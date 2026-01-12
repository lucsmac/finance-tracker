import { useState, useEffect } from 'react'
import { investmentsApi } from '../api/investments'
import { supabase } from '../supabase'
import type { Investment } from '@/app/data/mockData'

export function useInvestments(userId: string | undefined) {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    loadInvestments()

    // Real-time subscription
    const subscription = supabase
      .channel('investments_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'investments',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadInvestments()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const loadInvestments = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const data = await investmentsApi.getAll(userId)
      setInvestments(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error loading investments:', err)
    } finally {
      setLoading(false)
    }
  }

  const createInvestment = async (investment: Omit<Investment, 'id'>) => {
    if (!userId) throw new Error('No user ID')
    return investmentsApi.create(userId, investment)
  }

  const updateInvestment = async (id: string, updates: Partial<Investment>) => {
    return investmentsApi.update(id, updates)
  }

  const deleteInvestment = async (id: string) => {
    return investmentsApi.delete(id)
  }

  const getByCategory = async (category: string) => {
    if (!userId) throw new Error('No user ID')
    return investmentsApi.getByCategory(userId, category)
  }

  return {
    investments,
    loading,
    error,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    getByCategory,
    refresh: loadInvestments
  }
}
