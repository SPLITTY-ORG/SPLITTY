'use client'

import { useState, useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { ethers } from 'ethers'
import { SPLITTY_ADDRESS, SPLITTY_ABI, ERC20_ABI } from '@/lib/contracts'
import { getMerkleProof } from '@/lib/merkle'

interface ClaimableDistribution {
  id: number
  token: string
  tokenSymbol: string
  tokenDecimals: number
  totalAmount: bigint
  claimedAmount: bigint
  merkleRoot: string
  expiry: number
  cancelled: boolean
  claimed: boolean
}

export default function Claims() {
  const { wallets } = useWallets()
  const [claims, setClaims] = useState<ClaimableDistribution[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [claimingId, setClaimingId] = useState<number | null>(null)
  const [claimStatus, setClaimStatus] = useState('')

  const fetchClaims = async () => {
    if (wallets.length === 0) return

    setLoading(true)
    setError('')

    try {
      const wallet = wallets[0]
      const provider = await wallet.getEthereumProvider()
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()
      const address = await signer.getAddress()

      const splittyContract = new ethers.Contract(SPLITTY_ADDRESS, SPLITTY_ABI, signer)

      const claimableDistributions: ClaimableDistribution[] = []

      for (let i = 0; i < 100; i++) {
        try {
          const info = await splittyContract.getDistributionInfo(i)
          
          if (info.creator === '0x0000000000000000000000000000000000000000') {
            break
          }

          const hasClaimed = await splittyContract.hasClaimed(i, address)

          if (!info.cancelled && !hasClaimed) {
            const now = Math.floor(Date.now() / 1000)
            if (Number(info.expiry) > now) {
              let tokenSymbol = 'TOKEN'
              let tokenDecimals = 6
              try {
                const tokenContract = new ethers.Contract(info.token, ERC20_ABI, signer)
                tokenSymbol = await tokenContract.symbol()
                tokenDecimals = await tokenContract.decimals()
              } catch {
                tokenSymbol = 'TOKEN'
              }

              claimableDistributions.push({
                id: i,
                token: info.token,
                tokenSymbol,
                tokenDecimals,
                totalAmount: info.totalAmount,
                claimedAmount: info.claimedAmount,
                merkleRoot: info.merkleRoot,
                expiry: Number(info.expiry),
                cancelled: info.cancelled,
                claimed: hasClaimed
              })
            }
          }
        } catch (err) {
          continue
        }
      }

      setClaims(claimableDistributions)
    } catch (err: any) {
      console.error('Error fetching claims:', err)
      setError('Failed to fetch claims')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (wallets.length > 0) {
      fetchClaims()
    }
  }, [wallets])

  const handleClaim = async (claim: ClaimableDistribution) => {
    if (wallets.length === 0) return

    setClaimingId(claim.id)
    setClaimStatus('Preparing claim...')
    setError('')

    try {
      const wallet = wallets[0]
      const provider = await wallet.getEthereumProvider()
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()
      const userAddress = await signer.getAddress()

      // We need to know the amount this user can claim
      // This would come from off-chain data or a database
      // For now, show a message
      setClaimStatus('To claim, you need the Merkle proof for your address. This requires off-chain data.')
      
    } catch (err: any) {
      console.error('Error claiming:', err)
      setError(`Claim failed: ${err.message?.slice(0, 100)}`)
    } finally {
      setClaimingId(null)
      setClaimStatus('')
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <p className="text-gray-400">Loading claims...</p>
      </div>
    )
  }

  if (claims.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <p className="text-gray-400 mb-4">No claimable distributions found</p>
        <button
          onClick={fetchClaims}
          className="bg-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-400">{claims.length} claimable distribution(s)</p>
        <button
          onClick={fetchClaims}
          className="bg-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {claims.map((claim) => (
        <div key={claim.id} className="bg-gray-800 p-6 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">Distribution #{claim.id}</h3>
              <p className="text-sm text-gray-400 mt-1">
                Token: {claim.tokenSymbol}
              </p>
              <p className="text-sm text-gray-400">
                Total: {ethers.formatUnits(claim.totalAmount, claim.tokenDecimals)} {claim.tokenSymbol}
              </p>
              <p className="text-sm text-gray-400">
                Claimed: {ethers.formatUnits(claim.claimedAmount, claim.tokenDecimals)} {claim.tokenSymbol}
              </p>
              <p className="text-sm text-gray-400">
                Expires: {new Date(claim.expiry * 1000).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs bg-green-600/20 text-green-400">
                Claimable
              </span>
              <button
                onClick={() => handleClaim(claim)}
                disabled={claimingId === claim.id}
                className="bg-green-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {claimingId === claim.id ? 'Claiming...' : 'Claim'}
              </button>
            </div>
          </div>
          
          {claimStatus && claimingId === claim.id && (
            <div className="mt-3 p-3 bg-gray-700 rounded-lg text-sm">
              {claimStatus}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
