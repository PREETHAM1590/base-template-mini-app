'use client'

import { ReactNode, createContext, useContext, useState, useEffect } from 'react'

// Enhanced mock wallet context for development
interface WalletContextType {
  address: string | null
  isConnected: boolean
  chain: { id: number; name: string } | null
  connect: () => Promise<void>
  disconnect: () => void
  switchNetwork: (chainId: number) => Promise<void>
  isConnecting: boolean
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  chain: null,
  connect: async () => {},
  disconnect: () => {},
  switchNetwork: async () => {},
  isConnecting: false
})

export const useAccount = () => {
  const { address, isConnected } = useContext(WalletContext)
  return { address, isConnected }
}

export const useConnect = () => {
  const { connect, disconnect, isConnecting } = useContext(WalletContext)
  return { connect, disconnect, isConnecting }
}

export const useNetwork = () => {
  const { chain } = useContext(WalletContext)
  return { chain }
}

export const useSwitchNetwork = () => {
  const { switchNetwork } = useContext(WalletContext)
  return { switchNetwork }
}

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [chain, setChain] = useState<{ id: number; name: string } | null>({
    id: 8453,
    name: 'Base'
  })

  // Auto-connect if previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem('wallet-connected')
    if (wasConnected === 'true') {
      setAddress('0x742d35Cc6634C0532925a3b8D2a4b7C5f2C8Dd8d')
      setIsConnected(true)
    }
  }, [])

  const connect = async () => {
    setIsConnecting(true)
    
    // Simulate wallet connection delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Simulate wallet connection
    setAddress('0x742d35Cc6634C0532925a3b8D2a4b7C5f2C8Dd8d')
    setIsConnected(true)
    setIsConnecting(false)
    
    // Remember connection
    localStorage.setItem('wallet-connected', 'true')
  }

  const disconnect = () => {
    setAddress(null)
    setIsConnected(false)
    setIsConnecting(false)
    localStorage.removeItem('wallet-connected')
  }

  const switchNetwork = async (chainId: number) => {
    // Simulate network switching delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (chainId === 8453) {
      setChain({ id: 8453, name: 'Base' })
    } else if (chainId === 84531) {
      setChain({ id: 84531, name: 'Base Sepolia' })
    } else if (chainId === 1) {
      setChain({ id: 1, name: 'Ethereum' })
    }
  }

  const value = {
    address,
    isConnected,
    chain,
    connect,
    disconnect,
    switchNetwork,
    isConnecting
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}
