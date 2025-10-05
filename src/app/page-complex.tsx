'use client'

import { useState, useEffect } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { Header } from '@/components/Header'
import { Scanner } from '@/components/Scanner'
import { OpportunityCard } from '@/components/OpportunityCard'
import { UserStats } from '@/components/UserStats'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useFarcasterAuth } from '@/lib/farcaster'
import { ArbitrageOpportunity, UserStats as UserStatsType } from '@/types'
import { RefreshCw, TrendingUp, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([])
  const [userStats, setUserStats] = useState<UserStatsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoScan, setAutoScan] = useState(false)

  const { address, isConnected } = useAccount()
  const { user: farcasterUser, isSignedIn } = useFarcasterAuth()

  useEffect(() => {
    if (isConnected || isSignedIn) {
      fetchOpportunities()
      fetchUserStats()
    }
  }, [isConnected, isSignedIn])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoScan && (isConnected || isSignedIn)) {
      interval = setInterval(() => {
        fetchOpportunities()
      }, 30000) // Scan every 30 seconds
    }
    return () => clearInterval(interval)
  }, [autoScan, isConnected, isSignedIn])

  const fetchOpportunities = async () => {
    if (!isConnected && !isSignedIn) return

    setIsScanning(true)
    setError(null)

    try {
      const response = await fetch('/api/arbitrage', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch opportunities')
      }

      const data = await response.json()
      setOpportunities(data.data || [])
    } catch (error) {
      console.error('Error fetching opportunities:', error)
      setError('Failed to fetch opportunities. Please try again.')
    } finally {
      setIsScanning(false)
      setIsLoading(false)
    }
  }

  const fetchUserStats = async () => {
    if (!address && !farcasterUser?.fid) return

    try {
      const response = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user stats')
      }

      const data = await response.json()
      setUserStats(data.data)
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const handleScanNow = () => {
    fetchOpportunities()
  }

  const handleAutoScanToggle = (enabled: boolean) => {
    setAutoScan(enabled)
  }

  if (!isConnected && !isSignedIn) {
    return (
      <div className="mobile-container">
        <Header />
        
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold gradient-text">ArbiTips</h1>
            <p className="text-muted-foreground max-w-sm">
              AI-powered arbitrage opportunities scanner for Base network
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col space-y-3">
              <ConnectKitButton />
              <div className="text-sm text-muted-foreground">or</div>
              <button
                onClick={() => {/* Farcaster auth handled by useFarcasterAuth */}}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Sign in with Farcaster
              </button>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              Connect your wallet or Farcaster account to start finding arbitrage opportunities
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">AI</div>
              <div className="text-xs text-muted-foreground">Powered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">3+</div>
              <div className="text-xs text-muted-foreground">DEXs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">⚡</div>
              <div className="text-xs text-muted-foreground">Real-time</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-container">
      <Header />
      
      {userStats && (
        <div className="mb-6">
          <UserStats stats={userStats} />
        </div>
      )}

      <Scanner
        isScanning={isScanning}
        autoScan={autoScan}
        onScanNow={handleScanNow}
        onAutoScanToggle={handleAutoScanToggle}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Opportunities</h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span>{opportunities.length} found</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">No opportunities found</h3>
              <p className="text-sm text-muted-foreground">
                Try scanning again or adjust your filters
              </p>
            </div>
            <button
              onClick={handleScanNow}
              disabled={isScanning}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Scan Again</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onExecute={() => {
                  // Handle trade execution
                  console.log('Execute trade:', opportunity.id)
                }}
                onShare={() => {
                  // Handle sharing
                  console.log('Share opportunity:', opportunity.id)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {(isConnected || isSignedIn) && opportunities.length > 0 && (
        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
          <p>🤖 Opportunities analyzed by AI • ⛽ Gas estimates included</p>
          <p className="mt-1">Always DYOR before executing trades</p>
        </div>
      )}
    </div>
  )
}