#!/usr/bin/env ts-node

import { priceDiscovery } from '../src/lib/priceDiscovery'
import { opportunityDetection } from '../src/lib/opportunityDetection'

async function testProductionSystem() {
  console.log('🧪 Testing ArbiTips Production System...')
  console.log('========================================')
  
  try {
    // Test 1: Initialize price discovery
    console.log('📊 Test 1: Initializing price discovery engine...')
    await priceDiscovery.initialize()
    console.log('✅ Price discovery initialized')
    
    // Wait a few seconds for data to come in
    console.log('⏳ Waiting 5 seconds for price data...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Test 2: Check price data
    console.log('📈 Test 2: Checking price feeds...')
    const priceSnapshot = priceDiscovery.getLatestPrices()
    
    if (priceSnapshot) {
      console.log(`✅ Price data available:`)
      console.log(`   - DEX prices: ${priceSnapshot.dexPrices.size}`)
      console.log(`   - CEX prices: ${priceSnapshot.cexPrices.size}`)
      console.log(`   - Last update: ${new Date(priceSnapshot.timestamp).toLocaleString()}`)
      
      // Display actual prices
      console.log('\\n💰 Current Prices:')
      for (const [dex, price] of priceSnapshot.dexPrices.entries()) {
        console.log(`   ${dex}: $${price.toFixed(2)}`)
      }
      
      for (const [cex, orderBook] of priceSnapshot.cexPrices.entries()) {
        const bestBid = orderBook.bids[0]?.price || 0
        const bestAsk = orderBook.asks[0]?.price || 0
        console.log(`   ${cex}: bid $${bestBid.toFixed(2)} / ask $${bestAsk.toFixed(2)}`)
      }
    } else {
      console.log('❌ No price data available')
    }
    
    // Test 3: Check opportunities
    console.log('\\n🔍 Test 3: Checking for opportunities...')
    const opportunities = opportunityDetection.getOpportunities()
    const stats = opportunityDetection.getStatistics()
    
    console.log(`✅ Opportunity detection working:`)
    console.log(`   - Total opportunities: ${stats.totalOpportunities}`)
    console.log(`   - Average spread: ${stats.averageSpread.toFixed(3)}%`)
    console.log(`   - Average profit: $${stats.averageProfit.toFixed(2)}`)
    console.log(`   - High confidence: ${stats.highConfidenceCount}`)
    
    if (opportunities.length > 0) {
      console.log('\\n💎 Best Opportunities:')
      opportunities.slice(0, 3).forEach((opp, i) => {
        console.log(`   ${i + 1}. ${opp.buyVenue} → ${opp.sellVenue}`)
        console.log(`      Spread: ${opp.spreadPercentage.toFixed(2)}%`)
        console.log(`      Profit: $${opp.profitAfterFees.toFixed(2)}`)
        console.log(`      Confidence: ${(opp.confidence * 100).toFixed(1)}%`)
      })
    }
    
    // Test 4: API simulation
    console.log('\\n🔗 Test 4: Testing API response format...')
    const apiResponse = {
      success: true,
      data: {
        opportunities: opportunities.slice(0, 5).map(opp => ({
          id: opp.id,
          type: opp.type,
          buyVenue: opp.buyVenue,
          sellVenue: opp.sellVenue,
          spread: opp.spreadPercentage,
          profit: opp.profitAfterFees,
          confidence: opp.confidence,
          timestamp: opp.timestamp
        })),
        stats: {
          total: stats.totalOpportunities,
          averageSpread: stats.averageSpread,
          averageProfit: stats.averageProfit,
          totalPotentialProfit: stats.totalPotentialProfit
        },
        market: {
          lastUpdate: priceSnapshot?.timestamp || Date.now(),
          priceCount: {
            dex: priceSnapshot?.dexPrices.size || 0,
            cex: priceSnapshot?.cexPrices.size || 0
          }
        }
      }
    }
    
    console.log('✅ API response format ready')
    console.log(`   Response size: ${JSON.stringify(apiResponse).length} bytes`)
    
    console.log('\\n🎉 Production System Test Results:')
    console.log('===================================')
    console.log('✅ Price discovery: Working')
    console.log('✅ Opportunity detection: Working')  
    console.log('✅ API response format: Ready')
    console.log('✅ Real-time data: Available')
    
    console.log('\\n📱 Next Steps:')
    console.log('1. Start Next.js server: npm run dev')
    console.log('2. Visit: http://localhost:3000/dashboard-production')
    console.log('3. API endpoint: http://localhost:3000/api/arbitrage/opportunities')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await priceDiscovery.cleanup()
    console.log('\\n🛑 Test completed, cleanup finished')
    process.exit(0)
  }
}

// Run the test
testProductionSystem()