'use client'

import { useState, useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { ethers } from 'ethers'

interface ChainBalance {
  chain: string
  icon: string
  balance: string
  isTestnet: boolean
  rpcUrl?: string
  usdcAddress?: string
  domain?: string
}

const TESTNET_CHAINS: ChainBalance[] = [
  {
    chain: 'Arc Testnet',
    icon: '🟢',
    balance: '0',
    isTestnet: true,
    rpcUrl: 'https://rpc.testnet.arc.network',
    usdcAddress: '0x3600000000000000000000000000000000000000',
    domain: 'CCTP Domain 36',
  },
  {
    chain: 'Ethereum Sepolia',
    icon: '🔷',
    balance: '0',
    isTestnet: true,
    rpcUrl: 'https://rpc.sepolia.org',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    domain: 'CCTP Domain 0',
  },
  {
    chain: 'Base Sepolia',
    icon: '🔵',
    balance: '0',
    isTestnet: true,
    rpcUrl: 'https://sepolia.base.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    domain: 'CCTP Domain 6',
  },
]

const MAINNET_CHAINS: ChainBalance[] = [
  { chain: 'Ethereum', icon: '🔷', balance: '—', isTestnet: false },
  { chain: 'Base', icon: '🔵', balance: '—', isTestnet: false },
  { chain: 'Arbitrum', icon: '🟠', balance: '—', isTestnet: false },
  { chain: 'Optimism', icon: '🔴', balance: '—', isTestnet: false },
  { chain: 'Polygon', icon: '🟣', balance: '—', isTestnet: false },
  { chain: 'Avalanche', icon: '🔺', balance: '—', isTestnet: false },
  { chain: 'Solana', icon: '🟡', balance: '—', isTestnet: false },
]

export default function ChainIcons() {
  const { wallets } = useWallets()
  const [testnetBalances, setTestnetBalances] = useState<ChainBalance[]>(TESTNET_CHAINS)
  const [loading, setLoading] = useState(true)
  const [connectedChain, setConnectedChain] = useState<string>('')
  const [hoveredChain, setHoveredChain] = useState<string | null>(null)

  useEffect(() => {
    const fetchBalances = async () => {
      if (wallets.length === 0) return

      setLoading(true)

      try {
        const wallet = wallets[0]
        const address = wallet.address

        const provider = await wallet.getEthereumProvider()
        const ethersProvider = new ethers.BrowserProvider(provider)
        const network = await ethersProvider.getNetwork()
        
        const chainId = Number(network.chainId)
        if (chainId === 5042002) setConnectedChain('Arc Testnet')
        else if (chainId === 11155111) setConnectedChain('Ethereum Sepolia')
        else if (chainId === 84532) setConnectedChain('Base Sepolia')

        const erc20ABI = [
          'function balanceOf(address) view returns (uint256)',
          'function decimals() view returns (uint8)',
        ]

        const updatedBalances = await Promise.all(
          TESTNET_CHAINS.map(async (chain) => {
            try {
              const rpcProvider = new ethers.JsonRpcProvider(chain.rpcUrl)
              const tokenContract = new ethers.Contract(chain.usdcAddress!, erc20ABI, rpcProvider)
              const balanceRaw = await tokenContract.balanceOf(address)
              const decimals = await tokenContract.decimals()
              return {
                ...chain,
                balance: ethers.formatUnits(balanceRaw, decimals)
              }
            } catch {
              return { ...chain, balance: '0' }
            }
          })
        )

        setTestnetBalances(updatedBalances)
      } catch (error) {
        console.error('Error fetching chain balances:', error)
      } finally {
        setLoading(false)
      }
    }

    if (wallets.length > 0) {
      fetchBalances()
    }
  }, [wallets])

  const hasBalance = (chain: ChainBalance) => {
    if (chain.balance === '—') return false
    return parseFloat(chain.balance) > 0
  }

  const totalTestnetBalance = testnetBalances.reduce((sum, chain) => {
    return sum + (parseFloat(chain.balance) || 0)
  }, 0)

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Chain Balances</h3>
        <span className="text-sm font-bold text-green-400">
          ${totalTestnetBalance.toFixed(2)}
        </span>
      </div>

      {/* Testnet Chains */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Testnet</p>
        <div className="flex items-center space-x-3">
          {testnetBalances.map((chain) => {
            const isConnected = connectedChain === chain.chain
            const hasFunds = hasBalance(chain)
            
            return (
              <div
                key={chain.chain}
                className="relative"
                onMouseEnter={() => setHoveredChain(chain.chain)}
                onMouseLeave={() => setHoveredChain(null)}
              >
                <div
                  className={`
                    flex items-center justify-center rounded-full
                    ${chain.chain === 'Arc Testnet' ? 'w-14 h-14 text-2xl' : 'w-10 h-10 text-xl'}
                    ${isConnected ? 'ring-2 ring-blue-500' : ''}
                    ${hasFunds ? 'ring-2 ring-green-400' : ''}
                    ${isConnected && hasFunds ? 'ring-4 ring-blue-500' : ''}
                    ${!hasFunds && !isConnected ? 'opacity-40' : ''}
                    bg-gray-700 cursor-pointer transition-all duration-200
                    hover:scale-110
                    ${hasFunds ? 'shadow-lg shadow-green-500/20' : ''}
                  `}
                >
                  {chain.icon}
                </div>

                {hoveredChain === chain.chain && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 rounded-lg text-xs whitespace-nowrap z-20">
                    <p className="font-semibold">{chain.chain}</p>
                    <p className="text-gray-400">
                      {loading ? '...' : `${parseFloat(chain.balance).toFixed(2)} USDC`}
                    </p>
                    {chain.domain && (
                      <p className="text-gray-500 text-xs mt-0.5">{chain.domain}</p>
                    )}
                    {isConnected && (
                      <p className="text-blue-400 text-xs mt-1">● Connected</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700 my-4"></div>

      {/* Mainnet Chains */}
      <div>
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
          Mainnet <span className="text-gray-600">(coming soon)</span>
        </p>
        <div className="flex items-center space-x-3">
          {MAINNET_CHAINS.map((chain) => (
            <div
              key={chain.chain}
              className="relative"
              onMouseEnter={() => setHoveredChain(chain.chain)}
              onMouseLeave={() => setHoveredChain(null)}
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 opacity-30 cursor-pointer text-lg transition-all duration-200 hover:opacity-50">
                {chain.icon}
              </div>

              {hoveredChain === chain.chain && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 rounded-lg text-xs whitespace-nowrap z-20">
                  <p className="font-semibold">{chain.chain}</p>
                  <p className="text-gray-500 text-xs">Mainnet sync coming soon</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Total Summary */}
      <div className="mt-4 p-3 bg-gray-700 rounded-lg">
        <p className="text-xs text-gray-400">
          💡 Total testnet USDC across chains: <strong>{totalTestnetBalance.toFixed(2)} USDC</strong>
        </p>
      </div>
    </div>
  )
}
