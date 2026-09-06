'use client'

import { useState, useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { ARC_EXPLORER_URL } from '@/lib/contracts'
import { getAccountData, removeAccountData } from '@/lib/storage'

interface HistoryItem {
  txHash: string
  tokenAddress: string
  tokenSymbol: string
  totalAmount: string
  decimals: number
  recipientCount: number
  successfulTransfers?: number
  timestamp: number
}

export default function History() {
  const { wallets } = useWallets()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'partial'>('all')

  const walletAddress = wallets[0]?.address || ''

  const fetchHistory = () => {
    if (walletAddress) {
      const saved = getAccountData('history', walletAddress) || []
      setHistory(saved)
    } else {
      setHistory([])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchHistory()

    const interval = setInterval(fetchHistory, 2000)
    return () => clearInterval(interval)
  }, [walletAddress])

  const clearHistory = () => {
    if (confirm('Clear all transaction history?')) {
      if (walletAddress) {
        removeAccountData('history', walletAddress)
      }
      fetchHistory()
    }
  }

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true
    if (filter === 'completed') return !item.successfulTransfers || item.successfulTransfers === item.recipientCount
    if (filter === 'partial') return item.successfulTransfers && item.successfulTransfers < item.recipientCount
    return true
  })

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <p className="text-gray-400">Loading history...</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Transaction History</h2>
          <button
            onClick={fetchHistory}
            className="bg-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg text-center py-12">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-gray-400 text-lg mb-2">No transactions yet</p>
          <p className="text-gray-500 text-sm">
            Create a distribution to see it here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-3xl font-bold">Transaction History</h2>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              filter === 'all' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            All ({history.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              filter === 'completed' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('partial')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              filter === 'partial' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Partial
          </button>
          <button
            onClick={fetchHistory}
            className="px-3 py-1.5 rounded-lg text-xs bg-gray-700 hover:bg-gray-600"
          >
            🔄
          </button>
          <button
            onClick={clearHistory}
            className="px-3 py-1.5 rounded-lg text-xs bg-red-600 hover:bg-red-700"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="bg-gray-800 p-6 rounded-lg text-center py-8">
            <p className="text-gray-400">No transactions with this filter</p>
          </div>
        ) : (
          filteredHistory.map((item, index) => {
            const total = (Number(item.totalAmount) / 10 ** item.decimals).toFixed(4)
            const date = new Date(item.timestamp).toLocaleString()
            const successCount = item.successfulTransfers || item.recipientCount
            const isComplete = successCount === item.recipientCount
            
            return (
              <div key={index} className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {isComplete ? (
                        <span className="inline-block px-3 py-1 rounded-full text-xs bg-green-600/20 text-green-400">
                          ✓ Completed
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full text-xs bg-yellow-600/20 text-yellow-400">
                          ⚠ Partial
                        </span>
                      )}
                      <span className="text-sm text-gray-400">{date}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Token</p>
                        <p className="font-semibold">{item.tokenSymbol || 'USDC'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                        <p className="font-semibold">{total} {item.tokenSymbol || 'USDC'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Recipients</p>
                        <p className="font-semibold">
                          {successCount} / {item.recipientCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Transaction</p>
                        {item.txHash ? (
                          <a
                            href={`${ARC_EXPLORER_URL}/tx/${item.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 font-mono text-sm"
                          >
                            {item.txHash.slice(0, 10)}...
                          </a>
                        ) : (
                          <p className="text-gray-500 text-sm">No hash</p>
                        )}
                      </div>
                    </div>

                    {!isComplete && (
                      <div className="mt-3 text-xs text-yellow-400">
                        {item.recipientCount - successCount} transfer(s) failed or were blocked
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
