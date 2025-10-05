'use client'

import { useState } from 'react'

export default function TestPage() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-white/20">
        <div className="text-center space-y-6">
          <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            ArbiTips
          </div>
          
          <div className="text-xl text-white/80">
            AI-Powered Arbitrage Scanner
          </div>
          
          <div className="space-y-4">
            <div className="text-lg text-white/70">
              Test Counter: <span className="text-white font-bold">{count}</span>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setCount(c => c + 1)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Increment
              </button>
              
              <button
                onClick={() => setCount(0)}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
          
          <div className="text-sm text-white/50">
            ✅ Next.js 14 Working<br/>
            ✅ Tailwind CSS Working<br/>
            ✅ TypeScript Working<br/>
            ✅ React State Working
          </div>
          
          <div className="pt-4">
            <a 
              href="/"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Go to Main App
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}