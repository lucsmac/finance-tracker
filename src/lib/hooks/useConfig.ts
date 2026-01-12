import { useState, useEffect } from 'react'
import { configApi, type UserConfig } from '../api/config'
import { supabase } from '../supabase'

export function useConfig(userId: string | undefined) {
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    loadConfig()

    // Real-time subscription
    const subscription = supabase
      .channel('user_configs_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_configs',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadConfig()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const loadConfig = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const data = await configApi.get(userId)
      setConfig(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error loading config:', err)
    } finally {
      setLoading(false)
    }
  }

  const createConfig = async (configData: Omit<UserConfig, 'id' | 'userId'>) => {
    if (!userId) throw new Error('No user ID')
    return configApi.create(userId, configData)
  }

  const updateConfig = async (updates: Partial<Omit<UserConfig, 'id' | 'userId'>>) => {
    if (!userId) throw new Error('No user ID')
    return configApi.update(userId, updates)
  }

  return {
    config,
    loading,
    error,
    createConfig,
    updateConfig,
    refresh: loadConfig
  }
}
