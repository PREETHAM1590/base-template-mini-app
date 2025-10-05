import { priceDiscovery, PriceSnapshot } from './priceDiscovery'

// Types
export interface ArbitrageOpportunity {
  id: string
  timestamp: number
  type: 'dex-to-cex' | 'cex-to-dex'
  buyVenue: string
  sellVenue: string
  buyPrice: number
  sellPrice: number
  spread: number
  spreadPercentage: number
  estimatedProfit: number
  profitAfterFees: number
  gasEstimate: number
  confidence: number
  minTradeSize: number
  maxTradeSize: number
  liquidity: {
    buy: number
    sell: number
  }
  fees: {
    trading: number
    gas: number
    slippage: number
    total: number
  }
  risks: string[]
  executionTimeWindow: number // milliseconds
  aiScore: number // AI confidence score 0-100
}

export interface OpportunityFilters {
  minSpread?: number
  minProfit?: number
  maxGasCost?: number
  minConfidence?: number
  venues?: string[]
}

export class OpportunityDetectionEngine {
  private opportunities: ArbitrageOpportunity[] = []
  private callbacks: Array<(opportunities: ArbitrageOpportunity[]) => void> = []
  private filters: OpportunityFilters = {
    minSpread: 0.1, // 0.1%
    minProfit: 50, // $50 USD
    maxGasCost: 20, // $20 USD
    minConfidence: 0.7
  }

  // Trading fees by venue (in percentage)
  private readonly VENUE_FEES = {
    'uniswap-v3-500': 0.05,
    'uniswap-v3-3000': 0.30,
    'sushiswap': 0.25,
    'aerodrome': 0.20,
    'binance': 0.10,
    'backpack': 0.15
  }

  // Slippage estimates by venue
  private readonly SLIPPAGE_ESTIMATES = {
    'uniswap-v3-500': 0.05, // Low fee tier = high liquidity
    'uniswap-v3-3000': 0.08,
    'sushiswap': 0.12,
    'aerodrome': 0.15,
    'binance': 0.02,
    'backpack': 0.05
  }

  constructor() {
    // Subscribe to price updates
    priceDiscovery.onPriceUpdate(this.analyzePrices.bind(this))
  }

  // Main analysis function called on every price update
  private async analyzePrices(snapshot: PriceSnapshot): Promise<void> {
    try {
      const newOpportunities = await this.detectOpportunities(snapshot)
      
      // Filter opportunities
      const filteredOpportunities = this.applyFilters(newOpportunities)
      
      // Update opportunity list
      this.updateOpportunities(filteredOpportunities)
      
      // Notify subscribers
      this.callbacks.forEach(callback => callback(this.opportunities))
      
    } catch (error) {
      console.error('Error analyzing prices for opportunities:', error)
    }
  }

  // Detect all possible arbitrage opportunities
  private async detectOpportunities(snapshot: PriceSnapshot): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = []
    const { dexPrices, cexPrices, timestamp } = snapshot

    // DEX to CEX arbitrage opportunities
    for (const [dexName, dexPrice] of dexPrices.entries()) {
      for (const [cexName, cexOrderBook] of cexPrices.entries()) {
        if (cexOrderBook.bids.length > 0) {
          const cexBestBid = cexOrderBook.bids[0].price
          const opportunity = await this.calculateOpportunity({
            timestamp,
            type: 'dex-to-cex',
            buyVenue: dexName,
            sellVenue: cexName,
            buyPrice: dexPrice,
            sellPrice: cexBestBid,
            buyLiquidity: this.estimateDEXLiquidity(dexName),
            sellLiquidity: cexOrderBook.bids[0].quantity
          })

          if (opportunity) {
            opportunities.push(opportunity)
          }
        }
      }
    }

    // CEX to DEX arbitrage opportunities
    for (const [cexName, cexOrderBook] of cexPrices.entries()) {
      if (cexOrderBook.asks.length > 0) {
        for (const [dexName, dexPrice] of dexPrices.entries()) {
          const cexBestAsk = cexOrderBook.asks[0].price
          const opportunity = await this.calculateOpportunity({
            timestamp,
            type: 'cex-to-dex',
            buyVenue: cexName,
            sellVenue: dexName,
            buyPrice: cexBestAsk,
            sellPrice: dexPrice,
            buyLiquidity: cexOrderBook.asks[0].quantity,
            sellLiquidity: this.estimateDEXLiquidity(dexName)
          })

          if (opportunity) {
            opportunities.push(opportunity)
          }
        }
      }
    }

    // DEX to DEX opportunities (cross-DEX arbitrage)
    const dexEntries = Array.from(dexPrices.entries())
    for (let i = 0; i < dexEntries.length; i++) {
      for (let j = i + 1; j < dexEntries.length; j++) {
        const [dex1Name, dex1Price] = dexEntries[i]
        const [dex2Name, dex2Price] = dexEntries[j]

        // Check both directions
        if (dex1Price < dex2Price) {
          const opportunity = await this.calculateOpportunity({
            timestamp,
            type: 'dex-to-dex' as any,
            buyVenue: dex1Name,
            sellVenue: dex2Name,
            buyPrice: dex1Price,
            sellPrice: dex2Price,
            buyLiquidity: this.estimateDEXLiquidity(dex1Name),
            sellLiquidity: this.estimateDEXLiquidity(dex2Name)
          })

          if (opportunity) {
            opportunities.push(opportunity)
          }
        }
      }
    }

    return opportunities
  }

  // Calculate detailed opportunity metrics
  private async calculateOpportunity(params: {
    timestamp: number
    type: 'dex-to-cex' | 'cex-to-dex' | 'dex-to-dex'
    buyVenue: string
    sellVenue: string
    buyPrice: number
    sellPrice: number
    buyLiquidity: number
    sellLiquidity: number
  }): Promise<ArbitrageOpportunity | null> {
    const {
      timestamp,
      type,
      buyVenue,
      sellVenue,
      buyPrice,
      sellPrice,
      buyLiquidity,
      sellLiquidity
    } = params

    // Basic spread calculation
    const spread = sellPrice - buyPrice
    const spreadPercentage = (spread / buyPrice) * 100

    // Skip negative spreads
    if (spread <= 0) return null

    // Calculate fees
    const buyFee = this.VENUE_FEES[buyVenue as keyof typeof this.VENUE_FEES] || 0.25
    const sellFee = this.VENUE_FEES[sellVenue as keyof typeof this.VENUE_FEES] || 0.25
    const buySlippage = this.SLIPPAGE_ESTIMATES[buyVenue as keyof typeof this.SLIPPAGE_ESTIMATES] || 0.1
    const sellSlippage = this.SLIPPAGE_ESTIMATES[sellVenue as keyof typeof this.SLIPPAGE_ESTIMATES] || 0.1

    // Estimate gas costs
    const gasEstimate = await this.estimateGasCosts(type)

    // Calculate trade size constraints
    const maxTradeSize = Math.min(buyLiquidity * 0.5, sellLiquidity * 0.5) // Use 50% of available liquidity
    const minTradeSize = Math.max(gasEstimate * 2, 100) // Minimum to make gas costs worthwhile

    if (maxTradeSize < minTradeSize) return null

    // Use optimal trade size (usually around 30-70% of max for slippage reasons)
    const optimalTradeSize = maxTradeSize * 0.5

    // Calculate fees for optimal trade size
    const tradingFees = (optimalTradeSize * buyFee / 100) + (optimalTradeSize * sellFee / 100)
    const slippageCosts = (optimalTradeSize * buySlippage / 100) + (optimalTradeSize * sellSlippage / 100)
    const totalFees = tradingFees + slippageCosts + gasEstimate

    // Calculate profits
    const grossProfit = optimalTradeSize * (spread / buyPrice)
    const netProfit = grossProfit - totalFees

    // Skip unprofitable opportunities
    if (netProfit <= 0) return null

    // Calculate confidence score
    const confidence = this.calculateConfidence({
      spread: spreadPercentage,
      liquidity: Math.min(buyLiquidity, sellLiquidity),
      venues: [buyVenue, sellVenue],
      gasPrice: gasEstimate
    })

    // Assess risks
    const risks = this.assessRisks({
      type,
      buyVenue,
      sellVenue,
      spread: spreadPercentage,
      liquidity: Math.min(buyLiquidity, sellLiquidity)
    })

    // Calculate execution time window
    const executionTimeWindow = this.calculateExecutionWindow(type)

    return {
      id: `${buyVenue}-${sellVenue}-${timestamp}`,
      timestamp,
      type: type as 'dex-to-cex' | 'cex-to-dex',
      buyVenue,
      sellVenue,
      buyPrice,
      sellPrice,
      spread,
      spreadPercentage,
      estimatedProfit: grossProfit,
      profitAfterFees: netProfit,
      gasEstimate,
      confidence,
      minTradeSize,
      maxTradeSize,
      liquidity: {
        buy: buyLiquidity,
        sell: sellLiquidity
      },
      fees: {
        trading: tradingFees,
        gas: gasEstimate,
        slippage: slippageCosts,
        total: totalFees
      },
      risks,
      executionTimeWindow,
      aiScore: Math.round(confidence * 100) // Convert confidence to 0-100 score
    }
  }

  // Estimate gas costs for different transaction types
  private async estimateGasCosts(type: string): Promise<number> {
    // Base gas prices in USD (would fetch from real gas oracles)
    const baseGasPrice = 0.001 // $0.001 per gas unit on Base
    
    const gasEstimates = {
      'dex-to-cex': 250000, // Complex transaction with DEX swap + CEX deposit
      'cex-to-dex': 200000, // CEX withdrawal + DEX swap
      'dex-to-dex': 180000  // Two DEX swaps in one transaction
    }

    const gasUnits = gasEstimates[type as keyof typeof gasEstimates] || 200000
    return gasUnits * baseGasPrice
  }

  // Estimate DEX liquidity (mock implementation)
  private estimateDEXLiquidity(dexName: string): number {
    const liquidityEstimates = {
      'uniswap-v3-500': 50000,   // $50K in pool
      'uniswap-v3-3000': 25000,  // $25K in pool
      'sushiswap': 15000,        // $15K in pool
      'aerodrome': 10000         // $10K in pool
    }

    return liquidityEstimates[dexName as keyof typeof liquidityEstimates] || 5000
  }

  // Calculate confidence score based on multiple factors
  private calculateConfidence(params: {
    spread: number
    liquidity: number
    venues: string[]
    gasPrice: number
  }): number {
    const { spread, liquidity, venues, gasPrice } = params
    
    let confidence = 0.5 // Base confidence

    // Higher spread = higher confidence
    if (spread > 0.5) confidence += 0.2
    if (spread > 1.0) confidence += 0.1
    if (spread > 2.0) confidence += 0.1

    // Higher liquidity = higher confidence
    if (liquidity > 10000) confidence += 0.1
    if (liquidity > 25000) confidence += 0.1
    if (liquidity > 50000) confidence += 0.1

    // Known reliable venues = higher confidence
    const reliableVenues = ['uniswap-v3-500', 'binance']
    if (venues.some(venue => reliableVenues.includes(venue))) {
      confidence += 0.1
    }

    // Lower gas price = higher confidence
    if (gasPrice < 10) confidence += 0.1

    return Math.min(confidence, 1.0)
  }

  // Assess risks for the opportunity
  private assessRisks(params: {
    type: string
    buyVenue: string
    sellVenue: string
    spread: number
    liquidity: number
  }): string[] {
    const { type, buyVenue, sellVenue, spread, liquidity } = params
    const risks: string[] = []

    // High spread might indicate stale data
    if (spread > 5.0) {
      risks.push('HIGH_SPREAD_RISK: Spread unusually high, may indicate stale price data')
    }

    // Low liquidity risk
    if (liquidity < 5000) {
      risks.push('LOW_LIQUIDITY_RISK: Limited liquidity may cause high slippage')
    }

    // Cross-venue risks
    if (type === 'dex-to-cex' || type === 'cex-to-dex') {
      risks.push('BRIDGE_RISK: Requires bridging between DEX and CEX')
      risks.push('TIMING_RISK: CEX deposits/withdrawals may have delays')
    }

    // New or less reliable venues
    const reliableVenues = ['uniswap-v3-500', 'uniswap-v3-3000', 'binance']
    if (!reliableVenues.includes(buyVenue) || !reliableVenues.includes(sellVenue)) {
      risks.push('VENUE_RISK: Trading on less established venues')
    }

    // MEV risk for DEX transactions
    if (buyVenue.includes('uniswap') || sellVenue.includes('uniswap')) {
      risks.push('MEV_RISK: Transaction may be front-run by MEV bots')
    }

    return risks
  }

  // Calculate execution time window
  private calculateExecutionWindow(type: string): number {
    const windows = {
      'dex-to-cex': 120000,  // 2 minutes
      'cex-to-dex': 300000,  // 5 minutes (longer due to CEX delays)
      'dex-to-dex': 60000    // 1 minute
    }

    return windows[type as keyof typeof windows] || 180000
  }

  // Apply filters to opportunities
  private applyFilters(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity[] {
    return opportunities.filter(opp => {
      if (this.filters.minSpread && opp.spreadPercentage < this.filters.minSpread) return false
      if (this.filters.minProfit && opp.profitAfterFees < this.filters.minProfit) return false
      if (this.filters.maxGasCost && opp.gasEstimate > this.filters.maxGasCost) return false
      if (this.filters.minConfidence && opp.confidence < this.filters.minConfidence) return false
      if (this.filters.venues && 
          !this.filters.venues.includes(opp.buyVenue) && 
          !this.filters.venues.includes(opp.sellVenue)) return false

      return true
    })
  }

  // Update opportunity list with new opportunities
  private updateOpportunities(newOpportunities: ArbitrageOpportunity[]): void {
    // Remove stale opportunities (older than 30 seconds)
    const now = Date.now()
    this.opportunities = this.opportunities.filter(opp => 
      now - opp.timestamp < 30000
    )

    // Add new opportunities
    this.opportunities.push(...newOpportunities)

    // Sort by profit descending
    this.opportunities.sort((a, b) => b.profitAfterFees - a.profitAfterFees)

    // Keep only top 50 opportunities
    this.opportunities = this.opportunities.slice(0, 50)
  }

  // Public methods for external use
  
  // Get current opportunities
  getOpportunities(): ArbitrageOpportunity[] {
    return [...this.opportunities]
  }

  // Subscribe to opportunity updates
  onOpportunitiesUpdate(callback: (opportunities: ArbitrageOpportunity[]) => void): void {
    this.callbacks.push(callback)
  }

  // Update filters
  updateFilters(newFilters: Partial<OpportunityFilters>): void {
    this.filters = { ...this.filters, ...newFilters }
    
    // Reapply filters to current opportunities
    const filteredOpportunities = this.applyFilters(this.opportunities)
    this.opportunities = filteredOpportunities
    
    // Notify subscribers
    this.callbacks.forEach(callback => callback(this.opportunities))
  }

  // Get best opportunity
  getBestOpportunity(): ArbitrageOpportunity | null {
    return this.opportunities.length > 0 ? this.opportunities[0] : null
  }

  // Get opportunities by type
  getOpportunitiesByType(type: 'dex-to-cex' | 'cex-to-dex'): ArbitrageOpportunity[] {
    return this.opportunities.filter(opp => opp.type === type)
  }

  // Get opportunity statistics
  getStatistics(): {
    totalOpportunities: number
    averageSpread: number
    averageProfit: number
    totalPotentialProfit: number
    highConfidenceCount: number
  } {
    if (this.opportunities.length === 0) {
      return {
        totalOpportunities: 0,
        averageSpread: 0,
        averageProfit: 0,
        totalPotentialProfit: 0,
        highConfidenceCount: 0
      }
    }

    const totalOpportunities = this.opportunities.length
    const averageSpread = this.opportunities.reduce((sum, opp) => sum + opp.spreadPercentage, 0) / totalOpportunities
    const averageProfit = this.opportunities.reduce((sum, opp) => sum + opp.profitAfterFees, 0) / totalOpportunities
    const totalPotentialProfit = this.opportunities.reduce((sum, opp) => sum + opp.profitAfterFees, 0)
    const highConfidenceCount = this.opportunities.filter(opp => opp.confidence > 0.8).length

    return {
      totalOpportunities,
      averageSpread,
      averageProfit,
      totalPotentialProfit,
      highConfidenceCount
    }
  }
}

// Singleton instance
export const opportunityDetection = new OpportunityDetectionEngine()