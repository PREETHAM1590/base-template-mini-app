// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IDEXRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

interface IFlashLoanReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

contract ArbiTipsTrading is Ownable, ReentrancyGuard, Pausable, IFlashLoanReceiver {
    using SafeERC20 for IERC20;
    
    // Events
    event ArbitrageExecuted(
        address indexed user,
        address tokenA,
        address tokenB,
        uint256 profit,
        uint256 timestamp
    );
    
    event EmergencyWithdraw(address indexed token, uint256 amount);
    event TradingLimitUpdated(address indexed user, uint256 newLimit);
    event FlashLoanExecuted(address asset, uint256 amount, uint256 premium);
    
    // Structs
    struct TradingLimit {
        uint256 maxTradeAmount;
        uint256 dailyLimit;
        uint256 dailyVolume;
        uint256 lastResetTime;
        bool isActive;
    }
    
    struct ArbitrageParams {
        address tokenA;
        address tokenB;
        uint256 amountIn;
        address[] routerA;
        address[] routerB;
        address[] pathA;
        address[] pathB;
        uint256 minProfit;
    }
    
    // State variables
    mapping(address => TradingLimit) public userLimits;
    mapping(address => bool) public approvedRouters;
    mapping(address => bool) public whitelistedTokens;
    mapping(address => uint256) public userProfits;
    
    uint256 public platformFeePercent = 10; // 0.1%
    uint256 public minProfitThreshold = 1e15; // 0.001 ETH minimum profit
    uint256 public maxSlippagePercent = 100; // 1%
    address public feeCollector;
    address public flashLoanProvider;
    
    bool public flashLoansEnabled = true;
    
    // Modifiers
    modifier onlyWhitelistedTokens(address tokenA, address tokenB) {
        require(whitelistedTokens[tokenA], "TokenA not whitelisted");
        require(whitelistedTokens[tokenB], "TokenB not whitelisted");
        _;
    }
    
    modifier checkTradingLimits(address user, uint256 amount) {
        TradingLimit storage limit = userLimits[user];
        require(limit.isActive, "Trading not enabled for user");
        require(amount <= limit.maxTradeAmount, "Exceeds max trade amount");
        
        // Reset daily volume if needed
        if (block.timestamp >= limit.lastResetTime + 1 days) {
            limit.dailyVolume = 0;
            limit.lastResetTime = block.timestamp;
        }
        
        require(limit.dailyVolume + amount <= limit.dailyLimit, "Exceeds daily limit");
        _;
    }
    
    constructor(address _feeCollector) {
        feeCollector = _feeCollector;
    }
    
    /**
     * @dev Execute arbitrage trade
     */
    function executeArbitrage(
        ArbitrageParams calldata params
    ) 
        external 
        nonReentrant 
        whenNotPaused
        onlyWhitelistedTokens(params.tokenA, params.tokenB)
        checkTradingLimits(msg.sender, params.amountIn)
    {
        require(params.minProfit >= minProfitThreshold, "Profit too low");
        require(approvedRouters[params.routerA[0]], "RouterA not approved");
        require(approvedRouters[params.routerB[0]], "RouterB not approved");
        
        // Transfer tokens from user
        IERC20(params.tokenA).safeTransferFrom(msg.sender, address(this), params.amountIn);
        
        // Execute first swap (Buy on DEX A)
        uint256 amountReceived = _executeSwap(
            params.routerA[0],
            params.amountIn,
            params.pathA,
            address(this)
        );
        
        // Execute second swap (Sell on DEX B)
        uint256 finalAmount = _executeSwap(
            params.routerB[0],
            amountReceived,
            params.pathB,
            address(this)
        );
        
        // Calculate profit
        uint256 profit = finalAmount > params.amountIn ? finalAmount - params.amountIn : 0;
        require(profit >= params.minProfit, "Insufficient profit");
        
        // Take platform fee
        uint256 fee = (profit * platformFeePercent) / 10000;
        if (fee > 0) {
            IERC20(params.tokenA).safeTransfer(feeCollector, fee);
        }
        
        // Send profit to user
        uint256 userProfit = profit - fee;
        IERC20(params.tokenA).safeTransfer(msg.sender, params.amountIn + userProfit);
        
        // Update user stats
        userProfits[msg.sender] += userProfit;
        userLimits[msg.sender].dailyVolume += params.amountIn;
        
        emit ArbitrageExecuted(msg.sender, params.tokenA, params.tokenB, userProfit, block.timestamp);
    }
    
    /**
     * @dev Execute arbitrage with flash loan
     */
    function executeArbitrageWithFlashLoan(
        address asset,
        uint256 amount,
        ArbitrageParams calldata params
    ) 
        external 
        nonReentrant 
        whenNotPaused
    {
        require(flashLoansEnabled, "Flash loans disabled");
        require(flashLoanProvider != address(0), "Flash loan provider not set");
        
        // Encode parameters for flash loan callback
        bytes memory data = abi.encode(params, msg.sender);
        
        // Request flash loan (implementation depends on provider - Aave, dYdX, etc.)
        // This is a simplified interface - actual implementation varies by provider
        IFlashLoanProvider(flashLoanProvider).flashLoan(asset, amount, data);
    }
    
    /**
     * @dev Flash loan callback - executed by flash loan provider
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) 
        external 
        override 
        returns (bool) 
    {
        require(msg.sender == flashLoanProvider, "Invalid flash loan provider");
        
        (ArbitrageParams memory arbParams, address user) = abi.decode(params, (ArbitrageParams, address));
        
        // Execute arbitrage logic
        uint256 initialBalance = IERC20(asset).balanceOf(address(this));
        
        // First swap
        uint256 amountReceived = _executeSwap(
            arbParams.routerA[0],
            amount,
            arbParams.pathA,
            address(this)
        );
        
        // Second swap
        uint256 finalAmount = _executeSwap(
            arbParams.routerB[0],
            amountReceived,
            arbParams.pathB,
            address(this)
        );
        
        // Calculate profit after repaying flash loan
        uint256 totalDebt = amount + premium;
        require(finalAmount >= totalDebt, "Insufficient funds to repay flash loan");
        
        uint256 profit = finalAmount - totalDebt;
        require(profit >= arbParams.minProfit, "Insufficient profit");
        
        // Take platform fee
        uint256 fee = (profit * platformFeePercent) / 10000;
        if (fee > 0) {
            IERC20(asset).safeTransfer(feeCollector, fee);
        }
        
        // Send profit to user
        uint256 userProfit = profit - fee;
        IERC20(asset).safeTransfer(user, userProfit);
        
        // Approve flash loan provider to pull back the debt
        IERC20(asset).approve(flashLoanProvider, totalDebt);
        
        // Update user stats
        userProfits[user] += userProfit;
        
        emit FlashLoanExecuted(asset, amount, premium);
        emit ArbitrageExecuted(user, arbParams.tokenA, arbParams.tokenB, userProfit, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Internal swap execution
     */
    function _executeSwap(
        address router,
        uint256 amountIn,
        address[] memory path,
        address recipient
    ) private returns (uint256) {
        require(path.length >= 2, "Invalid path");
        
        // Approve router
        IERC20(path[0]).approve(router, amountIn);
        
        // Calculate minimum amount out with slippage
        uint256[] memory amountsOut = IDEXRouter(router).getAmountsOut(amountIn, path);
        uint256 amountOutMin = (amountsOut[amountsOut.length - 1] * (10000 - maxSlippagePercent)) / 10000;
        
        // Execute swap
        uint256[] memory amounts = IDEXRouter(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            recipient,
            block.timestamp + 300 // 5 minute deadline
        );
        
        return amounts[amounts.length - 1];
    }
    
    /**
     * @dev Simulate arbitrage opportunity
     */
    function simulateArbitrage(
        ArbitrageParams calldata params
    ) external view returns (uint256 estimatedProfit, bool profitable) {
        // Get amounts from first swap
        uint256[] memory amountsA = IDEXRouter(params.routerA[0]).getAmountsOut(
            params.amountIn, 
            params.pathA
        );
        uint256 amountAfterA = amountsA[amountsA.length - 1];
        
        // Get amounts from second swap
        uint256[] memory amountsB = IDEXRouter(params.routerB[0]).getAmountsOut(
            amountAfterA, 
            params.pathB
        );
        uint256 finalAmount = amountsB[amountsB.length - 1];
        
        // Calculate profit
        if (finalAmount > params.amountIn) {
            estimatedProfit = finalAmount - params.amountIn;
            uint256 fee = (estimatedProfit * platformFeePercent) / 10000;
            estimatedProfit = estimatedProfit - fee;
            profitable = estimatedProfit >= params.minProfit;
        } else {
            estimatedProfit = 0;
            profitable = false;
        }
    }
    
    // Admin functions
    
    function setTradingLimit(
        address user,
        uint256 maxTradeAmount,
        uint256 dailyLimit,
        bool isActive
    ) external onlyOwner {
        userLimits[user] = TradingLimit({
            maxTradeAmount: maxTradeAmount,
            dailyLimit: dailyLimit,
            dailyVolume: 0,
            lastResetTime: block.timestamp,
            isActive: isActive
        });
        
        emit TradingLimitUpdated(user, dailyLimit);
    }
    
    function whitelistToken(address token, bool status) external onlyOwner {
        whitelistedTokens[token] = status;
    }
    
    function approveRouter(address router, bool status) external onlyOwner {
        approvedRouters[router] = status;
    }
    
    function setFeeCollector(address _feeCollector) external onlyOwner {
        feeCollector = _feeCollector;
    }
    
    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 500, "Fee too high"); // Max 5%
        platformFeePercent = _feePercent;
    }
    
    function setFlashLoanProvider(address _provider) external onlyOwner {
        flashLoanProvider = _provider;
    }
    
    function toggleFlashLoans() external onlyOwner {
        flashLoansEnabled = !flashLoansEnabled;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw function
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(owner(), balance);
            emit EmergencyWithdraw(token, balance);
        }
    }
}

// Simplified flash loan provider interface (actual implementation varies)
interface IFlashLoanProvider {
    function flashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external;
}