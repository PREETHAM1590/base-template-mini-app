'use client'

import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { useFarcasterAuth } from '@/lib/farcaster'
import { formatAddress } from '@/lib/utils'
import { User, Settings } from 'lucide-react'

export function Header() {
  const { address, isConnected } = useAccount()
  const { user: farcasterUser, isSignedIn } = useFarcasterAuth()

  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold">A</span>
        </div>
        <div>
          <h1 className="font-bold text-lg">ArbiTips</h1>
          <p className="text-xs text-muted-foreground">AI Arbitrage Scanner</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {isConnected || isSignedIn ? (
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
            {address && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-muted rounded-lg">
                <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-blue-500 rounded-full" />
                <span className="text-xs font-mono">{formatAddress(address)}</span>
              </div>
            )}
            <ConnectKitButton />
          </div>
        ) : (
          <ConnectKitButton />
        )}
      </div>
    </header>
  )
}