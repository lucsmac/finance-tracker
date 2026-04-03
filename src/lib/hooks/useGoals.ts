import { useState, useEffect } from 'react'
import { goalsApi } from '../api/goals'
import { supabase } from '../supabase'
import type { Goal } from '@/app/data/mockData'
import { emitDataSync, subscribeDataSync } from '../utils/dataSync'

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

    const unsubscribeDataSync = subscribeDataSync('goals', () => {
      void loadGoals()
    })

    return () => {
      subscription.unsubscribe()
      unsubscribeDataSync()
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
    const createdGoal = await goalsApi.create(userId, goal)
    setGoals((current) => [...current, createdGoal])
    setError(null)
    emitDataSync('goals')
    return createdGoal
  }

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const updatedGoal = await goalsApi.update(id, updates)
    setGoals((current) => current.map((goal) => (goal.id === id ? updatedGoal : goal)))
    setError(null)
    emitDataSync('goals')
    return updatedGoal
  }

  const deleteGoal = async (id: string) => {
    await goalsApi.delete(id)
    setGoals((current) => current.filter((goal) => goal.id !== id))
    setError(null)
    emitDataSync('goals')
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
