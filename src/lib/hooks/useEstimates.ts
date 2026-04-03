import { useState, useEffect } from 'react'
import { estimatesApi } from '../api/estimates'
import { supabase } from '../supabase'
import type { Estimate } from '@/app/data/mockData'
import { emitDataSync, subscribeDataSync } from '../utils/dataSync'

export function useEstimates(userId: string | undefined) {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    loadEstimates()

    // Real-time subscription
    const subscription = supabase
      .channel('estimates_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'estimates',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadEstimates()
      })
      .subscribe()

    const unsubscribeDataSync = subscribeDataSync('estimates', () => {
      void loadEstimates()
    })

    return () => {
      subscription.unsubscribe()
      unsubscribeDataSync()
    }
  }, [userId])

  const loadEstimates = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const data = await estimatesApi.getAll(userId)
      setEstimates(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error loading estimates:', err)
    } finally {
      setLoading(false)
    }
  }

  const createEstimate = async (estimate: Omit<Estimate, 'id'>) => {
    if (!userId) throw new Error('No user ID')
    const createdEstimate = await estimatesApi.create(userId, estimate)
    setEstimates((current) => [...current, createdEstimate])
    setError(null)
    emitDataSync('estimates')
    return createdEstimate
  }

  const updateEstimate = async (id: string, updates: Partial<Estimate>) => {
    const updatedEstimate = await estimatesApi.update(id, updates)
    setEstimates((current) => current.map((estimate) => (
      estimate.id === id ? updatedEstimate : estimate
    )))
    setError(null)
    emitDataSync('estimates')
    return updatedEstimate
  }

  const deleteEstimate = async (id: string) => {
    await estimatesApi.delete(id)
    setEstimates((current) => current.filter((estimate) => estimate.id !== id))
    setError(null)
    emitDataSync('estimates')
  }

  return {
    estimates,
    loading,
    error,
    createEstimate,
    updateEstimate,
    deleteEstimate,
    refresh: loadEstimates
  }
}
