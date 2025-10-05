import { FarcasterUser } from '@/types'
import { useState, useEffect } from 'react'

// Mock Farcaster auth implementation for development
// In production, replace with actual @farcaster/auth-kit integration
export function useFarcasterAuth() {
  const [user, setUser] = useState<FarcasterUser | null>(null)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<Error | null>(null)

  // Check for existing auth on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('farcaster_user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        setIsSignedIn(true)
      } catch (error) {
        console.error('Failed to parse saved user:', error)
        localStorage.removeItem('farcaster_user')
      }
    }
  }, [])

  const signInWithFarcaster = async () => {
    setIsSigningIn(true)
    setSignInError(null)
    
    try {
      // Mock sign-in process - replace with actual Farcaster auth
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      const mockUser: FarcasterUser = {
        fid: Math.floor(Math.random() * 100000) + 1000,
        username: `user${Math.floor(Math.random() * 10000)}`,
        displayName: 'Demo User',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
        bio: 'Arbitrage enthusiast using ArbiTips',
        followerCount: Math.floor(Math.random() * 1000),
        followingCount: Math.floor(Math.random() * 500),
        verifications: [],
        isConnected: true,
      }
      
      setUser(mockUser)
      setIsSignedIn(true)
      localStorage.setItem('farcaster_user', JSON.stringify(mockUser))
    } catch (error) {
      setSignInError(error as Error)
      console.error('Failed to sign in with Farcaster:', error)
    } finally {
      setIsSigningIn(false)
    }
  }

  const signOut = () => {
    setUser(null)
    setIsSignedIn(false)
    localStorage.removeItem('farcaster_user')
  }

  return {
    user,
    isSignedIn,
    isSigningIn,
    isLoadingProfile: false,
    signInError,
    signIn: signInWithFarcaster,
    signOut,
    custodyAddress: user?.verifications[0] || null,
    message: null,
    signature: null,
  }
}

export async function getUserProfile(fid: number): Promise<FarcasterUser | null> {
  try {
    // For now, return mock data - in production this would call an API endpoint
    return {
      fid,
      username: `user${fid}`,
      displayName: `User ${fid}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fid}`,
      bio: 'Farcaster user',
      followerCount: Math.floor(Math.random() * 1000),
      followingCount: Math.floor(Math.random() * 500),
      verifications: [],
      isConnected: true,
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return null
  }
}

export async function postCast(text: string, embeds?: string[]): Promise<string | null> {
  try {
    // For now, return mock data - in production this would call an API endpoint
    console.log('Mock posting cast:', text, embeds)
    
    // Generate a mock hash
    const mockHash = '0x' + Math.random().toString(16).substring(2, 10)
    return mockHash
  } catch (error) {
    console.error('Failed to post cast:', error)
    return null
  }
}

export function createShareText(
  profit: string,
  winRate: number,
  totalTrades: number,
): string {
  const shareText = `🚀 Just made ${profit} ETH in arbitrage profits on @base with @arbitips!\n\n📊 Win Rate: ${(winRate * 100).toFixed(1)}%\n🎯 Total Trades: ${totalTrades}\n\nFind your next arbitrage opportunity: https://arbitips.app\n\n#Base #DeFi #Arbitrage #ArbiTips`
  
  return shareText
}

export function createOpportunityShareText(
  tokenA: string,
  tokenB: string,
  spread: number,
  exchanges: string[],
): string {
  const shareText = `💰 Found a ${spread.toFixed(2)}% arbitrage opportunity!\n\n🔄 ${tokenA}/${tokenB}\n📈 ${exchanges[0]} → ${exchanges[1]}\n\nDiscover more opportunities with @arbitips on @base\n\nhttps://arbitips.app\n\n#Arbitrage #DeFi #Base`
  
  return shareText
}