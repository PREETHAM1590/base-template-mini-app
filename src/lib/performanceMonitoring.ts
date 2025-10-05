// Performance monitoring system for ArbiTips
import { ArbitrageOpportunity } from './opportunityDetection'

// Trade execution record
interface TradeExecution {
  id: string
  timestamp: number
  opportunity: ArbitrageOpportunity
  executionTime: number // milliseconds
  gasUsed: number
  gasCost: number
  success: boolean
  actualProfit: number
  slippage: number
  errors?: string[]
}

// Performance metrics
interface PerformanceMetrics {
  // Overall Performance
  totalTrades: number
  successfulTrades: number
  failedTrades: number
  winRate: number
  
  // Profitability
  totalProfit: number
  totalLoss: number
  netProfit: number
  avgProfit: number
  avgLoss: number
  profitFactor: number // Total profit / Total loss
  
  // Execution Performance
  avgExecutionTime: number
  minExecutionTime: number
  maxExecutionTime: number
  
  // Gas Metrics
  totalGasUsed: number
  avgGasUsed: number
  totalGasCost: number
  avgGasCost: number
  
  // Risk Metrics
  maxDrawdown: number
  currentDrawdown: number
  sharpeRatio: number
  volatility: number
  
  // Trading Metrics
  avgTradeSize: number
  totalVolume: number
  bestTrade: number
  worstTrade: number
  
  // Opportunity Metrics
  opportunitiesFound: number
  opportunitiesExecuted: number
  executionRate: number
  
  // Time-based metrics
  tradesPerHour: number
  profitPerHour: number
  
  // Latest update
  lastUpdate: number
}

// Daily performance summary
interface DailyPerformance {
  date: string
  trades: number
  profit: number
  volume: number
  winRate: number
  avgProfit: number
  bestTrade: number
  gasUsed: number
  executionTime: number
}

// Real-time analytics
interface RealtimeAnalytics {
  timestamp: number
  
  // Current session
  sessionTrades: number
  sessionProfit: number
  sessionVolume: number
  sessionStartTime: number
  
  // Recent performance (last 24 hours)
  recentTrades: TradeExecution[]
  recentProfit: number
  recentWinRate: number
  
  // Market conditions
  marketVolatility: number
  avgSpread: number
  avgOpportunityCount: number
  
  // System performance
  avgApiLatency: number
  systemUptime: number
  errorRate: number
}

export class PerformanceMonitoringSystem {
  private trades: TradeExecution[] = []
  private dailyStats: Map<string, DailyPerformance> = new Map()
  private metrics: PerformanceMetrics
  private analytics: RealtimeAnalytics
  private callbacks: Array<(metrics: PerformanceMetrics) => void> = []
  
  // Configuration
  private maxTradeHistory = 10000 // Keep last 10k trades
  private maxDailyHistory = 365   // Keep 1 year of daily stats

  constructor() {
    this.metrics = this.initializeMetrics()
    this.analytics = this.initializeAnalytics()
    
    // Schedule periodic calculations
    setInterval(() => this.updateMetrics(), 60000) // Update every minute
    setInterval(() => this.calculateRealtimeAnalytics(), 10000) // Update analytics every 10s
    
    // Daily reset at midnight
    this.scheduleDailyReset()
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      winRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      netProfit: 0,
      avgProfit: 0,
      avgLoss: 0,
      profitFactor: 0,
      avgExecutionTime: 0,
      minExecutionTime: 0,
      maxExecutionTime: 0,
      totalGasUsed: 0,
      avgGasUsed: 0,
      totalGasCost: 0,
      avgGasCost: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      sharpeRatio: 0,
      volatility: 0,
      avgTradeSize: 0,
      totalVolume: 0,
      bestTrade: 0,
      worstTrade: 0,
      opportunitiesFound: 0,
      opportunitiesExecuted: 0,
      executionRate: 0,
      tradesPerHour: 0,
      profitPerHour: 0,
      lastUpdate: Date.now()
    }
  }

  private initializeAnalytics(): RealtimeAnalytics {
    return {
      timestamp: Date.now(),
      sessionTrades: 0,
      sessionProfit: 0,
      sessionVolume: 0,
      sessionStartTime: Date.now(),
      recentTrades: [],
      recentProfit: 0,
      recentWinRate: 0,
      marketVolatility: 0,
      avgSpread: 0,
      avgOpportunityCount: 0,
      avgApiLatency: 0,
      systemUptime: Date.now(),
      errorRate: 0
    }
  }

  // Record a completed trade
  recordTrade(execution: TradeExecution) {
    // Add to trade history
    this.trades.push(execution)
    
    // Maintain trade history limit
    if (this.trades.length > this.maxTradeHistory) {
      this.trades = this.trades.slice(-this.maxTradeHistory)
    }
    
    // Update session metrics
    this.analytics.sessionTrades++
    if (execution.success) {
      this.analytics.sessionProfit += execution.actualProfit
    }
    this.analytics.sessionVolume += execution.opportunity.maxTradeSize
    
    // Update daily stats
    this.updateDailyStats(execution)
    
    // Trigger metrics recalculation
    this.updateMetrics()
    
    console.log(`📊 Trade recorded: ${execution.success ? '✅' : '❌'} $${execution.actualProfit.toFixed(2)}`)
  }

  // Record opportunity found (for tracking discovery vs execution rate)
  recordOpportunity(opportunity: ArbitrageOpportunity) {
    this.metrics.opportunitiesFound++
    this.updateExecutionRate()
  }

  // Update all performance metrics
  private updateMetrics() {
    const now = Date.now()
    
    if (this.trades.length === 0) {
      this.metrics.lastUpdate = now
      return
    }

    // Basic counts
    this.metrics.totalTrades = this.trades.length
    this.metrics.successfulTrades = this.trades.filter(t => t.success).length
    this.metrics.failedTrades = this.trades.length - this.metrics.successfulTrades
    this.metrics.winRate = this.metrics.totalTrades > 0 ? 
      (this.metrics.successfulTrades / this.metrics.totalTrades) * 100 : 0

    // Profitability metrics
    const profits = this.trades.filter(t => t.actualProfit > 0).map(t => t.actualProfit)
    const losses = this.trades.filter(t => t.actualProfit < 0).map(t => Math.abs(t.actualProfit))
    
    this.metrics.totalProfit = profits.reduce((sum, p) => sum + p, 0)
    this.metrics.totalLoss = losses.reduce((sum, l) => sum + l, 0)
    this.metrics.netProfit = this.metrics.totalProfit - this.metrics.totalLoss
    this.metrics.avgProfit = profits.length > 0 ? this.metrics.totalProfit / profits.length : 0
    this.metrics.avgLoss = losses.length > 0 ? this.metrics.totalLoss / losses.length : 0
    this.metrics.profitFactor = this.metrics.totalLoss > 0 ? 
      this.metrics.totalProfit / this.metrics.totalLoss : 0

    // Execution performance
    const executionTimes = this.trades.map(t => t.executionTime)
    this.metrics.avgExecutionTime = executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length
    this.metrics.minExecutionTime = Math.min(...executionTimes)
    this.metrics.maxExecutionTime = Math.max(...executionTimes)

    // Gas metrics
    this.metrics.totalGasUsed = this.trades.reduce((sum, t) => sum + t.gasUsed, 0)
    this.metrics.avgGasUsed = this.metrics.totalGasUsed / this.trades.length
    this.metrics.totalGasCost = this.trades.reduce((sum, t) => sum + t.gasCost, 0)
    this.metrics.avgGasCost = this.metrics.totalGasCost / this.trades.length

    // Trading metrics
    const tradeSizes = this.trades.map(t => t.opportunity.maxTradeSize)
    this.metrics.avgTradeSize = tradeSizes.reduce((sum, s) => sum + s, 0) / tradeSizes.length
    this.metrics.totalVolume = tradeSizes.reduce((sum, s) => sum + s, 0)
    
    const allProfits = this.trades.map(t => t.actualProfit)
    this.metrics.bestTrade = Math.max(...allProfits)
    this.metrics.worstTrade = Math.min(...allProfits)

    // Time-based metrics
    const hoursSinceStart = (now - this.analytics.sessionStartTime) / (1000 * 60 * 60)
    this.metrics.tradesPerHour = hoursSinceStart > 0 ? this.metrics.totalTrades / hoursSinceStart : 0
    this.metrics.profitPerHour = hoursSinceStart > 0 ? this.metrics.netProfit / hoursSinceStart : 0

    // Risk metrics
    this.calculateRiskMetrics()

    // Execution rate
    this.updateExecutionRate()

    this.metrics.lastUpdate = now

    // Notify callbacks
    this.callbacks.forEach(callback => callback(this.metrics))
  }

  // Calculate advanced risk metrics
  private calculateRiskMetrics() {
    if (this.trades.length < 2) return

    const profits = this.trades.map(t => t.actualProfit)
    
    // Calculate running drawdown
    let peak = 0
    let currentDrawdown = 0
    let maxDrawdown = 0
    let runningSum = 0

    for (const profit of profits) {
      runningSum += profit
      if (runningSum > peak) {
        peak = runningSum
        currentDrawdown = 0
      } else {
        currentDrawdown = ((peak - runningSum) / peak) * 100
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown)
      }
    }

    this.metrics.currentDrawdown = currentDrawdown
    this.metrics.maxDrawdown = maxDrawdown

    // Calculate Sharpe ratio (simplified)
    const avgReturn = profits.reduce((sum, p) => sum + p, 0) / profits.length
    const variance = profits.reduce((sum, p) => sum + Math.pow(p - avgReturn, 2), 0) / profits.length
    const stdDev = Math.sqrt(variance)
    
    this.metrics.volatility = stdDev
    this.metrics.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0
  }

  // Update execution rate
  private updateExecutionRate() {
    this.metrics.opportunitiesExecuted = this.trades.length
    this.metrics.executionRate = this.metrics.opportunitiesFound > 0 ? 
      (this.metrics.opportunitiesExecuted / this.metrics.opportunitiesFound) * 100 : 0
  }

  // Update daily statistics
  private updateDailyStats(execution: TradeExecution) {
    const dateKey = new Date(execution.timestamp).toISOString().split('T')[0]
    
    let dailyStats = this.dailyStats.get(dateKey)
    if (!dailyStats) {
      dailyStats = {
        date: dateKey,
        trades: 0,
        profit: 0,
        volume: 0,
        winRate: 0,
        avgProfit: 0,
        bestTrade: 0,
        gasUsed: 0,
        executionTime: 0
      }
      this.dailyStats.set(dateKey, dailyStats)
    }

    // Update daily metrics
    dailyStats.trades++
    dailyStats.profit += execution.actualProfit
    dailyStats.volume += execution.opportunity.maxTradeSize
    dailyStats.gasUsed += execution.gasUsed
    dailyStats.executionTime = (dailyStats.executionTime * (dailyStats.trades - 1) + execution.executionTime) / dailyStats.trades
    dailyStats.bestTrade = Math.max(dailyStats.bestTrade, execution.actualProfit)

    // Recalculate daily win rate
    const todaysTrades = this.trades.filter(t => 
      new Date(t.timestamp).toISOString().split('T')[0] === dateKey
    )
    const successfulToday = todaysTrades.filter(t => t.success).length
    dailyStats.winRate = todaysTrades.length > 0 ? (successfulToday / todaysTrades.length) * 100 : 0
    dailyStats.avgProfit = todaysTrades.length > 0 ? dailyStats.profit / todaysTrades.length : 0

    // Maintain daily history limit
    if (this.dailyStats.size > this.maxDailyHistory) {
      const oldestKey = Array.from(this.dailyStats.keys()).sort()[0]
      this.dailyStats.delete(oldestKey)
    }
  }

  // Calculate real-time analytics
  private calculateRealtimeAnalytics() {
    const now = Date.now()
    const last24Hours = now - (24 * 60 * 60 * 1000)
    
    // Recent trades (last 24 hours)
    this.analytics.recentTrades = this.trades.filter(t => t.timestamp > last24Hours)
    this.analytics.recentProfit = this.analytics.recentTrades.reduce((sum, t) => sum + t.actualProfit, 0)
    
    const recentSuccessful = this.analytics.recentTrades.filter(t => t.success).length
    this.analytics.recentWinRate = this.analytics.recentTrades.length > 0 ? 
      (recentSuccessful / this.analytics.recentTrades.length) * 100 : 0

    // Market conditions (simplified calculations)
    if (this.analytics.recentTrades.length > 0) {
      const spreads = this.analytics.recentTrades.map(t => t.opportunity.spreadPercentage)
      this.analytics.avgSpread = spreads.reduce((sum, s) => sum + s, 0) / spreads.length
      
      // Simple volatility calculation
      const profits = this.analytics.recentTrades.map(t => t.actualProfit)
      const avgProfit = profits.reduce((sum, p) => sum + p, 0) / profits.length
      const variance = profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / profits.length
      this.analytics.marketVolatility = Math.sqrt(variance)
    }

    // System uptime
    this.analytics.systemUptime = now - this.analytics.sessionStartTime

    this.analytics.timestamp = now
  }

  // Schedule daily reset
  private scheduleDailyReset() {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime()

    setTimeout(() => {
      this.resetDailySession()
      // Schedule next reset
      setInterval(() => this.resetDailySession(), 24 * 60 * 60 * 1000)
    }, msUntilMidnight)
  }

  private resetDailySession() {
    this.analytics.sessionTrades = 0
    this.analytics.sessionProfit = 0
    this.analytics.sessionVolume = 0
    this.analytics.sessionStartTime = Date.now()
    console.log('📅 Daily performance session reset')
  }

  // Public methods

  // Get current performance metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  // Get real-time analytics
  getAnalytics(): RealtimeAnalytics {
    return { ...this.analytics }
  }

  // Get daily performance data
  getDailyPerformance(days: number = 30): DailyPerformance[] {
    const sortedDays = Array.from(this.dailyStats.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, days)
    
    return sortedDays
  }

  // Get recent trades
  getRecentTrades(limit: number = 50): TradeExecution[] {
    return this.trades.slice(-limit).reverse() // Most recent first
  }

  // Get performance summary for dashboard
  getPerformanceSummary() {
    const metrics = this.getMetrics()
    const analytics = this.getAnalytics()
    
    return {
      // Key performance indicators
      netProfit: metrics.netProfit,
      winRate: metrics.winRate,
      totalTrades: metrics.totalTrades,
      avgProfit: metrics.avgProfit,
      profitFactor: metrics.profitFactor,
      
      // Current session
      sessionProfit: analytics.sessionProfit,
      sessionTrades: analytics.sessionTrades,
      sessionDuration: (Date.now() - analytics.sessionStartTime) / (1000 * 60 * 60), // hours
      
      // Risk metrics
      maxDrawdown: metrics.maxDrawdown,
      currentDrawdown: metrics.currentDrawdown,
      sharpeRatio: metrics.sharpeRatio,
      
      // Efficiency
      avgExecutionTime: metrics.avgExecutionTime,
      tradesPerHour: metrics.tradesPerHour,
      executionRate: metrics.executionRate,
      
      // Latest update
      lastUpdate: metrics.lastUpdate
    }
  }

  // Export performance data
  exportPerformanceData() {
    return {
      metrics: this.getMetrics(),
      analytics: this.getAnalytics(),
      trades: this.trades,
      dailyStats: Array.from(this.dailyStats.values()),
      exportTimestamp: Date.now()
    }
  }

  // Subscribe to metrics updates
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void) {
    this.callbacks.push(callback)
  }

  // Get trade statistics by venue
  getVenueStats() {
    const venueStats = new Map()
    
    this.trades.forEach(trade => {
      const buyVenue = trade.opportunity.buyVenue
      const sellVenue = trade.opportunity.sellVenue
      const key = `${buyVenue}-${sellVenue}`
      
      if (!venueStats.has(key)) {
        venueStats.set(key, {
          route: key,
          trades: 0,
          successfulTrades: 0,
          totalProfit: 0,
          avgExecutionTime: 0,
          winRate: 0
        })
      }
      
      const stats = venueStats.get(key)
      stats.trades++
      if (trade.success) {
        stats.successfulTrades++
        stats.totalProfit += trade.actualProfit
      }
      stats.avgExecutionTime = (stats.avgExecutionTime * (stats.trades - 1) + trade.executionTime) / stats.trades
      stats.winRate = (stats.successfulTrades / stats.trades) * 100
    })
    
    return Array.from(venueStats.values()).sort((a, b) => b.totalProfit - a.totalProfit)
  }

  // Reset all metrics (use with caution)
  resetMetrics() {
    this.trades = []
    this.dailyStats.clear()
    this.metrics = this.initializeMetrics()
    this.analytics = this.initializeAnalytics()
    console.log('🔄 All performance metrics reset')
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitoringSystem()

// Export types
export type { TradeExecution, PerformanceMetrics, DailyPerformance, RealtimeAnalytics }