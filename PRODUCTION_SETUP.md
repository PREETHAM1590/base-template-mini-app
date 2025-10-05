# 🚀 ArbiTips Production Setup Guide

This guide will help you transition from demo mode to a fully functional production arbitrage system with live data feeds, smart contracts, and real-time monitoring.

## 📋 Prerequisites

Before starting, make sure you have:

- Node.js 18+ installed
- A Base network wallet with ETH for gas fees
- API keys for exchanges (Binance, etc.)
- A Base RPC endpoint (Alchemy, Infura, or public)

## ⚙️ Step 1: Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.production .env.local
   ```

2. **Configure your environment variables in `.env.local`:**
   ```bash
   # Base Network Configuration
   NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
   NEXT_PUBLIC_CHAIN_ID=8453

   # Exchange API Keys
   BINANCE_API_KEY=your_binance_api_key_here
   BINANCE_SECRET_KEY=your_binance_secret_key_here

   # Additional services (optional)
   COINGECKO_API_KEY=your_coingecko_api_key_here
   GRAPH_API_KEY=your_graph_api_key_here

   # Feature flags
   NEXT_PUBLIC_ENABLE_LIVE_TRADING=true
   NEXT_PUBLIC_MIN_PROFIT_USD=10.0
   NEXT_PUBLIC_MAX_GAS_PRICE_GWEI=25
   ```

## 📦 Step 2: Smart Contract Deployment

1. **Install Hardhat dependencies:**
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   ```

2. **Create Hardhat configuration (`hardhat.config.js`):**
   ```javascript
   require("@nomicfoundation/hardhat-toolbox");

   module.exports = {
     solidity: "0.8.19",
     networks: {
       base: {
         url: process.env.NEXT_PUBLIC_BASE_RPC_URL,
         accounts: [process.env.PRIVATE_KEY],
         chainId: 8453
       }
     }
   };
   ```

3. **Deploy contracts to Base:**
   ```bash
   # Set your private key
   export PRIVATE_KEY=your_wallet_private_key_here

   # Deploy contracts
   npx hardhat run scripts/deploy-contracts.js --network base
   ```

   The deployment will:
   - Deploy CEXBridge and ArbitrageExecutor contracts
   - Configure supported tokens and DEX routers
   - Save addresses to `.env.local`
   - Generate deployment info in `deployments/base.json`

## 🔄 Step 3: Start Production System

1. **Install TypeScript dependencies:**
   ```bash
   npm install -g ts-node typescript
   ```

2. **Start the price discovery and opportunity detection:**
   ```bash
   ts-node scripts/start-production.ts
   ```

   This will:
   - Initialize real-time price feeds from Binance and Base DEXs
   - Start monitoring for arbitrage opportunities
   - Apply production filters for profitability
   - Display live opportunities in console

3. **Start the Next.js development server (in another terminal):**
   ```bash
   npm run dev
   ```

## 📊 Step 4: Access Production Dashboard

Navigate to: `http://localhost:3000/dashboard-production`

The dashboard provides:
- **Live Opportunities**: Real-time arbitrage opportunities with profitability metrics
- **Market Data**: Current prices across DEXs and CEXs
- **Performance Stats**: Success rates, total profits, gas costs
- **Execution Controls**: Manual and automated trade execution
- **Risk Management**: Filters and safety parameters

## 🔧 Step 5: Configuration Options

### Opportunity Filters
Adjust filters in the production startup script or dashboard:
- **Minimum Spread**: Default 0.2%
- **Minimum Profit**: Default $10 USD
- **Maximum Gas Cost**: Default $25 USD
- **Confidence Threshold**: Default 60%

### API Endpoints

#### Get Opportunities
```bash
GET /api/arbitrage/opportunities?limit=10&minSpread=0.5&minProfit=20
```

#### Get User Statistics
```bash
GET /api/user
```

### Real-time Updates

The system provides real-time updates via:
- **WebSocket connections** to Binance for CEX data
- **RPC polling** for Base network DEX data
- **Event-driven architecture** for opportunity detection

## 🚨 Production Checklist

### Security
- [ ] Private keys are secure and not in code
- [ ] Environment variables are properly set
- [ ] Smart contracts are verified on Basescan
- [ ] Rate limiting is configured for API endpoints

### Performance
- [ ] Price feeds are updating properly (check console logs)
- [ ] Opportunities are being detected (see dashboard)
- [ ] Gas estimation is accurate
- [ ] Slippage calculations are reasonable

### Monitoring
- [ ] Error logging is configured
- [ ] Performance metrics are tracked
- [ ] Alerts are set up for system failures
- [ ] Backup RPC endpoints are configured

## 🎯 Live Trading (Advanced)

To enable automated trading:

1. **Set the environment flag:**
   ```bash
   NEXT_PUBLIC_ENABLE_AUTO_EXECUTION=true
   ```

2. **Fund your contracts with initial capital**

3. **Configure risk parameters:**
   - Maximum trade size per opportunity
   - Stop-loss thresholds
   - Daily loss limits

⚠️ **Warning**: Live trading involves significant financial risk. Start with small amounts and thoroughly test the system.

## 📈 Performance Optimization

### High-Frequency Monitoring
- Reduce price polling interval to 1-2 seconds
- Use WebSocket connections where possible
- Implement connection pooling for RPC calls

### Gas Optimization
- Use flashloans to reduce capital requirements
- Implement MEV protection strategies
- Monitor and adjust gas price dynamically

### Scalability
- Add support for more token pairs
- Integrate additional DEXs and CEXs
- Implement distributed monitoring across multiple servers

## 🛠 Troubleshooting

### Common Issues

1. **No opportunities detected:**
   - Check price feed connections
   - Verify API keys are valid
   - Reduce minimum profit thresholds

2. **High gas costs:**
   - Increase max gas price limit
   - Monitor Base network congestion
   - Consider alternative execution strategies

3. **Connection errors:**
   - Check RPC endpoint status
   - Verify network configuration
   - Implement retry logic with exponential backoff

### Debug Commands

```bash
# Check price feeds
curl http://localhost:3000/api/arbitrage/opportunities

# Monitor system logs
tail -f logs/production.log

# Test contract deployment
npx hardhat verify --network base CONTRACT_ADDRESS
```

## 📞 Support

For additional support or issues:
- Check the GitHub issues
- Review the smart contract code
- Monitor the console logs for error messages

---

**🎉 Congratulations!** Your ArbiTips system is now running in production mode with live data feeds and real arbitrage opportunities.

Remember to start small, monitor closely, and gradually increase your trading parameters as you gain confidence in the system.