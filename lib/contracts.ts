import { ethers } from 'ethers'

// Contract addresses
export const SPLITTY_ADDRESS = '0x8E39A2839750C74C706b92D28c56C05b8c523C04'
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'
export const MULTICALL3FROM_ADDRESS = '0x522fAf9A91c41c443c66765030741e4AaCe147D0'

// Arc Network configuration
export const ARC_CHAIN_ID = 5042002
export const ARC_RPC_URL = 'https://rpc.testnet.arc.io'
export const ARC_EXPLORER_URL = 'https://testnet.arcscan.app'

// Multicall3From ABI - Arc's official batch transfer contract
export const MULTICALL3FROM_ABI = [
  {
    "type": "function",
    "name": "aggregate3",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "name": "calls",
        "type": "tuple[]",
        "components": [
          { "name": "target", "type": "address" },
          { "name": "allowFailure", "type": "bool" },
          { "name": "callData", "type": "bytes" }
        ]
      }
    ],
    "outputs": [
      {
        "name": "returnData",
        "type": "tuple[]",
        "components": [
          { "name": "success", "type": "bool" },
          { "name": "returnData", "type": "bytes" }
        ]
      }
    ]
  }
]

// Splitty contract ABI (for Merkle distributions)
export const SPLITTY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address[]", "name": "recipients", "type": "address[]" },
      { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
    ],
    "name": "splitToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address[]", "name": "recipients", "type": "address[]" },
      { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
    ],
    "name": "splitNative",
    "outputs": [{ "internalType": "uint256", "name": "failedCount", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "totalAmount", "type": "uint256" },
      { "internalType": "bytes32", "name": "merkleRoot", "type": "bytes32" },
      { "internalType": "uint256", "name": "expiry", "type": "uint256" }
    ],
    "name": "createMerkleDistribution",
    "outputs": [{ "internalType": "uint256", "name": "distributionId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "distributionId", "type": "uint256" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "bytes32[]", "name": "proof", "type": "bytes32[]" }
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "distributionId", "type": "uint256" }
    ],
    "name": "cancelDistribution",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "distributionId", "type": "uint256" }
    ],
    "name": "getDistributionInfo",
    "outputs": [
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "totalAmount", "type": "uint256" },
      { "internalType": "bytes32", "name": "merkleRoot", "type": "bytes32" },
      { "internalType": "uint256", "name": "claimedAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "expiry", "type": "uint256" },
      { "internalType": "bool", "name": "cancelled", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "distributionId", "type": "uint256" },
      { "internalType": "address", "name": "claimant", "type": "address" }
    ],
    "name": "hasClaimed",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
]

// ERC-20 ABI (complete with all functions we need)
export const ERC20_ABI = [
  {
    "type": "function",
    "name": "transfer",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }]
  },
  {
    "type": "function",
    "name": "approve",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }]
  },
  {
    "type": "function",
    "name": "allowance",
    "stateMutability": "view",
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "balanceOf",
    "stateMutability": "view",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "decimals",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint8" }]
  },
  {
    "type": "function",
    "name": "symbol",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }]
  }
]

// Helper to convert amount to ERC-20 units
export function toERC20Units(amount: string, decimals: number = 6): bigint {
  const [whole, fraction = ''] = amount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole + paddedFraction) * BigInt(10) ** BigInt(decimals - paddedFraction.length)
}

export function getERC20Contract(address: string, signer: ethers.Signer) {
  return new ethers.Contract(address, ERC20_ABI, signer)
}

export function getMulticall3FromContract(signer: ethers.Signer) {
  return new ethers.Contract(MULTICALL3FROM_ADDRESS, MULTICALL3FROM_ABI, signer)
}

export function getSplittyContract(signer: ethers.Signer) {
  return new ethers.Contract(SPLITTY_ADDRESS, SPLITTY_ABI, signer)
}
