import { NextRequest, NextResponse } from 'next/server'
import { findChallenge, upsertChallenge } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { user_id, challenge_id, title, programmingLanguage, skillLevel, attempts = 1 } =
      await req.json()

    if (!user_id || !challenge_id) {
      return NextResponse.json({ error: 'Missing user_id or challenge_id' }, { status: 400 })
    }

    const existing = await findChallenge(user_id, challenge_id)
    if (existing?.status === 'completed') {
      return NextResponse.json({ message: 'Already completed' }, { status: 200 })
    }

    await upsertChallenge({
      user_id,
      challenge_id,
      title,
      programmingLanguage,
      skillLevel,
      status: 'completed',
      attempts,
    })

    return NextResponse.json({ message: 'Challenge marked as completed' }, { status: 201 })
  } catch (err: unknown) {
    console.error('Complete challenge error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
