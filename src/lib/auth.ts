import { NextRequest } from 'next/server'
import { verifyMessage } from 'viem'

export interface AuthResult {
  address?: string
  fid?: number
  isAuthenticated: boolean
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult | null> {
  try {
    // Try to verify wallet signature first
    const walletAuth = await verifyWalletAuth(request)
    if (walletAuth) {
      return walletAuth
    }

    // Try to verify Farcaster auth
    const farcasterAuth = await verifyFarcasterAuth(request)
    if (farcasterAuth) {
      return farcasterAuth
    }

    return null
  } catch (error) {
    console.error('Auth verification error:', error)
    return null
  }
}

async function verifyWalletAuth(request: NextRequest): Promise<AuthResult | null> {
  const authHeader = request.headers.get('authorization')
  const signature = request.headers.get('x-signature')
  const address = request.headers.get('x-address')
  const message = request.headers.get('x-message')

  if (!signature || !address || !message) {
    return null
  }

  try {
    // Verify the signature
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })

    if (isValid) {
      return {
        address,
        isAuthenticated: true,
      }
    }
  } catch (error) {
    console.error('Wallet auth verification failed:', error)
  }

  return null
}

async function verifyFarcasterAuth(request: NextRequest): Promise<AuthResult | null> {
  const fid = request.headers.get('x-farcaster-fid')
  const signature = request.headers.get('x-farcaster-signature')
  const message = request.headers.get('x-farcaster-message')

  if (!fid || !signature || !message) {
    return null
  }

  try {
    // Mock verification - in production this would verify the Farcaster signature properly
    const fidNumber = parseInt(fid)
    if (fidNumber > 0) {
      return {
        fid: fidNumber,
        isAuthenticated: true,
      }
    }
  } catch (error) {
    console.error('Farcaster auth verification failed:', error)
  }

  return null
}

// Helper function to generate authentication challenge
export function generateAuthChallenge(address: string): string {
  const timestamp = Date.now()
  return `ArbiTips wants to verify your wallet:\n\nAddress: ${address}\nTimestamp: ${timestamp}\n\nSign this message to authenticate.`
}

// Helper function to check if auth is still valid (not expired)
export function isAuthValid(timestamp: number, maxAge: number = 3600000): boolean {
  return Date.now() - timestamp < maxAge // Default 1 hour
}