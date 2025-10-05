# ArbiTips 🚀

**AI-powered arbitrage opportunities scanner for Base network**

ArbiTips is a Base miniapp that uses artificial intelligence to find and execute profitable arbitrage opportunities across multiple DEXs on Base network. Built with Next.js 14, TypeScript, Tailwind CSS, and smart contracts.

![ArbiTips Banner](https://arbitips.app/banner.png)

## 🌟 Features

- **AI-Powered Analysis**: GPT-4 analyzes market conditions and confidence scores
- **Multi-DEX Support**: Scans Uniswap V3, SushiSwap, PancakeSwap, and Aerodrome
- **Real-time Monitoring**: Auto-scan mode with 30-second intervals
- **Smart Contract Execution**: Automated arbitrage execution with safety checks
- **Social Integration**: Farcaster auth and profit sharing
- **Mobile-First Design**: Optimized for Base Beta mobile experience
- **Risk Management**: AI confidence scoring and slippage protection

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ArbiTips Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Next.js 14)          Backend APIs               │
│  ┌─────────────────┐            ┌─────────────────┐         │
│  │ Dashboard       │            │ /api/arbitrage  │         │
│  │ OpportunityCard │     ───────│ /api/user       │         │
│  │ Scanner         │            │ /api/auth       │         │
│  │ UserStats       │            └─────────────────┘         │
│  └─────────────────┘                     │                 │
│           │                              │                 │
│           │              ┌─────────────────────────────────┐ │
│           │              │     ArbitrageScanner           │ │
│           │              │     ┌─────────────────┐       │ │
│           │              │     │ Price Fetching  │       │ │
│           │              │     │ AI Analysis     │       │ │
│           │              │     │ Profit Calc     │       │ │
│           │              │     └─────────────────┘       │ │
│           │              └─────────────────────────────────┘ │
│           │                              │                 │
│  ┌─────────────────┐            ┌─────────────────┐         │
│  │ Wallet Connect  │            │ Smart Contracts │         │
│  │ Farcaster Auth  │     ───────│ ArbitrageExecutor│        │
│  │ wagmi/viem      │            │ Safety Checks    │        │
│  └─────────────────┘            └─────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Base network RPC access
- OpenAI API key (optional, for AI features)

### 1. Clone and Install

```bash
git clone https://github.com/your-username/ArbiTips.git
cd ArbiTips
npm install
```

### 2. Environment Setup

Copy the environment template:

```bash
cp .env.example .env.local
```

Add your configuration:

```env
# Required
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id

# Optional (for AI features)
OPENAI_API_KEY=your_openai_api_key

# For smart contract deployment
PRIVATE_KEY=your_deployer_private_key
BASESCAN_API_KEY=your_basescan_api_key
```

### 3. Development

```bash
# Start the development server
npm run dev

# Open http://localhost:3000
```

### 4. Smart Contract Deployment

```bash
# Compile contracts
npm run compile:contracts

# Deploy to Base testnet
cd contracts && npx hardhat run scripts/deploy.js --network base-goerli

# Deploy to Base mainnet
cd contracts && npx hardhat run scripts/deploy.js --network base
```

### 5. Production Build

```bash
npm run build
npm start
```

## 📱 Base Miniapp Compliance

ArbiTips is fully compliant with Base Miniapp Builders guidelines:

- ✅ **Finance Category**: Listed under "Finance" for top-15 visibility
- ✅ **Mobile-First**: Responsive design for 450px width requirement
- ✅ **Short Onboarding**: One-click wallet/Farcaster connection
- ✅ **Minimal Data Collection**: Only trading data for analytics
- ✅ **Cross-Platform**: iOS and Android compatible
- ✅ **No Copyrighted Assets**: All original icons and branding
- ✅ **Social Features**: Farcaster integration for sharing

## 🔧 Configuration

### Scanner Settings

```typescript
// Default configuration
const scannerConfig = {
  minSpread: 0.3,           // Minimum 0.3% spread
  maxOpportunities: 10,     // Top 10 results
  scanInterval: 30000,      // 30-second auto-scan
  aiConfidence: 0.6,        // 60% minimum AI confidence
}
```

### Smart Contract Parameters

```solidity
uint256 public minProfitThreshold = 1e15;     // 0.001 ETH minimum
uint256 public maxSlippageBasisPoints = 500;  // 5% max slippage
uint256 public treasuryFee = 100;             // 1% treasury fee
```

## 🤖 AI Implementation

ArbiTips uses OpenAI GPT-4 for:

1. **Market Analysis**: Real-time volatility and sentiment analysis
2. **Confidence Scoring**: Multi-factor risk assessment
3. **Profit Prediction**: ML-enhanced profit probability
4. **Gas Optimization**: Dynamic gas limit recommendations

### AI Confidence Factors

- **Liquidity Depth**: 30% weight
- **Market Volatility**: 20% weight  
- **Gas Price Conditions**: 20% weight
- **Overall Market Sentiment**: 30% weight

## 🔐 Security Features

- **Smart Contract Audits**: OpenZeppelin contracts
- **Slippage Protection**: Maximum 5% slippage limits
- **Reentrancy Guards**: Protection against attacks
- **Auth Verification**: Wallet signature + Farcaster validation
- **Rate Limiting**: API request throttling
- **Emergency Pause**: Owner-controlled circuit breaker

## 🏆 Competition Strategy

### Base Beta Top-15 Plan

1. **Launch Week**: Focus on user acquisition via Farcaster
2. **Feature Rollout**: AI improvements and new DEX integrations  
3. **Community Building**: Trading competitions and leaderboards
4. **Partnership**: Integration with Base ecosystem protocols
5. **Scaling**: Advanced features like flash loans and MEV protection

### User Retention

- **Achievement System**: Trading milestones and badges
- **Social Sharing**: Profit bragging rights on Farcaster
- **Referral Program**: Invite friends for fee discounts
- **Educational Content**: DeFi arbitrage tutorials

## 📊 Performance Metrics

### Target KPIs

- **Daily Active Users**: 1,000+ by month 2
- **Successful Trades**: 85%+ win rate
- **Average Profit**: 0.5%+ per trade
- **User Retention**: 60%+ weekly retention

## 🛠️ Development

### Project Structure

```
ArbiTips/
├── src/
│   ├── app/                 # Next.js 14 app directory
│   │   ├── api/            # API routes
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Dashboard
│   ├── components/         # React components
│   ├── lib/               # Utilities and services
│   └── types/             # TypeScript definitions
├── contracts/             # Smart contracts
├── public/               # Static assets
└── docs/                # Documentation
```

### Key Dependencies

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Web3**: wagmi, viem, ConnectKit, @farcaster/auth-kit
- **Backend**: OpenAI API, Neynar SDK
- **Smart Contracts**: Hardhat, OpenZeppelin, Solidity 0.8.19

### Testing

```bash
# Run frontend tests
npm test

# Run contract tests
cd contracts && npx hardhat test

# Coverage report
npm run test:coverage
```

## 🚢 Deployment

### Vercel (Recommended)

1. **Fork Repository**: Fork to your GitHub account
2. **Connect Vercel**: Import project in Vercel dashboard
3. **Environment Variables**: Add all required env vars
4. **Deploy**: Automatic deployment on push to main
5. **Custom Domain**: Optional custom domain setup

### Manual Deployment

```bash
# Build for production
npm run build

# Deploy contracts
npm run deploy:contracts

# Start production server
npm start
```

## 📜 Smart Contract Addresses

### Base Mainnet
- **ArbitrageExecutor**: `0x...` (deploy to get address)
- **Treasury**: `0x...` (your treasury address)

### Base Goerli Testnet  
- **ArbitrageExecutor**: `0x...` (deploy to get address)
- **Treasury**: `0x...` (your treasury address)

## 📈 Roadmap

### Phase 1: MVP (Month 1)
- [x] Basic arbitrage scanner
- [x] Wallet and Farcaster auth  
- [x] Smart contract execution
- [x] Base Beta integration

### Phase 2: Enhancement (Month 2)
- [ ] Flash loan integration
- [ ] Advanced AI models
- [ ] More DEX support
- [ ] Mobile app (React Native)

### Phase 3: Scale (Month 3+)
- [ ] MEV protection
- [ ] Cross-chain arbitrage
- [ ] Institutional features
- [ ] DAO governance token

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.arbitips.app](https://docs.arbitips.app)
- **Discord**: [discord.gg/arbitips](https://discord.gg/arbitips)
- **Twitter**: [@ArbiTips](https://twitter.com/arbitips)
- **Email**: support@arbitips.app

## ⚠️ Disclaimer

ArbiTips is experimental software. Use at your own risk. Always DYOR before executing trades. Past performance does not guarantee future results.

---

**Built with ❤️ for the Base ecosystem**

*Connecting DeFi opportunities with AI-powered precision*