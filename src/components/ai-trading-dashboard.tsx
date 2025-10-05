'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PlayCircle, 
  PauseCircle, 
  StopCircle, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Wallet,
  Activity,
  DollarSign,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { AITradingEngine, TradingSettings, TradingState, ActiveTrade } from '@/lib/ai-trading-engine';
import { getWalletConnection, WalletState } from '@/lib/wallet-connection';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface TradingDashboardProps {
  tradingEngine?: AITradingEngine;
}

export default function AITradingDashboard({ tradingEngine }: TradingDashboardProps) {
  const [settings, setSettings] = useState<TradingSettings>({
    maxTradeAmount: 100,
    dailyLimit: 500,
    weeklyLimit: 2000,
    minProfitThreshold: 2.0,
    maxSlippage: 1.0,
    riskTolerance: 'medium',
    autoTradingEnabled: false,
    emergencyStop: false,
    gasPrice: 'standard'
  });

  const [tradingState, setTradingState] = useState<TradingState>({
    isActive: false,
    dailyVolume: 0,
    weeklyVolume: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfit: 0,
    lastTradeTime: 0,
    activeTrades: []
  });

  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false
  });

  const [showSettings, setShowSettings] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<ActiveTrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const walletConnection = getWalletConnection();

  // Update states when props change
  useEffect(() => {
    if (tradingEngine) {
      setTradingState(tradingEngine.getTradingState());
      setTradeHistory(tradingEngine.getTradingHistory(10));
    }
  }, [tradingEngine]);

  // Listen to wallet events
  useEffect(() => {
    const updateWalletState = () => {
      setWalletState(walletConnection.getState());
    };

    walletConnection.on('connected', updateWalletState);
    walletConnection.on('disconnected', updateWalletState);
    walletConnection.on('balanceUpdated', updateWalletState);

    // Initial state
    updateWalletState();

    return () => {
      walletConnection.off('connected', updateWalletState);
      walletConnection.off('disconnected', updateWalletState);
      walletConnection.off('balanceUpdated', updateWalletState);
    };
  }, []);

  // Connect wallet
  const handleConnectWallet = async (walletType: 'metamask' | 'coinbase' = 'metamask') => {
    try {
      setIsLoading(true);
      await walletConnection.connect(walletType);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update trading settings
  const handleUpdateSettings = (newSettings: Partial<TradingSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    if (tradingEngine) {
      tradingEngine.updateSettings(updated);
    }
  };

  // Toggle auto-trading
  const toggleAutoTrading = async () => {
    if (!walletState.isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    const newValue = !settings.autoTradingEnabled;
    handleUpdateSettings({ autoTradingEnabled: newValue });

    if (newValue) {
      console.log('AI auto-trading enabled');
    } else {
      console.log('AI auto-trading disabled');
    }
  };

  // Emergency stop
  const handleEmergencyStop = () => {
    handleUpdateSettings({ emergencyStop: true, autoTradingEnabled: false });
    if (tradingEngine) {
      tradingEngine.emergencyStop();
    }
    console.log('EMERGENCY STOP activated');
  };

  // Resume trading
  const handleResumeTrading = () => {
    handleUpdateSettings({ emergencyStop: false });
    if (tradingEngine) {
      tradingEngine.resumeTrading();
    }
  };

  // Calculate success rate
  const successRate = tradingState.totalTrades > 0 
    ? (tradingState.successfulTrades / tradingState.totalTrades) * 100 
    : 0;

  // Calculate daily/weekly progress
  const dailyProgress = (tradingState.dailyVolume / settings.dailyLimit) * 100;
  const weeklyProgress = (tradingState.weeklyVolume / settings.weeklyLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">AI Trading Dashboard</h2>
          <p className="text-gray-600">Automated arbitrage trading with AI optimization</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {walletState.isConnected ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-600">Connected</p>
                <p className="text-sm text-gray-600">
                  {walletState.address?.slice(0, 6)}...{walletState.address?.slice(-4)}
                </p>
                <p className="text-sm text-gray-600">
                  Balance: {walletState.balance} ETH
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {walletConnection.getNetworkInfo().networkName}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-600">Not Connected</p>
                <p className="text-sm text-gray-600">Connect wallet to enable trading</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleConnectWallet('metamask')}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  MetaMask
                </Button>
                <Button 
                  onClick={() => handleConnectWallet('coinbase')}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  Coinbase
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trading Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Trading Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Auto Trading</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.autoTradingEnabled && !settings.emergencyStop}
                    onCheckedChange={toggleAutoTrading}
                    disabled={!walletState.isConnected}
                  />
                  {settings.autoTradingEnabled && !settings.emergencyStop ? (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={toggleAutoTrading}
                  disabled={!walletState.isConnected}
                  className={settings.autoTradingEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                  size="sm"
                >
                  {settings.autoTradingEnabled ? (
                    <>
                      <PauseCircle className="w-4 h-4 mr-2" />
                      Stop Trading
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Start Trading
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleEmergencyStop}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Emergency Stop
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Profit</span>
                <span className={`font-medium ${tradingState.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(tradingState.totalProfit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="font-medium">{formatPercent(successRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Trades</span>
                <span className="font-medium">{tradingState.totalTrades}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Volume Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Daily Volume</span>
                  <span>{formatCurrency(tradingState.dailyVolume)} / {formatCurrency(settings.dailyLimit)}</span>
                </div>
                <Progress value={dailyProgress} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Weekly Volume</span>
                  <span>{formatCurrency(tradingState.weeklyVolume)} / {formatCurrency(settings.weeklyLimit)}</span>
                </div>
                <Progress value={weeklyProgress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Stop Alert */}
      {settings.emergencyStop && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Emergency Stop Active</strong> - All trading has been halted.
            <Button
              onClick={handleResumeTrading}
              variant="link"
              className="p-0 ml-2 text-red-600 hover:text-red-800"
            >
              Resume Trading
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Trades */}
      {tradingState.activeTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Trades</CardTitle>
            <CardDescription>
              Currently executing {tradingState.activeTrades.length} trades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tradingState.activeTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {trade.opportunity.tokenA} → {trade.opportunity.tokenB}
                    </p>
                    <p className="text-sm text-gray-600">
                      {trade.opportunity.dexA} → {trade.opportunity.dexB}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={trade.status === 'executing' ? 'default' : 'secondary'}
                      className={trade.status === 'executing' ? 'animate-pulse' : ''}
                    >
                      {trade.status}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatCurrency(trade.opportunity.profitUsd)} profit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trading Settings */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Trading Settings</CardTitle>
            <CardDescription>
              Configure AI trading parameters and risk management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="maxTradeAmount">Max Trade Amount (USD)</Label>
                  <Input
                    id="maxTradeAmount"
                    type="number"
                    value={settings.maxTradeAmount}
                    onChange={(e) => handleUpdateSettings({ maxTradeAmount: Number(e.target.value) })}
                    min="10"
                    max="10000"
                  />
                </div>
                <div>
                  <Label htmlFor="dailyLimit">Daily Limit (USD)</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    value={settings.dailyLimit}
                    onChange={(e) => handleUpdateSettings({ dailyLimit: Number(e.target.value) })}
                    min="50"
                    max="50000"
                  />
                </div>
                <div>
                  <Label htmlFor="weeklyLimit">Weekly Limit (USD)</Label>
                  <Input
                    id="weeklyLimit"
                    type="number"
                    value={settings.weeklyLimit}
                    onChange={(e) => handleUpdateSettings({ weeklyLimit: Number(e.target.value) })}
                    min="100"
                    max="100000"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="minProfitThreshold">Min Profit Threshold (%)</Label>
                  <Input
                    id="minProfitThreshold"
                    type="number"
                    step="0.1"
                    value={settings.minProfitThreshold}
                    onChange={(e) => handleUpdateSettings({ minProfitThreshold: Number(e.target.value) })}
                    min="0.1"
                    max="20"
                  />
                </div>
                <div>
                  <Label htmlFor="maxSlippage">Max Slippage (%)</Label>
                  <Input
                    id="maxSlippage"
                    type="number"
                    step="0.1"
                    value={settings.maxSlippage}
                    onChange={(e) => handleUpdateSettings({ maxSlippage: Number(e.target.value) })}
                    min="0.1"
                    max="10"
                  />
                </div>
                <div>
                  <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                  <select
                    id="riskTolerance"
                    value={settings.riskTolerance}
                    onChange={(e) => handleUpdateSettings({ riskTolerance: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low (Conservative)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Aggressive)</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Trade History */}
      {tradeHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
            <CardDescription>
              Last {tradeHistory.length} executed trades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tradeHistory.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {trade.status === 'completed' ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {trade.opportunity.tokenA} → {trade.opportunity.tokenB}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(trade.startTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium text-sm ${
                      trade.status === 'completed' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trade.actualProfit ? formatCurrency(trade.actualProfit) : formatCurrency(trade.opportunity.profitUsd)}
                    </p>
                    <Badge
                      variant={trade.status === 'completed' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {trade.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Note: formatCurrency and formatPercent are imported from '@/lib/utils'
