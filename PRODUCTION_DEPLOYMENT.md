# ArbiTips Production Deployment Guide

## 🚀 Overview

This guide covers the complete deployment of ArbiTips from demo to production-grade arbitrage system on Base network.

## 📋 Phase 1: Smart Contract Deployment

### Prerequisites
- Base testnet/mainnet RPC endpoint
- Funded wallet with ETH for gas fees
- Hardhat environment configured

### 1.1 Deploy to Base Testnet

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to Base testnet
npx hardhat run scripts/deploy.ts --network base-testnet

# Verify contract
npx hardhat verify --network base-testnet <CONTRACT_ADDRESS> \
  "0xE592427A0AEce92De3Edee1F18E0157C05861564" \  # Uniswap V3 Router
  "0x0000000000000000000000000000000000000000" \   # CEX Bridge (deploy separately)
  "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43" \  # Aerodrome Router
  "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"    # SushiSwap Router
```

### 1.2 Configure Contract Parameters

```bash
# Set minimum profit threshold to $50 USDC
npx hardhat run scripts/configure.ts --network base-testnet
```

### 1.3 Deploy to Base Mainnet

```bash
# Deploy to mainnet (with real funds)
npx hardhat run scripts/deploy.ts --network base-mainnet

# Update frontend with contract address
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=0x..." >> .env.local
```

## 📊 Phase 2: Real-Time Price Feeds

### 2.1 Initialize Price Discovery

```typescript
// Add to your Next.js app initialization
import { priceDiscovery } from './lib/priceDiscovery'

// In your app startup
await priceDiscovery.initialize()
```

### 2.2 Configure Base RPC

```bash
# Add to .env.local
BASE_RPC_URL=https://mainnet.base.org
# Or use a dedicated RPC provider like Alchemy/Infura
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY
```

### 2.3 Set Up CEX API Access

```bash
# Binance API (optional for enhanced data)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret

# Backpack API (when available)
BACKPACK_API_KEY=your_backpack_api_key
```

## 🤖 Phase 3: Rust Arbitrage Bot

### 3.1 Setup Rust Environment

```bash
# Navigate to bot directory
cd bot

# Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build the bot
cargo build --release
```

### 3.2 Configure Bot Environment

```bash
# Create bot/.env
cat > .env << EOF
PRIVATE_KEY=your_ethereum_private_key_here
BASE_RPC_URL=https://mainnet.base.org
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
MIN_PROFIT_THRESHOLD=50.0
MAX_GAS_PRICE=50000000000
EOF
```

### 3.3 Deploy Bot to VPS

```bash
# Copy to server
scp -r ./bot user@your-server.com:/opt/arbitips-bot/

# On server: Install as systemd service
sudo tee /etc/systemd/system/arbitips-bot.service << EOF
[Unit]
Description=ArbiTips Arbitrage Bot
After=network.target

[Service]
Type=simple
User=arbitips
WorkingDirectory=/opt/arbitips-bot
ExecStart=/opt/arbitips-bot/target/release/arbitips-bot
Restart=always
RestartSec=10
Environment=RUST_LOG=info

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable arbitips-bot
sudo systemctl start arbitips-bot

# Check status
sudo systemctl status arbitips-bot
sudo journalctl -u arbitips-bot -f
```

## 🌐 Phase 4: Frontend Production Deployment

### 4.1 Vercel Deployment

```bash
# Already configured in your repo
# Push to main branch triggers deployment
git add .
git commit -m "Production-ready arbitrage system"
git push origin main

# Manual deployment
npx vercel --prod
```

### 4.2 Environment Variables

```bash
# Set in Vercel dashboard or CLI
vercel env add NEXT_PUBLIC_CONTRACT_ADDRESS
vercel env add BASE_RPC_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
```

## 🔧 Phase 5: Monitoring & Analytics

### 5.1 Set Up Monitoring

```bash
# Install monitoring tools
npm install @datadog/browser-logs @datadog/browser-rum

# Configure error tracking
# Add to _app.tsx:
import { datadogLogs } from '@datadog/browser-logs'
import { datadogRum } from '@datadog/browser-rum'
```

### 5.2 Smart Contract Events

```solidity
// Monitor these events in your smart contract
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
```

### 5.3 Bot Metrics Dashboard

```bash
# Add Prometheus metrics to bot
# Create monitoring dashboard
# Track:
# - Successful trades per hour
# - Average profit per trade  
# - Total volume processed
# - Error rates
```

## 🛡️ Phase 6: Risk Management

### 6.1 Smart Contract Security

```bash
# Pause contract if needed
npx hardhat run scripts/pause.ts --network base-mainnet

# Set conservative parameters initially
MIN_PROFIT_THRESHOLD=100  # $100
MAX_GAS_PRICE=20000000000 # 20 gwei
MAX_SLIPPAGE=50           # 0.5%
```

### 6.2 Bot Risk Controls

```rust
// Configure in bot
const CONFIG: Config = {
    min_profit_threshold: 100.0, // Start conservative
    max_trade_size: 10000.0,     // Limit position size
    max_gas_price: 20_000_000_000, // Limit gas price
    confidence_threshold: 0.9,   // High confidence only
};
```

### 6.3 Circuit Breakers

```typescript
// Implement in your monitoring system
if (failed_trades_per_hour > 10) {
    // Pause bot automatically
    // Send alerts
    // Require manual intervention
}
```

## 📈 Phase 7: Performance Optimization

### 7.1 Latency Optimization

```bash
# Use fast RPC endpoints
BASE_RPC_URL=https://base-mainnet.rpc.grove.city/v1/YOUR_APP_ID

# Consider running own Base node
# Co-locate bot close to exchanges
```

### 7.2 Gas Optimization

```solidity
// Optimize contract calls
// Use multicall for batch operations
// Implement gas price oracles
```

### 7.3 MEV Protection

```rust
// Implement in bot:
// - Private mempools
// - Flashbots integration
// - Transaction timing optimization
```

## 📊 Phase 8: Scaling Up

### 8.1 Multi-Token Support

```typescript
// Add support for more trading pairs
const SUPPORTED_PAIRS = [
    'WETH/USDC',
    'WBTC/USDC', 
    'DAI/USDC',
    'USDT/USDC'
];
```

### 8.2 Cross-Chain Arbitrage

```solidity
// Implement cross-chain bridges
// Support Ethereum, Polygon, Arbitrum
// Use LayerZero or Wormhole protocols
```

### 8.3 Institutional Features

```typescript
// Add features for larger traders:
// - Portfolio management
// - Risk analytics dashboard
// - Custom trading strategies
// - API access for institutions
```

## 🚨 Alerts & Notifications

### 8.1 Set Up Alerts

```typescript
// Configure alerts for:
// - Large profitable opportunities (>$500)
// - System failures
// - Unusual market conditions
// - Daily/weekly performance reports

// Integration options:
// - Discord webhooks
// - Telegram bots
// - Email notifications
// - SMS for critical alerts
```

## 📋 Production Checklist

- [ ] Smart contract deployed to Base mainnet
- [ ] Contract verified on Basescan
- [ ] Price feeds actively updating
- [ ] Rust bot running on production server  
- [ ] Frontend deployed to Vercel
- [ ] Monitoring dashboards configured
- [ ] Alert systems active
- [ ] Risk management parameters set
- [ ] Documentation updated
- [ ] Team trained on operations

## 🔍 Monitoring URLs

- **Frontend**: https://your-app.vercel.app
- **Contract**: https://basescan.org/address/YOUR_CONTRACT
- **Bot Logs**: `sudo journalctl -u arbitips-bot -f`
- **Metrics**: Your monitoring dashboard URL

## 🆘 Emergency Procedures

### If Something Goes Wrong:

1. **Pause Smart Contract**:
   ```bash
   npx hardhat run scripts/emergency-pause.ts --network base-mainnet
   ```

2. **Stop Bot**:
   ```bash
   sudo systemctl stop arbitips-bot
   ```

3. **Withdraw Funds**:
   ```bash
   npx hardhat run scripts/emergency-withdraw.ts --network base-mainnet
   ```

4. **Contact Team**: Use emergency contacts/channels

---

## 💡 Next Steps

1. Start with testnet deployment
2. Run bot with small amounts initially
3. Monitor performance for 1-2 weeks
4. Gradually increase trading limits
5. Add more trading pairs and venues
6. Scale infrastructure as needed

**Remember**: Start small, test thoroughly, and scale gradually. Arbitrage trading involves real financial risk.

## 📞 Support

- **Technical Issues**: Create GitHub issue
- **Security Concerns**: security@arbitips.com
- **General Questions**: team@arbitips.com

---

*Last Updated: December 2024*