'use client'

import { useState } from 'react'
import { ArbitrageOpportunity, UserStats as UserStatsType } from '@/types'
import { formatCurrency, formatPercentage, formatTimeAgo, cn } from '@/lib/utils'
import { 
  RefreshCw, 
  Zap, 
  Star, 
  Share2, 
  Play, 
  TrendingUp, 
  Trophy,
  Target,
  DollarSign,
  Activity,
  Clock
} from 'lucide-react'

// Loading Spinner Component
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

// Scanner Component
interface ScannerProps {
  isScanning: boolean
  autoScan: boolean
  onScanNow: () => void
  onAutoScanToggle: (enabled: boolean) => void
}

export function Scanner({ isScanning, autoScan, onScanNow, onAutoScanToggle }: ScannerProps) {
  return (
    <div className="mobile-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-3 h-3 rounded-full transition-colors duration-200",
            isScanning || autoScan ? "bg-green-500 scanner-pulse" : "bg-gray-400"
          )} />
          <span className="font-medium">Scanner</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoScan}
              onChange={(e) => onAutoScanToggle(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Auto</span>
          </label>
          
          <button
            onClick={onScanNow}
            disabled={isScanning}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isScanning && "animate-spin")} />
            <span>Scan</span>
          </button>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground">
        {isScanning ? (
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>Scanning DEXs for arbitrage opportunities...</span>
          </div>
        ) : autoScan ? (
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-green-500" />
            <span>Auto-scanning enabled • Next scan in 30s</span>
          </div>
        ) : (
          <span>Ready to scan • Click scan or enable auto-scan</span>
        )}
      </div>
    </div>
  )
}

// Confidence Stars Component
function ConfidenceStars({ score }: { score: number }) {
  const stars = Math.round(score * 5)
  
  return (
    <div className="confidence-stars">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            "confidence-star",
            i < stars ? "filled" : "empty"
          )}
          fill={i < stars ? "currentColor" : "none"}
        />
      ))}
    </div>
  )
}

// Opportunity Card Component
interface OpportunityCardProps {
  opportunity: ArbitrageOpportunity
  onExecute: () => void
  onShare: () => void
}

export function OpportunityCard({ opportunity, onExecute, onShare }: OpportunityCardProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  
  const handleExecute = async () => {
    setIsExecuting(true)
    try {
      await onExecute()
    } finally {
      setIsExecuting(false)
    }
  }
  
  const netProfit = parseFloat(opportunity.estimatedProfit.net)
  const isProfit = netProfit > 0
  
  return (
    <div className="opportunity-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-lg">
              {opportunity.tokenPair.tokenA.symbol}/{opportunity.tokenPair.tokenB.symbol}
            </span>
            <span className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              `risk-${opportunity.riskLevel.toLowerCase()}`
            )}>
              {opportunity.riskLevel}
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: opportunity.exchanges.buyExchange.color }}
              />
              <span>{opportunity.exchanges.buyExchange.displayName}</span>
            </div>
            <span>→</span>
            <div className="flex items-center space-x-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: opportunity.exchanges.sellExchange.color }}
              />
              <span>{opportunity.exchanges.sellExchange.displayName}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold text-primary">
            {formatPercentage(opportunity.spread.percentage)}
          </div>
          <ConfidenceStars score={opportunity.aiConfidence.score} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-muted-foreground">Estimated Profit</div>
          <div className={cn(
            "font-semibold",
            isProfit ? "profit-positive" : "profit-negative"
          )}>
            {isProfit ? '+' : ''}{opportunity.estimatedProfit.net} ETH
          </div>
        </div>
        
        <div>
          <div className="text-muted-foreground">Gas Estimate</div>
          <div>{opportunity.estimatedProfit.gasEstimate} ETH</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Expires in {Math.floor(opportunity.timeToExpiry / 60)}m</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onShare}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleExecute}
            disabled={isExecuting || !isProfit}
            className="inline-flex items-center space-x-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Play className={cn("w-4 h-4", isExecuting && "animate-spin")} />
            <span>{isExecuting ? 'Executing...' : 'Execute'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// User Stats Component
interface UserStatsProps {
  stats: UserStatsType
}

export function UserStats({ stats }: UserStatsProps) {
  return (
    <div className="mobile-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Your Stats</h3>
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Trophy className="w-4 h-4" />
          <span>#{stats.rank}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold profit-positive">
            {formatPercentage(stats.winRate * 100, 1)}
          </div>
          <div className="text-xs text-muted-foreground">Win Rate</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold">
            {stats.totalProfit} ETH
          </div>
          <div className="text-xs text-muted-foreground">Total Profit</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold">
            {stats.totalTrades}
          </div>
          <div className="text-xs text-muted-foreground">Total Trades</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold">
            {stats.avgProfit} ETH
          </div>
          <div className="text-xs text-muted-foreground">Avg Profit</div>
        </div>
      </div>
    </div>
  )
}