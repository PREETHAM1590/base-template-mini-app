import { parseGwei, formatGwei, parseUnits, isAddress } from 'viem';

export interface SecurityConfig {
  maxGasPrice: bigint;
  maxSlippage: number;
  minLiquidity: number;
  blacklistedTokens: string[];
  blacklistedDexes: string[];
  maxConcurrentTrades: number;
  transactionTimeout: number;
  requireSimulation: boolean;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
}

export interface SecurityCheck {
  passed: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditLogEntry {
  timestamp: number;
  action: string;
  user: string;
  details: any;
  result: 'success' | 'failed' | 'blocked';
  txHash?: string;
  error?: string;
}

export class SecurityManager {
  private config: SecurityConfig;
  private auditLog: AuditLogEntry[] = [];
  private failedAttempts: Map<string, number> = new Map();
  private circuitBreakerActive = false;
  private lastSecurityCheck = 0;
  
  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      maxGasPrice: parseGwei('100'), // 100 gwei max
      maxSlippage: 3.0, // 3% max slippage
      minLiquidity: 10000, // $10,000 minimum liquidity
      blacklistedTokens: [],
      blacklistedDexes: [],
      maxConcurrentTrades: 3,
      transactionTimeout: 300000, // 5 minutes
      requireSimulation: true,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5, // 5 failed trades triggers circuit breaker
      ...config
    };
  }

  /**
   * Comprehensive security check before trade execution
   */
  async performSecurityCheck(trade: any): Promise<SecurityCheck> {
    try {
      // Check circuit breaker
      if (this.circuitBreakerActive) {
        return {
          passed: false,
          reason: 'Circuit breaker active - trading halted for safety',
          severity: 'critical'
        };
      }

      // Check blacklisted tokens
      if (this.isBlacklisted(trade.tokenA) || this.isBlacklisted(trade.tokenB)) {
        return {
          passed: false,
          reason: 'Token is blacklisted',
          severity: 'high'
        };
      }

      // Check DEX blacklist
      if (this.isDexBlacklisted(trade.dexA) || this.isDexBlacklisted(trade.dexB)) {
        return {
          passed: false,
          reason: 'DEX is blacklisted',
          severity: 'high'
        };
      }

      // Check gas price
      const gasCheck = await this.checkGasPrice();
      if (!gasCheck.passed) {
        return gasCheck;
      }

      // Check slippage
      if (trade.slippage > this.config.maxSlippage) {
        return {
          passed: false,
          reason: `Slippage ${trade.slippage}% exceeds maximum ${this.config.maxSlippage}%`,
          severity: 'medium'
        };
      }

      // Check liquidity
      if (trade.liquidity < this.config.minLiquidity) {
        return {
          passed: false,
          reason: `Insufficient liquidity: $${trade.liquidity}`,
          severity: 'medium'
        };
      }

      // Check for unusual patterns
      const patternCheck = this.detectUnusualPatterns(trade);
      if (!patternCheck.passed) {
        return patternCheck;
      }

      // Check rate limiting
      const rateCheck = this.checkRateLimit(trade.user);
      if (!rateCheck.passed) {
        return rateCheck;
      }

      // All checks passed
      return { passed: true };
      
    } catch (error) {
      console.error('Security check failed:', error);
      return {
        passed: false,
        reason: 'Security check error',
        severity: 'high'
      };
    }
  }

  /**
   * Check current gas price
   */
  private async checkGasPrice(): Promise<SecurityCheck> {
    try {
      // In production, get actual gas price from provider
      const currentGasPrice = parseGwei('50'); // Mock value
      
      if (currentGasPrice > this.config.maxGasPrice) {
        return {
          passed: false,
          reason: `Gas price too high: ${formatGwei(currentGasPrice)} gwei`,
          severity: 'low'
        };
      }
      
      return { passed: true };
    } catch (error) {
      return {
        passed: false,
        reason: 'Could not check gas price',
        severity: 'medium'
      };
    }
  }

  /**
   * Detect unusual trading patterns
   */
  private detectUnusualPatterns(trade: any): SecurityCheck {
    // Check for sandwich attack patterns
    if (this.isSandwichAttackPattern(trade)) {
      return {
        passed: false,
        reason: 'Potential sandwich attack detected',
        severity: 'critical'
      };
    }

    // Check for front-running patterns
    if (this.isFrontRunningPattern(trade)) {
      return {
        passed: false,
        reason: 'Potential front-running detected',
        severity: 'high'
      };
    }

    // Check for wash trading
    if (this.isWashTradingPattern(trade)) {
      return {
        passed: false,
        reason: 'Potential wash trading detected',
        severity: 'high'
      };
    }

    return { passed: true };
  }

  /**
   * Check if trade pattern suggests sandwich attack
   */
  private isSandwichAttackPattern(trade: any): boolean {
    // Simplified check - in production, use more sophisticated detection
    const recentTrades = this.getRecentTrades(trade.tokenA, trade.tokenB);
    
    // Check for rapid buy-sell pattern
    if (recentTrades.length >= 2) {
      const timeDiff = Date.now() - recentTrades[0].timestamp;
      if (timeDiff < 30000) { // Within 30 seconds
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if trade pattern suggests front-running
   */
  private isFrontRunningPattern(trade: any): boolean {
    // Check if similar trade was recently submitted
    const similarTrades = this.auditLog.filter(entry => {
      return entry.timestamp > Date.now() - 5000 && // Within 5 seconds
             entry.details.tokenA === trade.tokenA &&
             entry.details.tokenB === trade.tokenB &&
             Math.abs(entry.details.amount - trade.amount) < trade.amount * 0.1; // Similar amount
    });
    
    return similarTrades.length > 0;
  }

  /**
   * Check if trade pattern suggests wash trading
   */
  private isWashTradingPattern(trade: any): boolean {
    // Check for repetitive back-and-forth trades
    const userTrades = this.auditLog.filter(entry => 
      entry.user === trade.user &&
      entry.timestamp > Date.now() - 3600000 // Within last hour
    );
    
    // Count round-trip trades
    let roundTrips = 0;
    for (let i = 1; i < userTrades.length; i++) {
      if (userTrades[i].details.tokenA === userTrades[i-1].details.tokenB &&
          userTrades[i].details.tokenB === userTrades[i-1].details.tokenA) {
        roundTrips++;
      }
    }
    
    return roundTrips > 3; // More than 3 round-trips
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(user: string): SecurityCheck {
    const now = Date.now();
    const userTrades = this.auditLog.filter(entry => 
      entry.user === user &&
      entry.timestamp > now - 60000 // Last minute
    );
    
    if (userTrades.length > 10) {
      return {
        passed: false,
        reason: 'Rate limit exceeded',
        severity: 'low'
      };
    }
    
    return { passed: true };
  }

  /**
   * Transaction simulation
   */
  async simulateTransaction(trade: any): Promise<{success: boolean; estimatedGas?: bigint; error?: string}> {
    try {
      if (!this.config.requireSimulation) {
        return { success: true };
      }

      // In production, use eth_call or tenderly simulation
      // For now, basic validation
      if (trade.amount <= 0) {
        return { success: false, error: 'Invalid trade amount' };
      }

      if (!isAddress(trade.tokenA) || !isAddress(trade.tokenB)) {
        return { success: false, error: 'Invalid token addresses' };
      }

      // Mock gas estimation
      const estimatedGas = parseUnits('200000', 'wei');
      
      return { 
        success: true, 
        estimatedGas 
      };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Simulation failed' 
      };
    }
  }

  /**
   * Log trading activity for audit
   */
  logActivity(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      timestamp: Date.now(),
      ...entry
    };
    
    this.auditLog.push(logEntry);
    
    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // Update failed attempts counter
    if (entry.result === 'failed') {
      const failures = this.failedAttempts.get(entry.user) || 0;
      this.failedAttempts.set(entry.user, failures + 1);
      
      // Trigger circuit breaker if needed
      if (failures >= this.config.circuitBreakerThreshold) {
        this.triggerCircuitBreaker();
      }
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', logEntry);
    }
  }

  /**
   * Trigger circuit breaker
   */
  private triggerCircuitBreaker(): void {
    if (!this.config.enableCircuitBreaker) return;
    
    this.circuitBreakerActive = true;
    console.error('🚨 CIRCUIT BREAKER ACTIVATED - Trading halted');
    
    // Auto-reset after 5 minutes
    setTimeout(() => {
      this.circuitBreakerActive = false;
      this.failedAttempts.clear();
      console.log('✅ Circuit breaker reset - Trading resumed');
    }, 300000);
  }

  /**
   * Manual circuit breaker control
   */
  activateCircuitBreaker(): void {
    this.circuitBreakerActive = true;
  }

  deactivateCircuitBreaker(): void {
    this.circuitBreakerActive = false;
    this.failedAttempts.clear();
  }

  /**
   * Check if token is blacklisted
   */
  private isBlacklisted(token: string): boolean {
    return this.config.blacklistedTokens.includes(token.toLowerCase());
  }

  /**
   * Check if DEX is blacklisted
   */
  private isDexBlacklisted(dex: string): boolean {
    return this.config.blacklistedDexes.includes(dex.toLowerCase());
  }

  /**
   * Get recent trades for pattern detection
   */
  private getRecentTrades(tokenA: string, tokenB: string): any[] {
    return this.auditLog.filter(entry => 
      entry.details?.tokenA === tokenA &&
      entry.details?.tokenB === tokenB &&
      entry.timestamp > Date.now() - 60000 // Last minute
    );
  }

  /**
   * Update security configuration
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('Security configuration updated');
  }

  /**
   * Get audit log
   */
  getAuditLog(limit?: number): AuditLogEntry[] {
    return limit ? this.auditLog.slice(-limit) : this.auditLog;
  }

  /**
   * Get security status
   */
  getSecurityStatus(): {
    circuitBreakerActive: boolean;
    failedAttempts: number;
    recentAlerts: number;
    lastCheck: number;
  } {
    const totalFailures = Array.from(this.failedAttempts.values()).reduce((a, b) => a + b, 0);
    const recentAlerts = this.auditLog.filter(entry => 
      entry.result === 'blocked' && 
      entry.timestamp > Date.now() - 3600000
    ).length;
    
    return {
      circuitBreakerActive: this.circuitBreakerActive,
      failedAttempts: totalFailures,
      recentAlerts,
      lastCheck: this.lastSecurityCheck
    };
  }

  /**
   * Add token to blacklist
   */
  blacklistToken(token: string): void {
    if (!this.config.blacklistedTokens.includes(token.toLowerCase())) {
      this.config.blacklistedTokens.push(token.toLowerCase());
      console.log(`Token ${token} added to blacklist`);
    }
  }

  /**
   * Remove token from blacklist
   */
  whitelistToken(token: string): void {
    this.config.blacklistedTokens = this.config.blacklistedTokens.filter(
      t => t !== token.toLowerCase()
    );
    console.log(`Token ${token} removed from blacklist`);
  }
}