import { useState, useEffect } from 'react'
import { configApi, type UserConfig } from '../api/config'
import { supabase } from '../supabase'
import { emitDataSync, subscribeDataSync } from '../utils/dataSync'

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

    const unsubscribeDataSync = subscribeDataSync('config', () => {
      void loadConfig()
    })

    return () => {
      subscription.unsubscribe()
      unsubscribeDataSync()
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
    const createdConfig = await configApi.create(userId, configData)
    setConfig(createdConfig)
    setError(null)
    emitDataSync('config')
    return createdConfig
  }

  const updateConfig = async (updates: Partial<Omit<UserConfig, 'id' | 'userId'>>) => {
    if (!userId) throw new Error('No user ID')
    const updatedConfig = await configApi.update(userId, updates)
    setConfig(updatedConfig)
    setError(null)
    emitDataSync('config')
    return updatedConfig
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
