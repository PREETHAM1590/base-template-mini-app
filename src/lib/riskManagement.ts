import { ArbitrageOpportunity } from './opportunityDetection'

// Risk Management Configuration
interface RiskConfig {
  maxTradeSize: number          // Maximum trade size in USD
  maxDailyVolume: number       // Maximum daily trading volume
  maxSlippageTolerance: number // Maximum slippage tolerance (%)
  minLiquidityRatio: number    // Minimum liquidity ratio for execution
  maxGasPrice: number          // Maximum gas price in gwei
  maxDrawdown: number          // Maximum allowable drawdown (%)
  circuitBreakerThreshold: number // Loss threshold to trigger circuit breaker
  cooldownPeriod: number       // Cooldown period after circuit breaker (ms)
}

// Risk Metrics
interface RiskMetrics {
  currentDrawdown: number
  dailyVolume: number
  recentLosses: number
  consecutiveFailures: number
  gasUsageToday: number
  lastFailureTime: number
  totalRisk: number  // Overall risk score 0-100
}

// Risk Assessment Result
interface RiskAssessment {
  approved: boolean
  riskScore: number
  warnings: string[]
  restrictions: {
    maxTradeSize?: number
    requiresApproval?: boolean
    delayExecution?: number
  }
  circuitBreakerTriggered: boolean
}

// Risk Event Types
type RiskEvent = 
  | 'LARGE_TRADE'
  | 'HIGH_SLIPPAGE'
  | 'LOW_LIQUIDITY'
  | 'HIGH_GAS'
  | 'CONSECUTIVE_FAILURES'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'CIRCUIT_BREAKER'

interface RiskAlert {
  event: RiskEvent
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  timestamp: number
  data?: any
}

export class RiskManagementSystem {
  private config: RiskConfig
  private metrics: RiskMetrics
  private alerts: RiskAlert[] = []
  private circuitBreakerActive: boolean = false
  private circuitBreakerStartTime: number = 0
  private callbacks: Array<(alert: RiskAlert) => void> = []

  constructor(config: Partial<RiskConfig> = {}) {
    this.config = {
      maxTradeSize: 10000,           // $10,000
      maxDailyVolume: 100000,        // $100,000
      maxSlippageTolerance: 2.0,     // 2%
      minLiquidityRatio: 0.1,        // 10% of available liquidity
      maxGasPrice: 100,              // 100 gwei
      maxDrawdown: 10.0,             // 10%
      circuitBreakerThreshold: 1000, // $1,000 loss
      cooldownPeriod: 3600000,       // 1 hour
      ...config
    }

    this.metrics = {
      currentDrawdown: 0,
      dailyVolume: 0,
      recentLosses: 0,
      consecutiveFailures: 0,
      gasUsageToday: 0,
      lastFailureTime: 0,
      totalRisk: 0
    }

    // Reset daily metrics at midnight
    this.scheduleDailyReset()
  }

  // Main risk assessment function
  assessRisk(opportunity: ArbitrageOpportunity, currentGasPrice?: number): RiskAssessment {
    const warnings: string[] = []
    let riskScore = 0
    let approved = true
    const restrictions: any = {}

    // Check circuit breaker status
    if (this.isCircuitBreakerActive()) {
      return {
        approved: false,
        riskScore: 100,
        warnings: ['Circuit breaker is active - trading suspended'],
        restrictions: { requiresApproval: true },
        circuitBreakerTriggered: true
      }
    }

    // 1. Trade Size Risk Assessment
    const tradeSizeRisk = this.assessTradeSize(opportunity)
    riskScore += tradeSizeRisk.score
    warnings.push(...tradeSizeRisk.warnings)
    if (tradeSizeRisk.restrictions) {
      Object.assign(restrictions, tradeSizeRisk.restrictions)
    }

    // 2. Liquidity Risk Assessment
    const liquidityRisk = this.assessLiquidity(opportunity)
    riskScore += liquidityRisk.score
    warnings.push(...liquidityRisk.warnings)

    // 3. Slippage Risk Assessment
    const slippageRisk = this.assessSlippage(opportunity)
    riskScore += slippageRisk.score
    warnings.push(...slippageRisk.warnings)

    // 4. Gas Price Risk Assessment
    if (currentGasPrice) {
      const gasRisk = this.assessGasPrice(currentGasPrice, opportunity.gasEstimate)
      riskScore += gasRisk.score
      warnings.push(...gasRisk.warnings)
    }

    // 5. Confidence & AI Score Risk Assessment
    const confidenceRisk = this.assessConfidence(opportunity)
    riskScore += confidenceRisk.score
    warnings.push(...confidenceRisk.warnings)

    // 6. Daily Volume Risk Assessment
    const volumeRisk = this.assessDailyVolume(opportunity.profitAfterFees)
    riskScore += volumeRisk.score
    warnings.push(...volumeRisk.warnings)

    // 7. Historical Performance Risk
    const performanceRisk = this.assessHistoricalPerformance()
    riskScore += performanceRisk.score
    warnings.push(...performanceRisk.warnings)

    // Final risk score (0-100)
    riskScore = Math.min(riskScore, 100)

    // Determine approval based on risk score
    if (riskScore >= 80) {
      approved = false
      restrictions.requiresApproval = true
    } else if (riskScore >= 60) {
      restrictions.delayExecution = 5000 // 5 second delay
      restrictions.requiresApproval = true
    } else if (riskScore >= 40) {
      restrictions.delayExecution = 2000 // 2 second delay
    }

    // Generate alerts for high risk
    if (riskScore >= 70) {
      this.generateAlert('HIGH_GAS', 'HIGH', `High risk trade detected: ${riskScore}/100`)
    }

    return {
      approved,
      riskScore,
      warnings: warnings.filter(w => w.length > 0),
      restrictions,
      circuitBreakerTriggered: false
    }
  }

  // Trade size risk assessment
  private assessTradeSize(opportunity: ArbitrageOpportunity) {
    const warnings: string[] = []
    let score = 0
    const restrictions: any = {}

    const tradeSize = opportunity.maxTradeSize

    if (tradeSize > this.config.maxTradeSize) {
      score += 30
      warnings.push(`Trade size $${tradeSize.toFixed(2)} exceeds maximum $${this.config.maxTradeSize}`)
      restrictions.maxTradeSize = this.config.maxTradeSize
      this.generateAlert('LARGE_TRADE', 'HIGH', 
        `Large trade size: $${tradeSize.toFixed(2)} (max: $${this.config.maxTradeSize})`)
    } else if (tradeSize > this.config.maxTradeSize * 0.8) {
      score += 15
      warnings.push(`Trade size approaching maximum limit`)
    } else if (tradeSize > this.config.maxTradeSize * 0.5) {
      score += 5
    }

    return { score, warnings, restrictions }
  }

  // Liquidity risk assessment
  private assessLiquidity(opportunity: ArbitrageOpportunity) {
    const warnings: string[] = []
    let score = 0

    const buyLiquidity = opportunity.liquidity.buy
    const sellLiquidity = opportunity.liquidity.sell
    const minLiquidity = Math.min(buyLiquidity, sellLiquidity)
    const tradeSize = opportunity.maxTradeSize
    const liquidityRatio = tradeSize / minLiquidity

    if (liquidityRatio > 0.5) {
      score += 25
      warnings.push(`High liquidity utilization: ${(liquidityRatio * 100).toFixed(1)}%`)
      this.generateAlert('LOW_LIQUIDITY', 'HIGH', 
        `Low liquidity for trade size: ${(liquidityRatio * 100).toFixed(1)}% utilization`)
    } else if (liquidityRatio > 0.3) {
      score += 10
      warnings.push(`Moderate liquidity utilization: ${(liquidityRatio * 100).toFixed(1)}%`)
    } else if (liquidityRatio > this.config.minLiquidityRatio) {
      score += 5
    }

    if (buyLiquidity < 5000 || sellLiquidity < 5000) {
      score += 15
      warnings.push('Low absolute liquidity detected')
    }

    return { score, warnings }
  }

  // Slippage risk assessment
  private assessSlippage(opportunity: ArbitrageOpportunity) {
    const warnings: string[] = []
    let score = 0

    // Calculate expected slippage based on liquidity and trade size
    const buySlippage = opportunity.fees.slippage / 2 // Assuming half from each side
    const sellSlippage = opportunity.fees.slippage / 2
    const totalSlippage = buySlippage + sellSlippage

    if (totalSlippage > this.config.maxSlippageTolerance) {
      score += 20
      warnings.push(`High expected slippage: ${totalSlippage.toFixed(2)}%`)
      this.generateAlert('HIGH_SLIPPAGE', 'MEDIUM', 
        `High slippage expected: ${totalSlippage.toFixed(2)}%`)
    } else if (totalSlippage > this.config.maxSlippageTolerance * 0.7) {
      score += 10
      warnings.push(`Moderate expected slippage: ${totalSlippage.toFixed(2)}%`)
    }

    return { score, warnings }
  }

  // Gas price risk assessment
  private assessGasPrice(currentGasPrice: number, gasEstimate: number) {
    const warnings: string[] = []
    let score = 0

    const gasPriceGwei = currentGasPrice / 1e9 // Convert to gwei

    if (gasPriceGwei > this.config.maxGasPrice) {
      score += 25
      warnings.push(`High gas price: ${gasPriceGwei.toFixed(1)} gwei`)
      this.generateAlert('HIGH_GAS', 'MEDIUM', 
        `High gas price: ${gasPriceGwei.toFixed(1)} gwei`)
    } else if (gasPriceGwei > this.config.maxGasPrice * 0.8) {
      score += 10
      warnings.push(`Elevated gas price: ${gasPriceGwei.toFixed(1)} gwei`)
    }

    // Check gas cost vs profit ratio
    const gasCostUSD = (gasEstimate * currentGasPrice * 2500) / 1e18 // Assuming ETH = $2500
    // This should come from the opportunity object, but approximating here

    return { score, warnings }
  }

  // Confidence and AI score assessment
  private assessConfidence(opportunity: ArbitrageOpportunity) {
    const warnings: string[] = []
    let score = 0

    if (opportunity.confidence < 0.5) {
      score += 30
      warnings.push(`Very low confidence: ${(opportunity.confidence * 100).toFixed(1)}%`)
    } else if (opportunity.confidence < 0.7) {
      score += 15
      warnings.push(`Low confidence: ${(opportunity.confidence * 100).toFixed(1)}%`)
    } else if (opportunity.confidence < 0.8) {
      score += 5
    }

    if (opportunity.aiScore < 60) {
      score += 15
      warnings.push(`Low AI score: ${opportunity.aiScore}`)
    } else if (opportunity.aiScore < 75) {
      score += 5
    }

    // Risk warnings from opportunity
    if (opportunity.risks.length > 3) {
      score += 10
      warnings.push(`Multiple risks identified: ${opportunity.risks.length}`)
    } else if (opportunity.risks.length > 1) {
      score += 5
    }

    return { score, warnings }
  }

  // Daily volume risk assessment
  private assessDailyVolume(tradeValue: number) {
    const warnings: string[] = []
    let score = 0

    const projectedVolume = this.metrics.dailyVolume + tradeValue

    if (projectedVolume > this.config.maxDailyVolume) {
      score += 20
      warnings.push(`Daily volume limit exceeded: $${projectedVolume.toFixed(2)}`)
      this.generateAlert('DAILY_LIMIT_EXCEEDED', 'HIGH', 
        `Daily volume limit exceeded: $${projectedVolume.toFixed(2)}`)
    } else if (projectedVolume > this.config.maxDailyVolume * 0.9) {
      score += 10
      warnings.push(`Approaching daily volume limit`)
    }

    return { score, warnings }
  }

  // Historical performance risk assessment
  private assessHistoricalPerformance() {
    const warnings: string[] = []
    let score = 0

    if (this.metrics.consecutiveFailures >= 5) {
      score += 25
      warnings.push(`High consecutive failures: ${this.metrics.consecutiveFailures}`)
      this.generateAlert('CONSECUTIVE_FAILURES', 'HIGH', 
        `${this.metrics.consecutiveFailures} consecutive failures`)
    } else if (this.metrics.consecutiveFailures >= 3) {
      score += 10
      warnings.push(`Multiple consecutive failures`)
    }

    if (this.metrics.currentDrawdown > this.config.maxDrawdown * 0.8) {
      score += 20
      warnings.push(`High drawdown: ${this.metrics.currentDrawdown.toFixed(2)}%`)
    } else if (this.metrics.currentDrawdown > this.config.maxDrawdown * 0.6) {
      score += 10
      warnings.push(`Moderate drawdown: ${this.metrics.currentDrawdown.toFixed(2)}%`)
    }

    return { score, warnings }
  }

  // Update metrics after trade execution
  updateMetrics(trade: {
    success: boolean
    tradeSize: number
    profit: number
    gasUsed: number
    timestamp: number
  }) {
    // Update daily volume
    this.metrics.dailyVolume += trade.tradeSize

    // Update gas usage
    this.metrics.gasUsageToday += trade.gasUsed

    if (trade.success) {
      // Reset consecutive failures on success
      this.metrics.consecutiveFailures = 0
      
      // Update drawdown (reduce if profitable)
      if (trade.profit > 0) {
        this.metrics.currentDrawdown = Math.max(0, this.metrics.currentDrawdown - (trade.profit / trade.tradeSize) * 100)
      }
    } else {
      // Update failure metrics
      this.metrics.consecutiveFailures++
      this.metrics.lastFailureTime = trade.timestamp
      this.metrics.recentLosses += Math.abs(trade.profit)

      // Update drawdown
      const lossPercentage = Math.abs(trade.profit) / trade.tradeSize * 100
      this.metrics.currentDrawdown += lossPercentage

      // Check circuit breaker
      if (this.metrics.recentLosses > this.config.circuitBreakerThreshold) {
        this.triggerCircuitBreaker()
      }
    }

    // Update total risk score
    this.updateRiskScore()
  }

  // Circuit breaker functions
  private triggerCircuitBreaker() {
    this.circuitBreakerActive = true
    this.circuitBreakerStartTime = Date.now()
    
    this.generateAlert('CIRCUIT_BREAKER', 'CRITICAL', 
      `Circuit breaker activated: $${this.metrics.recentLosses.toFixed(2)} losses`)
    
    console.log('🔴 CIRCUIT BREAKER ACTIVATED - Trading suspended')
  }

  private isCircuitBreakerActive(): boolean {
    if (!this.circuitBreakerActive) return false

    // Check if cooldown period has elapsed
    if (Date.now() - this.circuitBreakerStartTime > this.config.cooldownPeriod) {
      this.circuitBreakerActive = false
      this.metrics.recentLosses = 0 // Reset losses
      console.log('🟢 Circuit breaker deactivated - Trading resumed')
      return false
    }

    return true
  }

  // Generate risk alerts
  private generateAlert(event: RiskEvent, severity: RiskAlert['severity'], message: string, data?: any) {
    const alert: RiskAlert = {
      event,
      severity,
      message,
      timestamp: Date.now(),
      data
    }

    this.alerts.push(alert)
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }

    // Notify callbacks
    this.callbacks.forEach(callback => callback(alert))

    console.log(`🚨 Risk Alert [${severity}]: ${message}`)
  }

  // Update overall risk score
  private updateRiskScore() {
    let score = 0

    // Drawdown risk
    score += (this.metrics.currentDrawdown / this.config.maxDrawdown) * 30

    // Consecutive failures risk
    score += Math.min(this.metrics.consecutiveFailures * 5, 25)

    // Daily volume risk
    score += (this.metrics.dailyVolume / this.config.maxDailyVolume) * 20

    // Recent losses risk
    score += Math.min((this.metrics.recentLosses / this.config.circuitBreakerThreshold) * 25, 25)

    this.metrics.totalRisk = Math.min(score, 100)
  }

  // Schedule daily metrics reset
  private scheduleDailyReset() {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime()

    setTimeout(() => {
      this.resetDailyMetrics()
      // Schedule next reset
      setInterval(() => this.resetDailyMetrics(), 24 * 60 * 60 * 1000)
    }, msUntilMidnight)
  }

  private resetDailyMetrics() {
    this.metrics.dailyVolume = 0
    this.metrics.gasUsageToday = 0
    console.log('📅 Daily risk metrics reset')
  }

  // Public methods for external use

  // Get current risk metrics
  getRiskMetrics(): RiskMetrics {
    return { ...this.metrics }
  }

  // Get risk configuration
  getRiskConfig(): RiskConfig {
    return { ...this.config }
  }

  // Update risk configuration
  updateConfig(newConfig: Partial<RiskConfig>) {
    this.config = { ...this.config, ...newConfig }
    console.log('⚙️ Risk configuration updated')
  }

  // Get recent alerts
  getRecentAlerts(limit: number = 20): RiskAlert[] {
    return this.alerts.slice(-limit)
  }

  // Subscribe to risk alerts
  onAlert(callback: (alert: RiskAlert) => void) {
    this.callbacks.push(callback)
  }

  // Manual circuit breaker override
  manualCircuitBreakerToggle(active: boolean) {
    this.circuitBreakerActive = active
    if (active) {
      this.circuitBreakerStartTime = Date.now()
    }
    
    console.log(`🔄 Manual circuit breaker ${active ? 'activated' : 'deactivated'}`)
  }

  // Get risk summary for dashboard
  getRiskSummary() {
    return {
      totalRiskScore: this.metrics.totalRisk,
      circuitBreakerActive: this.circuitBreakerActive,
      dailyVolumeUsed: (this.metrics.dailyVolume / this.config.maxDailyVolume) * 100,
      currentDrawdown: this.metrics.currentDrawdown,
      consecutiveFailures: this.metrics.consecutiveFailures,
      recentAlerts: this.getRecentAlerts(5)
    }
  }
}

// Singleton instance
export const riskManager = new RiskManagementSystem()

// Export types
export type { RiskConfig, RiskMetrics, RiskAssessment, RiskAlert, RiskEvent }