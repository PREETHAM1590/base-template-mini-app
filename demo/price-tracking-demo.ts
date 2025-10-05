/**
 * ArbiTips Price Tracking Demo
 * 
 * This script demonstrates exactly how we track coin prices from multiple sources
 * for arbitrage opportunities.
 */

import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'

// 🎯 **HOW WE TRACK COIN PRICES** 🎯

console.log('🚀 ArbiTips Price Tracking Demo')
console.log('=====================================')

// Method 1: DEX PRICES - Direct Blockchain Calls
// =============================================

const BASE_RPC = 'https://mainnet.base.org'
const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC)
})

// Real Uniswap V3 pool addresses on Base
const UNISWAP_V3_POOLS = {
  'WETH-USDC-500': '0x4C36388bE6F416A29C8d8Eee81C771cE6bE14B18',   // 0.05% fee
  'WETH-USDC-3000': '0xd0b53D9277642d899DF5C87A3966A349A798F224', // 0.30% fee
}

// ABI for reading Uniswap V3 pool data
const POOL_ABI = parseAbi([
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() view returns (uint128)',
  'function token0() view returns (address)',
  'function token1() view returns (address)'
])

async function getUniswapV3Price(poolAddress: string): Promise<number> {
  try {
    console.log(`\n📊 Fetching Uniswap V3 price from pool: ${poolAddress}`)
    
    // Read the current price data from the pool
    const slot0Data = await publicClient.readContract({
      address: poolAddress as `0x${string}`,
      abi: POOL_ABI,
      functionName: 'slot0'
    })
    
    const sqrtPriceX96 = slot0Data[0] as bigint
    console.log(`   Raw sqrtPriceX96: ${sqrtPriceX96.toString()}`)
    
    // Convert to readable price
    const Q96 = BigInt(2) ** BigInt(96)
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96)
    const price = sqrtPrice * sqrtPrice
    
    // Adjust for token decimals (USDC=6, WETH=18)
    const ethPrice = (1 / price) * (10 ** 12)
    
    console.log(`   ✅ Calculated ETH Price: $${ethPrice.toFixed(2)}`)
    return ethPrice
    
  } catch (error) {
    console.error(`   ❌ Error fetching price:`, error)
    return 0
  }
}

// Method 2: CEX PRICES - WebSocket Real-time Data
// ==============================================

import WebSocket from 'ws'

function connectToBinanceWebSocket() {
  console.log(`\n💹 Connecting to Binance WebSocket...`)
  
  const ws = new WebSocket('wss://stream.binance.com:9443/ws/ethusdc@depth')
  
  ws.on('open', () => {
    console.log('   🔗 Connected to Binance order book stream')
  })
  
  ws.on('message', (data) => {
    try {
      const orderBook = JSON.parse(data.toString())
      
      if (orderBook.b && orderBook.a) {
        const bestBid = parseFloat(orderBook.b[0][0])  // Highest buy price
        const bestAsk = parseFloat(orderBook.a[0][0])  // Lowest sell price
        const bidQty = parseFloat(orderBook.b[0][1])   // Buy quantity
        const askQty = parseFloat(orderBook.a[0][1])   // Sell quantity
        
        console.log(`   📈 Binance ETH/USDC:`)
        console.log(`      Best Bid: $${bestBid.toFixed(2)} (${bidQty.toFixed(3)} ETH)`)
        console.log(`      Best Ask: $${bestAsk.toFixed(2)} (${askQty.toFixed(3)} ETH)`)
        console.log(`      Spread: $${(bestAsk - bestBid).toFixed(2)} (${(((bestAsk - bestBid) / bestBid) * 100).toFixed(3)}%)`)
      }
    } catch (error) {
      console.error('   ❌ Error parsing Binance data:', error)
    }
  })
  
  ws.on('error', (error) => {
    console.error('   ❌ Binance WebSocket error:', error)
  })
  
  return ws
}

// Method 3: PRICE COMPARISON & ARBITRAGE DETECTION
// ==============================================

interface PriceData {
  venue: string
  price: number
  liquidity: number
  timestamp: number
}

class ArbitragePriceTracker {
  private dexPrices: Map<string, PriceData> = new Map()
  private cexPrices: Map<string, PriceData> = new Map()
  
  addDEXPrice(venue: string, price: number, liquidity: number) {
    this.dexPrices.set(venue, {
      venue,
      price,
      liquidity,
      timestamp: Date.now()
    })
    
    console.log(`   📊 ${venue}: $${price.toFixed(2)} (Liquidity: $${liquidity.toLocaleString()})`)
    this.checkArbitrageOpportunities()
  }
  
  addCEXPrice(venue: string, price: number, liquidity: number) {
    this.cexPrices.set(venue, {
      venue,
      price,
      liquidity,
      timestamp: Date.now()
    })
    
    console.log(`   💹 ${venue}: $${price.toFixed(2)} (Liquidity: $${liquidity.toLocaleString()})`)
    this.checkArbitrageOpportunities()
  }
  
  checkArbitrageOpportunities() {
    console.log(`\n🎯 CHECKING FOR ARBITRAGE OPPORTUNITIES`)
    console.log('=====================================')
    
    // Find best prices
    let bestDEXPrice = 0
    let bestDEXVenue = ''
    let bestCEXPrice = 0
    let bestCEXVenue = ''
    
    // Find cheapest DEX price (where to buy)
    for (const [venue, data] of this.dexPrices) {
      if (data.price > 0 && (bestDEXPrice === 0 || data.price < bestDEXPrice)) {
        bestDEXPrice = data.price
        bestDEXVenue = venue
      }
    }
    
    // Find highest CEX price (where to sell)
    for (const [venue, data] of this.cexPrices) {
      if (data.price > bestCEXPrice) {
        bestCEXPrice = data.price
        bestCEXVenue = venue
      }
    }
    
    if (bestDEXPrice > 0 && bestCEXPrice > 0) {
      const spread = bestCEXPrice - bestDEXPrice
      const spreadPercent = (spread / bestDEXPrice) * 100
      
      console.log(`   Buy on ${bestDEXVenue}: $${bestDEXPrice.toFixed(2)}`)
      console.log(`   Sell on ${bestCEXVenue}: $${bestCEXPrice.toFixed(2)}`)
      console.log(`   Spread: $${spread.toFixed(2)} (${spreadPercent.toFixed(3)}%)`)
      
      if (spreadPercent > 0.1) {
        const tradeSize = 1000 // $1000 trade
        const estimatedProfit = (tradeSize * spreadPercent / 100) - 20 // Minus fees
        
        console.log(`   🚀 ARBITRAGE OPPORTUNITY FOUND!`)
        console.log(`   💰 Estimated Profit: $${estimatedProfit.toFixed(2)} on $${tradeSize} trade`)
        
        if (estimatedProfit > 50) {
          console.log(`   ✅ PROFITABLE! (>$50 minimum)`)
        } else {
          console.log(`   ⚠️  Below minimum profit threshold`)
        }
      } else {
        console.log(`   ℹ️  Spread too small for profitable arbitrage`)
      }
    }
  }
  
  getAllPrices() {
    return {
      dex: Array.from(this.dexPrices.values()),
      cex: Array.from(this.cexPrices.values())
    }
  }
}

// Method 4: COMPLETE PRICE TRACKING SYSTEM
// =======================================

async function demonstratePriceTracking() {
  console.log(`\n🔥 COMPLETE PRICE TRACKING DEMONSTRATION`)
  console.log('==========================================')
  
  const tracker = new ArbitragePriceTracker()
  
  // 1. Fetch real DEX prices from Base network
  console.log(`\n1️⃣ FETCHING DEX PRICES FROM BASE NETWORK`)
  console.log('------------------------------------------')
  
  try {
    const uniV3Price500 = await getUniswapV3Price(UNISWAP_V3_POOLS['WETH-USDC-500'])
    const uniV3Price3000 = await getUniswapV3Price(UNISWAP_V3_POOLS['WETH-USDC-3000'])
    
    if (uniV3Price500 > 0) {
      tracker.addDEXPrice('Uniswap V3 (0.05%)', uniV3Price500, 50000)
    }
    if (uniV3Price3000 > 0) {
      tracker.addDEXPrice('Uniswap V3 (0.30%)', uniV3Price3000, 25000)
    }
    
    // Add some mock DEX prices for demo
    tracker.addDEXPrice('Aerodrome', uniV3Price500 * 0.998, 15000)
    tracker.addDEXPrice('SushiSwap', uniV3Price500 * 1.001, 20000)
    
  } catch (error) {
    console.log('   ⚠️  Using mock prices (RPC connection failed)')
    tracker.addDEXPrice('Uniswap V3 (0.05%)', 2500.50, 50000)
    tracker.addDEXPrice('Uniswap V3 (0.30%)', 2501.20, 25000)
    tracker.addDEXPrice('Aerodrome', 2499.75, 15000)
    tracker.addDEXPrice('SushiSwap', 2502.10, 20000)
  }
  
  // 2. Add simulated CEX prices
  console.log(`\n2️⃣ SIMULATING CEX PRICES`)
  console.log('------------------------')
  
  tracker.addCEXPrice('Binance', 2503.25, 100000)
  tracker.addCEXPrice('Backpack', 2502.80, 50000)
  
  // 3. Show real-time price updates
  console.log(`\n3️⃣ SIMULATING REAL-TIME PRICE UPDATES`)
  console.log('-------------------------------------')
  
  let updateCount = 0
  const priceUpdater = setInterval(() => {
    updateCount++
    
    // Simulate price movements
    const basePrice = 2500
    const variation = (Math.random() - 0.5) * 20 // ±$10 variation
    
    tracker.addDEXPrice('Uniswap V3 (0.05%)', basePrice + variation, 50000)
    tracker.addCEXPrice('Binance', basePrice + variation + 2, 100000) // CEX slightly higher
    
    if (updateCount >= 3) {
      clearInterval(priceUpdater)
      console.log(`\n✅ Price tracking demonstration complete!`)
      
      // Show final summary
      const allPrices = tracker.getAllPrices()
      console.log(`\n📊 FINAL PRICE SUMMARY`)
      console.log('======================')
      console.log('DEX Prices:', allPrices.dex.map(p => `${p.venue}: $${p.price.toFixed(2)}`).join(', '))
      console.log('CEX Prices:', allPrices.cex.map(p => `${p.venue}: $${p.price.toFixed(2)}`).join(', '))
    }
  }, 2000)
}

// Method 5: REAL-TIME BINANCE WEBSOCKET (Optional)
// ==============================================

function enableRealTimeBinancePrices() {
  console.log(`\n4️⃣ CONNECTING TO REAL-TIME BINANCE FEED (Optional)`)
  console.log('--------------------------------------------------')
  
  const binanceWS = connectToBinanceWebSocket()
  
  // Close after 10 seconds to prevent spam
  setTimeout(() => {
    console.log(`\n   🔒 Closing Binance connection...`)
    binanceWS.close()
  }, 10000)
}

// RUN THE DEMONSTRATION
// ====================

async function main() {
  try {
    await demonstratePriceTracking()
    
    // Uncomment to see real Binance WebSocket data
    // enableRealTimeBinancePrices()
    
  } catch (error) {
    console.error('Demo error:', error)
  }
}

// Export for use in other files
export {
  getUniswapV3Price,
  connectToBinanceWebSocket,
  ArbitragePriceTracker
}

// Run if this file is executed directly
if (require.main === module) {
  main()
}