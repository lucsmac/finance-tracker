import { useEffect, useState } from 'react'
import {
  dailyExpensesApi,
  type CreateDailyExpenseInput,
  type DailyExpense,
  type UpdateDailyExpenseInput,
} from '../api/dailyExpenses'
import { supabase } from '../supabase'
import { emitDataSync, subscribeDataSync } from '../utils/dataSync'

const sortDailyExpenses = (items: DailyExpense[]) =>
  [...items].sort((left, right) => {
    const dateComparison = right.date.localeCompare(left.date)
    if (dateComparison !== 0) return dateComparison
    return right.createdAt.localeCompare(left.createdAt)
  })

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

    const unsubscribeDataSync = subscribeDataSync('daily_expenses', () => {
      void loadDailyExpenses()
    })

    return () => {
      subscription.unsubscribe()
      unsubscribeDataSync()
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
    const createdExpense = await dailyExpensesApi.create(userId, expense)
    setDailyExpenses((current) => sortDailyExpenses([...current, createdExpense]))
    setError(null)
    emitDataSync('daily_expenses')
    return createdExpense
  }

  const deleteDailyExpense = async (id: string) => {
    await dailyExpensesApi.delete(id)
    setDailyExpenses((current) => current.filter((expense) => expense.id !== id))
    setError(null)
    emitDataSync('daily_expenses')
  }

  const updateDailyExpense = async (id: string, updates: UpdateDailyExpenseInput) => {
    const updatedExpense = await dailyExpensesApi.update(id, updates)
    setDailyExpenses((current) => sortDailyExpenses(current.map((expense) => (
      expense.id === id ? updatedExpense : expense
    ))))
    setError(null)
    emitDataSync('daily_expenses')
    return updatedExpense
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
    updateDailyExpense,
    deleteDailyExpense,
    getExpensesForDate,
    getTotalForDate,
    refresh: loadDailyExpenses
  }
}
