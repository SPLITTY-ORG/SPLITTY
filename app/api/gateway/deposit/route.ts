import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { depositToGateway, RPC_URLS } from '@/lib/circle/gateway-sdk'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { privateKey, chain, amount } = body

    if (!privateKey || !chain || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const provider = new ethers.JsonRpcProvider(RPC_URLS[chain as keyof typeof RPC_URLS])
    const signer = new ethers.Wallet(privateKey, provider)

    const txHash = await depositToGateway(signer, chain, amount)
    return NextResponse.json({ success: true, txHash })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
