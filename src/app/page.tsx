'use client'

import { useState } from 'react'
import { RefreshCw, TrendingUp, Zap, Star } from 'lucide-react'

export default function SimpleDashboard() {
  const [isScanning, setIsScanning] = useState(false)
  const [autoScan, setAutoScan] = useState(false)
  
  // Mock opportunity data
  const opportunities = [
    {
      id: '1',
      pair: 'WETH/USDC',
      spread: 0.75,
      profit: '0.025',
      confidence: 4,
      exchanges: ['Uniswap', 'SushiSwap'],
      risk: 'LOW'
    },
    {
      id: '2', 
      pair: 'USDC/DAI',
      spread: 0.42,
      profit: '0.012',
      confidence: 5,
      exchanges: ['Aerodrome', 'PancakeSwap'],
      risk: 'LOW'
    },
    {
      id: '3',
      pair: 'WETH/DAI', 
      spread: 1.15,
      profit: '0.048',
      confidence: 3,
      exchanges: ['Uniswap', 'Aerodrome'],
      risk: 'MEDIUM'
    }
  ]

  const handleScan = () => {
    setIsScanning(true)
    setTimeout(() => setIsScanning(false), 2000)
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
            <div className="text-sm text-gray-400">Demo Mode</div>
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
            {isScanning ? (
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 animate-pulse text-green-400" />
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

        {/* Opportunities */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Opportunities</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <TrendingUp className="w-4 h-4" />
              <span>{opportunities.length} found</span>
            </div>
          </div>

          <div className="space-y-3">
            {opportunities.map((opp) => (
              <div key={opp.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-lg">{opp.pair}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        opp.risk === 'LOW' ? 'bg-green-900 text-green-200' :
                        opp.risk === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-red-900 text-red-200'
                      }`}>
                        {opp.risk}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>{opp.exchanges[0]}</span>
                      <span>→</span>
                      <span>{opp.exchanges[1]}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-400">
                      {opp.spread.toFixed(2)}%
                    </div>
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < opp.confidence ? 'text-yellow-400 fill-current' : 'text-gray-500'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-gray-400">Estimated Profit</div>
                    <div className="font-semibold text-green-400">+{opp.profit} ETH</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400">Gas Estimate</div>
                    <div className="text-gray-300">0.005 ETH</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    Expires in 5m
                  </div>
                  
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                    Execute Trade
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg text-center text-sm text-gray-400">
          <p>🤖 Opportunities analyzed by AI • ⛽ Gas estimates included</p>
          <p className="mt-1">Demo mode - Connect wallet to trade</p>
        </div>
      </div>
    </div>
  )
}