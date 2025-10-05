'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useNetwork, useSwitchNetwork } from '../../lib/providers'

// Components
import { Header } from '../../components/Header'
import { NewsSection } from '../../components/NewsSection'

// Types
interface ArbitrageOpportunity {
  id: string
  timestamp: number
  type: 'dex-to-cex' | 'cex-to-dex'
  buyVenue: string
  sellVenue: string
  buyPrice: number
  sellPrice: number
  spreadPercentage: number
  profitAfterFees: number
  confidence: number
  minTradeSize: number
  maxTradeSize: number
  gasEstimate: number
  executionTimeWindow: number
  risks: string[]
  aiScore: number
  status: 'active' | 'executing' | 'completed' | 'failed'
}

interface MarketData {
  lastUpdate: number
  bestDEXPrice: number
  bestCEXPrice: number
  priceCount: {
    dex: number
    cex: number
  }
}

interface UserStats {
  totalTrades: number
  successfulTrades: number
  totalProfit: number
  winRate: number
  avgProfit: number
}

export default function ProductionDashboard() {
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()
  const { switchNetwork } = useSwitchNetwork()
  
  // State
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([])
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    minSpread: 0.1,
    minProfit: 5,
    maxGas: 30,
    minConfidence: 0.5,
    type: 'all'
  })
  
  // Auto-refresh data every 10 seconds (reduced from 2 for stability)
  useEffect(() => {
    fetchOpportunities()
    
    const interval = setInterval(() => {
      fetchOpportunities()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [filters])

  const fetchOpportunities = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const queryParams = new URLSearchParams({
        limit: '20',
        minSpread: filters.minSpread.toString(),
        minProfit: filters.minProfit.toString(),
        maxGas: filters.maxGas.toString(),
        minConfidence: filters.minConfidence.toString(),
        ...(filters.type !== 'all' && { type: filters.type })
      })
      
      const response = await fetch(`/api/arbitrage/opportunities?${queryParams}`)
      const data = await response.json()
      
      if (data.success) {
        setOpportunities(data.data.opportunities || [])
        setMarketData(data.data.market)
        
        // Generate mock user stats for demonstration
        setUserStats({
          totalTrades: Math.floor(Math.random() * 50) + 10,
          successfulTrades: Math.floor(Math.random() * 40) + 8,
          totalProfit: parseFloat((Math.random() * 500 + 50).toFixed(2)),
          winRate: parseFloat((Math.random() * 30 + 70).toFixed(1)),
          avgProfit: parseFloat((Math.random() * 20 + 5).toFixed(2))
        })
      } else {
        setError(data.error || 'Failed to fetch opportunities')
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error)
      setError(error instanceof Error ? error.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const executeArbitrage = async (opportunity: ArbitrageOpportunity) => {
    setIsExecuting(true)
    setSelectedOpportunity(opportunity)
    
    try {
      // In production, this would call the smart contract
      console.log('Executing arbitrage:', opportunity)
      
      // Mock execution delay
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Update opportunity status
      setOpportunities(prev => 
        prev.map(opp => 
          opp.id === opportunity.id 
            ? { ...opp, status: 'completed' as const }
            : opp
        )
      )
      
      // Refresh data
      await fetchOpportunities()
      
    } catch (error) {
      console.error('Arbitrage execution failed:', error)
      
      // Update opportunity status to failed
      setOpportunities(prev => 
        prev.map(opp => 
          opp.id === opportunity.id 
            ? { ...opp, status: 'failed' as const }
            : opp
        )
      )
    } finally {
      setIsExecuting(false)
      setSelectedOpportunity(null)
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400'
      case 'executing': return 'text-yellow-400'
      case 'completed': return 'text-blue-400'
      case 'failed': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400'
    if (confidence >= 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const formatVenue = (venue: string) => {
    const venueMap: { [key: string]: string } = {
      'uniswap-v3-500': 'Uniswap V3',
      'uniswap-v3-3000': 'Uniswap V3',
      'sushiswap': 'SushiSwap',
      'aerodrome': 'Aerodrome',
      'binance': 'Binance',
      'backpack': 'Backpack'
    }
    return venueMap[venue] || venue
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <Header />
      
      <div className="container mx-auto px-4 pt-24">
        {/* Market Status Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">
              🚀 Production Arbitrage Dashboard
            </h1>
            
            <div className="flex items-center space-x-4 text-sm text-gray-300">
              {/* Network Status */}
              {isConnected && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    chain?.id === 8453 ? 'bg-blue-400' : 'bg-yellow-400'
                  }`}></div>
                  <span>{chain?.name || 'Unknown'}</span>
                  {chain?.id !== 8453 && switchNetwork && (
                    <button
                      onClick={() => switchNetwork(8453)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                    >
                      Switch to Base
                    </button>
                  )}
                </div>
              )}
              
              {/* Market Data Status */}
              {marketData && (
                <>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      marketData.priceCount.dex > 0 ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                    }`}></div>
                    <span>{marketData.priceCount.dex > 0 ? 'Live Data' : 'Connecting...'}</span>
                  </div>
                  <span>DEX: {marketData.priceCount.dex} feeds</span>
                  <span>CEX: {marketData.priceCount.cex} feeds</span>
                  <span>Updated: {formatTimeAgo(marketData.lastUpdate)}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Stats Cards */}
          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Total Trades</div>
                <div className="text-white text-2xl font-bold">{userStats.totalTrades}</div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Success Rate</div>
                <div className="text-green-400 text-2xl font-bold">{userStats.winRate}%</div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Total Profit</div>
                <div className="text-green-400 text-2xl font-bold">${userStats.totalProfit}</div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Avg Profit</div>
                <div className="text-blue-400 text-2xl font-bold">${userStats.avgProfit}</div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Opportunities</div>
                <div className="text-purple-400 text-2xl font-bold">{opportunities.length}</div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 mb-6">
              <div className="text-red-400 font-semibold">⚠️ System Error</div>
              <div className="text-red-300 text-sm mt-1">{error}</div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-3">🔍 Filters & Controls</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <label className="text-gray-400 text-sm">Min Spread (%)</label>
              <input
                type="number"
                step="0.1"
                value={filters.minSpread}
                onChange={(e) => setFilters(prev => ({ ...prev, minSpread: parseFloat(e.target.value) || 0 }))}
                className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            
            <div>
              <label className="text-gray-400 text-sm">Min Profit ($)</label>
              <input
                type="number"
                value={filters.minProfit}
                onChange={(e) => setFilters(prev => ({ ...prev, minProfit: parseFloat(e.target.value) || 0 }))}
                className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            
            <div>
              <label className="text-gray-400 text-sm">Max Gas ($)</label>
              <input
                type="number"
                value={filters.maxGas}
                onChange={(e) => setFilters(prev => ({ ...prev, maxGas: parseFloat(e.target.value) || 100 }))}
                className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            
            <div>
              <label className="text-gray-400 text-sm">Min Confidence</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={filters.minConfidence}
                onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: parseFloat(e.target.value) || 0 }))}
                className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            
            <div>
              <label className="text-gray-400 text-sm">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="all">All Types</option>
                <option value="dex-to-cex">DEX → CEX</option>
                <option value="cex-to-dex">CEX → DEX</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={fetchOpportunities}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
              >
                {isLoading ? '⏳' : '🔄'} Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white flex items-center">
              ⚡ Live Arbitrage Opportunities
              <span className="ml-3 text-sm text-gray-400">({opportunities.length} found)</span>
              {opportunities.length > 0 && (
                <div className="ml-auto flex items-center space-x-2 text-sm text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Real-time</span>
                </div>
              )}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left p-3 text-gray-300 text-sm">Route</th>
                  <th className="text-left p-3 text-gray-300 text-sm">Spread</th>
                  <th className="text-left p-3 text-gray-300 text-sm">Profit</th>
                  <th className="text-left p-3 text-gray-300 text-sm">AI Score</th>
                  <th className="text-left p-3 text-gray-300 text-sm">Type</th>
                  <th className="text-left p-3 text-gray-300 text-sm">Status</th>
                  <th className="text-left p-3 text-gray-300 text-sm">Action</th>
                </tr>
              </thead>
              
              <tbody>
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-gray-400">
                      {isLoading ? (
                        <div>
                          <div className="mb-2">🔍 Scanning for opportunities...</div>
                          <div className="text-sm">Initializing price feeds and detection system...</div>
                        </div>
                      ) : error ? (
                        <div>
                          <div className="mb-2">❌ System Error</div>
                          <div className="text-sm">Please check your connection and try refreshing</div>
                        </div>
                      ) : (marketData?.priceCount?.dex || 0) > 0 ? (
                        <div>
                          <div className="mb-2">📊 No opportunities match current filters</div>
                          <div className="text-sm">Try adjusting your minimum profit or spread requirements</div>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-2">🔌 Connecting to price feeds...</div>
                          <div className="text-sm">Starting price discovery engine...</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opportunity) => (
                    <tr 
                      key={opportunity.id}
                      className="border-b border-gray-700/50 hover:bg-gray-700/25 transition-colors"
                    >
                      <td className="p-3">
                        <div className="text-white text-sm font-medium">
                          {formatVenue(opportunity.buyVenue)} → {formatVenue(opportunity.sellVenue)}
                        </div>
                        <div className="text-gray-400 text-xs">
                          WETH/USDC • {formatTimeAgo(opportunity.timestamp)}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="text-green-400 font-bold">
                          {(opportunity.spreadPercentage || 0).toFixed(3)}%
                        </div>
                        <div className="text-gray-400 text-xs">
                          Live spread
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="text-green-400 font-bold">
                          ${(opportunity.profitAfterFees || 0).toFixed(2)}
                        </div>
                        <div className="text-gray-400 text-xs">
                          After fees
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className={`font-bold ${getConfidenceColor(opportunity.confidence || opportunity.aiScore / 100)}`}>
                          {Math.round(opportunity.aiScore || (opportunity.confidence * 100) || 0)}/100
                        </div>
                        <div className="text-gray-400 text-xs">
                          AI Analysis
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="text-purple-400 text-sm font-medium capitalize">
                          {(opportunity.type || 'dex-to-dex').replace('-', ' → ')}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className={`text-sm font-medium capitalize ${getStatusColor(opportunity.status || 'active')}`}>
                          {opportunity.status || 'active'}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        {(!opportunity.status || opportunity.status === 'active') && (
                          <button
                            onClick={() => executeArbitrage(opportunity)}
                            disabled={isExecuting}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                              isExecuting
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : (opportunity.confidence || opportunity.aiScore / 100) >= 0.8
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            }`}
                          >
                            {isExecuting && selectedOpportunity?.id === opportunity.id ? '⏳' : '🚀'} Execute
                          </button>
                        )}
                        
                        {opportunity.status === 'executing' && (
                          <div className="text-yellow-400 text-xs animate-pulse">
                            ⏳ Executing...
                          </div>
                        )}
                        
                        {opportunity.status === 'completed' && (
                          <div className="text-green-400 text-xs">
                            ✅ Completed
                          </div>
                        )}
                        
                        {opportunity.status === 'failed' && (
                          <div className="text-red-400 text-xs">
                            ❌ Failed
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* News Section */}
        <div className="mt-8">
          <NewsSection />
        </div>

        {/* Risk Warnings */}
        <div className="mt-6 bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
          <h3 className="text-yellow-400 font-semibold mb-2">⚠️ Risk Disclaimer</h3>
          <ul className="text-yellow-300 text-sm space-y-1">
            <li>• Arbitrage trading involves significant financial risk</li>
            <li>• Past performance does not guarantee future results</li>
            <li>• Always verify opportunities before execution</li>
            <li>• Consider gas costs and slippage in your calculations</li>
            <li>• Use only funds you can afford to lose</li>
          </ul>
        </div>
      </div>
    </div>
  )
}