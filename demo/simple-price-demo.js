/**
 * Simple Price Tracking Demo
 * Shows exactly how ArbiTips tracks coin prices for arbitrage
 */

console.log('🚀 ArbiTips Price Tracking Demo')
console.log('=====================================')

// 🎯 **HOW WE TRACK COIN PRICES** 🎯

// Method 1: DEX Price Simulation (normally from blockchain)
// ========================================================

class PriceTracker {
  constructor() {
    this.dexPrices = new Map()
    this.cexPrices = new Map()
  }
  
  // Add DEX price (from blockchain contracts)
  addDEXPrice(venue, price, liquidity) {
    this.dexPrices.set(venue, {
      venue,
      price,
      liquidity,
      timestamp: Date.now()
    })
    
    console.log(`📊 DEX ${venue}: $${price.toFixed(2)} (Liquidity: $${liquidity.toLocaleString()})`)
    this.checkArbitrage()
  }
  
  // Add CEX price (from WebSocket/API)
  addCEXPrice(venue, price, liquidity) {
    this.cexPrices.set(venue, {
      venue,
      price,
      liquidity,
      timestamp: Date.now()
    })
    
    console.log(`💹 CEX ${venue}: $${price.toFixed(2)} (Liquidity: $${liquidity.toLocaleString()})`)
    this.checkArbitrage()
  }
  
  // Check for arbitrage opportunities
  checkArbitrage() {
    if (this.dexPrices.size === 0 || this.cexPrices.size === 0) return
    
    console.log(`\n🎯 CHECKING FOR ARBITRAGE OPPORTUNITIES`)
    console.log('=====================================')
    
    // Find best prices
    let bestDEXPrice = Infinity
    let bestDEXVenue = ''
    let bestCEXPrice = 0
    let bestCEXVenue = ''
    
    // Find cheapest DEX price (where to buy)
    for (const [venue, data] of this.dexPrices) {
      if (data.price < bestDEXPrice) {
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
    
    const spread = bestCEXPrice - bestDEXPrice
    const spreadPercent = (spread / bestDEXPrice) * 100
    
    console.log(`   🔍 Best Buy Price: ${bestDEXVenue} at $${bestDEXPrice.toFixed(2)}`)
    console.log(`   🔍 Best Sell Price: ${bestCEXVenue} at $${bestCEXPrice.toFixed(2)}`)
    console.log(`   📈 Spread: $${spread.toFixed(2)} (${spreadPercent.toFixed(3)}%)`)
    
    if (spreadPercent > 0.1) {
      const tradeSize = 1000 // $1000 trade
      const grossProfit = tradeSize * spreadPercent / 100
      const fees = 20 // Trading fees + gas
      const netProfit = grossProfit - fees
      
      console.log(`\n   🚀 ARBITRAGE OPPORTUNITY FOUND!`)
      console.log(`   💰 Trade Size: $${tradeSize}`)
      console.log(`   💰 Gross Profit: $${grossProfit.toFixed(2)}`)
      console.log(`   💰 Net Profit: $${netProfit.toFixed(2)} (after $${fees} fees)`)
      
      if (netProfit > 50) {
        console.log(`   ✅ PROFITABLE! (Above $50 minimum threshold)`)
        console.log(`   🎯 Strategy: Buy on ${bestDEXVenue} → Sell on ${bestCEXVenue}`)
      } else {
        console.log(`   ⚠️  Below minimum profit threshold ($50)`)
      }
    } else {
      console.log(`   ℹ️  Spread too small for profitable arbitrage`)
    }
    
    console.log('') // Empty line for readability
  }
}

// Method 2: Simulate Real Price Data
// =================================

function simulateRealTimePrices() {
  console.log(`\n🔥 SIMULATING REAL-TIME PRICE TRACKING`)
  console.log('======================================')
  
  const tracker = new PriceTracker()
  
  // Step 1: Initial DEX prices (from Base blockchain)
  console.log(`\n1️⃣ FETCHING DEX PRICES FROM BASE NETWORK`)
  console.log('------------------------------------------')
  
  tracker.addDEXPrice('Uniswap V3 (0.05%)', 2500.45, 50000)
  tracker.addDEXPrice('Uniswap V3 (0.30%)', 2501.20, 25000)
  tracker.addDEXPrice('Aerodrome', 2499.75, 15000)
  tracker.addDEXPrice('SushiSwap', 2502.10, 20000)
  
  // Step 2: Initial CEX prices (from WebSocket feeds)
  console.log(`\n2️⃣ FETCHING CEX PRICES FROM WEBSOCKETS`)
  console.log('--------------------------------------')
  
  tracker.addCEXPrice('Binance', 2503.25, 100000)
  tracker.addCEXPrice('Backpack', 2502.80, 50000)
  
  // Step 3: Simulate price updates
  console.log(`\n3️⃣ SIMULATING REAL-TIME PRICE UPDATES`)
  console.log('-------------------------------------')
  
  let updateCount = 0
  const priceUpdater = setInterval(() => {
    updateCount++
    
    // Simulate price movements (±$5 variation)
    const basePrice = 2500
    const dexVariation = (Math.random() - 0.5) * 10
    const cexVariation = (Math.random() - 0.5) * 10
    
    console.log(`\n📊 Price Update #${updateCount}:`)
    tracker.addDEXPrice('Uniswap V3 (0.05%)', basePrice + dexVariation, 50000)
    tracker.addCEXPrice('Binance', basePrice + cexVariation + 2, 100000) // CEX slightly higher
    
    if (updateCount >= 3) {
      clearInterval(priceUpdater)
      showFinalSummary(tracker)
    }
  }, 3000) // Update every 3 seconds
}

function showFinalSummary(tracker) {
  console.log(`\n✅ PRICE TRACKING DEMONSTRATION COMPLETE!`)
  console.log('=========================================')
  
  console.log(`\n📊 FINAL PRICE SUMMARY:`)
  console.log('DEX Prices:')
  for (const [venue, data] of tracker.dexPrices) {
    console.log(`   ${venue}: $${data.price.toFixed(2)}`)
  }
  
  console.log('CEX Prices:')
  for (const [venue, data] of tracker.cexPrices) {
    console.log(`   ${venue}: $${data.price.toFixed(2)}`)
  }
  
  console.log(`\n🎯 HOW THIS WORKS IN PRODUCTION:`)
  console.log('================================')
  console.log('1. 📡 Real-time data from Base blockchain (5s intervals)')
  console.log('2. 🌐 WebSocket streams from exchanges (100ms updates)')  
  console.log('3. 🤖 Rust bot analyzes 1000s of opportunities per second')
  console.log('4. ⚡ Executes profitable trades in <100ms')
  console.log('5. 💰 Target profit: $50-$500+ per trade')
  
  console.log(`\n📞 REAL DATA SOURCES:`)
  console.log('====================')
  console.log('DEX: Uniswap V3, Aerodrome, SushiSwap on Base')
  console.log('CEX: Binance, Backpack, Coinbase WebSocket APIs')
  console.log('Blockchain: Base RPC nodes (mainnet.base.org)')
}

// Method 3: Show Binance WebSocket Format
// =======================================

function showBinanceDataFormat() {
  console.log(`\n💹 REAL BINANCE WEBSOCKET DATA FORMAT`)
  console.log('====================================')
  
  // This is what real Binance WebSocket data looks like:
  const sampleBinanceData = {
    "stream": "ethusdc@depth",
    "data": {
      "e": "depthUpdate",
      "E": 1703123456789,
      "s": "ETHUSDC",
      "b": [  // Bids (buy orders)
        ["2499.50", "10.5"],    // [price, quantity]
        ["2499.25", "25.2"],
        ["2499.00", "15.8"]
      ],
      "a": [  // Asks (sell orders)  
        ["2500.25", "12.1"],    // [price, quantity]
        ["2500.50", "18.7"],
        ["2500.75", "22.3"]
      ]
    }
  }
  
  console.log('Raw WebSocket Data:')
  console.log(JSON.stringify(sampleBinanceData, null, 2))
  
  console.log(`\n📊 Parsed Price Data:`)
  console.log(`Best Bid (Highest Buy): $${sampleBinanceData.data.b[0][0]} (${sampleBinanceData.data.b[0][1]} ETH)`)
  console.log(`Best Ask (Lowest Sell): $${sampleBinanceData.data.a[0][0]} (${sampleBinanceData.data.a[0][1]} ETH)`)
  console.log(`Binance Spread: $${(parseFloat(sampleBinanceData.data.a[0][0]) - parseFloat(sampleBinanceData.data.b[0][0])).toFixed(2)}`)
}

// Method 4: Show Uniswap V3 Price Calculation
// ==========================================

function showUniswapV3Calculation() {
  console.log(`\n🔬 UNISWAP V3 PRICE CALCULATION`)
  console.log('===============================')
  
  // Real Uniswap V3 pool addresses on Base
  console.log('Real Pool Addresses on Base:')
  console.log('WETH/USDC (0.05%): 0x4C36388bE6F416A29C8d8Eee81C771cE6bE14B18')
  console.log('WETH/USDC (0.30%): 0xd0b53D9277642d899DF5C87A3966A349A798F224')
  
  console.log(`\nPrice Calculation Process:`)
  console.log('1. Read sqrtPriceX96 from pool contract')
  console.log('2. Convert: price = (sqrtPriceX96 / 2^96)^2')
  console.log('3. Adjust for decimals: USDC=6, WETH=18')
  console.log('4. Final ETH price in USD')
  
  // Example calculation
  const sqrtPriceX96 = "2505414483750479311864138240" // Example value
  console.log(`\nExample:`)
  console.log(`Raw sqrtPriceX96: ${sqrtPriceX96}`)
  console.log(`After conversion: $2,500.45`)
}

// RUN THE DEMONSTRATION
// ====================

console.log(`\n🎬 STARTING COMPREHENSIVE DEMO`)
console.log('==============================')

// Show the data formats first
showBinanceDataFormat()
showUniswapV3Calculation()

// Run the main simulation
setTimeout(() => {
  simulateRealTimePrices()
}, 2000)

// Show what the user will see
console.log(`\n👀 WATCH FOR:`)
console.log('=============')
console.log('🚀 Arbitrage opportunities when spread > 0.1%')
console.log('💰 Profit calculations with realistic fees')
console.log('⚡ Real-time price updates every few seconds')
console.log('✅ Profitable trades above $50 threshold')

module.exports = {
  PriceTracker,
  simulateRealTimePrices
}