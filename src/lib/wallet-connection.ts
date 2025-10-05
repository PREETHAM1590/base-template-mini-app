import { createConfig, http, reconnect } from '@wagmi/core';
import { base, baseSepolia } from '@wagmi/core/chains';
// Commented out unused connectors to fix build
// import { InjectedConnector } from '@wagmi/core/connectors/injected';
// import { MetaMaskConnector } from '@wagmi/core/connectors/metaMask';
// import { WalletConnectConnector } from '@wagmi/core/connectors/walletConnect';
// import { CoinbaseWalletConnector } from '@wagmi/core/connectors/coinbaseWallet';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, walletConnectWallet, coinbaseWallet as cbWallet } from '@rainbow-me/rainbowkit/wallets';

export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address?: string;
  chainId?: number;
  balance?: string;
  error?: string;
  connector?: string;
  lastConnectionTime?: number;
}

export interface WalletConnectionError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}

export type WalletEvent = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'chainChanged'
  | 'accountsChanged'
  | 'balanceUpdated';

export class EnhancedWalletConnection {
  private state: WalletState;
  private listeners: Map<WalletEvent, Function[]> = new Map();
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000;
  private balanceUpdateInterval?: NodeJS.Timeout;

  constructor() {
    this.state = {
      isConnected: false,
      isConnecting: false,
    };

    this.initializeListeners();
  }

  /**
   * Initialize wallet event listeners
   */
  private initializeListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        console.log('Accounts changed:', accounts);
        this.handleAccountsChanged(accounts);
      });

      window.ethereum.on('chainChanged', (chainId: string) => {
        console.log('Chain changed:', chainId);
        this.handleChainChanged(parseInt(chainId, 16));
      });

      window.ethereum.on('disconnect', (error: any) => {
        console.log('Wallet disconnected:', error);
        this.handleDisconnect(error);
      });
    }

    // Start balance monitoring
    this.startBalanceMonitoring();
  }

  /**
   * Connect to wallet with enhanced error handling
   */
  async connect(walletType: 'metamask' | 'walletconnect' | 'coinbase' = 'metamask'): Promise<WalletState> {
    console.log(`Attempting to connect to ${walletType}...`);
    
    this.updateState({ isConnecting: true, error: undefined });
    this.emit('connecting');

    try {
      const result = await this.connectWithRetry(walletType);
      
      if (result.success) {
        this.updateState({
          isConnected: true,
          isConnecting: false,
          address: result.address,
          chainId: result.chainId,
          connector: walletType,
          lastConnectionTime: Date.now(),
          error: undefined
        });

        // Update balance
        await this.updateBalance();

        this.emit('connected');
        console.log('Wallet connected successfully:', result.address);
        
        return this.state;
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      const walletError = this.parseWalletError(error);
      
      this.updateState({
        isConnecting: false,
        error: walletError.message
      });

      this.emit('error', walletError);
      console.error('Wallet connection failed:', walletError);
      
      throw walletError;
    }
  }

  /**
   * Connect with retry logic
   */
  private async connectWithRetry(walletType: string): Promise<{success: boolean, address?: string, chainId?: number, error?: string}> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.attemptConnection(walletType);
        this.retryCount = 0; // Reset on success
        return { success: true, ...result };
      } catch (error) {
        console.log(`Connection attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.maxRetries) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Connection failed'
          };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  /**
   * Attempt wallet connection
   */
  private async attemptConnection(walletType: string): Promise<{address: string, chainId: number}> {
    if (typeof window === 'undefined') {
      throw new Error('Window not available');
    }

    switch (walletType) {
      case 'metamask':
        return await this.connectMetaMask();
      case 'walletconnect':
        return await this.connectWalletConnect();
      case 'coinbase':
        return await this.connectCoinbase();
      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }

  /**
   * Connect to MetaMask
   */
  private async connectMetaMask(): Promise<{address: string, chainId: number}> {
    if (!window.ethereum || !window.ethereum.isMetaMask) {
      throw new Error('MetaMask not installed');
    }

    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const chainId = await window.ethereum.request({ 
      method: 'eth_chainId' 
    });

    // Ensure we're on Base network
    await this.ensureCorrectNetwork();

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    };
  }

  /**
   * Connect to WalletConnect
   */
  private async connectWalletConnect(): Promise<{address: string, chainId: number}> {
    // WalletConnect implementation would go here
    throw new Error('WalletConnect not implemented yet');
  }

  /**
   * Connect to Coinbase Wallet
   */
  private async connectCoinbase(): Promise<{address: string, chainId: number}> {
    if (!window.ethereum || !window.ethereum.isCoinbaseWallet) {
      throw new Error('Coinbase Wallet not installed');
    }

    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const chainId = await window.ethereum.request({ 
      method: 'eth_chainId' 
    });

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    };
  }

  /**
   * Ensure we're connected to the correct network (Base)
   */
  private async ensureCorrectNetwork(): Promise<void> {
    if (!window.ethereum) return;

    const targetChainId = '0x2105'; // Base mainnet
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });

    if (currentChainId !== targetChainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainId }],
        });
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await this.addBaseNetwork();
        } else {
          throw switchError;
        }
      }
    }
  }

  /**
   * Add Base network to wallet
   */
  private async addBaseNetwork(): Promise<void> {
    if (!window.ethereum) return;

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x2105',
        chainName: 'Base',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org'],
      }],
    });
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    console.log('Disconnecting wallet...');
    
    this.stopBalanceMonitoring();
    
    this.updateState({
      isConnected: false,
      isConnecting: false,
      address: undefined,
      chainId: undefined,
      balance: undefined,
      connector: undefined,
      error: undefined
    });

    this.emit('disconnected');
  }

  /**
   * Check wallet balance
   */
  async updateBalance(): Promise<void> {
    if (!this.state.isConnected || !this.state.address || !window.ethereum) {
      return;
    }

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [this.state.address, 'latest']
      });

      // Convert from wei to ETH
      const balanceInEth = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
      
      this.updateState({ balance: balanceInEth });
      this.emit('balanceUpdated', balanceInEth);
      
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  }

  /**
   * Start monitoring balance changes
   */
  private startBalanceMonitoring(): void {
    if (this.balanceUpdateInterval) {
      clearInterval(this.balanceUpdateInterval);
    }

    this.balanceUpdateInterval = setInterval(() => {
      if (this.state.isConnected) {
        this.updateBalance();
      }
    }, 10000); // Update every 10 seconds
  }

  /**
   * Stop monitoring balance changes
   */
  private stopBalanceMonitoring(): void {
    if (this.balanceUpdateInterval) {
      clearInterval(this.balanceUpdateInterval);
      this.balanceUpdateInterval = undefined;
    }
  }

  /**
   * Handle account changes
   */
  private handleAccountsChanged(accounts: string[]): void {
    if (accounts.length === 0) {
      this.disconnect();
    } else if (accounts[0] !== this.state.address) {
      this.updateState({ address: accounts[0] });
      this.updateBalance();
      this.emit('accountsChanged', accounts[0]);
    }
  }

  /**
   * Handle chain changes
   */
  private handleChainChanged(chainId: number): void {
    this.updateState({ chainId });
    this.emit('chainChanged', chainId);

    // If not on Base network, show warning
    if (chainId !== 8453) { // Base mainnet
      console.warn('Not connected to Base network. Some features may not work.');
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(error: any): void {
    console.log('Wallet disconnected:', error);
    this.disconnect();
  }

  /**
   * Parse wallet errors into user-friendly format
   */
  private parseWalletError(error: any): WalletConnectionError {
    if (error?.code === 4001) {
      return {
        code: 'USER_REJECTED',
        message: 'Connection rejected by user',
        recoverable: true
      };
    }

    if (error?.code === -32002) {
      return {
        code: 'PENDING_REQUEST',
        message: 'Connection request already pending. Please check your wallet.',
        recoverable: true
      };
    }

    if (error?.code === 4902) {
      return {
        code: 'UNSUPPORTED_CHAIN',
        message: 'Unsupported network. Please add Base network to your wallet.',
        recoverable: true
      };
    }

    if (error?.message?.includes('No provider')) {
      return {
        code: 'NO_WALLET',
        message: 'No wallet detected. Please install MetaMask or another Web3 wallet.',
        recoverable: false
      };
    }

    if (error?.message?.includes('Network Error')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed. Please check your internet connection.',
        recoverable: true
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'An unknown error occurred while connecting to your wallet.',
      details: error,
      recoverable: true
    };
  }

  /**
   * Update internal state
   */
  private updateState(updates: Partial<WalletState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Event emitter
   */
  on(event: WalletEvent, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: WalletEvent, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: WalletEvent, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Get current wallet state
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Check if sufficient balance for trading
   */
  async hasMinimumBalance(minAmount: number): Promise<boolean> {
    if (!this.state.balance) {
      await this.updateBalance();
    }

    const balance = parseFloat(this.state.balance || '0');
    return balance >= minAmount;
  }

  /**
   * Get network information
   */
  getNetworkInfo(): { isCorrectNetwork: boolean; networkName: string } {
    const chainId = this.state.chainId;
    
    if (chainId === 8453) {
      return { isCorrectNetwork: true, networkName: 'Base' };
    } else if (chainId === 84532) {
      return { isCorrectNetwork: true, networkName: 'Base Sepolia' };
    } else {
      return { isCorrectNetwork: false, networkName: chainId ? `Chain ${chainId}` : 'Unknown' };
    }
  }

  /**
   * Retry connection with exponential backoff
   */
  async retryConnection(): Promise<WalletState> {
    if (!this.state.connector) {
      throw new Error('No previous connection to retry');
    }

    return await this.connect(this.state.connector as any);
  }
}

// Global wallet connection instance
let walletConnection: EnhancedWalletConnection;

export function getWalletConnection(): EnhancedWalletConnection {
  if (!walletConnection) {
    walletConnection = new EnhancedWalletConnection();
  }
  return walletConnection;
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}