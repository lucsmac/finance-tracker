import { useState, useEffect } from 'react'
import { dailyPlansApi, type DailyPlan } from '../api/dailyPlans'
import { supabase } from '../supabase'

export function useDailyPlans(userId: string | undefined) {
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    loadDailyPlans()

    // Real-time subscription
    const subscription = supabase
      .channel('daily_plans_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_plans',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadDailyPlans()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const loadDailyPlans = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const data = await dailyPlansApi.getAll(userId)
      setDailyPlans(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error loading daily plans:', err)
    } finally {
      setLoading(false)
    }
  }

  const upsertDailyPlan = async (date: string, plannedAmount: number) => {
    if (!userId) throw new Error('No user ID')
    return dailyPlansApi.upsert(userId, date, plannedAmount)
  }

  const deleteDailyPlan = async (date: string) => {
    if (!userId) throw new Error('No user ID')
    return dailyPlansApi.delete(userId, date)
  }

  const getPlannedForDate = (date: string): number | null => {
    const plan = dailyPlans.find(p => p.date === date)
    return plan ? plan.plannedAmount : null
  }

  return {
    dailyPlans,
    loading,
    error,
    upsertDailyPlan,
    deleteDailyPlan,
    getPlannedForDate,
    refresh: loadDailyPlans
  }
}
