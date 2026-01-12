import { useState, useEffect } from 'react'
import { goalsApi } from '../api/goals'
import { supabase } from '../supabase'
import type { Goal } from '@/app/data/mockData'

export function useGoals(userId: string | undefined) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    loadGoals()

    // Real-time subscription
    const subscription = supabase
      .channel('goals_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'goals',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadGoals()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const loadGoals = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const data = await goalsApi.getAll(userId)
      setGoals(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error loading goals:', err)
    } finally {
      setLoading(false)
    }
  }

  const createGoal = async (goal: Omit<Goal, 'id'>) => {
    if (!userId) throw new Error('No user ID')
    return goalsApi.create(userId, goal)
  }

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    return goalsApi.update(id, updates)
  }

  const deleteGoal = async (id: string) => {
    return goalsApi.delete(id)
  }

  return {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    refresh: loadGoals
  }
}
