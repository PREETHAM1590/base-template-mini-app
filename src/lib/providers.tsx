'use client'

import { ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // Simplified provider for demo - will add Web3 providers later
  return (
    <div>
      {children}
    </div>
  )
}
