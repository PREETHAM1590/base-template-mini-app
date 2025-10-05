import { NextApiRequest, NextApiResponse } from 'next'
import { opportunityDetection, ArbitrageOpportunity } from '../../../lib/opportunityDetection'
import { priceDiscovery } from '../../../lib/priceDiscovery'

// Global initialization state
let isInitialized = false
let isInitializing = false

// Auto-initialize the price discovery system
async function ensureInitialized() {
  if (isInitialized) return true
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return isInitialized
  }

  isInitializing = true
  try {
    console.log('🚀 Auto-initializing ArbiTips production system...')
    await priceDiscovery.initialize()
    
    // Configure production filters
    opportunityDetection.updateFilters({
      minSpread: parseFloat(process.env.NEXT_PUBLIC_MIN_SPREAD || '0.1'),
      minProfit: parseFloat(process.env.NEXT_PUBLIC_MIN_PROFIT_USD || '5'),
      maxGasCost: parseFloat(process.env.NEXT_PUBLIC_MAX_GAS_PRICE_GWEI || '30'),
      minConfidence: 0.5
    })
    
    isInitialized = true
    console.log('✅ Production system initialized successfully!')
    return true
  } catch (error) {
    console.error('❌ Failed to initialize production system:', error)
    return false
  } finally {
    isInitializing = false
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req

  // Enable CORS for frontend
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    switch (method) {
      case 'GET':
        await handleGetOpportunities(req, res)
        break
      case 'POST':
        await handleCreateOpportunity(req, res)
        break
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        res.status(405).end(`Method ${method} Not Allowed`)
    }
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleGetOpportunities(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Ensure the system is initialized
  const initialized = await ensureInitialized()
  if (!initialized) {
    return res.status(503).json({
      success: false,
      error: 'Price discovery system failed to initialize',
      message: 'Please try again in a few moments'
    })
  }

  const { 
    limit = '10',
    type,
    minSpread,
    minProfit,
    maxGas,
    minConfidence,
    venues 
  } = req.query

  // Parse query parameters
  const limitNum = Math.min(parseInt(limit as string, 10) || 10, 100)
  const filters: any = {}
  
  if (minSpread) filters.minSpread = parseFloat(minSpread as string)
  if (minProfit) filters.minProfit = parseFloat(minProfit as string)
  if (maxGas) filters.maxGasCost = parseFloat(maxGas as string)
  if (minConfidence) filters.minConfidence = parseFloat(minConfidence as string)
  if (venues) filters.venues = (venues as string).split(',')

  // Apply filters if provided
  if (Object.keys(filters).length > 0) {
    opportunityDetection.updateFilters(filters)
  }

  // Get opportunities from the real-time detection engine
  let opportunities = opportunityDetection.getOpportunities()

  // Filter by type if specified
  if (type && (type === 'dex-to-cex' || type === 'cex-to-dex')) {
    opportunities = opportunityDetection.getOpportunitiesByType(type)
  }

  // Limit results
  opportunities = opportunities.slice(0, limitNum)

  // Get statistics
  const stats = opportunityDetection.getStatistics()

  // Get latest price snapshot
  const latestPrices = priceDiscovery.getLatestPrices()
  const bestPrices = priceDiscovery.getBestPrices()

  res.status(200).json({
    success: true,
    data: {
      opportunities: opportunities.map(formatOpportunity),
      stats: {
        total: stats.totalOpportunities,
        averageSpread: stats.averageSpread,
        averageProfit: stats.averageProfit,
        totalPotentialProfit: stats.totalPotentialProfit,
        highConfidenceCount: stats.highConfidenceCount
      },
      market: {
        lastUpdate: latestPrices?.timestamp || Date.now(),
        bestDEXPrice: bestPrices?.bestDEXAsk || 0,
        bestCEXPrice: bestPrices?.bestCEXBid || 0,
        priceCount: {
          dex: latestPrices?.dexPrices.size || 0,
          cex: latestPrices?.cexPrices.size || 0
        }
      }
    },
    timestamp: Date.now()
  })
}

async function handleCreateOpportunity(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { 
    tokenPair = 'WETH/USDC',
    strategy,
    buyVenue,
    sellVenue,
    expectedSpread,
    tradeSize 
  } = req.body

  // Validate required fields
  if (!strategy || !buyVenue || !sellVenue || !expectedSpread) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: strategy, buyVenue, sellVenue, expectedSpread'
    })
  }

  // In a real implementation, this would trigger the bot to look for
  // specific opportunities matching these criteria
  const customOpportunity = {
    id: `custom-${Date.now()}`,
    type: strategy,
    tokenPair,
    buyVenue,
    sellVenue,
    expectedSpread: parseFloat(expectedSpread),
    tradeSize: parseFloat(tradeSize) || 1000,
    status: 'monitoring',
    createdAt: new Date().toISOString()
  }

  // In production, you'd store this in a database and configure the bot
  // to monitor for opportunities matching these criteria
  console.log('📋 Custom opportunity request:', customOpportunity)

  res.status(201).json({
    success: true,
    data: customOpportunity,
    message: 'Opportunity monitoring request created successfully'
  })
}

function formatOpportunity(opp: ArbitrageOpportunity) {
  return {
    id: opp.id,
    timestamp: opp.timestamp,
    type: opp.type,
    tokenPair: 'WETH/USDC', // Assume WETH/USDC for now
    
    // Trading venues
    buyVenue: opp.buyVenue,
    sellVenue: opp.sellVenue,
    
    // Pricing
    buyPrice: opp.buyPrice,
    sellPrice: opp.sellPrice,
    spread: opp.spread,
    spreadPercentage: opp.spreadPercentage,
    
    // Profitability
    estimatedProfit: opp.estimatedProfit,
    profitAfterFees: opp.profitAfterFees,
    
    // Risk metrics
    confidence: opp.confidence,
    risks: opp.risks,
    
    // Trading constraints
    minTradeSize: opp.minTradeSize,
    maxTradeSize: opp.maxTradeSize,
    
    // Liquidity
    liquidity: {
      buy: opp.liquidity.buy,
      sell: opp.liquidity.sell
    },
    
    // Costs
    fees: {
      trading: opp.fees.trading,
      gas: opp.fees.gas,
      slippage: opp.fees.slippage,
      total: opp.fees.total
    },
    
    // Execution
    gasEstimate: opp.gasEstimate,
    executionTimeWindow: opp.executionTimeWindow,
    
    // Status
    status: 'active',
    aiScore: Math.round(opp.confidence * 100)
  }
}