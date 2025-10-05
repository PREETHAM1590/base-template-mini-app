#!/usr/bin/env ts-node

import { priceDiscovery } from '../src/lib/priceDiscovery'
import { opportunityDetection } from '../src/lib/opportunityDetection'

async function startProductionSystem() {
  console.log('🚀 Starting ArbiTips Production System...')
  console.log('=====================================')
  
  try {
    // Initialize price discovery engine
    console.log('📊 Initializing price discovery engine...')
    await priceDiscovery.initialize()
    
    // Set up opportunity monitoring
    console.log('🔍 Setting up opportunity detection...')
    opportunityDetection.onOpportunitiesUpdate((opportunities) => {
      if (opportunities.length > 0) {
        const best = opportunities[0]
        console.log(`💰 New opportunity: ${best.buyVenue} → ${best.sellVenue} | Spread: ${best.spreadPercentage.toFixed(2)}% | Profit: $${best.profitAfterFees.toFixed(2)}`)
      }
    })
    
    // Configure production filters
    opportunityDetection.updateFilters({
      minSpread: parseFloat(process.env.NEXT_PUBLIC_MIN_PROFIT_USD || '0.2'), // 0.2% minimum spread
      minProfit: parseFloat(process.env.NEXT_PUBLIC_MIN_PROFIT_USD || '10'), // $10 minimum profit
      maxGasCost: parseFloat(process.env.NEXT_PUBLIC_MAX_GAS_PRICE_GWEI || '25'), // $25 max gas
      minConfidence: 0.6 // 60% minimum confidence
    })
    
    console.log('✅ Production system initialized successfully!')
    console.log('🔍 Monitoring for arbitrage opportunities...')
    console.log('📱 Dashboard available at: http://localhost:3000/dashboard-production')
    console.log('🔗 API endpoint: http://localhost:3000/api/arbitrage/opportunities')
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down production system...')
      await priceDiscovery.cleanup()
      process.exit(0)
    })
    
    // Print status every 30 seconds
    setInterval(() => {
      const stats = opportunityDetection.getStatistics()
      const prices = priceDiscovery.getLatestPrices()
      
      console.log(`📈 Status: ${stats.totalOpportunities} opportunities | Avg spread: ${stats.averageSpread.toFixed(3)}% | Best profit: $${stats.totalPotentialProfit.toFixed(2)}`)
      
      if (prices) {
        console.log(`💹 Price feeds: ${prices.dexPrices.size} DEX + ${prices.cexPrices.size} CEX | Last update: ${new Date(prices.timestamp).toLocaleTimeString()}`)
      }
    }, 30000)
    
  } catch (error) {
    console.error('❌ Failed to start production system:', error)
    process.exit(1)
  }
}

// Auto-start if this file is run directly
if (require.main === module) {
  startProductionSystem()
}

export { startProductionSystem }