// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// Interface for CEX Bridge contract
interface ICEXBridge {
    function deposit(address token, uint256 amount, bytes calldata data) external;
    function withdraw(address token, uint256 amount, address to) external;
    function getBalance(address token, address account) external view returns (uint256);
    function executeTrade(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256);
}

// Interface for Uniswap V3 Router
interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);
}

// Interface for Aerodrome Router
interface IAerodrome {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function getAmountOut(uint amountIn, address tokenIn, address tokenOut) external view returns (uint amountOut);
}

// Interface for SushiSwap Router
interface ISushiSwapRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

/**
 * @title ArbitrageExecutor
 * @dev Production-grade smart contract for executing atomic arbitrage on Base network
 * @notice Handles DEX-to-CEX, CEX-to-DEX, and DEX-to-DEX arbitrage with flash loans
 */
contract ArbitrageExecutor is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Enums
    enum ArbitrageStrategy {
        DEX_TO_CEX,
        CEX_TO_DEX,
        DEX_TO_DEX
    }

    // Structs
    struct ArbitrageParams {
        ArbitrageStrategy strategy;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        string buyVenue;
        string sellVenue;
        bytes extraData;
    }

    struct DEXRoute {
        address router;
        uint24 fee; // For Uniswap V3
        address[] path; // For V2-style routers
    }

    // Events
    event ArbitrageExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        string buyVenue,
        string sellVenue,
        uint256 gasUsed
    );
    
    event ParametersUpdated(
        uint256 maxSlippage,
        uint256 minProfitThreshold,
        uint256 maxGasPrice
    );
    
    event EmergencyWithdraw(
        address indexed token,
        uint256 amount,
        address indexed to
    );

    event FlashLoanExecuted(
        address indexed token,
        uint256 amount,
        uint256 fee,
        bool success
    );

    // State variables
    uint256 public maxSlippagePercent = 100; // 1% in basis points
    uint256 public minProfitThreshold = 50 * 10**6; // $50 in USDC
    uint256 public maxGasPrice = 50 * 10**9; // 50 gwei
    uint256 public flashLoanFee = 9; // 0.09% in basis points
    
    mapping(address => bool) public authorizedCallers;
    mapping(address => bool) public supportedTokens;
    mapping(string => DEXRoute) public dexRoutes;
    mapping(address => uint256) public profits; // Track profits per token
    
    // Contract addresses on Base
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    
    IUniswapV3Router public immutable uniswapRouter;
    ICEXBridge public cexBridge;
    IAerodrome public aerodromeRouter;
    ISushiSwapRouter public sushiRouter;

    // Flash loan state
    bool private inFlashLoan;
    bytes private flashLoanData;

    constructor(
        address _uniswapRouter,
        address _cexBridge,
        address _aerodromeRouter,
        address _sushiRouter
    ) {
        uniswapRouter = IUniswapV3Router(_uniswapRouter);
        cexBridge = ICEXBridge(_cexBridge);
        aerodromeRouter = IAerodrome(_aerodromeRouter);
        sushiRouter = ISushiSwapRouter(_sushiRouter);
        
        // Initialize supported tokens
        supportedTokens[WETH] = true;
        supportedTokens[USDC] = true;
        
        // Authorize owner as caller
        authorizedCallers[msg.sender] = true;
        
        // Initialize DEX routes
        _initializeDEXRoutes();
    }

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender], "Not authorized");
        _;
    }

    modifier validToken(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }

    modifier notInFlashLoan() {
        require(!inFlashLoan, "Already in flash loan");
        _;
    }

    // Initialize DEX routing configuration
    function _initializeDEXRoutes() private {
        // Uniswap V3 routes
        dexRoutes["uniswap-v3-500"] = DEXRoute({
            router: address(uniswapRouter),
            fee: 500,
            path: new address[](0)
        });
        
        dexRoutes["uniswap-v3-3000"] = DEXRoute({
            router: address(uniswapRouter),
            fee: 3000,
            path: new address[](0)
        });

        // Aerodrome route
        address[] memory aeroPath = new address[](2);
        aeroPath[0] = WETH;
        aeroPath[1] = USDC;
        dexRoutes["aerodrome"] = DEXRoute({
            router: address(aerodromeRouter),
            fee: 0,
            path: aeroPath
        });

        // SushiSwap route
        address[] memory sushiPath = new address[](2);
        sushiPath[0] = WETH;
        sushiPath[1] = USDC;
        dexRoutes["sushiswap"] = DEXRoute({
            router: address(sushiRouter),
            fee: 0,
            path: sushiPath
        });
    }

    // Main arbitrage execution function
    function executeArbitrage(
        ArbitrageParams calldata params
    ) external onlyAuthorized nonReentrant whenNotPaused validToken(params.tokenIn) validToken(params.tokenOut) returns (uint256 actualProfit) {
        require(params.amountIn > 0, "Invalid amount");
        require(tx.gasprice <= maxGasPrice, "Gas price too high");

        uint256 gasStart = gasleft();
        uint256 initialBalance = IERC20(params.tokenIn).balanceOf(address(this));
        
        // Execute the arbitrage strategy
        uint256 amountOut;
        if (params.strategy == ArbitrageStrategy.DEX_TO_CEX) {
            amountOut = _executeDEXToCEX(params);
        } else if (params.strategy == ArbitrageStrategy.CEX_TO_DEX) {
            amountOut = _executeCEXToDEX(params);
        } else if (params.strategy == ArbitrageStrategy.DEX_TO_DEX) {
            amountOut = _executeDEXToDEX(params);
        } else {
            revert("Unknown strategy");
        }
        
        require(amountOut >= params.minAmountOut, "Insufficient output amount");
        
        // Calculate actual profit (in terms of input token)
        uint256 finalBalance = IERC20(params.tokenIn).balanceOf(address(this));
        actualProfit = finalBalance > initialBalance ? finalBalance - initialBalance : 0;
        
        // Track profits
        profits[params.tokenIn] += actualProfit;
        
        uint256 gasUsed = gasStart - gasleft();
        
        emit ArbitrageExecuted(
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            actualProfit,
            params.buyVenue,
            params.sellVenue,
            gasUsed
        );
        
        return actualProfit;
    }

    // DEX to CEX arbitrage implementation
    function _executeDEXToCEX(ArbitrageParams memory params) private returns (uint256) {
        // Step 1: Buy on DEX
        uint256 amountOut = _executeDEXSwap(params.buyVenue, params.tokenIn, params.tokenOut, params.amountIn, params.minAmountOut);
        
        // Step 2: Deposit to CEX and sell
        require(address(cexBridge) != address(0), "CEX bridge not configured");
        
        IERC20(params.tokenOut).safeApprove(address(cexBridge), amountOut);
        cexBridge.deposit(params.tokenOut, amountOut, params.extraData);
        
        return amountOut;
    }

    // CEX to DEX arbitrage implementation
    function _executeCEXToDEX(ArbitrageParams memory params) private returns (uint256) {
        // Step 1: Withdraw from CEX
        require(address(cexBridge) != address(0), "CEX bridge not configured");
        cexBridge.withdraw(params.tokenIn, params.amountIn, address(this));
        
        // Step 2: Sell on DEX
        uint256 amountOut = _executeDEXSwap(params.sellVenue, params.tokenIn, params.tokenOut, params.amountIn, params.minAmountOut);
        
        return amountOut;
    }

    // DEX to DEX arbitrage implementation
    function _executeDEXToDEX(ArbitrageParams memory params) private returns (uint256) {
        // Step 1: Buy on first DEX
        uint256 intermediateAmount = _executeDEXSwap(params.buyVenue, params.tokenIn, params.tokenOut, params.amountIn, 0);
        
        // Step 2: Sell on second DEX
        uint256 finalAmount = _executeDEXSwap(params.sellVenue, params.tokenOut, params.tokenIn, intermediateAmount, params.minAmountOut);
        
        return finalAmount;
    }

    // Execute swap on specified DEX
    function _executeDEXSwap(string memory venue, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) private returns (uint256) {
        DEXRoute memory route = dexRoutes[venue];
        require(route.router != address(0), "DEX route not configured");
        
        IERC20(tokenIn).safeApprove(route.router, amountIn);
        
        if (route.fee > 0) {
            // Uniswap V3 swap
            IUniswapV3Router.ExactInputSingleParams memory swapParams = IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: route.fee,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            });
            
            return IUniswapV3Router(route.router).exactInputSingle(swapParams);
        } else {
            // V2-style swap (Aerodrome, SushiSwap)
            if (route.router == address(aerodromeRouter)) {
                uint[] memory amounts = aerodromeRouter.swapExactTokensForTokens(
                    amountIn,
                    minAmountOut,
                    route.path,
                    address(this),
                    block.timestamp + 300
                );
                return amounts[amounts.length - 1];
            } else if (route.router == address(sushiRouter)) {
                uint[] memory amounts = sushiRouter.swapExactTokensForTokens(
                    amountIn,
                    minAmountOut,
                    route.path,
                    address(this),
                    block.timestamp + 300
                );
                return amounts[amounts.length - 1];
            }
        }
        
        revert("Unsupported DEX");
    }

    // Flash loan functionality for capital efficiency
    function executeFlashLoanArbitrage(
        address token,
        uint256 amount,
        bytes calldata arbitrageData
    ) external onlyAuthorized nonReentrant whenNotPaused notInFlashLoan {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Invalid amount");
        
        // Calculate flash loan fee
        uint256 fee = amount.mul(flashLoanFee).div(10000);
        uint256 totalRepayment = amount.add(fee);
        
        // Ensure we can repay the loan
        require(IERC20(token).balanceOf(address(this)) >= totalRepayment, "Insufficient balance for repayment");
        
        // Set flash loan state
        inFlashLoan = true;
        flashLoanData = arbitrageData;
        
        // Execute arbitrage with borrowed funds
        ArbitrageParams memory params = abi.decode(arbitrageData, (ArbitrageParams));
        params.amountIn = amount;
        
        uint256 amountOut = this.executeArbitrage(params);
        
        // Check profitability after fees
        require(amountOut > totalRepayment, "Arbitrage not profitable after fees");
        
        // Reset flash loan state
        inFlashLoan = false;
        delete flashLoanData;
        
        emit FlashLoanExecuted(token, amount, fee, true);
    }

    // Emergency functions
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
        
        emit EmergencyWithdraw(token, amount, owner());
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Admin functions
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }
    
    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
    }
    
    function updateParameters(
        uint256 _maxSlippagePercent,
        uint256 _minProfitThreshold,
        uint256 _maxGasPrice,
        uint256 _flashLoanFee
    ) external onlyOwner {
        maxSlippagePercent = _maxSlippagePercent;
        minProfitThreshold = _minProfitThreshold;
        maxGasPrice = _maxGasPrice;
        flashLoanFee = _flashLoanFee;
        
        emit ParametersUpdated(_maxSlippagePercent, _minProfitThreshold, _maxGasPrice);
    }
    
    function setCEXBridge(address _cexBridge) external onlyOwner {
        cexBridge = ICEXBridge(_cexBridge);
    }

    function setDEXRoute(string memory venue, address router, uint24 fee, address[] memory path) external onlyOwner {
        dexRoutes[venue] = DEXRoute({
            router: router,
            fee: fee,
            path: path
        });
    }

    // View functions
    function getContractBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }
    
    function isAuthorizedCaller(address caller) external view returns (bool) {
        return authorizedCallers[caller];
    }
    
    function isSupportedToken(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    function getDEXRoute(string memory venue) external view returns (address router, uint24 fee, address[] memory path) {
        DEXRoute memory route = dexRoutes[venue];
        return (route.router, route.fee, route.path);
    }

    function getTotalProfit(address token) external view returns (uint256) {
        return profits[token];
    }
    
    function version() external pure returns (string memory) {
        return "2.0.0";
    }

    // Receive function to handle native token deposits
    receive() external payable {}
}