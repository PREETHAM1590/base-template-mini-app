// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ArbitrageExecutor
 * @dev Smart contract for executing arbitrage trades across multiple DEXs on Base network
 * @notice This contract handles arbitrage execution with built-in safety mechanisms
 */
contract ArbitrageExecutor is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // Events
    event ArbitrageExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        address exchangeA,
        address exchangeB
    );

    event MinProfitUpdated(uint256 oldMinProfit, uint256 newMinProfit);
    event MaxSlippageUpdated(uint256 oldMaxSlippage, uint256 newMaxSlippage);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    // Structs
    struct ArbitrageParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        address exchangeA;      // Router address for first exchange
        address exchangeB;      // Router address for second exchange
        bytes pathA;            // Encoded path for exchange A
        bytes pathB;            // Encoded path for exchange B
        uint256 minProfit;      // Minimum profit in tokenIn
        uint256 deadline;       // Transaction deadline
        uint256 maxSlippage;    // Maximum slippage in basis points (e.g., 50 = 0.5%)
    }

    // State variables
    mapping(address => bool) public authorizedRouters;
    mapping(address => uint256) public userNonces;
    
    uint256 public minProfitThreshold = 1e15; // 0.001 ETH minimum profit
    uint256 public maxSlippageBasisPoints = 500; // 5% max slippage
    uint256 public treasuryFee = 100; // 1% treasury fee in basis points
    address public treasury;
    
    // Gas limits for external calls
    uint256 public constant SWAP_GAS_LIMIT = 300000;
    
    constructor(address _treasury) {
        treasury = _treasury;
        _transferOwnership(msg.sender);
    }

    /**
     * @dev Execute arbitrage between two DEXs
     * @param params ArbitrageParams struct containing all necessary parameters
     */
    function executeArbitrage(ArbitrageParams calldata params) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(params.deadline >= block.timestamp, "ArbitrageExecutor: Transaction expired");
        require(params.maxSlippage <= maxSlippageBasisPoints, "ArbitrageExecutor: Slippage too high");
        require(authorizedRouters[params.exchangeA], "ArbitrageExecutor: Exchange A not authorized");
        require(authorizedRouters[params.exchangeB], "ArbitrageExecutor: Exchange B not authorized");
        require(params.minProfit >= minProfitThreshold, "ArbitrageExecutor: Profit below threshold");

        IERC20 tokenIn = IERC20(params.tokenIn);
        IERC20 tokenOut = IERC20(params.tokenOut);
        
        uint256 initialBalance = tokenIn.balanceOf(address(this));
        
        // Transfer tokens from user
        tokenIn.safeTransferFrom(msg.sender, address(this), params.amountIn);
        
        // Execute first swap (buy on cheaper exchange)
        uint256 intermediateAmount = _executeSwap(
            params.exchangeA,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            params.pathA
        );
        
        // Execute second swap (sell on more expensive exchange)
        uint256 finalAmount = _executeSwap(
            params.exchangeB,
            params.tokenOut,
            params.tokenIn,
            intermediateAmount,
            params.pathB
        );
        
        // Calculate profit
        require(finalAmount > params.amountIn, "ArbitrageExecutor: No profit made");
        uint256 grossProfit = finalAmount - params.amountIn;
        require(grossProfit >= params.minProfit, "ArbitrageExecutor: Profit below minimum");
        
        // Calculate and deduct treasury fee
        uint256 treasuryFeeAmount = (grossProfit * treasuryFee) / 10000;
        uint256 netProfit = grossProfit - treasuryFeeAmount;
        
        // Transfer profits
        if (treasuryFeeAmount > 0) {
            tokenIn.safeTransfer(treasury, treasuryFeeAmount);
        }
        tokenIn.safeTransfer(msg.sender, params.amountIn + netProfit);
        
        emit ArbitrageExecuted(
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            finalAmount,
            netProfit,
            params.exchangeA,
            params.exchangeB
        );
    }

    /**
     * @dev Execute a swap on a specific DEX router
     */
    function _executeSwap(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata path
    ) internal returns (uint256 amountOut) {
        IERC20(tokenIn).safeApprove(router, amountIn);
        
        // Construct the swap call
        bytes memory swapCall = abi.encodeWithSignature(
            "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
            amountIn,
            0, // Accept any amount of tokens out
            abi.decode(path, (address[])),
            address(this),
            block.timestamp + 300 // 5 minutes from now
        );
        
        // Execute the swap with gas limit
        (bool success, bytes memory result) = router.call{gas: SWAP_GAS_LIMIT}(swapCall);
        require(success, "ArbitrageExecutor: Swap failed");
        
        // Decode the result to get amounts
        uint256[] memory amounts = abi.decode(result, (uint256[]));
        amountOut = amounts[amounts.length - 1];
        
        // Reset approval
        IERC20(tokenIn).safeApprove(router, 0);
    }

    /**
     * @dev Simulate arbitrage execution to estimate profits and gas
     * @param params ArbitrageParams struct
     * @return estimatedProfit Expected profit in tokenIn
     * @return estimatedGas Estimated gas cost
     */
    function simulateArbitrage(ArbitrageParams calldata params)
        external
        view
        returns (uint256 estimatedProfit, uint256 estimatedGas)
    {
        // This is a simplified simulation - in production you'd query DEX contracts
        // For now, return mock estimates based on input parameters
        
        uint256 mockIntermediateAmount = params.amountIn * 102 / 100; // Mock 2% gain
        uint256 mockFinalAmount = mockIntermediateAmount * 101 / 100; // Mock 1% gain
        
        if (mockFinalAmount > params.amountIn) {
            uint256 grossProfit = mockFinalAmount - params.amountIn;
            uint256 treasuryFeeAmount = (grossProfit * treasuryFee) / 10000;
            estimatedProfit = grossProfit - treasuryFeeAmount;
        }
        
        estimatedGas = 400000; // Estimated gas for arbitrage execution
    }

    // Admin functions
    
    /**
     * @dev Add or remove authorized router
     */
    function setAuthorizedRouter(address router, bool authorized) external onlyOwner {
        authorizedRouters[router] = authorized;
    }

    /**
     * @dev Update minimum profit threshold
     */
    function setMinProfitThreshold(uint256 _minProfitThreshold) external onlyOwner {
        emit MinProfitUpdated(minProfitThreshold, _minProfitThreshold);
        minProfitThreshold = _minProfitThreshold;
    }

    /**
     * @dev Update maximum slippage
     */
    function setMaxSlippage(uint256 _maxSlippageBasisPoints) external onlyOwner {
        require(_maxSlippageBasisPoints <= 1000, "ArbitrageExecutor: Slippage too high"); // Max 10%
        emit MaxSlippageUpdated(maxSlippageBasisPoints, _maxSlippageBasisPoints);
        maxSlippageBasisPoints = _maxSlippageBasisPoints;
    }

    /**
     * @dev Update treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "ArbitrageExecutor: Invalid treasury address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    /**
     * @dev Update treasury fee
     */
    function setTreasuryFee(uint256 _treasuryFee) external onlyOwner {
        require(_treasuryFee <= 1000, "ArbitrageExecutor: Fee too high"); // Max 10%
        treasuryFee = _treasuryFee;
    }

    /**
     * @dev Pause/unpause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency function to rescue tokens
     */
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            // Rescue native tokens
            payable(owner()).transfer(amount);
        } else {
            // Rescue ERC20 tokens
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    /**
     * @dev Get contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    // Receive function to handle native token deposits
    receive() external payable {}
}