import { NextRequest, NextResponse } from 'next/server'
import { listChallenges } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get('user_id')
  if (!user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  try {
    const rows = await listChallenges(user_id, 'completed')
    const challenges = rows.map((row) => ({
      id: String(row.id),
      challenge_id: row.challenge_id,
      user_id: row.user_id,
      title: row.title,
      programming_language: row.programming_language,
      skill_level: row.skill_level,
      attempts: row.attempts,
      max_attempts: row.max_attempts,
      status: row.status,
      completed_at: row.completed_at,
      created_at: row.created_at,
    }))
    return NextResponse.json({ challenges }, { status: 200 })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
