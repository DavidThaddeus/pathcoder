import { NextRequest, NextResponse } from 'next/server'
import { getProfile, updateProfile } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/profile?user_id=... → profile (display name, tech role, points)
export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }
  const profile = await getProfile(userId)
  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  return NextResponse.json({ profile })
}

// POST /api/profile → update display name / tech role
export async function POST(req: NextRequest) {
  try {
    const { user_id, displayName, techRole } = await req.json()
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }
    await updateProfile(user_id, { displayName, techRole })
    const profile = await getProfile(user_id)
    return NextResponse.json({ success: true, profile })
  } catch (err) {
    console.error('profile update error:', err)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
