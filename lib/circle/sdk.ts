import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'

const apiKey = process.env.CIRCLE_API_KEY || ''
const entitySecret = process.env.CIRCLE_ENTITY_SECRET || ''

export const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret,
})

export async function createWalletSet(name: string) {
  const response = await circleDeveloperSdk.createWalletSet({
    name,
  })
  return response.data?.walletSet
}

export async function createWallet(walletSetId: string) {
  const response = await circleDeveloperSdk.createWallets({
    walletSetId,
    count: 1,
    blockchains: ['ARC-TESTNET'],
  })
  return response.data?.wallets?.[0]
}

export async function getWalletBalance(walletId: string) {
  const response = await circleDeveloperSdk.getWalletTokenBalance({
    walletId,
  })
  return response.data
}
