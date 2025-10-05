'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { AITradingEngine, TradingSettings, TradingState, ArbitrageOpportunity } from '@/lib/ai-trading-engine';
import { getWalletConnection } from '@/lib/wallet-connection';

// Default trading settings
const DEFAULT_SETTINGS: TradingSettings = {
  maxTradeAmount: 100,
  dailyLimit: 500,
  weeklyLimit: 2000,
  minProfitThreshold: 2.0,
  maxSlippage: 1.0,
  riskTolerance: 'medium',
  autoTradingEnabled: false,
  emergencyStop: false,
  gasPrice: 'standard'
};

export function useAITrading() {
  const [tradingEngine, setTradingEngine] = useState<AITradingEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout>();

  const walletConnection = getWalletConnection();

  // Initialize trading engine
  const initializeTradingEngine = useCallback(async () => {
    try {
      setError(null);
      
      // Check if wallet is connected
      const walletState = walletConnection.getState();
      if (!walletState.isConnected) {
        throw new Error('Wallet not connected');
      }

      // Create provider
      if (!window.ethereum) {
        throw new Error('No Web3 provider found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create and initialize trading engine
      const engine = new AITradingEngine(provider, DEFAULT_SETTINGS);
      await engine.initialize(signer);

      setTradingEngine(engine);
      setIsInitialized(true);
      
      console.log('AI Trading Engine initialized successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(message);
      console.error('Failed to initialize trading engine:', error);
    }
  }, [walletConnection]);

  // Start opportunity scanning
  const startScanning = useCallback(async () => {
    if (!tradingEngine || isScanning) return;

    setIsScanning(true);
    console.log('Starting AI arbitrage scanning...');

    const scan = async () => {
      try {
        // Fetch opportunities from your API
        const response = await fetch('/api/arbitrage');
        if (!response.ok) {
          console.warn(`API Error: ${response.status}, using empty array`);
          setOpportunities([]);
          return;
        }
        
        const data = await response.json();
        const opportunities: ArbitrageOpportunity[] = data.data || data.opportunities || [];
        
        setOpportunities(opportunities);

        // Let AI analyze and potentially trade
        if (opportunities.length > 0 && tradingEngine) {
          await tradingEngine.analyzeAndTrade(opportunities);
        }
      } catch (error) {
        console.error('Scanning failed:', error);
      }
    };

    // Initial scan
    await scan();

    // Set up interval scanning
    scanIntervalRef.current = setInterval(scan, 30000); // Every 30 seconds
  }, [tradingEngine, isScanning]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = undefined;
    }
    setIsScanning(false);
    console.log('AI arbitrage scanning stopped');
  }, []);

  // Initialize when wallet connects
  useEffect(() => {
    const handleWalletConnection = () => {
      const walletState = walletConnection.getState();
      if (walletState.isConnected && !isInitialized) {
        initializeTradingEngine();
      }
    };

    walletConnection.on('connected', handleWalletConnection);
    
    // Check initial connection state
    handleWalletConnection();

    return () => {
      walletConnection.off('connected', handleWalletConnection);
    };
  }, [walletConnection, isInitialized, initializeTradingEngine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<TradingSettings>) => {
    if (tradingEngine) {
      tradingEngine.updateSettings(newSettings);
    }
  }, [tradingEngine]);

  // Manual trade execution
  const executeTrade = useCallback(async (opportunity: ArbitrageOpportunity) => {
    if (!tradingEngine) {
      throw new Error('Trading engine not initialized');
    }

    await tradingEngine.analyzeAndTrade([opportunity]);
  }, [tradingEngine]);

  // Get current state
  const getTradingState = useCallback((): TradingState => {
    if (!tradingEngine) {
      return {
        isActive: false,
        dailyVolume: 0,
        weeklyVolume: 0,
        totalTrades: 0,
        successfulTrades: 0,
        totalProfit: 0,
        lastTradeTime: 0,
        activeTrades: []
      };
    }
    return tradingEngine.getTradingState();
  }, [tradingEngine]);

  // Emergency stop
  const emergencyStop = useCallback(() => {
    if (tradingEngine) {
      tradingEngine.emergencyStop();
    }
    stopScanning();
  }, [tradingEngine, stopScanning]);

  // Resume trading
  const resumeTrading = useCallback(() => {
    if (tradingEngine) {
      tradingEngine.resumeTrading();
    }
    startScanning();
  }, [tradingEngine, startScanning]);

  return {
    // State
    tradingEngine,
    isInitialized,
    error,
    opportunities,
    isScanning,
    
    // Actions
    initializeTradingEngine,
    startScanning,
    stopScanning,
    updateSettings,
    executeTrade,
    getTradingState,
    emergencyStop,
    resumeTrading
  };
}

// Hook for real-time trading state
export function useTradingState(tradingEngine: AITradingEngine | null) {
  const [state, setState] = useState<TradingState>({
    isActive: false,
    dailyVolume: 0,
    weeklyVolume: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfit: 0,
    lastTradeTime: 0,
    activeTrades: []
  });

  useEffect(() => {
    if (!tradingEngine) return;

    const updateState = () => {
      setState(tradingEngine.getTradingState());
    };

    // Update initially
    updateState();

    // Set up periodic updates
    const interval = setInterval(updateState, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [tradingEngine]);

  return state;
}

// Hook for trade history
export function useTradeHistory(tradingEngine: AITradingEngine | null, limit: number = 50) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!tradingEngine) return;

    const updateHistory = () => {
      setHistory(tradingEngine.getTradingHistory(limit));
    };

    // Update initially
    updateHistory();

    // Set up periodic updates
    const interval = setInterval(updateHistory, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [tradingEngine, limit]);

  return history;
}