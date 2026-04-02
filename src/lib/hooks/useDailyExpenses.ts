import { useEffect, useState } from 'react'
import {
  dailyExpensesApi,
  type CreateDailyExpenseInput,
  type DailyExpense
} from '../api/dailyExpenses'
import { supabase } from '../supabase'

export function useDailyExpenses(userId: string | undefined) {
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    loadDailyExpenses()

    const subscription = supabase
      .channel('daily_expenses_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_expenses',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadDailyExpenses()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const loadDailyExpenses = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const data = await dailyExpensesApi.getAll(userId)
      setDailyExpenses(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error loading daily expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  const createDailyExpense = async (expense: CreateDailyExpenseInput) => {
    if (!userId) throw new Error('No user ID')
    return dailyExpensesApi.create(userId, expense)
  }

  const deleteDailyExpense = async (id: string) => {
    return dailyExpensesApi.delete(id)
  }

  const getExpensesForDate = (date: string) => {
    return dailyExpenses.filter(expense => expense.date === date)
  }

  const getTotalForDate = (date: string) => {
    return getExpensesForDate(date).reduce((sum, expense) => sum + expense.amount, 0)
  }

  return {
    dailyExpenses,
    loading,
    error,
    createDailyExpense,
    deleteDailyExpense,
    getExpensesForDate,
    getTotalForDate,
    refresh: loadDailyExpenses
  }
}
