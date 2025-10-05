export interface ArbitrageOpportunity {
  id: string
  tokenPair: {
    tokenA: Token
    tokenB: Token
  }
  exchanges: {
    buyExchange: Exchange
    sellExchange: Exchange
  }
  prices: {
    buyPrice: string
    sellPrice: string
  }
  spread: {
    percentage: number
    absolute: string
  }
  estimatedProfit: {
    gross: string
    net: string
    gasEstimate: string
  }
  aiConfidence: {
    score: number
    factors: ConfidenceFactor[]
  }
  liquidity: {
    buyLiquidity: string
    sellLiquidity: string
    minTradeSize: string
    maxTradeSize: string
  }
  timeToExpiry: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  timestamp: number
}

export interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  priceUSD?: string
}

export interface Exchange {
  id: string
  name: string
  displayName: string
  router: string
  factory: string
  fee: number
  logoURI: string
  color: string
}

export interface PriceData {
  exchange: Exchange
  token0: Token
  token1: Token
  price: string
  liquidity: string
  volume24h: string
  timestamp: number
  blockNumber: number
}

export interface ConfidenceFactor {
  type: 'LIQUIDITY' | 'VOLUME' | 'VOLATILITY' | 'GAS_PRICE' | 'MARKET_CONDITIONS'
  weight: number
  score: number
  description: string
}

export interface UserStats {
  fid?: number
  address?: string
  totalTrades: number
  successfulTrades: number
  winRate: number
  totalProfit: string
  avgProfit: string
  totalGasSpent: string
  rank: number
  achievements: Achievement[]
  tradingHistory: TradeRecord[]
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: number
}

export interface TradeRecord {
  id: string
  timestamp: number
  opportunity: ArbitrageOpportunity
  executedAmount: string
  actualProfit: string
  gasUsed: string
  transactionHash: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  errorMessage?: string
}

export interface ScannerConfig {
  enabled: boolean
  interval: number
  minSpread: number
  minProfit: string
  maxGasPrice: string
  blacklistedTokens: string[]
  preferredExchanges: string[]
}

export interface AIAnalysisResult {
  opportunities: ArbitrageOpportunity[]
  marketConditions: MarketConditions
  recommendations: string[]
  confidence: number
  processingTime: number
}

export interface MarketConditions {
  volatility: 'LOW' | 'MEDIUM' | 'HIGH'
  gasPrice: string
  networkCongestion: 'LOW' | 'MEDIUM' | 'HIGH'
  overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  recommendedAction: 'TRADE' | 'WAIT' | 'AVOID'
}

export interface WalletState {
  address?: string
  chainId?: number
  isConnected: boolean
  balance?: string
  ensName?: string
  avatar?: string
}

export interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  avatar: string
  bio: string
  followerCount: number
  followingCount: number
  verifications: string[]
  isConnected: boolean
}

export interface NotificationSettings {
  opportunities: boolean
  trades: boolean
  achievements: boolean
  marketUpdates: boolean
  priceAlerts: boolean
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface OpportunitiesResponse extends ApiResponse<ArbitrageOpportunity[]> {
  total: number
  page: number
  limit: number
}

export interface ExecuteTradeRequest {
  opportunityId: string
  amount: string
  slippage: number
  gasLimit?: string
}

export interface ExecuteTradeResponse extends ApiResponse<TradeRecord> {}

// Smart Contract Types
export interface ArbitrageParams {
  tokenA: string
  tokenB: string
  amountIn: string
  exchangeA: string
  exchangeB: string
  pathA: string[]
  pathB: string[]
  minProfit: string
  deadline: number
}

export interface ContractAddresses {
  arbitrageExecutor: string
  multiDEXRouter: string
  priceOracle: string
}

// Constants
export const SUPPORTED_EXCHANGES: Exchange[] = [
  {
    id: 'uniswap-v3',
    name: 'Uniswap V3',
    displayName: 'Uniswap',
    router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    fee: 0.3,
    logoURI: 'https://app.uniswap.org/favicon.ico',
    color: '#FF007A'
  },
  {
    id: 'sushiswap',
    name: 'SushiSwap',
    displayName: 'SushiSwap',
    router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
    fee: 0.3,
    logoURI: 'https://app.sushi.com/favicon.ico',
    color: '#0E111A'
  },
  {
    id: 'aerodrome',
    name: 'Aerodrome',
    displayName: 'Aerodrome',
    router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
    factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
    fee: 0.2,
    logoURI: 'https://aerodrome.finance/favicon.ico',
    color: '#3B82F6'
  }
]

export const BASE_CHAIN_ID = 8453
export const BASE_GOERLI_CHAIN_ID = 84531

export const COMMON_TOKENS: Token[] = [
  {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: 'https://ethereum-optimism.github.io/data/WETH/logo.png'
  },
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://ethereum-optimism.github.io/data/USDC/logo.png'
  },
  {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI: 'https://ethereum-optimism.github.io/data/DAI/logo.png'
  }
]