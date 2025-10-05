'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp, Zap, Star, Activity } from 'lucide-react'
import Link from 'next/link'
import { NewsSection } from '../../components/NewsSection'

interface Opportunity {
  id: string
  type: string
  tokenPair: string
  buyVenue: string
  sellVenue: string
  spread: number
  profit: number
  confidence: number
  aiScore: number
}

interface ApiResponse {
  success: boolean
  data: {
    opportunities: Opportunity[]
    stats: {
      total: number
      averageSpread: number
      averageProfit: number
      totalPotentialProfit: number
      highConfidenceCount: number
    }
    market: {
      lastUpdate: number
      bestDEXPrice: number
      bestCEXPrice: number
      priceCount: {
        dex: number
        cex: number
      }
    }
  }
}

export default function LiveDashboard() {
  const [isScanning, setIsScanning] = useState(false)
  const [autoScan, setAutoScan] = useState(true)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [stats, setStats] = useState<any>(null)
  const [market, setMarket] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch opportunities from API
  const fetchOpportunities = async () => {
    try {
      setIsScanning(true)
      setError(null)
      
      const response = await fetch('/api/arbitrage/opportunities?limit=10')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: ApiResponse = await response.json()
      
      if (data.success) {
        setOpportunities(data.data.opportunities)
        setStats(data.data.stats)
        setMarket(data.data.market)
        setLastUpdate(new Date())
      } else {
        throw new Error('API returned error')
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch data')
    } finally {
      setIsScanning(false)
    }
  }
  
  // Auto-fetch on mount and every 30 seconds if autoScan is enabled
  useEffect(() => {
    fetchOpportunities()
    
    if (autoScan) {
      const interval = setInterval(fetchOpportunities, 30000) // 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoScan])
  
  const handleScan = () => {
    fetchOpportunities()
  }
  
  // Format venue names for display
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
  
  // Calculate risk level based on confidence and spread
  const getRiskLevel = (confidence: number, spread: number) => {
    if (confidence > 0.8 && spread < 2) return 'LOW'
    if (confidence > 0.6 && spread < 5) return 'MEDIUM'
    return 'HIGH'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">ArbiTips</h1>
              <p className="text-xs text-gray-400">AI Arbitrage Scanner</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                market?.priceCount?.dex > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              <div className="text-sm text-gray-400">
                {market?.priceCount?.dex > 0 ? 'Live Data' : 'Connecting...'}
              </div>
            </div>
            {lastUpdate && (
              <div className="text-xs text-gray-500">
                {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </header>

        {/* Scanner Controls */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full transition-colors ${
                isScanning || autoScan ? 'bg-green-500' : 'bg-gray-500'
              }`} />
              <span className="font-medium">Scanner</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoScan}
                  onChange={(e) => setAutoScan(e.target.checked)}
                  className="rounded"
                />
                <span>Auto</span>
              </label>
              
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>Scan</span>
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            {error ? (
              <div className="flex items-center space-x-2 text-red-400">
                <Activity className="w-4 h-4" />
                <span>Error: {error}</span>
              </div>
            ) : isScanning ? (
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 animate-pulse text-green-400" />
                <span>Scanning live markets for opportunities...</span>
              </div>
            ) : autoScan ? (
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-green-500" />
                <span>Auto-scan enabled • DEX: {market?.priceCount?.dex || 0} • CEX: {market?.priceCount?.cex || 0}</span>
              </div>
            ) : (
              <span>Ready to scan • Click scan or enable auto-scan</span>
            )}
          </div>
        </div>

        {/* Opportunities */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Opportunities</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <TrendingUp className="w-4 h-4" />
              <span>{opportunities.length} found</span>
              {stats && (
                <span className="text-xs">
                  • Avg: {stats.averageSpread?.toFixed(2) || 0}% 
                  • High confidence: {stats.highConfidenceCount || 0}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {opportunities.length === 0 ? (
              <div className="bg-gray-800/50 rounded-lg p-8 text-center">
                <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">
                  {isScanning ? 'Scanning for opportunities...' : 
                   error ? 'System error - please try again' :
                   market?.priceCount?.dex > 0 ? 'No profitable opportunities found' :
                   'Starting price feeds...'}
                </p>
                {!error && market?.priceCount?.dex === 0 && (
                  <p className="text-sm text-gray-500">
                    Connecting to Base DEXs and exchanges...
                  </p>
                )}
              </div>
            ) : (
              opportunities.map((opp) => {
                const riskLevel = getRiskLevel(opp.confidence, opp.spread)
                const confidenceStars = Math.round((opp.confidence || opp.aiScore / 100) * 5)
                
                return (
                  <div key={opp.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-lg">{opp.tokenPair || 'WETH/USDC'}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            riskLevel === 'LOW' ? 'bg-green-900 text-green-200' :
                            riskLevel === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
                            'bg-red-900 text-red-200'
                          }`}>
                            {riskLevel}
                          </span>
                          <span className="px-2 py-1 bg-blue-900 text-blue-200 rounded-full text-xs">
                            {opp.type}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>{formatVenue(opp.buyVenue)}</span>
                          <span>→</span>
                          <span>{formatVenue(opp.sellVenue)}</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-400">
                          {opp.spread?.toFixed(2) || '0.00'}%
                        </div>
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < confidenceStars ? 'text-yellow-400 fill-current' : 'text-gray-500'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <div className="text-gray-400">Estimated Profit</div>
                        <div className="font-semibold text-green-400">${(opp.profit || 0).toFixed(2)}</div>
                      </div>
                      
                      <div>
                        <div className="text-gray-400">AI Score</div>
                        <div className="text-yellow-400">{Math.round(opp.aiScore || opp.confidence * 100 || 0)}/100</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        Live opportunity
                      </div>
                      
                      <Link 
                        href="/dashboard-production"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* News Section */}
        <div className="mt-8">
          <NewsSection />
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg text-center text-sm text-gray-400">
          <p>🤖 Live opportunities analyzed by AI • ⛽ Real-time gas estimates</p>
          <div className="mt-2 flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Base Network</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live Data</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Production</span>
            </div>
          </div>
          <p className="mt-2 text-xs">
            <Link href="/dashboard-production" className="text-blue-400 hover:text-blue-300">
              Full Dashboard
            </Link>
            {' • '}
            Connect wallet to execute trades
          </p>
        </div>
      </div>
    </div>
  )
}