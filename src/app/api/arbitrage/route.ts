import { NextRequest, NextResponse } from 'next/server'
import { ArbitrageScanner } from '@/lib/arbitrage'
import { COMMON_TOKENS, ExecuteTradeRequest, TradeRecord } from '@/types'
import { generateId } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const tokens = searchParams.get('tokens')
    const minSpread = parseFloat(searchParams.get('minSpread') || '0.3')
    const maxResults = parseInt(searchParams.get('maxResults') || '10')

    // Initialize scanner with optional API key
    const scanner = new ArbitrageScanner(process.env.OPENAI_API_KEY || 'mock-key')
    
    // Use provided tokens or defaults
    const tokensToScan = tokens ? JSON.parse(tokens) : COMMON_TOKENS
    
    // Scan for opportunities
    const opportunities = await scanner.scanForOpportunities(
      tokensToScan,
      minSpread,
      maxResults
    )

    // Get market conditions
    const marketConditions = await scanner.getMarketConditions()

    return NextResponse.json({
      success: true,
      data: opportunities,
      marketConditions,
      meta: {
        total: opportunities.length,
        minSpread,
        maxResults,
        scannedAt: Date.now(),
      },
    })
  } catch (error) {
    console.error('Arbitrage API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch arbitrage opportunities',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Temporarily disabled auth for testing
    // const auth = await verifyAuth(request)
    // if (!auth) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }
    const auth = { address: 'test-address', fid: 1 } // Mock auth for testing

    // Parse request body
    const body: ExecuteTradeRequest = await request.json()
    const { opportunityId, amount, slippage, gasLimit } = body

    // Validate input
    if (!opportunityId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Mock trade execution (in production, this would interact with smart contracts)
    const executionResult = await mockExecuteTrade({
      opportunityId,
      amount,
      slippage: slippage || 0.5,
      gasLimit,
      userAddress: auth.address,
      fid: auth.fid,
    })

    return NextResponse.json({
      success: true,
      data: executionResult,
    })
  } catch (error) {
    console.error('Trade execution error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute trade',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Mock trade execution function
async function mockExecuteTrade(params: {
  opportunityId: string
  amount: string
  slippage: number
  gasLimit?: string
  userAddress?: string
  fid?: number
}): Promise<TradeRecord> {
  // Simulate trade execution delay
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Mock success/failure based on random chance (90% success rate)
  const isSuccessful = Math.random() > 0.1

  if (isSuccessful) {
    // Calculate mock profit (with some variation from estimated)
    const estimatedProfit = parseFloat(params.amount) * 0.02 // 2% profit
    const actualProfit = estimatedProfit * (0.8 + Math.random() * 0.4) // ±20% variation
    const gasUsed = (0.003 + Math.random() * 0.002).toFixed(6) // 0.003-0.005 ETH gas

    return {
      id: generateId(),
      timestamp: Date.now(),
      opportunity: {
        // Mock opportunity data
        id: params.opportunityId,
        tokenPair: {
          tokenA: COMMON_TOKENS[0],
          tokenB: COMMON_TOKENS[1],
        },
        exchanges: {
          buyExchange: {
            id: 'uniswap-v3',
            name: 'Uniswap V3',
            displayName: 'Uniswap',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            fee: 0.3,
            logoURI: 'https://app.uniswap.org/favicon.ico',
            color: '#FF007A'
          },
          sellExchange: {
            id: 'sushiswap',
            name: 'SushiSwap',
            displayName: 'SushiSwap',
            router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
            factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
            fee: 0.3,
            logoURI: 'https://app.sushi.com/favicon.ico',
            color: '#0E111A'
          },
        },
        prices: {
          buyPrice: '2495.50',
          sellPrice: '2510.25',
        },
        spread: {
          percentage: 0.59,
          absolute: '14.75',
        },
        estimatedProfit: {
          gross: actualProfit.toFixed(6),
          net: (actualProfit - parseFloat(gasUsed)).toFixed(6),
          gasEstimate: gasUsed,
        },
        aiConfidence: {
          score: 0.85,
          factors: [],
        },
        liquidity: {
          buyLiquidity: '1250000',
          sellLiquidity: '980000',
          minTradeSize: '0.01',
          maxTradeSize: '50',
        },
        timeToExpiry: 300,
        riskLevel: 'LOW' as const,
        timestamp: Date.now(),
      },
      executedAmount: params.amount,
      actualProfit: actualProfit.toFixed(6),
      gasUsed,
      transactionHash: `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`,
      status: 'SUCCESS',
    }
  } else {
    // Mock failed trade
    return {
      id: generateId(),
      timestamp: Date.now(),
      opportunity: {} as any, // Would be the full opportunity in real implementation
      executedAmount: '0',
      actualProfit: '0',
      gasUsed: (0.002 + Math.random() * 0.001).toFixed(6), // Still used gas for failed tx
      transactionHash: `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`,
      status: 'FAILED',
      errorMessage: 'Insufficient liquidity or price moved unfavorably',
    }
  }
}