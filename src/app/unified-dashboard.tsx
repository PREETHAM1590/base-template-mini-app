'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Bot, 
  DollarSign, 
  Activity, 
  ArrowRight, 
  Zap, 
  Shield, 
  Target,
  AlertTriangle,
  Wallet,
  BarChart3,
  RefreshCw,
  Clock,
  TrendingDown,
  CheckCircle,
  XCircle,
  Brain,
  Newspaper,
  History,
  Settings,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import AITradingDashboard from '@/components/ai-trading-dashboard';
import { useAITrading } from '@/lib/use-ai-trading';
import { getWalletConnection } from '@/lib/wallet-connection';

interface ArbitrageOpportunity {
  id: string;
  timestamp: number;
  tokenA: string;
  tokenB: string;
  dexA: string;
  dexB: string;
  priceA: number;
  priceB: number;
  profitPercent: number;
  profitUsd: number;
  status: 'active' | 'missed' | 'executed' | 'failed';
  gasEstimate: number;
  confidence: number;
  liquidity: number;
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  category: string;
  timestamp: string;
  impact: 'high' | 'medium' | 'low';
  source: string;
  url?: string;
}

export default function UnifiedDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [historicalOpps, setHistoricalOpps] = useState<ArbitrageOpportunity[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [isLoadingOpps, setIsLoadingOpps] = useState(false);
  const [stats, setStats] = useState({
    totalOpportunities: 0,
    missedOpportunities: 0,
    executedTrades: 0,
    totalProfit: 0,
    successRate: 0,
    avgProfitPerTrade: 0
  });

  const {
    tradingEngine,
    isInitialized,
    error: tradingError,
    isScanning,
    startScanning,
    stopScanning
  } = useAITrading();

  const walletConnection = getWalletConnection();
  const [walletState, setWalletState] = useState(walletConnection.getState());

  // Fetch real-time opportunities
  const fetchOpportunities = async () => {
    setIsLoadingOpps(true);
    try {
      const response = await fetch('/api/arbitrage');
      const data = await response.json();
      
      if (data.opportunities) {
        const activeOpps = data.opportunities.map((opp: any) => ({
          ...opp,
          status: 'active',
          timestamp: Date.now()
        }));
        setOpportunities(activeOpps);
        
        // Update stats
        updateStats(activeOpps, historicalOpps);
      }
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setIsLoadingOpps(false);
    }
  };

  // Fetch historical/missed opportunities
  const fetchHistoricalOpportunities = () => {
    // Simulate historical data - in production, fetch from database
    const historical: ArbitrageOpportunity[] = [
      {
        id: 'hist-1',
        timestamp: Date.now() - 3600000,
        tokenA: 'ETH',
        tokenB: 'USDC',
        dexA: 'Uniswap',
        dexB: 'SushiSwap',
        priceA: 2450,
        priceB: 2465,
        profitPercent: 0.61,
        profitUsd: 15,
        status: 'missed',
        gasEstimate: 5,
        confidence: 0.85,
        liquidity: 150000
      },
      {
        id: 'hist-2',
        timestamp: Date.now() - 7200000,
        tokenA: 'WBTC',
        tokenB: 'USDT',
        dexA: 'Curve',
        dexB: 'Balancer',
        priceA: 42100,
        priceB: 42250,
        profitPercent: 0.36,
        profitUsd: 150,
        status: 'executed',
        gasEstimate: 8,
        confidence: 0.92,
        liquidity: 500000
      },
      {
        id: 'hist-3',
        timestamp: Date.now() - 10800000,
        tokenA: 'MATIC',
        tokenB: 'USDC',
        dexA: 'Uniswap',
        dexB: 'Aerodrome',
        priceA: 0.85,
        priceB: 0.87,
        profitPercent: 2.35,
        profitUsd: 20,
        status: 'missed',
        gasEstimate: 3,
        confidence: 0.78,
        liquidity: 75000
      }
    ];
    setHistoricalOpps(historical);
  };

  // Fetch real news
  const fetchNews = async () => {
    setIsLoadingNews(true);
    try {
      const response = await fetch('/api/news?category=defi&limit=10');
      const data = await response.json();
      
      if (data.articles) {
        const newsItems: NewsItem[] = data.articles.map((article: any, index: number) => ({
          id: `news-${index}`,
          title: article.title,
          description: article.description || article.summary,
          category: article.category || 'DeFi',
          timestamp: article.publishedAt || new Date().toISOString(),
          impact: article.sentiment === 'positive' ? 'high' : article.sentiment === 'neutral' ? 'medium' : 'low',
          source: article.source?.name || 'Unknown',
          url: article.url
        }));
        setNews(newsItems);
      } else {
        // Fallback to mock news if API fails
        setNews([
          {
            id: 'news-1',
            title: 'Base Network Sees Record TVL Growth',
            description: 'Total value locked on Base network surpasses $2 billion milestone',
            category: 'DeFi',
            timestamp: new Date().toISOString(),
            impact: 'high',
            source: 'DeFi Pulse'
          },
          {
            id: 'news-2',
            title: 'Uniswap V4 Hooks Enable New Arbitrage Strategies',
            description: 'Custom hooks allow for more efficient cross-pool arbitrage execution',
            category: 'Protocol',
            timestamp: new Date().toISOString(),
            impact: 'high',
            source: 'Uniswap Blog'
          },
          {
            id: 'news-3',
            title: 'Gas Fees on Base Drop to Record Lows',
            description: 'Average transaction costs fall below $0.01, boosting arbitrage profitability',
            category: 'Network',
            timestamp: new Date().toISOString(),
            impact: 'medium',
            source: 'Base Analytics'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
      // Use mock data on error
      setNews([
        {
          id: 'news-fallback-1',
          title: 'DeFi Market Update',
          description: 'Latest developments in decentralized finance',
          category: 'Market',
          timestamp: new Date().toISOString(),
          impact: 'medium',
          source: 'ArbiTips'
        }
      ]);
    } finally {
      setIsLoadingNews(false);
    }
  };

  // Update statistics
  const updateStats = (active: ArbitrageOpportunity[], historical: ArbitrageOpportunity[]) => {
    const allOpps = [...active, ...historical];
    const missed = historical.filter(o => o.status === 'missed');
    const executed = historical.filter(o => o.status === 'executed');
    
    const totalProfit = executed.reduce((sum, o) => sum + o.profitUsd, 0);
    const successRate = executed.length > 0 ? (executed.length / (executed.length + missed.length)) * 100 : 0;
    
    setStats({
      totalOpportunities: allOpps.length,
      missedOpportunities: missed.length,
      executedTrades: executed.length,
      totalProfit,
      successRate,
      avgProfitPerTrade: executed.length > 0 ? totalProfit / executed.length : 0
    });
  };

  // Connect wallet
  const handleConnectWallet = async () => {
    try {
      await walletConnection.connect('metamask');
      setWalletState(walletConnection.getState());
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchOpportunities();
    fetchHistoricalOpportunities();
    fetchNews();
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchOpportunities();
      fetchNews();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Update wallet state
  useEffect(() => {
    const updateWallet = () => setWalletState(walletConnection.getState());
    walletConnection.on('connected', updateWallet);
    walletConnection.on('disconnected', updateWallet);
    return () => {
      walletConnection.off('connected', updateWallet);
      walletConnection.off('disconnected', updateWallet);
    };
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">ArbiTips AI</h1>
                <p className="text-gray-300 text-sm">Automated Arbitrage Intelligence</p>
              </div>
            </div>
            
            {/* Wallet Connection */}
            <div className="flex items-center gap-4">
              {walletState.isConnected ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                  <span className="text-white text-sm">
                    {walletState.address?.slice(0, 6)}...{walletState.address?.slice(-4)}
                  </span>
                </div>
              ) : (
                <Button onClick={handleConnectWallet} className="bg-blue-600 hover:bg-blue-700">
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
              
              {/* AI Status */}
              {isScanning ? (
                <Badge className="bg-green-500/20 text-green-400 animate-pulse">
                  <Activity className="w-3 h-3 mr-1" />
                  AI Active
                </Badge>
              ) : (
                <Badge variant="secondary">
                  AI Inactive
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Opportunities</p>
                  <p className="text-2xl font-bold text-white">{stats.totalOpportunities}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Executed</p>
                  <p className="text-2xl font-bold text-white">{stats.executedTrades}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Missed</p>
                  <p className="text-2xl font-bold text-white">{stats.missedOpportunities}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Profit</p>
                  <p className="text-2xl font-bold text-white">${stats.totalProfit.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Success Rate</p>
                  <p className="text-2xl font-bold text-white">{stats.successRate.toFixed(1)}%</p>
                </div>
                <Target className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Avg Profit</p>
                  <p className="text-2xl font-bold text-white">${stats.avgProfitPerTrade.toFixed(2)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20">
              <Activity className="w-4 h-4 mr-2" />
              Live Opportunities
            </TabsTrigger>
            <TabsTrigger value="history" className="text-white data-[state=active]:bg-white/20">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="ai-trading" className="text-white data-[state=active]:bg-white/20">
              <Brain className="w-4 h-4 mr-2" />
              AI Trading
            </TabsTrigger>
            <TabsTrigger value="news" className="text-white data-[state=active]:bg-white/20">
              <Newspaper className="w-4 h-4 mr-2" />
              News
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-white data-[state=active]:bg-white/20">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Live Opportunities Tab */}
          <TabsContent value="overview">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Live Arbitrage Opportunities</CardTitle>
                    <CardDescription className="text-white/70">
                      Real-time profitable trading opportunities across DEXs
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={fetchOpportunities}
                    disabled={isLoadingOpps}
                    size="sm"
                    variant="outline"
                    className="text-white border-white/20"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingOpps ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {opportunities.length === 0 ? (
                    <div className="text-center py-8 text-white/50">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No active opportunities at the moment</p>
                      <p className="text-sm mt-2">AI is scanning markets...</p>
                    </div>
                  ) : (
                    opportunities.map((opp) => (
                      <div key={opp.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <Badge className="bg-green-500/20 text-green-400">
                                Active
                              </Badge>
                              <span className="text-white font-medium">
                                {opp.tokenA} → {opp.tokenB}
                              </span>
                              <span className="text-white/70 text-sm">
                                {opp.dexA} → {opp.dexB}
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <span className="text-green-400">
                                +{opp.profitPercent.toFixed(2)}% (${opp.profitUsd.toFixed(2)})
                              </span>
                              <span className="text-white/50">
                                Gas: ${opp.gasEstimate.toFixed(2)}
                              </span>
                              <span className="text-white/50">
                                Confidence: {(opp.confidence * 100).toFixed(0)}%
                              </span>
                              <span className="text-white/50">
                                Liquidity: ${(opp.liquidity / 1000).toFixed(0)}k
                              </span>
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={!walletState.isConnected}
                          >
                            Execute
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Historical Opportunities</CardTitle>
                <CardDescription className="text-white/70">
                  Past arbitrage opportunities - executed and missed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historicalOpps.map((opp) => (
                    <div key={opp.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <Badge 
                              className={
                                opp.status === 'executed' 
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-red-500/20 text-red-400'
                              }
                            >
                              {opp.status === 'executed' ? 'Executed' : 'Missed'}
                            </Badge>
                            <span className="text-white font-medium">
                              {opp.tokenA} → {opp.tokenB}
                            </span>
                            <span className="text-white/70 text-sm">
                              {formatTime(opp.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <span className={opp.status === 'executed' ? 'text-green-400' : 'text-gray-400'}>
                              {opp.profitPercent.toFixed(2)}% (${opp.profitUsd.toFixed(2)})
                            </span>
                            <span className="text-white/50">
                              {opp.dexA} → {opp.dexB}
                            </span>
                            <span className="text-white/50">
                              Gas: ${opp.gasEstimate.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {opp.status === 'executed' ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Trading Tab */}
          <TabsContent value="ai-trading">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <AITradingDashboard tradingEngine={tradingEngine} />
            </div>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Market News & Updates</CardTitle>
                    <CardDescription className="text-white/70">
                      Latest DeFi and crypto market news affecting arbitrage
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={fetchNews}
                    disabled={isLoadingNews}
                    size="sm"
                    variant="outline"
                    className="text-white border-white/20"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingNews ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {news.map((item) => (
                    <div key={item.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge 
                              className={
                                item.impact === 'high' 
                                  ? 'bg-red-500/20 text-red-400'
                                  : item.impact === 'medium'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }
                            >
                              {item.impact} impact
                            </Badge>
                            <span className="text-white/50 text-sm">{item.source}</span>
                            <span className="text-white/50 text-sm">
                              {formatTime(new Date(item.timestamp).getTime())}
                            </span>
                          </div>
                          <h3 className="text-white font-medium mb-1">{item.title}</h3>
                          <p className="text-white/70 text-sm">{item.description}</p>
                        </div>
                        {item.url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white/70 hover:text-white"
                            onClick={() => window.open(item.url, '_blank')}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Settings & Configuration</CardTitle>
                <CardDescription className="text-white/70">
                  Configure AI trading parameters and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-white font-medium mb-4">Quick Actions</h3>
                    <div className="flex gap-4">
                      <Button 
                        onClick={() => isScanning ? stopScanning() : startScanning()}
                        className={isScanning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                      >
                        {isScanning ? (
                          <>
                            <PauseCircle className="w-4 h-4 mr-2" />
                            Stop AI Scanner
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Start AI Scanner
                          </>
                        )}
                      </Button>
                      <Button variant="outline" className="text-white border-white/20">
                        <Shield className="w-4 h-4 mr-2" />
                        Security Settings
                      </Button>
                    </div>
                  </div>

                  {/* Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">AI Engine</h4>
                      <p className="text-white/70 text-sm">Version 2.0.1</p>
                      <p className="text-white/70 text-sm">Model: GPT-4 Enhanced</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Network</h4>
                      <p className="text-white/70 text-sm">Base Mainnet</p>
                      <p className="text-white/70 text-sm">RPC: Optimized</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Data Sources</h4>
                      <p className="text-white/70 text-sm">5 DEX Connected</p>
                      <p className="text-white/70 text-sm">3 Price Oracles</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}