import WebSocket from 'ws'
import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'

// Types
export interface PoolReserves {
  token0: string
  token1: string
  reserve0: bigint
  reserve1: bigint
  fee: number
  sqrtPriceX96?: bigint // For Uniswap V3
}

export interface CEXOrderBook {
  exchange: 'binance' | 'backpack'
  symbol: string
  bids: Array<{ price: number; quantity: number }>
  asks: Array<{ price: number; quantity: number }>
  timestamp: number
}

export interface PriceSnapshot {
  dexPrices: Map<string, number> // DEX ID -> price
  cexPrices: Map<string, CEXOrderBook> // Exchange -> order book
  timestamp: number
}

// DEX Configuration
const DEX_CONFIGS = {
  'uniswap-v3': {
    router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
  },
  'sushiswap': {
    router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
  },
  'aerodrome': {
    router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
    factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
  }
}

// WETH/USDC pool addresses on Base
const POOL_ADDRESSES = {
  'uniswap-v3-weth-usdc-500': '0x4C36388bE6F416A29C8d8Eee81C771cE6bE14B18', // 0.05% fee
  'uniswap-v3-weth-usdc-3000': '0xd0b53D9277642d899DF5C87A3966A349A798F224', // 0.3% fee
  'sushiswap-weth-usdc': '0x02a84c0b3d8e17F6D3f62261b8b7d3B6D08e6a6c',
  'aerodrome-weth-usdc': '0x2F14b9F8543F8A0c0FB8b2B3a0B0e8F3aE3de78a'
}

// ABIs
const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)'
])

const UNISWAP_V3_POOL_ABI = parseAbi([
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() view returns (uint128)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)'
])

export class PriceDiscoveryEngine {
  private publicClient
  private priceSnapshots: PriceSnapshot[] = []
  private wsConnections: Map<string, WebSocket> = new Map()
  private latestPrices: PriceSnapshot | null = null
  private callbacks: Array<(snapshot: PriceSnapshot) => void> = []

  constructor() {
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
    })
  }

  // Initialize all price feeds
  async initialize(): Promise<void> {
    console.log('🚀 Initializing price discovery engine...')
    
    // Start DEX monitoring
    await this.startDEXMonitoring()
    
    // Start CEX monitoring
    await this.startCEXMonitoring()
    
    console.log('✅ Price discovery engine initialized')
  }

  // Start monitoring DEX prices via Base RPC
  private async startDEXMonitoring(): Promise<void> {
    // Set up polling for pool reserves (WebSocket subscriptions would be ideal but not all pools support it)
    setInterval(async () => {
      try {
        const dexPrices = await this.fetchAllDEXPrices()
        await this.updatePriceSnapshot({ dexPrices })
      } catch (error) {
        console.error('Error fetching DEX prices:', error)
      }
    }, 5000) // Poll every 5 seconds

    console.log('📊 DEX price monitoring started')
  }

  // Start monitoring CEX order books via WebSocket
  private async startCEXMonitoring(): Promise<void> {
    // Binance WebSocket
    await this.connectBinanceWS()
    
    // Backpack WebSocket (mock for now - would need their actual API)
    await this.connectBackpackWS()
    
    console.log('💹 CEX price monitoring started')
  }

  // Connect to Binance WebSocket
  private async connectBinanceWS(): Promise<void> {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/ethusdc@depth')
    
    ws.on('open', () => {
      console.log('🔗 Connected to Binance WebSocket')
    })

    ws.on('message', (data: any) => {
      try {
        const orderBook = this.parseBinanceOrderBook(data.toString())
        this.updateCEXPrice('binance', orderBook)
      } catch (error) {
        console.error('Error parsing Binance data:', error)
      }
    })

    ws.on('error', (error: any) => {
      console.error('Binance WebSocket error:', error)
      // Implement reconnection logic
      setTimeout(() => this.connectBinanceWS(), 5000)
    })

    this.wsConnections.set('binance', ws)
  }

  // Connect to Backpack WebSocket (mock implementation)
  private async connectBackpackWS(): Promise<void> {
    // Mock implementation - would connect to actual Backpack WebSocket
    console.log('🎒 Backpack WebSocket connection (mock)')
    
    // Simulate Backpack order book updates
    setInterval(() => {
      const mockOrderBook: CEXOrderBook = {
        exchange: 'backpack',
        symbol: 'ETHUSDC',
        bids: [
          { price: 2499.5, quantity: 10.5 },
          { price: 2499.0, quantity: 25.2 }
        ],
        asks: [
          { price: 2500.5, quantity: 12.1 },
          { price: 2501.0, quantity: 18.7 }
        ],
        timestamp: Date.now()
      }
      this.updateCEXPrice('backpack', mockOrderBook)
    }, 3000)
  }

  // Fetch prices from all DEXs
  private async fetchAllDEXPrices(): Promise<Map<string, number>> {
    const prices = new Map<string, number>()

    try {
      // Fetch Uniswap V3 prices (concentrated liquidity)
      const uniV3Price500 = await this.fetchUniswapV3Price(POOL_ADDRESSES['uniswap-v3-weth-usdc-500'])
      const uniV3Price3000 = await this.fetchUniswapV3Price(POOL_ADDRESSES['uniswap-v3-weth-usdc-3000'])
      
      prices.set('uniswap-v3-500', uniV3Price500)
      prices.set('uniswap-v3-3000', uniV3Price3000)

      // Fetch SushiSwap price (would implement similar for other DEXs)
      // const sushiPrice = await this.fetchSushiSwapPrice(POOL_ADDRESSES['sushiswap-weth-usdc'])
      // prices.set('sushiswap', sushiPrice)

      // Mock other DEX prices for now
      prices.set('sushiswap', uniV3Price500 * (0.999 + Math.random() * 0.002)) // ±0.1% variance
      prices.set('aerodrome', uniV3Price500 * (0.9985 + Math.random() * 0.003)) // ±0.15% variance

    } catch (error) {
      console.error('Error fetching DEX prices:', error)
    }

    return prices
  }

  // Fetch Uniswap V3 price using concentrated liquidity formula
  private async fetchUniswapV3Price(poolAddress: string): Promise<number> {
    try {
      const [slot0Result, liquidityResult] = await Promise.all([
        this.publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: UNISWAP_V3_POOL_ABI,
          functionName: 'slot0'
        }),
        this.publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: UNISWAP_V3_POOL_ABI,
          functionName: 'liquidity'
        })
      ])

      const sqrtPriceX96 = slot0Result[0] as bigint
      
      // Convert sqrtPriceX96 to actual price
      // Price = (sqrtPriceX96 / 2^96)^2 * 10^(decimals1 - decimals0)
      const price = this.calculatePriceFromSqrtPriceX96(sqrtPriceX96)
      
      return price

    } catch (error) {
      console.error(`Error fetching Uniswap V3 price for ${poolAddress}:`, error)
      return 0
    }
  }

  // Calculate price from Uniswap V3 sqrtPriceX96
  private calculatePriceFromSqrtPriceX96(sqrtPriceX96: bigint): number {
    const Q96 = BigInt(2) ** BigInt(96)
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96)
    const price = sqrtPrice * sqrtPrice
    
    // Adjust for USDC (6 decimals) vs WETH (18 decimals)
    // Price is in terms of token1/token0, so USDC/WETH
    // We want ETH/USDC, so we take the inverse and adjust decimals
    const ethPrice = (1 / price) * (10 ** 12) // 18 - 6 = 12 decimal difference
    
    return ethPrice
  }

  // Parse Binance order book data
  private parseBinanceOrderBook(data: string): CEXOrderBook {
    const parsed = JSON.parse(data)
    
    return {
      exchange: 'binance',
      symbol: 'ETHUSDC',
      bids: parsed.b?.map((bid: string[]) => ({
        price: parseFloat(bid[0]),
        quantity: parseFloat(bid[1])
      })) || [],
      asks: parsed.a?.map((ask: string[]) => ({
        price: parseFloat(ask[0]),
        quantity: parseFloat(ask[1])
      })) || [],
      timestamp: Date.now()
    }
  }

  // Update CEX price data
  private updateCEXPrice(exchange: string, orderBook: CEXOrderBook): void {
    if (!this.latestPrices) {
      this.latestPrices = {
        dexPrices: new Map(),
        cexPrices: new Map(),
        timestamp: Date.now()
      }
    }

    this.latestPrices.cexPrices.set(exchange, orderBook)
    this.latestPrices.timestamp = Date.now()
    
    // Notify callbacks
    this.callbacks.forEach(callback => callback(this.latestPrices!))
  }

  // Update price snapshot with new data
  private async updatePriceSnapshot(update: Partial<PriceSnapshot>): Promise<void> {
    if (!this.latestPrices) {
      this.latestPrices = {
        dexPrices: new Map(),
        cexPrices: new Map(),
        timestamp: Date.now()
      }
    }

    if (update.dexPrices) {
      this.latestPrices.dexPrices = update.dexPrices
    }
    
    this.latestPrices.timestamp = Date.now()

    // Store snapshot for history
    this.priceSnapshots.push({ ...this.latestPrices })
    
    // Keep only last 1000 snapshots
    if (this.priceSnapshots.length > 1000) {
      this.priceSnapshots = this.priceSnapshots.slice(-1000)
    }

    // Notify callbacks
    this.callbacks.forEach(callback => callback(this.latestPrices!))
  }

  // Subscribe to price updates
  onPriceUpdate(callback: (snapshot: PriceSnapshot) => void): void {
    this.callbacks.push(callback)
  }

  // Get latest prices
  getLatestPrices(): PriceSnapshot | null {
    return this.latestPrices
  }

  // Get best prices for arbitrage calculation
  getBestPrices(): { bestDEXAsk: number; bestCEXBid: number } | null {
    if (!this.latestPrices) return null

    // Find best DEX ask (lowest price to buy)
    let bestDEXAsk = Infinity
    for (const [dex, price] of this.latestPrices.dexPrices.entries()) {
      if (price > 0 && price < bestDEXAsk) {
        bestDEXAsk = price
      }
    }

    // Find best CEX bid (highest price to sell)
    let bestCEXBid = 0
    for (const [exchange, orderBook] of this.latestPrices.cexPrices.entries()) {
      if (orderBook.bids.length > 0) {
        const topBid = orderBook.bids[0].price
        if (topBid > bestCEXBid) {
          bestCEXBid = topBid
        }
      }
    }

    return bestDEXAsk === Infinity ? null : { bestDEXAsk, bestCEXBid }
  }

  // Cleanup connections
  async cleanup(): Promise<void> {
    this.wsConnections.forEach(ws => ws.close())
    this.wsConnections.clear()
    console.log('🛑 Price discovery engine stopped')
  }
}

// Singleton instance
export const priceDiscovery = new PriceDiscoveryEngine()