import { NextRequest, NextResponse } from 'next/server'

const CIRCLE_API_BASE = 'https://api.circle.com/v1'

// Helper to extract Kit Key from CIRCLE_API_KEY env
function getApiKey(): string | null {
  const apiKey = process.env.CIRCLE_API_KEY
  if (!apiKey) return null
  
  // If it's a Kit Key format, extract the actual key
  if (apiKey.startsWith('KIT_KEY:')) {
    return apiKey.replace('KIT_KEY:', '')
  }
  
  return apiKey
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'submitBurnIntent':
        return await handleBurnIntent(body)
      case 'getAttestation':
        return await handleAttestation(body)
      case 'getUnifiedBalance':
        return await handleUnifiedBalance(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Gateway API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleBurnIntent(body: any) {
  const { burnIntent, signature, sourceChain, destinationChain, amount } = body

  const apiKey = getApiKey()

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Circle API key not configured. Add CIRCLE_API_KEY to .env.local' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(`${CIRCLE_API_BASE}/gateway/burn-intent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        burnIntent,
        signature,
        sourceChain,
        destinationChain,
        amount,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Circle API error' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Burn intent error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit burn intent' },
      { status: 500 }
    )
  }
}

async function handleAttestation(body: any) {
  const { burnIntentId } = body

  const apiKey = getApiKey()

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Circle API key not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(`${CIRCLE_API_BASE}/gateway/attestations/${burnIntentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Circle API error' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Attestation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attestation' },
      { status: 500 }
    )
  }
}

async function handleUnifiedBalance(body: any) {
  const { walletAddress } = body

  const apiKey = getApiKey()

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Circle API key not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(`${CIRCLE_API_BASE}/gateway/balances?address=${walletAddress}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Circle API error' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Unified balance error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unified balance' },
      { status: 500 }
    )
  }
}
