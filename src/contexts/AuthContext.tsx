"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'

// Local user shape that mirrors the fields the app actually reads (id, email).
export interface AuthUser {
  id: string
  email: string
  full_name: string | null
}

interface AuthResult {
  data: { user: AuthUser } | null
  error: { message: string } | null
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore the session from the httpOnly cookie on load.
    const loadSession = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const { user } = await res.json()
        setUser(user ?? null)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [])

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      })
      const body = await res.json()

      if (!res.ok) {
        return { data: null, error: { message: body.error ?? 'Signup failed' } }
      }

      setUser(body.user)
      return { data: { user: body.user }, error: null }
    } catch (err) {
      return {
        data: null,
        error: { message: (err as Error).message || 'An error occurred during signup' },
      }
    }
  }

  const signIn = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const body = await res.json()

      if (!res.ok) {
        return { data: null, error: { message: body.error ?? 'Login failed' } }
      }

      setUser(body.user)
      return { data: { user: body.user }, error: null }
    } catch (err) {
      return {
        data: null,
        error: { message: (err as Error).message || 'An error occurred during login' },
      }
    }
  }

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
