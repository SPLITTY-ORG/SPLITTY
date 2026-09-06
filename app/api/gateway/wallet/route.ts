import { NextRequest, NextResponse } from 'next/server'
import { createWalletSet, createWallet } from '@/lib/circle/sdk'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, address } = body

    if (!userId || !address) {
      return NextResponse.json({ error: 'Missing userId or address' }, { status: 400 })
    }

    // Check if wallet already exists
    const { data: existingWallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .limit(1)

    if (existingWallet && existingWallet.length > 0) {
      return NextResponse.json({ success: true, wallet: existingWallet[0] })
    }

    // Create wallet set
    const walletSet = await createWalletSet(`splitty-${userId}`)
    if (!walletSet) {
      return NextResponse.json({ error: 'Failed to create wallet set' }, { status: 500 })
    }

    // Create wallet
    const wallet = await createWallet(walletSet.id)
    if (!wallet) {
      return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
    }

    // Save to Supabase
    await supabaseAdmin.from('wallets').insert([
      {
        user_id: userId,
        circle_wallet_id: wallet.id,
        wallet_set_id: walletSet.id,
        address: wallet.address || address,
        type: 'sca',
      },
    ])

    return NextResponse.json({
      success: true,
      wallet: {
        circle_wallet_id: wallet.id,
        wallet_set_id: walletSet.id,
        address: wallet.address || address,
      },
    })
  } catch (error: any) {
    console.error('Wallet creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
