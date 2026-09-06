'use client'

import { useState, useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { ethers } from 'ethers'
import { ARC_EXPLORER_URL, ARC_CHAIN_ID } from '@/lib/contracts'
import ChainIcons from '@/components/ChainIcons'

export default function Dashboard() {
  const { wallets } = useWallets()
  const [usdcBalance, setUsdcBalance] = useState('0')
  const [loading, setLoading] = useState(true)
  const [recentTx, setRecentTx] = useState<any[]>([])
  const [networkInfo, setNetworkInfo] = useState({ chainId: '', blockNumber: '' })
  const [onArcNetwork, setOnArcNetwork] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (wallets.length === 0) return

      setLoading(true)

      try {
        const wallet = wallets[0]
        const address = wallet.address
        const provider = await wallet.getEthereumProvider()
        const ethersProvider = new ethers.BrowserProvider(provider)

        const network = await ethersProvider.getNetwork()
        const isOnArc = Number(network.chainId) === ARC_CHAIN_ID
        setOnArcNetwork(isOnArc)

        if (isOnArc) {
          const balanceRaw = await ethersProvider.getBalance(address)
          setUsdcBalance(ethers.formatUnits(balanceRaw, 18))
          setNetworkInfo({
            chainId: network.chainId.toString(),
            blockNumber: (await ethersProvider.getBlockNumber()).toString()
          })
        }

        const savedHistory = JSON.parse(localStorage.getItem('splitty_history') || '[]')
        setRecentTx(savedHistory.slice(0, 3))
      } catch (error) {
        console.error('Error fetching data:', error)
        setOnArcNetwork(false)
      } finally {
        setLoading(false)
      }
    }

    if (wallets.length > 0) {
      fetchData()
    }
  }, [wallets])

  const switchToArc = async () => {
    const wallet = wallets[0]
    const provider = await wallet.getEthereumProvider()

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x4CEF52' }],
      })
      window.location.reload()
    } catch (error) {
      console.error('Error switching to Arc:', error)
    }
  }

  const openFaucet = () => {
    window.open('https://faucet.circle.com', '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-gray-400 mt-1">Welcome back to Splitty</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            onArcNetwork ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${onArcNetwork ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
            {onArcNetwork ? 'Arc Testnet' : 'Wrong Network'}
          </span>
        </div>
      </div>

      {!onArcNetwork && (
        <div className="bg-yellow-600/20 border border-yellow-600/50 p-4 rounded-lg">
          <p className="text-yellow-400 text-sm mb-3">
            ⚠️ Your wallet is on a different network. Switch to Arc Testnet to use Splitty.
          </p>
          <button
            onClick={switchToArc}
            className="bg-yellow-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700"
          >
            Switch to Arc Testnet
          </button>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-xl">
        <p className="text-sm text-blue-200 mb-2">USDC Balance</p>
        <p className="text-4xl font-bold">
          {loading ? 'Loading...' : `${Number(usdcBalance).toFixed(4)} USDC`}
        </p>
        <p className="text-sm text-blue-200 mt-2">Native USDC on Arc</p>
      </div>

      {/* Chain Icons Row */}
      <ChainIcons />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">Total Distributions</h3>
          <p className="text-2xl font-bold">
            {JSON.parse(localStorage.getItem('splitty_history') || '[]').length}
          </p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">Recent Recipients</h3>
          <p className="text-2xl font-bold">
            {recentTx.reduce((sum: number, tx: any) => sum + (tx.recipientCount || 0), 0)}
          </p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">Block Number</h3>
          <p className="text-2xl font-bold">{networkInfo.blockNumber || '...'}</p>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        
        {recentTx.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">📊</p>
            <p className="text-gray-400">No recent transactions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTx.map((tx: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                <div>
                  <p className="font-medium">{tx.tokenSymbol} Distribution</p>
                  <p className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString()}</p>
                </div>
                <a
                  href={`${ARC_EXPLORER_URL}/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  View ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <button
          onClick={openFaucet}
          className="bg-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          💧 Get USDC from Faucet
        </button>
      </div>
    </div>
  )
}
