import { NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentSession()
  return NextResponse.json({ user })
}
