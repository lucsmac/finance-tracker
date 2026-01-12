import { useState, useEffect } from 'react'
import { estimatesApi } from '../api/estimates'
import { supabase } from '../supabase'
import type { Estimate } from '@/app/data/mockData'

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

    return () => {
      subscription.unsubscribe()
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
    return estimatesApi.create(userId, estimate)
  }

  const updateEstimate = async (id: string, updates: Partial<Estimate>) => {
    return estimatesApi.update(id, updates)
  }

  const deleteEstimate = async (id: string) => {
    return estimatesApi.delete(id)
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
