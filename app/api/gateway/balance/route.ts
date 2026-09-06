import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { circleDeveloperSdk } from '@/lib/circle/sdk'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Get Circle wallet for user
    const { data: wallets } = await supabaseAdmin
      .from('wallets')
      .select('circle_wallet_id, address')
      .eq('user_id', userId)
      .limit(1)

    if (!wallets || wallets.length === 0) {
      return NextResponse.json({ balance: '0', hasWallet: false })
    }

    const wallet = wallets[0]

    try {
      // Try getWalletTokenBalance first
      const response = await circleDeveloperSdk.getWalletTokenBalance({
        id: wallet.circle_wallet_id,
        includeAll: true,
      })

      const balances = response.data?.tokenBalances || []
      const usdcBalance = balances.find(
        (b: any) => b.token?.symbol === 'USDC' || b.token?.symbol === 'USD Coin'
      )

      return NextResponse.json({
        balance: usdcBalance?.amount || '0',
        hasWallet: true,
        walletAddress: wallet.address,
        allBalances: balances,
      })
    } catch (tokenError) {
      // Fallback to getWalletsWithBalances
      try {
        const walletsResponse = await circleDeveloperSdk.getWalletsWithBalances({
          blockchain: 'ARC-TESTNET',
          address: wallet.address,
        })

        const circleWallets = walletsResponse.data?.wallets || []
        const circleWallet = circleWallets[0]
        const tokenBalances = circleWallet?.tokenBalances || []
        const usdcBalance = tokenBalances.find(
          (b: any) => b.token?.symbol === 'USDC' || b.token?.symbol === 'USD Coin'
        )

        return NextResponse.json({
          balance: usdcBalance?.amount || '0',
          hasWallet: true,
          walletAddress: wallet.address,
          allBalances: tokenBalances,
        })
      } catch (walletsError: any) {
        console.error('Both balance methods failed:', walletsError)
        return NextResponse.json({
          balance: '0',
          hasWallet: true,
          walletAddress: wallet.address,
          error: walletsError.message,
        })
      }
    }
  } catch (error: any) {
    console.error('Balance API error:', error)
    return NextResponse.json({ balance: '0', hasWallet: false, error: error.message })
  }
}
