// Simple test to check if our API is working with production data
console.log('🚀 Testing ArbiTips Production API...')

// Test the API endpoint multiple times to see the system initialize
async function testAPI() {
  const baseUrl = 'http://localhost:3000'
  
  console.log('📡 First request (should initialize system)...')
  try {
    const response1 = await fetch(`${baseUrl}/api/arbitrage/opportunities?limit=5`)
    const data1 = await response1.json()
    
    console.log('Response 1:', JSON.stringify(data1, null, 2))
    
    // Wait a few seconds for price data to populate
    console.log('⏳ Waiting 10 seconds for price feeds to populate...')
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    console.log('📡 Second request (should have live data)...')
    const response2 = await fetch(`${baseUrl}/api/arbitrage/opportunities?limit=5`)
    const data2 = await response2.json()
    
    console.log('Response 2:', JSON.stringify(data2, null, 2))
    
    // Check if we have price data now
    if (data2.data && data2.data.market.priceCount.dex > 0) {
      console.log('✅ DEX price feeds working!')
    } else {
      console.log('❌ DEX price feeds not yet populated')
    }
    
    if (data2.data && data2.data.market.priceCount.cex > 0) {
      console.log('✅ CEX price feeds working!')
    } else {
      console.log('❌ CEX price feeds not yet populated')
    }
    
    if (data2.data && data2.data.opportunities.length > 0) {
      console.log('✅ Arbitrage opportunities detected!')
      console.log('Best opportunity:', data2.data.opportunities[0])
    } else {
      console.log('⚠️ No arbitrage opportunities found yet')
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message)
  }
}

testAPI()