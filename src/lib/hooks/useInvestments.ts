import { useState, useEffect } from 'react'
import { investmentsApi } from '../api/investments'
import { supabase } from '../supabase'
import type { Investment } from '@/app/data/mockData'
import { emitDataSync, subscribeDataSync } from '../utils/dataSync'

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

    const unsubscribeDataSync = subscribeDataSync('investments', () => {
      void loadInvestments()
    })

    return () => {
      subscription.unsubscribe()
      unsubscribeDataSync()
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
    const createdInvestment = await investmentsApi.create(userId, investment)
    setInvestments((current) => [...current, createdInvestment])
    setError(null)
    emitDataSync('investments')
    return createdInvestment
  }

  const updateInvestment = async (id: string, updates: Partial<Investment>) => {
    const updatedInvestment = await investmentsApi.update(id, updates)
    setInvestments((current) => current.map((investment) => (
      investment.id === id ? updatedInvestment : investment
    )))
    setError(null)
    emitDataSync('investments')
    return updatedInvestment
  }

  const deleteInvestment = async (id: string) => {
    await investmentsApi.delete(id)
    setInvestments((current) => current.filter((investment) => investment.id !== id))
    setError(null)
    emitDataSync('investments')
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
