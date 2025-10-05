'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  Zap, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  Brain,
  Cpu,
  Target,
  Activity,
  ArrowRight
} from 'lucide-react';
import AITradingDashboard from '@/components/ai-trading-dashboard';
import { useAITrading } from '@/lib/use-ai-trading';
import { getWalletConnection } from '@/lib/wallet-connection';

export default function AITradingPage() {
  const {
    tradingEngine,
    isInitialized,
    error,
    opportunities,
    isScanning,
    startScanning,
    stopScanning,
    emergencyStop,
    resumeTrading
  } = useAITrading();

  const walletConnection = getWalletConnection();
  const walletState = walletConnection.getState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Trading</h1>
                <p className="text-gray-300 text-sm">Automated arbitrage with artificial intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Beta
              </Badge>
              {isScanning && (
                <Badge className="bg-green-100 text-green-800 animate-pulse">
                  <Activity className="w-3 h-3 mr-1" />
                  Scanning
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Introduction Section */}
        <div className="mb-8">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-400" />
                AI-Powered Automated Trading
              </CardTitle>
              <CardDescription className="text-gray-300">
                Advanced artificial intelligence continuously monitors arbitrage opportunities and executes trades 
                automatically when profitable conditions are met, with full user control and risk management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Lightning Fast</h3>
                    <p className="text-gray-300 text-sm">
                      AI analyzes opportunities in milliseconds and executes trades faster than human reaction time
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Risk Managed</h3>
                    <p className="text-gray-300 text-sm">
                      Configurable limits, emergency stops, and intelligent risk assessment protect your capital
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Precision Trading</h3>
                    <p className="text-gray-300 text-sm">
                      Machine learning optimizes trade timing and amounts for maximum profitability
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Features */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            AI Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="font-medium text-white text-sm">Opportunity Scoring</span>
                </div>
                <p className="text-gray-300 text-xs">
                  AI ranks opportunities by profit potential, risk level, and execution probability
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-white text-sm">Market Analysis</span>
                </div>
                <p className="text-gray-300 text-xs">
                  Continuous monitoring of market conditions and volatility patterns
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white text-sm">Optimal Sizing</span>
                </div>
                <p className="text-gray-300 text-xs">
                  Dynamic position sizing based on liquidity, risk tolerance, and market conditions
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-red-400" />
                  <span className="font-medium text-white text-sm">Risk Management</span>
                </div>
                <p className="text-gray-300 text-xs">
                  Automated stop-losses, slippage protection, and portfolio risk assessment
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Wallet Connection Required */}
        {!walletState.isConnected && (
          <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              <strong>Wallet Required:</strong> Connect your wallet to access AI trading features.
              <Button
                onClick={() => walletConnection.connect('metamask')}
                variant="link"
                className="p-0 ml-2 text-yellow-300 hover:text-yellow-100"
              >
                Connect Wallet <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Opportunities Preview */}
        {opportunities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Current Opportunities ({opportunities.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opportunities.slice(0, 6).map((opp) => (
                <Card key={opp.id} className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-white text-sm">
                          {opp.tokenA} → {opp.tokenB}
                        </p>
                        <p className="text-gray-300 text-xs">
                          {opp.dexA} → {opp.dexB}
                        </p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          opp.profitPercent >= 3 
                            ? 'bg-green-100 text-green-800' 
                            : opp.profitPercent >= 1
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {opp.profitPercent.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-gray-300">
                      <span>Profit: ${opp.profitUsd.toFixed(2)}</span>
                      <span>AI Score: {(opp.confidence * 100).toFixed(0)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Main Dashboard */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
          <AITradingDashboard tradingEngine={tradingEngine} />
        </div>

        {/* Safety Notice */}
        <Alert className="mt-8 border-blue-500/50 bg-blue-500/10">
          <Shield className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-300">
            <strong>Safety First:</strong> AI trading is in beta. Start with small amounts and always use stop-loss limits. 
            The emergency stop button immediately halts all trading activity. Monitor your trades regularly and never 
            invest more than you can afford to lose.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}