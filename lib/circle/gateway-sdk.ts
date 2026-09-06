import { ethers } from 'ethers'

const GATEWAY_WALLET_ADDRESS = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9'
const GATEWAY_MINTER_ADDRESS = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B'

const USDC_ADDRESSES = {
  arcTestnet: '0x3600000000000000000000000000000000000000',
  baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  avalancheFuji: '0x5425890298aed601595a70ab815c96711a31bc65',
} as const

export type SupportedChain = keyof typeof USDC_ADDRESSES

const DOMAIN_IDS = {
  avalancheFuji: 1,
  baseSepolia: 6,
  arcTestnet: 26,
} as const

const RPC_URLS = {
  arcTestnet: 'https://rpc.testnet.arc.network',
  baseSepolia: 'https://sepolia.base.org',
  avalancheFuji: 'https://api.avax-test.network/ext/bc/C/rpc',
} as const

const GATEWAY_ABI = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'value', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'availableBalance',
    inputs: [
      { name: 'depositor', type: 'address', internalType: 'address' },
      { name: 'token', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'initiateWithdrawal',
    inputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'value', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
]

export async function getGatewayBalance(
  walletAddress: string,
  chain: SupportedChain
): Promise<string> {
  const provider = new ethers.JsonRpcProvider(RPC_URLS[chain])
  const gatewayContract = new ethers.Contract(GATEWAY_WALLET_ADDRESS, GATEWAY_ABI, provider)
  
  try {
    const balance = await gatewayContract.availableBalance(walletAddress, USDC_ADDRESSES[chain])
    return ethers.formatUnits(balance, 6)
  } catch {
    return '0'
  }
}

export async function depositToGateway(
  signer: ethers.Signer,
  chain: SupportedChain,
  amountInUSDC: string
): Promise<string> {
  const provider = signer.provider
  if (!provider) throw new Error('No provider')

  const amountInUnits = ethers.parseUnits(amountInUSDC, 6)
  const usdcAddress = USDC_ADDRESSES[chain]

  // Approve USDC
  const erc20ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
  ]
  const usdcContract = new ethers.Contract(usdcAddress, erc20ABI, signer)
  const approveTx = await usdcContract.approve(GATEWAY_WALLET_ADDRESS, amountInUnits)
  await approveTx.wait()

  // Deposit
  const gatewayContract = new ethers.Contract(GATEWAY_WALLET_ADDRESS, GATEWAY_ABI, signer)
  const depositTx = await gatewayContract.deposit(usdcAddress, amountInUnits)
  await depositTx.wait()

  return depositTx.hash
}

export function getDomainId(chain: SupportedChain): number {
  return DOMAIN_IDS[chain]
}

export function getUsdcAddress(chain: SupportedChain): string {
  return USDC_ADDRESSES[chain]
}

export { GATEWAY_WALLET_ADDRESS, GATEWAY_MINTER_ADDRESS, DOMAIN_IDS, RPC_URLS, USDC_ADDRESSES }
