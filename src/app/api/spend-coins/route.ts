import { NextRequest, NextResponse } from 'next/server'
import { spendCoins } from '@/lib/db'

export const runtime = 'nodejs'

// Deduct coins (e.g. for revealing a hint). Returns the new balance, or 402 if
// the user doesn't have enough.
export async function POST(req: NextRequest) {
  try {
    const { user_id, amount = 2 } = await req.json()
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    const newBalance = await spendCoins(user_id, amount)
    if (newBalance === null) {
      return NextResponse.json(
        { error: 'Insufficient coins', insufficient: true },
        { status: 402 }
      )
    }

    return NextResponse.json({ success: true, points: newBalance })
  } catch (err) {
    console.error('spend-coins error:', err)
    return NextResponse.json({ error: 'Failed to spend coins' }, { status: 500 })
  }
}
