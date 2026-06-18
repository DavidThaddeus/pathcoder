import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { findUserByEmail } from '@/lib/db'
import { createSessionToken, setSessionCookie } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const userRow = await findUserByEmail(email)
    if (!userRow) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, userRow.password_hash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 401 }
      )
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      full_name: userRow.full_name,
    }
    const token = await createSessionToken(user)
    await setSessionCookie(token)

    return NextResponse.json({ user })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
