// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CEXBridge
 * @dev Bridge contract for interfacing with centralized exchanges
 * @notice Handles deposits, withdrawals, and trade execution coordination with CEXs
 */
contract CEXBridge is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Events
    event DepositInitiated(
        address indexed user,
        address indexed token,
        uint256 amount,
        string cexOrderId,
        bytes32 indexed depositId
    );

    event WithdrawalCompleted(
        address indexed user,
        address indexed token,
        uint256 amount,
        string cexOrderId,
        bytes32 indexed withdrawalId
    );

    event TradeExecuted(
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        string cexOrderId
    );

    event CEXOperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event EmergencyWithdrawal(address indexed token, uint256 amount, address indexed to);

    // Structs
    struct DepositRequest {
        address user;
        address token;
        uint256 amount;
        uint256 timestamp;
        string cexOrderId;
        bool executed;
    }

    struct WithdrawalRequest {
        address user;
        address token;
        uint256 amount;
        uint256 timestamp;
        string cexOrderId;
        bool completed;
    }

    struct CEXBalance {
        uint256 amount;
        uint256 lastUpdate;
        bool isActive;
    }

    // State variables
    mapping(bytes32 => DepositRequest) public depositRequests;
    mapping(bytes32 => WithdrawalRequest) public withdrawalRequests;
    mapping(address => mapping(address => CEXBalance)) public cexBalances; // user -> token -> balance
    mapping(address => bool) public authorizedOperators;
    mapping(address => bool) public supportedTokens;

    address public cexOperator; // Backend service that interfaces with CEXs
    uint256 public depositTimeout = 300; // 5 minutes
    uint256 public withdrawalTimeout = 1800; // 30 minutes
    
    // Supported exchanges
    enum Exchange { BINANCE, BACKPACK, COINBASE }
    mapping(Exchange => bool) public supportedExchanges;

    constructor(address _cexOperator) {
        cexOperator = _cexOperator;
        authorizedOperators[_cexOperator] = true;
        
        // Enable supported exchanges
        supportedExchanges[Exchange.BINANCE] = true;
        supportedExchanges[Exchange.BACKPACK] = true;
        supportedExchanges[Exchange.COINBASE] = true;
    }

    modifier onlyOperator() {
        require(authorizedOperators[msg.sender], "Not authorized operator");
        _;
    }

    modifier supportedToken(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }

    /**
     * @dev Initiate deposit to CEX for arbitrage execution
     * @param token Token to deposit
     * @param amount Amount to deposit
     * @param data Additional data containing CEX order info
     */
    function deposit(
        address token,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant whenNotPaused supportedToken(token) {
        require(amount > 0, "Invalid amount");
        
        // Parse CEX order data
        string memory cexOrderId = abi.decode(data, (string));
        
        // Generate unique deposit ID
        bytes32 depositId = keccak256(abi.encodePacked(
            msg.sender, token, amount, block.timestamp, cexOrderId
        ));
        
        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Create deposit request
        depositRequests[depositId] = DepositRequest({
            user: msg.sender,
            token: token,
            amount: amount,
            timestamp: block.timestamp,
            cexOrderId: cexOrderId,
            executed: false
        });
        
        // Update user's CEX balance
        cexBalances[msg.sender][token].amount += amount;
        cexBalances[msg.sender][token].lastUpdate = block.timestamp;
        cexBalances[msg.sender][token].isActive = true;
        
        emit DepositInitiated(msg.sender, token, amount, cexOrderId, depositId);
    }

    /**
     * @dev Complete withdrawal from CEX
     * @param user User address
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     * @param cexOrderId CEX order ID
     */
    function withdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOperator nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(to != address(0), "Invalid recipient");
        
        // Generate withdrawal ID
        bytes32 withdrawalId = keccak256(abi.encodePacked(
            to, token, amount, block.timestamp
        ));
        
        // Create withdrawal request
        withdrawalRequests[withdrawalId] = WithdrawalRequest({
            user: to,
            token: token,
            amount: amount,
            timestamp: block.timestamp,
            cexOrderId: "",
            completed: true
        });
        
        // Transfer tokens to user
        IERC20(token).safeTransfer(to, amount);
        
        // Update user's CEX balance
        if (cexBalances[to][token].amount >= amount) {
            cexBalances[to][token].amount -= amount;
            cexBalances[to][token].lastUpdate = block.timestamp;
        }
        
        emit WithdrawalCompleted(to, token, amount, "", withdrawalId);
    }

    /**
     * @dev Execute trade on CEX (called by authorized operator)
     * @param user User executing the trade
     * @param tokenIn Input token
     * @param tokenOut Output token  
     * @param amountIn Amount of input token
     * @param minAmountOut Minimum output amount
     */
    function executeTrade(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external onlyOperator nonReentrant whenNotPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid input amount");
        require(minAmountOut > 0, "Invalid minimum output");
        require(supportedTokens[tokenIn] && supportedTokens[tokenOut], "Unsupported tokens");
        
        // Check user has sufficient CEX balance
        require(cexBalances[user][tokenIn].amount >= amountIn, "Insufficient CEX balance");
        
        // Mock trade execution (in production, this would interface with actual CEX APIs)
        // For demo purposes, assume 0.1% trading fee and market execution
        uint256 tradingFee = amountIn * 1 / 1000; // 0.1% fee
        amountOut = amountIn - tradingFee;
        
        // Apply mock exchange rate (in production, get real rates from CEX)
        if (tokenIn != tokenOut) {
            // Mock exchange rate: assume 1:1 for stablecoins, or current market rate
            amountOut = amountOut; // Simplified for demo
        }
        
        require(amountOut >= minAmountOut, "Insufficient output amount");
        
        // Update user balances
        cexBalances[user][tokenIn].amount -= amountIn;
        cexBalances[user][tokenOut].amount += amountOut;
        cexBalances[user][tokenIn].lastUpdate = block.timestamp;
        cexBalances[user][tokenOut].lastUpdate = block.timestamp;
        
        emit TradeExecuted(user, tokenIn, tokenOut, amountIn, amountOut, "mock-order-id");
        
        return amountOut;
    }

    /**
     * @dev Get user's CEX balance for a token
     * @param token Token address
     * @param account User account
     */
    function getBalance(address token, address account) external view returns (uint256) {
        return cexBalances[account][token].amount;
    }

    /**
     * @dev Get user's detailed CEX balance info
     * @param token Token address
     * @param account User account
     */
    function getBalanceInfo(address token, address account) external view returns (
        uint256 amount,
        uint256 lastUpdate,
        bool isActive
    ) {
        CEXBalance memory balance = cexBalances[account][token];
        return (balance.amount, balance.lastUpdate, balance.isActive);
    }

    /**
     * @dev Check if deposit request is expired
     * @param depositId Deposit ID to check
     */
    function isDepositExpired(bytes32 depositId) external view returns (bool) {
        DepositRequest memory request = depositRequests[depositId];
        return (block.timestamp - request.timestamp) > depositTimeout;
    }

    /**
     * @dev Check if withdrawal request is expired  
     * @param withdrawalId Withdrawal ID to check
     */
    function isWithdrawalExpired(bytes32 withdrawalId) external view returns (bool) {
        WithdrawalRequest memory request = withdrawalRequests[withdrawalId];
        return (block.timestamp - request.timestamp) > withdrawalTimeout;
    }

    // Admin functions

    /**
     * @dev Set CEX operator address
     * @param _cexOperator New operator address
     */
    function setCEXOperator(address _cexOperator) external onlyOwner {
        require(_cexOperator != address(0), "Invalid operator address");
        
        address oldOperator = cexOperator;
        cexOperator = _cexOperator;
        
        // Update operator authorization
        authorizedOperators[oldOperator] = false;
        authorizedOperators[_cexOperator] = true;
        
        emit CEXOperatorUpdated(oldOperator, _cexOperator);
    }

    /**
     * @dev Add or remove authorized operator
     * @param operator Operator address
     * @param authorized Whether to authorize or deauthorize
     */
    function setAuthorizedOperator(address operator, bool authorized) external onlyOwner {
        authorizedOperators[operator] = authorized;
    }

    /**
     * @dev Add or remove supported token
     * @param token Token address
     * @param supported Whether token is supported
     */
    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
    }

    /**
     * @dev Set supported exchange
     * @param exchange Exchange enum
     * @param supported Whether exchange is supported
     */
    function setSupportedExchange(Exchange exchange, bool supported) external onlyOwner {
        supportedExchanges[exchange] = supported;
    }

    /**
     * @dev Update timeout settings
     * @param _depositTimeout New deposit timeout in seconds
     * @param _withdrawalTimeout New withdrawal timeout in seconds
     */
    function updateTimeouts(uint256 _depositTimeout, uint256 _withdrawalTimeout) external onlyOwner {
        require(_depositTimeout > 0 && _withdrawalTimeout > 0, "Invalid timeouts");
        depositTimeout = _depositTimeout;
        withdrawalTimeout = _withdrawalTimeout;
    }

    /**
     * @dev Pause contract operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal function
     * @param token Token to withdraw (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
        
        emit EmergencyWithdrawal(token, amount, owner());
    }

    /**
     * @dev Get contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    // Receive ETH
    receive() external payable {}
}