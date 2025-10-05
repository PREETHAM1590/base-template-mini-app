import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/lib/providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ArbiTips - AI-Powered Arbitrage Scanner',
  description: 'Find and execute profitable arbitrage opportunities on Base network with AI-powered analysis',
  keywords: ['arbitrage', 'defi', 'base', 'trading', 'ai', 'crypto'],
  authors: [{ name: 'ArbiTips Team' }],
  creator: 'ArbiTips',
  publisher: 'ArbiTips',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://arbitips.app'),
  openGraph: {
    title: 'ArbiTips - AI-Powered Arbitrage Scanner',
    description: 'Find and execute profitable arbitrage opportunities on Base network',
    url: 'https://arbitips.app',
    siteName: 'ArbiTips',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ArbiTips - AI-Powered Arbitrage Scanner',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ArbiTips - AI-Powered Arbitrage Scanner',
    description: 'Find and execute profitable arbitrage opportunities on Base network',
    images: ['/og-image.png'],
    creator: '@ArbiTips',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/icon-32x32.png" sizes="32x32" />
        <link rel="icon" href="/icon-192x192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}