import { NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/leaderboard → top users ranked by points.
export async function GET() {
  try {
    const leaderboard = await getLeaderboard(50)
    return NextResponse.json({ leaderboard })
  } catch (err) {
    console.error('leaderboard error:', err)
    return NextResponse.json({ leaderboard: [] })
  }
}
