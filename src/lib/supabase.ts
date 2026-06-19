import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Add better configuration for handling network issues
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'pathcoder-web'
    }
  }
})

// Types for our user data
export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  subscription_tier: 'free' | 'pro' | 'premium'
  created_at: string
  projects_generated: number
  last_login: string
}

// Authentication helpers with better error handling
export const authHelpers = {
  signUp: async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })
      return { data, error }
    } catch (err) {
      console.error('Sign up error:', err)
      return { data: null, error: err as Error }
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    } catch (err) {
      console.error('Sign in error:', err)
      return { data: null, error: err as Error }
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (err) {
      console.error('Sign out error:', err)
      return { error: err as Error }
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Get current user error:', error)
        return null
      }
      return user
    } catch (err) {
      console.error('Get current user error:', err)
      return null
    }
  },

  resetPassword: async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email)
      return { data, error }
    } catch (err) {
      console.error('Reset password error:', err)
      return { data: null, error: err as Error }
    }
  }
}
