import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import type { User } from '@supabase/supabase-js'

export type ThemePreference = 'light' | 'dark'

export const getUserThemePreference = (user: User | null | undefined): ThemePreference | null => {
  const rawPreference = user?.user_metadata?.themePreference ?? user?.user_metadata?.theme_preference
  return rawPreference === 'light' || rawPreference === 'dark' ? rawPreference : null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateThemePreference = async (themePreference: ThemePreference) => {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        themePreference,
      },
    })

    if (error) throw error

    if (data.user) {
      setUser(data.user)
    }

    return data.user
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateThemePreference
  }
}
