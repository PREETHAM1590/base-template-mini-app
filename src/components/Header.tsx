'use client'

import { useAccount, useConnect } from '../lib/providers'
import { useFarcasterAuth } from '@/lib/farcaster'
import { formatAddress } from '@/lib/utils'
import { User, Settings, Wallet } from 'lucide-react'

export function Header() {
  const { address, isConnected } = useAccount()
  const { connect, disconnect, isConnecting } = useConnect()
  const { user: farcasterUser, isSignedIn } = useFarcasterAuth()

  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold">A</span>
        </div>
        <div>
          <h1 className="font-bold text-lg text-white">ArbiTips</h1>
          <p className="text-xs text-gray-400">AI Arbitrage Scanner</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {farcasterUser && (
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <img
              src={farcasterUser.avatar}
              alt={farcasterUser.displayName}
              className="w-5 h-5 rounded-full"
            />
            <span className="text-xs font-medium">@{farcasterUser.username}</span>
          </div>
        )}
        
        {isConnected ? (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <Wallet className="w-4 h-4 text-green-400" />
              <span className="text-xs font-mono text-green-300">{formatAddress(address!)}</span>
            </div>
            <button
              onClick={disconnect}
              className="px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  )
}
