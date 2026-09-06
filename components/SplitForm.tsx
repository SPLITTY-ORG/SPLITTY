'use client'

import { useState, useRef, useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { ethers } from 'ethers'
import { 
  USDC_ADDRESS, 
  MULTICALL3FROM_ADDRESS, 
  MULTICALL3FROM_ABI, 
  ERC20_ABI,
  toERC20Units,
  ARC_EXPLORER_URL
} from '@/lib/contracts'
import { playSuccessSound, playFailureSound, isSoundEnabled, setSoundEnabled } from '@/lib/sounds'
import { getAccountData, setAccountData } from '@/lib/storage'

interface Recipient {
  address: string
  amount: string
}

interface SavedList {
  name: string
  recipients: Recipient[]
}

interface TokenInfo {
  address: string
  symbol: string
  decimals: number
  balance: string
}

interface ChunkStatus {
  chunk: number
  totalChunks: number
  status: 'pending' | 'processing' | 'confirmed' | 'failed'
  txHash?: string
  error?: string
}

const DEFAULT_CHUNK_SIZE = 200
const GATEWAY_WALLET_ADDRESS = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9'

export default function SplitForm() {
  const { wallets } = useWallets()
  const [assetType, setAssetType] = useState<'USDC' | 'CUSTOM'>('USDC')
  const [fundingSource, setFundingSource] = useState<'NATIVE' | 'GATEWAY'>('NATIVE')
  const [recipients, setRecipients] = useState<Recipient[]>([{ address: '', amount: '' }])
  const [splitMode, setSplitMode] = useState<'CUSTOM' | 'EQUAL'>('CUSTOM')
  const [equalTotal, setEqualTotal] = useState('')
  const [bulkPaste, setBulkPaste] = useState('')
  const [showBulkPaste, setShowBulkPaste] = useState(false)
  const [savedLists, setSavedLists] = useState<SavedList[]>([])
  const [showSaveList, setShowSaveList] = useState(false)
  const [listName, setListName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txStatus, setTxStatus] = useState<string>('')
  const [customTokenAddress, setCustomTokenAddress] = useState('')
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [loadingToken, setLoadingToken] = useState(false)
  const [chunkSize, setChunkSize] = useState(DEFAULT_CHUNK_SIZE)
  const [chunkStatuses, setChunkStatuses] = useState<ChunkStatus[]>([])
  const [showAllRecipients, setShowAllRecipients] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [gatewayBalance, setGatewayBalance] = useState('0')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const walletAddress = wallets[0]?.address || ''

  useEffect(() => {
    setSoundOn(isSoundEnabled())
  }, [])

  useEffect(() => {
    if (walletAddress) {
      const saved = getAccountData('saved_lists', walletAddress) || []
      setSavedLists(saved)
    }
  }, [walletAddress])

  useEffect(() => {
    const fetchGatewayBalance = async () => {
      if (wallets.length === 0 || fundingSource !== 'GATEWAY') return

      try {
        const wallet = wallets[0]
        const provider = await wallet.getEthereumProvider()
        const ethersProvider = new ethers.BrowserProvider(provider)
        
        const code = await ethersProvider.getCode(GATEWAY_WALLET_ADDRESS)
        if (code === '0x') {
          setGatewayBalance('0')
          return
        }

        const possibleABIs = [
          ['function balanceOf(address) view returns (uint256)'],
          ['function getBalance(address) view returns (uint256)'],
          ['function getUserBalance(address) view returns (uint256)'],
        ]

        for (const abi of possibleABIs) {
          try {
            const contract = new ethers.Contract(GATEWAY_WALLET_ADDRESS, abi, ethersProvider)
            const fnName = abi[0].split(' ')[1].split('(')[0]
            const balance = await contract[fnName](wallet.address)
            setGatewayBalance(ethers.formatUnits(balance, 6))
            break
          } catch {
            continue
          }
        }
      } catch (error) {
        console.error('Error fetching Gateway balance:', error)
        setGatewayBalance('0')
      }
    }

    fetchGatewayBalance()
  }, [wallets, fundingSource])

  const toggleSound = () => {
    const newState = !soundOn
    setSoundOn(newState)
    setSoundEnabled(newState)
  }

  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (assetType !== 'CUSTOM' || !customTokenAddress || !ethers.isAddress(customTokenAddress)) {
        setTokenInfo(null)
        return
      }

      if (wallets.length === 0) return

      setLoadingToken(true)

      try {
        const wallet = wallets[0]
        const provider = await wallet.getEthereumProvider()
        const ethersProvider = new ethers.BrowserProvider(provider)
        const signer = await ethersProvider.getSigner()
        const address = await signer.getAddress()

        const tokenContract = new ethers.Contract(customTokenAddress, ERC20_ABI, signer)
        
        const symbol = await tokenContract.symbol()
        const decimals = await tokenContract.decimals()
        const balanceRaw = await tokenContract.balanceOf(address)
        const balance = ethers.formatUnits(balanceRaw, decimals)

        setTokenInfo({
          address: customTokenAddress,
          symbol,
          decimals,
          balance
        })
      } catch (error) {
        console.error('Error fetching token info:', error)
        setTokenInfo(null)
      } finally {
        setLoadingToken(false)
      }
    }

    fetchTokenInfo()
  }, [customTokenAddress, assetType, wallets])

  const validateRecipients = () => {
    const errors: string[] = []
    const seen = new Set<string>()
    
    recipients.forEach((r, index) => {
      if (r.address && !ethers.isAddress(r.address)) {
        errors.push(`Row ${index + 1}: Invalid address ${r.address}`)
      }
      if (r.address && seen.has(r.address.toLowerCase())) {
        errors.push(`Row ${index + 1}: Duplicate address ${r.address}`)
      }
      if (r.address) {
        seen.add(r.address.toLowerCase())
      }
    })

    setValidationErrors(errors)
    return errors.length === 0
  }

  const addRecipient = () => {
    setRecipients([...recipients, { address: '', amount: '' }])
  }

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index))
  }

  const updateRecipient = (index: number, field: 'address' | 'amount', value: string) => {
    const updated = [...recipients]
    updated[index][field] = value
    setRecipients(updated)
  }

  const handleBulkPaste = () => {
    const lines = bulkPaste.split('\n').filter(line => line.trim() !== '')
    
    const newRecipients: Recipient[] = lines.map(line => {
      const parts = line.split(/[,;\t\s]+/).filter(p => p.trim() !== '')
      
      if (parts.length >= 2) {
        return { address: parts[0].trim(), amount: parts[1].trim() }
      } else if (parts.length === 1) {
        return { address: parts[0].trim(), amount: '' }
      }
      return { address: '', amount: '' }
    })

    const validRecipients = newRecipients.filter(r => r.address !== '')

    if (validRecipients.length > 0) {
      if (recipients.length === 1 && recipients[0].address === '' && recipients[0].amount === '') {
        setRecipients(validRecipients)
      } else {
        setRecipients([...recipients, ...validRecipients])
      }
    }

    setBulkPaste('')
    setShowBulkPaste(false)
  }

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim() !== '')
      
      const startIndex = lines[0].toLowerCase().includes('address') ? 1 : 0
      
      const newRecipients: Recipient[] = []
      
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim())
        if (parts.length >= 2 && parts[0] !== '') {
          newRecipients.push({ address: parts[0], amount: parts[1] || '' })
        } else if (parts.length === 1 && parts[0] !== '') {
          newRecipients.push({ address: parts[0], amount: '' })
        }
      }

      if (newRecipients.length > 0) {
        if (recipients.length === 1 && recipients[0].address === '' && recipients[0].amount === '') {
          setRecipients(newRecipients)
        } else {
          setRecipients([...recipients, ...newRecipients])
        }
      }
    }
    reader.readAsText(file)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSaveList = () => {
    if (listName.trim() === '') return
    
    const validRecipients = recipients.filter(r => r.address !== '')
    if (validRecipients.length === 0) return

    const newList: SavedList = {
      name: listName.trim(),
      recipients: validRecipients
    }

    const updatedLists = [...savedLists, newList]
    setSavedLists(updatedLists)
    
    if (walletAddress) {
      setAccountData('saved_lists', walletAddress, updatedLists)
    }
    
    setListName('')
    setShowSaveList(false)
  }

  const handleLoadList = (list: SavedList) => {
    setRecipients(list.recipients)
  }

  const handleDeleteList = (index: number) => {
    const updatedLists = savedLists.filter((_, i) => i !== index)
    setSavedLists(updatedLists)
    
    if (walletAddress) {
      setAccountData('saved_lists', walletAddress, updatedLists)
    }
  }

  const applyEqualSplit = () => {
    if (!equalTotal || parseFloat(equalTotal) <= 0) return
    
    const validCount = recipients.filter(r => r.address !== '').length
    if (validCount === 0) return

    const amountPerRecipient = (parseFloat(equalTotal) / validCount).toFixed(6)
    
    const updated = recipients.map(r => {
      if (r.address !== '') {
        return { ...r, amount: amountPerRecipient }
      }
      return r
    })

    setRecipients(updated)
  }

  const handleSubmit = async () => {
    if (wallets.length === 0) {
      setTxStatus('No wallet connected')
      playFailureSound()
      return
    }

    if (!validateRecipients()) {
      setTxStatus('Please fix validation errors')
      playFailureSound()
      return
    }

    const validRecipients = recipients.filter(r => r.address !== '' && r.amount !== '')
    if (validRecipients.length === 0) {
      setTxStatus('Please add at least one recipient with an amount')
      playFailureSound()
      return
    }

    if (fundingSource === 'GATEWAY' && parseFloat(gatewayBalance) <= 0) {
      setTxStatus('❌ No Gateway balance. Deposit USDC to Gateway first.')
      playFailureSound()
      return
    }

    setIsSubmitting(true)
    setTxStatus('Preparing transaction...')
    setChunkStatuses([])

    try {
      const wallet = wallets[0]
      const provider = await wallet.getEthereumProvider()
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()
      const userAddress = await signer.getAddress()

      const addresses = validRecipients.map(r => r.address)
      const tokenAddress = assetType === 'USDC' ? USDC_ADDRESS : tokenInfo!.address
      const decimals = assetType === 'USDC' ? 6 : tokenInfo!.decimals
      
      const amounts = validRecipients.map(r => toERC20Units(r.amount, decimals))
      
      setTxStatus('Approving tokens...')
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)
      const totalAmount = amounts.reduce((sum, a) => sum + a, BigInt(0))
      
      const allowance = await tokenContract.allowance(userAddress, MULTICALL3FROM_ADDRESS)
      if (allowance < totalAmount) {
        const approveTx = await tokenContract.approve(MULTICALL3FROM_ADDRESS, totalAmount)
        await approveTx.wait()
        setTxStatus('Tokens approved ✓')
      }
      
      setTxStatus('Encoding batch transfers...')
      const erc20Interface = new ethers.Interface(ERC20_ABI)
      
      const allCalls = addresses.map((address, i) => ({
        target: tokenAddress,
        allowFailure: true,
        callData: erc20Interface.encodeFunctionData('transfer', [address, amounts[i]])
      }))
      
      const chunks: typeof allCalls[] = []
      for (let i = 0; i < allCalls.length; i += chunkSize) {
        chunks.push(allCalls.slice(i, i + chunkSize))
      }

      const multicallContract = new ethers.Contract(MULTICALL3FROM_ADDRESS, MULTICALL3FROM_ABI, signer)

      let allSuccessful = true
      let totalSuccessfulTransfers = 0
      let firstTxHash = ''

      const initialStatuses: ChunkStatus[] = chunks.map((_, i) => ({
        chunk: i + 1,
        totalChunks: chunks.length,
        status: 'pending'
      }))
      setChunkStatuses(initialStatuses)

      for (let i = 0; i < chunks.length; i++) {
        setChunkStatuses(prev => prev.map(s => 
          s.chunk === i + 1 ? { ...s, status: 'processing' } : s
        ))
        
        setTxStatus(`Sending chunk ${i + 1} of ${chunks.length} (${chunks[i].length} recipients)...`)
        
        try {
          const tx = await multicallContract.aggregate3(chunks[i])
          const receipt = await tx.wait()
          
          if (receipt.status === 1) {
            const successful = receipt.logs.filter(
              (log: any) => log.address.toLowerCase() === tokenAddress.toLowerCase()
            ).length
            
            totalSuccessfulTransfers += successful
            
            if (!firstTxHash) {
              firstTxHash = tx.hash
            }
            
            setChunkStatuses(prev => prev.map(s => 
              s.chunk === i + 1 ? { ...s, status: 'confirmed', txHash: tx.hash } : s
            ))
          } else {
            allSuccessful = false
            setChunkStatuses(prev => prev.map(s => 
              s.chunk === i + 1 ? { ...s, status: 'failed' } : s
            ))
          }
        } catch (error: any) {
          allSuccessful = false
          setChunkStatuses(prev => prev.map(s => 
            s.chunk === i + 1 ? { ...s, status: 'failed', error: error.message?.slice(0, 100) } : s
          ))
        }
      }

      if (allSuccessful) {
        setTxStatus(`✅ Distribution completed! ${totalSuccessfulTransfers} transfers in ${chunks.length} chunk(s).`)
        playSuccessSound()
        
        const historyData = {
          txHash: firstTxHash,
          tokenAddress,
          tokenSymbol: assetType === 'USDC' ? 'USDC' : tokenInfo?.symbol,
          totalAmount: totalAmount.toString(),
          decimals,
          recipientCount: addresses.length,
          successfulTransfers: totalSuccessfulTransfers,
          fundingSource,
          timestamp: Date.now()
        }
        
        if (walletAddress) {
          const savedHistory = getAccountData('history', walletAddress) || []
          savedHistory.unshift(historyData)
          setAccountData('history', walletAddress, savedHistory)
        }
      } else {
        setTxStatus(`❌ Some chunks failed. ${totalSuccessfulTransfers} transfers completed.`)
        playFailureSound()
      }
    } catch (error: any) {
      console.error('Transaction error:', error)
      setTxStatus(`❌ Error: ${error.message?.slice(0, 100) || 'Transaction failed'}`)
      playFailureSound()
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalAmount = recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
  const validRecipientCount = recipients.filter(r => r.address !== '').length
  const displayedRecipients = showAllRecipients ? recipients : recipients.slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={toggleSound}
          className="text-xs text-gray-400 hover:text-gray-300"
        >
          {soundOn ? '🔊 Sound On' : '🔇 Sound Off'}
        </button>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold mb-4">Funding Source</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => setFundingSource('NATIVE')}
            className={`px-6 py-3 rounded-lg font-medium ${
              fundingSource === 'NATIVE' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            💳 Native Balance
          </button>
          <button
            onClick={() => setFundingSource('GATEWAY')}
            className={`px-6 py-3 rounded-lg font-medium ${
              fundingSource === 'GATEWAY' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            💰 Gateway Balance
            {fundingSource === 'GATEWAY' && (
              <span className="ml-2 text-xs">
                ({parseFloat(gatewayBalance).toFixed(2)} USDC)
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold mb-4">Select Asset</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => setAssetType('USDC')}
            className={`px-6 py-3 rounded-lg font-medium ${
              assetType === 'USDC' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            USDC
          </button>
          <button
            onClick={() => setAssetType('CUSTOM')}
            className={`px-6 py-3 rounded-lg font-medium ${
              assetType === 'CUSTOM' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Custom Token
          </button>
        </div>

        {assetType === 'CUSTOM' && (
          <div className="mt-4">
            <input
              type="text"
              placeholder="Token Address (0x...)"
              value={customTokenAddress}
              onChange={(e) => setCustomTokenAddress(e.target.value)}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm font-mono"
            />
            
            {loadingToken && <p className="text-sm text-gray-400 mt-2">Loading...</p>}
            
            {tokenInfo && !loadingToken && (
              <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                <p className="font-semibold">{tokenInfo.symbol}</p>
                <p className="text-xs text-gray-400">Balance: {tokenInfo.balance} {tokenInfo.symbol}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold mb-4">Split Mode</h3>
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setSplitMode('CUSTOM')}
            className={`px-4 py-2 rounded-lg text-sm ${
              splitMode === 'CUSTOM' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            Custom Amounts
          </button>
          <button
            onClick={() => setSplitMode('EQUAL')}
            className={`px-4 py-2 rounded-lg text-sm ${
              splitMode === 'EQUAL' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            Equal Split
          </button>
        </div>

        {splitMode === 'EQUAL' && (
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Total amount to split"
              value={equalTotal}
              onChange={(e) => setEqualTotal(e.target.value)}
              className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm"
            />
            <button
              onClick={applyEqualSplit}
              className="bg-blue-600 px-4 py-2 rounded-lg text-sm"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold mb-4">Add Recipients ({validRecipientCount})</h3>
        
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setShowBulkPaste(!showBulkPaste)}
            className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
          >
            📋 Bulk Paste
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
          >
            📄 CSV Upload
          </button>
          <button
            onClick={() => setShowSaveList(!showSaveList)}
            className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
          >
            💾 Save List
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
        </div>

        {showBulkPaste && (
          <div className="mb-4 p-4 bg-gray-750 rounded-lg border border-gray-600">
            <textarea
              value={bulkPaste}
              onChange={(e) => setBulkPaste(e.target.value)}
              rows={5}
              placeholder={'0x1234...5678, 100\n0xabcd...efgh, 200'}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm font-mono"
            />
            <div className="mt-2 flex space-x-2">
              <button onClick={handleBulkPaste} className="bg-blue-600 px-4 py-2 rounded-lg text-sm">Add</button>
              <button onClick={() => setShowBulkPaste(false)} className="bg-gray-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        {showSaveList && (
          <div className="mb-4 p-4 bg-gray-750 rounded-lg border border-gray-600">
            <input
              type="text"
              placeholder="List Name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm mb-2"
            />
            <button onClick={handleSaveList} className="bg-blue-600 px-4 py-2 rounded-lg text-sm">Save</button>
          </div>
        )}

        {savedLists.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Saved Lists:</p>
            <div className="space-y-2">
              {savedLists.map((list, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <button
                    onClick={() => handleLoadList(list)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm bg-gray-600 hover:bg-gray-500 text-left"
                  >
                    📄 {list.name} ({list.recipients.length} recipients)
                  </button>
                  <button
                    onClick={() => handleDeleteList(index)}
                    className="px-2 py-2 rounded-lg text-xs bg-red-600 hover:bg-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg">
            {validationErrors.map((error, i) => (
              <p key={i} className="text-sm text-red-400">{error}</p>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {displayedRecipients.map((recipient, index) => (
            <div key={index} className="flex space-x-3">
              <input
                type="text"
                placeholder="Wallet Address (0x...)"
                value={recipient.address}
                onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Amount"
                value={recipient.amount}
                onChange={(e) => updateRecipient(index, 'amount', e.target.value)}
                className="w-32 bg-gray-700 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={() => removeRecipient(index)}
                className="bg-red-600 px-3 py-2 rounded hover:bg-red-700 text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {recipients.length > 10 && (
          <button
            onClick={() => setShowAllRecipients(!showAllRecipients)}
            className="mt-3 text-sm text-blue-400 hover:text-blue-300"
          >
            {showAllRecipients ? '▲ Show less' : `▼ View all ${recipients.length} recipients`}
          </button>
        )}

        <button
          onClick={addRecipient}
          className="mt-4 bg-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
        >
          + Add Recipient
        </button>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <label className="text-sm text-gray-400 mb-2 block">Chunk Size (recipients per transaction)</label>
        <input
          type="number"
          value={chunkSize}
          onChange={(e) => setChunkSize(parseInt(e.target.value) || DEFAULT_CHUNK_SIZE)}
          className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
          min={10}
          max={500}
        />
      </div>

      {validRecipientCount > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 sticky bottom-4">
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Funding:</span>
              <span>{fundingSource === 'NATIVE' ? '💳 Native' : '💰 Gateway'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Asset:</span>
              <span>{assetType === 'USDC' ? 'USDC' : tokenInfo?.symbol || 'Custom Token'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Recipients:</span>
              <span>{validRecipientCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Chunks:</span>
              <span>{Math.ceil(validRecipientCount / chunkSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total:</span>
              <span>{totalAmount} {assetType === 'USDC' ? 'USDC' : tokenInfo?.symbol || ''}</span>
            </div>
          </div>

          {chunkStatuses.length > 0 && (
            <div className="mb-4 space-y-2">
              {chunkStatuses.map((status) => (
                <div key={status.chunk} className="flex items-center space-x-2 text-sm">
                  <span>
                    {status.status === 'pending' && '⏳'}
                    {status.status === 'processing' && '🔄'}
                    {status.status === 'confirmed' && '✅'}
                    {status.status === 'failed' && '❌'}
                  </span>
                  <span>Chunk {status.chunk}/{status.totalChunks}</span>
                  {status.txHash && (
                    <a
                      href={`${ARC_EXPLORER_URL}/tx/${status.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-xs"
                    >
                      View ↗
                    </a>
                  )}
                  {status.error && <span className="text-red-400 text-xs">{status.error}</span>}
                </div>
              ))}
            </div>
          )}

          {txStatus && (
            <div className="mb-4 p-3 bg-gray-700 rounded-lg text-sm">
              {txStatus}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-green-600 py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isSubmitting 
              ? 'Processing...' 
              : `Send ${totalAmount} ${assetType === 'USDC' ? 'USDC' : tokenInfo?.symbol || ''} to ${validRecipientCount} wallets`}
          </button>
        </div>
      )}
    </div>
  )
}
