import { useProfile, useSignIn } from '@farcaster/auth-kit'
import { FarcasterUser } from '@/types'

export function useFarcasterAuth() {
  const {
    isSuccess: isSignedIn,
    isLoading: isSigningIn,
    isError: signInError,
    signIn,
    message,
    signature,
    fid,
    username,
    displayName,
    pfpUrl,
    bio,
    custodyAddress,
    verifications,
  } = useSignIn()

  const { data: profile, isLoading: isLoadingProfile } = useProfile({
    fid: fid || undefined,
  })

  const user: FarcasterUser | null = fid ? {
    fid,
    username: username || '',
    displayName: displayName || '',
    avatar: pfpUrl || '',
    bio: bio || '',
    followerCount: profile?.follower_count || 0,
    followingCount: profile?.following_count || 0,
    verifications: verifications || [],
    isConnected: isSignedIn,
  } : null

  const signInWithFarcaster = async () => {
    try {
      await signIn()
    } catch (error) {
      console.error('Failed to sign in with Farcaster:', error)
      throw error
    }
  }

  return {
    user,
    isSignedIn,
    isSigningIn,
    isLoadingProfile,
    signInError,
    signIn: signInWithFarcaster,
    custodyAddress,
    message,
    signature,
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