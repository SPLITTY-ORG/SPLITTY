'use client'

import { useState, useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { supabase } from '@/lib/supabase/client'

interface GatewayStatus {
  status: string
  txHash?: string
}

export default function Gateway() {
  const { user } = usePrivy()
  const { wallets } = useWallets()
  const [gatewayBalance, setGatewayBalance] = useState('0')
  const [hasWallet, setHasWallet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [status, setStatus] = useState<GatewayStatus | null>(null)

  const walletAddress = wallets[0]?.address || ''

  const fetchBalance = async () => {
    if (!user?.id) return

    setLoading(true)

    try {
      const response = await fetch('/api/gateway/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await response.json()
      setGatewayBalance(data.balance || '0')
      setHasWallet(data.hasWallet || false)
    } catch (error) {
      console.error('Error fetching balance:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id && walletAddress) {
      fetchBalance()
    }
  }, [user, walletAddress])

  const handleCreateWallet = async () => {
    if (!user?.id || !walletAddress) return

    setIsCreating(true)
    setStatus({ status: '🔄 Creating Circle wallet...' })

    try {
      const response = await fetch('/api/gateway/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, address: walletAddress }),
      })
      const data = await response.json()

      if (data.success) {
        setStatus({ status: '✅ Wallet created!' })
        setHasWallet(true)
        await fetchBalance()
      } else {
        setStatus({ status: `❌ ${data.error || 'Failed to create wallet'}` })
      }
    } catch (error: any) {
      setStatus({ status: `❌ Error: ${error.message}` })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Circle Gateway</h3>
          <button
            onClick={fetchBalance}
            className="text-xs text-gray-400 hover:text-gray-300"
          >
            🔄 Refresh
          </button>
        </div>

        {!hasWallet ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-4">💰</p>
            <p className="text-gray-400 mb-6">No Circle wallet found. Create one to use Gateway.</p>
            <button
              onClick={handleCreateWallet}
              disabled={isCreating}
              className="bg-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-700 disabled:bg-gray-600"
            >
              {isCreating ? 'Creating...' : 'Create Circle Wallet'}
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-4 rounded-lg mb-6">
              <p className="text-sm text-purple-200 mb-1">Gateway Balance</p>
              <p className="text-3xl font-bold">
                {loading ? '...' : `${parseFloat(gatewayBalance).toFixed(2)} USDC`}
              </p>
            </div>
          </>
        )}

        {status && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <p className="text-sm font-medium">{status.status}</p>
          </div>
        )}
      </div>
    </div>
  )
}
