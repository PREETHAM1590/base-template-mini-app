import { 
  ArbitrageOpportunity, 
  Exchange, 
  Token, 
  PriceData, 
  AIAnalysisResult,
  MarketConditions,
  SUPPORTED_EXCHANGES,
  COMMON_TOKENS,
  ConfidenceFactor
} from '@/types'
import { formatUnits, parseUnits } from 'viem'

export class ArbitrageScanner {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || ''
    this.baseUrl = 'https://api.openai.com/v1'
  }

  // Mock price fetching (in production, this would fetch from real DEX APIs/subgraphs)
  async fetchPricesFromDEX(exchange: Exchange, tokens: Token[]): Promise<PriceData[]> {
    const prices: PriceData[] = []
    
    // Simulate fetching prices from different DEXs with slight variations
    for (let i = 0; i < tokens.length - 1; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const basePrice = this.generateMockPrice(tokens[i], tokens[j])
        const exchangeVariation = this.getExchangeVariation(exchange.id)
        const finalPrice = basePrice * exchangeVariation
        
        const priceData: PriceData = {
          exchange,
          token0: tokens[i],
          token1: tokens[j],
          price: finalPrice.toString(),
          liquidity: this.generateMockLiquidity(),
          volume24h: this.generateMockVolume(),
          timestamp: Date.now(),
          blockNumber: Math.floor(Math.random() * 1000000) + 9000000,
        }
        
        prices.push(priceData)
      }
    }
    
    return prices
  }

  private generateMockPrice(tokenA: Token, tokenB: Token): number {
    // Generate realistic mock prices based on token types
    if (tokenA.symbol === 'WETH' && tokenB.symbol === 'USDC') {
      return 2500 + Math.random() * 100 - 50 // ETH price around 2500 USDC ±50
    }
    if (tokenA.symbol === 'USDC' && tokenB.symbol === 'DAI') {
      return 1 + Math.random() * 0.01 - 0.005 // USDC/DAI around 1 ±0.005
    }
    if (tokenA.symbol === 'WETH' && tokenB.symbol === 'DAI') {
      return 2500 + Math.random() * 100 - 50 // ETH price around 2500 DAI ±50
    }
    return 1 + Math.random() * 10 // Default mock price
  }

  private getExchangeVariation(exchangeId: string): number {
    // Different exchanges have slightly different prices
    const variations = {
      'uniswap-v3': 1 + (Math.random() * 0.006 - 0.003), // ±0.3%
      'sushiswap': 1 + (Math.random() * 0.008 - 0.004), // ±0.4%
      'aerodrome': 1 + (Math.random() * 0.004 - 0.002), // ±0.2%
    }
    return variations[exchangeId as keyof typeof variations] || 1
  }

  private generateMockLiquidity(): string {
    return (Math.random() * 10000000 + 100000).toFixed(2) // $100K - $10M liquidity
  }

  private generateMockVolume(): string {
    return (Math.random() * 5000000 + 50000).toFixed(2) // $50K - $5M volume
  }

  async scanForOpportunities(
    tokens: Token[] = COMMON_TOKENS,
    minSpreadPercentage: number = 0.3,
    maxOpportunities: number = 10
  ): Promise<ArbitrageOpportunity[]> {
    try {
      // Fetch prices from all supported exchanges
      const allPrices: PriceData[] = []
      
      for (const exchange of SUPPORTED_EXCHANGES) {
        const exchangePrices = await this.fetchPricesFromDEX(exchange, tokens)
        allPrices.push(...exchangePrices)
      }

      // Find arbitrage opportunities
      const opportunities = this.findArbitrageOpportunities(allPrices, minSpreadPercentage)
      
      // Enhance opportunities with AI analysis
      const enhancedOpportunities = await this.enhanceWithAIAnalysis(opportunities)
      
      // Sort by potential profit and return top N
      return enhancedOpportunities
        .sort((a, b) => parseFloat(b.estimatedProfit.net) - parseFloat(a.estimatedProfit.net))
        .slice(0, maxOpportunities)
    } catch (error) {
      console.error('Error scanning for opportunities:', error)
      return []
    }
  }

  private findArbitrageOpportunities(
    prices: PriceData[], 
    minSpreadPercentage: number
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = []
    const priceMap = new Map<string, PriceData[]>()

    // Group prices by token pair
    prices.forEach(price => {
      const key = this.getTokenPairKey(price.token0, price.token1)
      if (!priceMap.has(key)) {
        priceMap.set(key, [])
      }
      priceMap.get(key)!.push(price)
    })

    // Find arbitrage opportunities for each token pair
    priceMap.forEach((pairPrices, pairKey) => {
      if (pairPrices.length < 2) return

      for (let i = 0; i < pairPrices.length - 1; i++) {
        for (let j = i + 1; j < pairPrices.length; j++) {
          const price1 = pairPrices[i]
          const price2 = pairPrices[j]
          
          const spread = Math.abs(parseFloat(price1.price) - parseFloat(price2.price))
          const avgPrice = (parseFloat(price1.price) + parseFloat(price2.price)) / 2
          const spreadPercentage = (spread / avgPrice) * 100

          if (spreadPercentage >= minSpreadPercentage) {
            const buyPrice = parseFloat(price1.price) < parseFloat(price2.price) ? price1 : price2
            const sellPrice = parseFloat(price1.price) > parseFloat(price2.price) ? price1 : price2

            const opportunity: ArbitrageOpportunity = {
              id: `${pairKey}-${buyPrice.exchange.id}-${sellPrice.exchange.id}-${Date.now()}`,
              tokenPair: {
                tokenA: buyPrice.token0,
                tokenB: buyPrice.token1,
              },
              exchanges: {
                buyExchange: buyPrice.exchange,
                sellExchange: sellPrice.exchange,
              },
              prices: {
                buyPrice: buyPrice.price,
                sellPrice: sellPrice.price,
              },
              spread: {
                percentage: spreadPercentage,
                absolute: spread.toString(),
              },
              estimatedProfit: this.calculateEstimatedProfit(buyPrice, sellPrice, spread),
              aiConfidence: {
                score: 0, // Will be set by AI analysis
                factors: [],
              },
              liquidity: {
                buyLiquidity: buyPrice.liquidity,
                sellLiquidity: sellPrice.liquidity,
                minTradeSize: '0.01',
                maxTradeSize: Math.min(parseFloat(buyPrice.liquidity), parseFloat(sellPrice.liquidity)).toString(),
              },
              timeToExpiry: 300, // 5 minutes
              riskLevel: this.calculateRiskLevel(spreadPercentage, parseFloat(buyPrice.liquidity), parseFloat(sellPrice.liquidity)),
              timestamp: Date.now(),
            }

            opportunities.push(opportunity)
          }
        }
      }
    })

    return opportunities
  }

  private getTokenPairKey(token0: Token, token1: Token): string {
    // Ensure consistent ordering for token pairs
    return token0.address < token1.address 
      ? `${token0.address}-${token1.address}` 
      : `${token1.address}-${token0.address}`
  }

  private calculateEstimatedProfit(
    buyPrice: PriceData,
    sellPrice: PriceData,
    spread: number
  ) {
    const tradeAmount = 1 // 1 ETH equivalent
    const grossProfit = spread * tradeAmount
    const gasEstimate = 0.005 // ~$12.5 at 2500 ETH price
    const netProfit = Math.max(0, grossProfit - gasEstimate)

    return {
      gross: grossProfit.toFixed(6),
      net: netProfit.toFixed(6),
      gasEstimate: gasEstimate.toFixed(6),
    }
  }

  private calculateRiskLevel(
    spreadPercentage: number,
    buyLiquidity: number,
    sellLiquidity: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    const minLiquidity = Math.min(buyLiquidity, sellLiquidity)
    
    if (spreadPercentage > 2 || minLiquidity < 50000) return 'HIGH'
    if (spreadPercentage > 1 || minLiquidity < 200000) return 'MEDIUM'
    return 'LOW'
  }

  private async enhanceWithAIAnalysis(
    opportunities: ArbitrageOpportunity[]
  ): Promise<ArbitrageOpportunity[]> {
    if (!this.apiKey || opportunities.length === 0) {
      // Return opportunities with mock AI confidence if no API key
      return opportunities.map(opp => ({
        ...opp,
        aiConfidence: {
          score: Math.random() * 0.4 + 0.6, // Random confidence 60-100%
          factors: this.generateMockConfidenceFactors(),
        },
      }))
    }

    try {
      const analysisPrompt = this.createAIAnalysisPrompt(opportunities)
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert DeFi arbitrage analyst. Analyze the provided opportunities and assign confidence scores based on liquidity, spread sustainability, market conditions, and execution probability.',
            },
            {
              role: 'user',
              content: analysisPrompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        throw new Error('AI analysis request failed')
      }

      const aiResponse = await response.json()
      const analysis = JSON.parse(aiResponse.choices[0].message.content)

      // Apply AI confidence scores to opportunities
      return opportunities.map((opp, index) => ({
        ...opp,
        aiConfidence: {
          score: analysis.confidenceScores[index] || 0.5,
          factors: analysis.confidenceFactors[index] || this.generateMockConfidenceFactors(),
        },
      }))
    } catch (error) {
      console.error('AI analysis failed, using fallback:', error)
      
      // Fallback: return opportunities with calculated confidence
      return opportunities.map(opp => ({
        ...opp,
        aiConfidence: {
          score: this.calculateFallbackConfidence(opp),
          factors: this.generateMockConfidenceFactors(),
        },
      }))
    }
  }

  private createAIAnalysisPrompt(opportunities: ArbitrageOpportunity[]): string {
    const opportunityData = opportunities.map(opp => ({
      id: opp.id,
      spread: opp.spread.percentage,
      liquidity: {
        buy: parseFloat(opp.liquidity.buyLiquidity),
        sell: parseFloat(opp.liquidity.sellLiquidity),
      },
      profit: parseFloat(opp.estimatedProfit.net),
      exchanges: [opp.exchanges.buyExchange.name, opp.exchanges.sellExchange.name],
    }))

    return `Analyze these arbitrage opportunities and provide confidence scores (0-1) for each:

${JSON.stringify(opportunityData, null, 2)}

Return a JSON response with:
{
  "confidenceScores": [score1, score2, ...],
  "confidenceFactors": [[factor1, factor2, ...], [factor1, factor2, ...], ...]
}

Consider: liquidity depth, spread sustainability, execution risk, gas costs, market volatility.`
  }

  private calculateFallbackConfidence(opportunity: ArbitrageOpportunity): number {
    let confidence = 0.5

    // Liquidity factor
    const minLiquidity = Math.min(
      parseFloat(opportunity.liquidity.buyLiquidity),
      parseFloat(opportunity.liquidity.sellLiquidity)
    )
    if (minLiquidity > 1000000) confidence += 0.2
    else if (minLiquidity > 500000) confidence += 0.1
    else if (minLiquidity < 100000) confidence -= 0.2

    // Spread factor
    if (opportunity.spread.percentage > 1.5) confidence -= 0.1
    else if (opportunity.spread.percentage > 0.5) confidence += 0.1

    // Profit factor
    const netProfit = parseFloat(opportunity.estimatedProfit.net)
    if (netProfit > 0.01) confidence += 0.2
    else if (netProfit < 0) confidence -= 0.4

    return Math.max(0, Math.min(1, confidence))
  }

  private generateMockConfidenceFactors(): ConfidenceFactor[] {
    return [
      {
        type: 'LIQUIDITY',
        weight: 0.3,
        score: Math.random() * 0.4 + 0.6,
        description: 'Sufficient liquidity on both exchanges',
      },
      {
        type: 'VOLATILITY',
        weight: 0.2,
        score: Math.random() * 0.4 + 0.5,
        description: 'Low to moderate price volatility',
      },
      {
        type: 'GAS_PRICE',
        weight: 0.2,
        score: Math.random() * 0.4 + 0.4,
        description: 'Current gas prices are acceptable',
      },
      {
        type: 'MARKET_CONDITIONS',
        weight: 0.3,
        score: Math.random() * 0.4 + 0.6,
        description: 'Favorable market conditions for arbitrage',
      },
    ]
  }

  async getMarketConditions(): Promise<MarketConditions> {
    // Mock market conditions (in production, fetch from real sources)
    const volatilityOptions: MarketConditions['volatility'][] = ['LOW', 'MEDIUM', 'HIGH']
    const congestionOptions: MarketConditions['networkCongestion'][] = ['LOW', 'MEDIUM', 'HIGH']
    const sentimentOptions: MarketConditions['overallSentiment'][] = ['BULLISH', 'BEARISH', 'NEUTRAL']
    const actionOptions: MarketConditions['recommendedAction'][] = ['TRADE', 'WAIT', 'AVOID']

    return {
      volatility: volatilityOptions[Math.floor(Math.random() * volatilityOptions.length)],
      gasPrice: (Math.random() * 50 + 10).toFixed(0), // 10-60 gwei
      networkCongestion: congestionOptions[Math.floor(Math.random() * congestionOptions.length)],
      overallSentiment: sentimentOptions[Math.floor(Math.random() * sentimentOptions.length)],
      recommendedAction: actionOptions[Math.floor(Math.random() * actionOptions.length)],
    }
  }
}