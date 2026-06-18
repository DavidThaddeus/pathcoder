import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { createUser, findUserByEmail } from '@/lib/db'
import { createSessionToken, setSessionCookie } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { email, password, fullName } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    if (await findUserByEmail(email)) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 409 }
      )
    }

    const id = randomUUID()
    const passwordHash = await bcrypt.hash(password, 10)
    await createUser({ id, email, fullName: fullName ?? '', passwordHash })

    const user = { id, email: email.toLowerCase(), full_name: fullName ?? '' }
    const token = await createSessionToken(user)
    await setSessionCookie(token)

    return NextResponse.json({ user })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    )
  }
}
