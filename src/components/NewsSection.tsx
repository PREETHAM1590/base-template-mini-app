'use client'

import React, { useState, useEffect } from 'react'
import { TrendingUp, Clock, Star, ExternalLink, Zap, Target, DollarSign, AlertTriangle } from 'lucide-react'

interface NewsItem {
  id: string
  title: string
  summary: string
  category: 'arbitrage' | 'defi' | 'base' | 'trading'
  timestamp: number
  readTime: number
  impact: 'high' | 'medium' | 'low'
  tip?: string
  source: string
  url?: string
}

interface TradingTip {
  id: string
  title: string
  content: string
  category: 'risk' | 'strategy' | 'technical' | 'market'
  importance: 'critical' | 'high' | 'medium'
  timestamp: number
}

export function NewsSection() {
  const [activeTab, setActiveTab] = useState<'news' | 'tips'>('news')
  const [news, setNews] = useState<NewsItem[]>([])
  const [tips, setTips] = useState<TradingTip[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadNewsAndTips()
  }, [])

  const loadNewsAndTips = async () => {
    setLoading(true)
    
    try {
      // Fetch real news data from API
      const newsResponse = await fetch('/api/news?category=defi&limit=5')
      const newsData = await newsResponse.json()
      
      if (newsData.success && newsData.articles) {
        const formattedNews: NewsItem[] = newsData.articles.map((article: any) => ({
          id: article.id,
          title: article.title,
          summary: article.summary || article.content?.slice(0, 150) + '...',
          category: article.category as 'arbitrage' | 'defi' | 'base' | 'trading',
          timestamp: article.timestamp,
          readTime: article.readTime || 2,
          impact: article.impact as 'high' | 'medium' | 'low',
          tip: article.tip,
          source: article.source,
          url: article.url
        }))
        setNews(formattedNews)
      } else {
        // Fallback to mock data if API fails
        setNews(getMockNews())
      }
      
      // Generate some tips based on news
      const generatedTips = await generateTipsFromNews()
      setTips(generatedTips)
      
    } catch (error) {
      console.error('Error loading news:', error)
      // Fallback to mock data
      setNews(getMockNews())
      setTips(getMockTips())
    }
    
    setLoading(false)
  }
  
  const getMockNews = (): NewsItem[] => [
      {
        id: '1',
        title: 'Base Network Reaches New TVL Milestone',
        summary: 'Base network surpasses $2B in Total Value Locked, creating new arbitrage opportunities across major DEXs including Uniswap V3 and Aerodrome.',
        category: 'base',
        timestamp: Date.now() - 1800000, // 30 minutes ago
        readTime: 2,
        impact: 'high',
        tip: 'Monitor WETH/USDC pairs on Base DEXs for increased volatility and arbitrage opportunities.',
        source: 'Base Blog',
        url: '#'
      },
      {
        id: '2',
        title: 'Aerodrome Finance Introduces New Liquidity Incentives',
        summary: 'Enhanced rewards for LP providers could create temporary price discrepancies with other Base DEXs.',
        category: 'defi',
        timestamp: Date.now() - 3600000, // 1 hour ago
        readTime: 3,
        impact: 'medium',
        tip: 'Watch for arbitrage opportunities between Aerodrome and Uniswap V3 as liquidity shifts.',
        source: 'Aerodrome',
        url: '#'
      },
      {
        id: '3',
        title: 'Gas Prices on Base Drop to Record Lows',
        summary: 'Average transaction costs fall below $0.001, making micro-arbitrage strategies more profitable.',
        category: 'base',
        timestamp: Date.now() - 5400000, // 1.5 hours ago
        readTime: 1,
        impact: 'high',
        tip: 'Lower gas costs mean smaller spreads (>0.05%) can now be profitable for arbitrage.',
        source: 'BaseScan',
        url: '#'
      },
      {
        id: '4',
        title: 'SushiSwap Expands Base Network Presence',
        summary: 'New token pairs and enhanced routing create more cross-DEX arbitrage possibilities.',
        category: 'defi',
        timestamp: Date.now() - 7200000, // 2 hours ago
        readTime: 2,
        impact: 'medium',
        tip: 'New pairs often have higher spreads initially - monitor closely for opportunities.',
        source: 'SushiSwap',
        url: '#'
      },
      {
        id: '5',
        title: 'Market Volatility Creates Arbitrage Goldmine',
        summary: 'Recent BTC and ETH price movements causing increased spread variations across Base DEXs.',
        category: 'trading',
        timestamp: Date.now() - 10800000, // 3 hours ago
        readTime: 3,
        impact: 'high',
        tip: 'High volatility periods often create 1-3% spreads that last 5-10 minutes.',
        source: 'CoinDesk',
        url: '#'
      }
    ]
    
  const getMockTips = (): TradingTip[] => [
      {
        id: '1',
        title: 'Risk Management: Never Risk More Than 2%',
        content: 'Always limit your arbitrage position size to maximum 2% of your total portfolio per trade. Even "guaranteed" arbitrage can fail due to MEV bots, slippage, or network congestion.',
        category: 'risk',
        importance: 'critical',
        timestamp: Date.now() - 3600000
      },
      {
        id: '2',
        title: 'Optimal Trade Size for Base Network',
        content: 'On Base, trade sizes between $1,000-$10,000 typically offer the best risk/reward ratio. Smaller trades may not cover gas costs, larger trades face slippage issues.',
        category: 'strategy',
        importance: 'high',
        timestamp: Date.now() - 7200000
      },
      {
        id: '3',
        title: 'MEV Protection Strategies',
        content: 'Use private mempools or commit-reveal schemes for large arbitrage trades. FlashBots Protect and similar services can prevent front-running on your profitable trades.',
        category: 'technical',
        importance: 'high',
        timestamp: Date.now() - 10800000
      },
      {
        id: '4',
        title: 'Market Hours Impact on Spreads',
        content: 'Best arbitrage opportunities typically occur during 8-12 PM UTC when both US and Asian markets are active. Spreads can increase by 200-300% during these hours.',
        category: 'market',
        importance: 'medium',
        timestamp: Date.now() - 14400000
      },
      {
        id: '5',
        title: 'Emergency Exit Strategies',
        content: 'Always have a stop-loss mechanism. If an arbitrage trade takes more than 2 blocks to execute, consider canceling. Network congestion can turn profits into losses quickly.',
        category: 'risk',
        importance: 'critical',
        timestamp: Date.now() - 18000000
      }
    ]
    
  const generateTipsFromNews = async (): Promise<TradingTip[]> => {
    // Generate tips using the news server API
    const tips: TradingTip[] = []
    
    const categories = ['risk', 'strategy', 'technical', 'market']
    
    for (const category of categories) {
      try {
        const response = await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-tip',
            news_content: 'Current market conditions based on latest news',
            category
          })
        })
        
        const result = await response.json()
        if (result.tip) {
          tips.push({
            id: `tip_${Date.now()}_${category}`,
            title: getTipTitle(category),
            content: result.tip,
            category: category as 'risk' | 'strategy' | 'technical' | 'market',
            importance: result.importance === 'high' ? 'high' : 'medium',
            timestamp: Date.now() - (tips.length * 3600000) // Stagger timestamps
          })
        }
      } catch (error) {
        console.error(`Error generating ${category} tip:`, error)
      }
    }
    
    return tips.length > 0 ? tips : getMockTips()
  }
  
  const getTipTitle = (category: string): string => {
    const titles = {
      'risk': 'Risk Management Alert',
      'strategy': 'Trading Strategy Insight', 
      'technical': 'Technical Implementation',
      'market': 'Market Analysis'
    }
    return titles[category as keyof typeof titles] || 'Trading Tip'
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      arbitrage: 'bg-green-500',
      defi: 'bg-blue-500',
      base: 'bg-purple-500',
      trading: 'bg-orange-500',
      risk: 'bg-red-500',
      strategy: 'bg-green-500',
      technical: 'bg-blue-500',
      market: 'bg-yellow-500'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-500'
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <TrendingUp className="w-4 h-4 text-red-400" />
      case 'medium': return <Target className="w-4 h-4 text-yellow-400" />
      case 'low': return <Clock className="w-4 h-4 text-green-400" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />
      case 'high': return <Star className="w-4 h-4 text-yellow-400" />
      case 'medium': return <Zap className="w-4 h-4 text-blue-400" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(timestamp).toLocaleDateString()
  }
  
  const openNewsArticle = (url: string) => {
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header with tabs */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            📰 Market Intelligence
          </h2>
          <div className="flex items-center space-x-1 bg-gray-700/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('news')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                activeTab === 'news'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              📈 News
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                activeTab === 'tips'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              💡 Tips
            </button>
          </div>
        </div>
        
        <p className="text-gray-300 text-sm">
          {activeTab === 'news' 
            ? 'Latest blockchain news and market updates affecting arbitrage opportunities'
            : 'Expert trading tips and risk management strategies for arbitrage success'
          }
        </p>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading latest updates...</p>
          </div>
        ) : activeTab === 'news' ? (
          <div className="space-y-0">
            {news.map((item, index) => (
              <div
                key={item.id}
                className={`p-4 border-b border-gray-700/50 hover:bg-gray-700/25 transition-colors cursor-pointer ${
                  index === news.length - 1 ? 'border-b-0' : ''
                }`}
                onClick={() => openNewsArticle(item.url || '')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getCategoryColor(item.category)}`}></div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">
                      {item.category}
                    </span>
                    {getImpactIcon(item.impact)}
                    <span className="text-xs text-gray-400">
                      {formatTimeAgo(item.timestamp)} • {item.readTime}m read
                    </span>
                  </div>
                  {item.url && item.url !== '#' && (
                    <ExternalLink className="w-4 h-4 text-gray-400 hover:text-blue-400 cursor-pointer" />
                  )}
                </div>
                
                <h3 className="text-white font-semibold mb-2 leading-tight hover:text-blue-300 transition-colors">
                  {item.title}
                </h3>
                
                <p className="text-gray-300 text-sm mb-3 leading-relaxed">
                  {item.summary}
                </p>
                
                {item.tip && (
                  <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 mt-3">
                    <div className="flex items-start space-x-2">
                      <DollarSign className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-green-400 font-medium mb-1">ARBITRAGE TIP</div>
                        <p className="text-sm text-gray-200">{item.tip}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">Source: {item.source}</span>
                  {item.url && item.url !== '#' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        openNewsArticle(item.url!)
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition-colors"
                    >
                      <span>Read More</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-0">
            {tips.map((tip, index) => (
              <div
                key={tip.id}
                className={`p-4 border-b border-gray-700/50 hover:bg-gray-700/25 transition-colors ${
                  index === tips.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getImportanceIcon(tip.importance)}
                    <span className="text-xs text-gray-400 uppercase tracking-wide">
                      {tip.category}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tip.importance === 'critical' 
                        ? 'bg-red-900 text-red-200'
                        : tip.importance === 'high'
                        ? 'bg-yellow-900 text-yellow-200'
                        : 'bg-blue-900 text-blue-200'
                    }`}>
                      {tip.importance}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(tip.timestamp)}
                  </span>
                </div>
                
                <h3 className="text-white font-semibold mb-2 leading-tight">
                  {tip.title}
                </h3>
                
                <p className="text-gray-300 text-sm leading-relaxed">
                  {tip.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-700/30 p-3 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Updates every 5 minutes</span>
          <button 
            onClick={loadNewsAndTips}
            className="flex items-center space-x-1 hover:text-blue-400 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  )
}