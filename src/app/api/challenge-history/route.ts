import { NextRequest, NextResponse } from 'next/server'
import {
  upsertChallenge,
  listChallenges,
  deleteChallenge,
  deleteAllChallenges,
  type ChallengeRow,
} from '@/lib/db'

export const runtime = 'nodejs'

// Map a DB row to the camelCase shape the dashboard expects.
function toClient(row: ChallengeRow, includeData: boolean) {
  return {
    id: String(row.id),
    challenge_id: row.challenge_id,
    user_id: row.user_id,
    title: row.title || `Challenge ${row.challenge_id}`,
    programmingLanguage: row.programming_language || 'Unknown',
    skillLevel: row.skill_level || 'Unknown',
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    created_at: row.created_at,
    completed_at: row.completed_at,
    failed_at: row.failed_at,
    challengeData:
      includeData && row.challenge_data ? JSON.parse(row.challenge_data) : null,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const status = searchParams.get('status')
  const getChallengeData = searchParams.get('get_challenge_data') === 'true'

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  try {
    const rows = await listChallenges(userId, status ?? undefined)
    return NextResponse.json({
      challenges: rows.map((r) => toClient(r, getChallengeData)),
    })
  } catch (error) {
    console.error('Error fetching challenge history:', error)
    return NextResponse.json({ challenges: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      user_id,
      challenge_id,
      title,
      programmingLanguage,
      skillLevel,
      status,
      attempts = 0,
      maxAttempts = 3,
      challengeData,
    } = await request.json()

    if (!user_id || !challenge_id) {
      return NextResponse.json(
        { error: 'User ID and Challenge ID required' },
        { status: 400 }
      )
    }

    if (!['available', 'ongoing', 'completed', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    await upsertChallenge({
      user_id,
      challenge_id,
      title,
      programmingLanguage,
      skillLevel,
      status,
      attempts,
      maxAttempts,
      challengeData,
    })

    return NextResponse.json({
      success: true,
      message: `Challenge ${status} successfully`,
    })
  } catch (error) {
    console.error('Challenge history error:', error)
    return NextResponse.json(
      { error: 'Failed to update challenge history' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user_id, challenge_id } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    if (challenge_id === 'all') {
      await deleteAllChallenges(user_id)
      return NextResponse.json({
        success: true,
        message: 'All challenges deleted successfully',
      })
    }

    if (!challenge_id) {
      return NextResponse.json({ error: 'Challenge ID required' }, { status: 400 })
    }

    await deleteChallenge(user_id, challenge_id)
    return NextResponse.json({
      success: true,
      message: 'Challenge deleted successfully',
    })
  } catch (error) {
    console.error('Delete challenge error:', error)
    return NextResponse.json(
      { error: 'Failed to delete challenge' },
      { status: 500 }
    )
  }
}
