import { useState, useEffect } from 'react'
import { transactionsApi } from '../api/transactions'
import { supabase } from '../supabase'
import type { Transaction } from '@/app/data/mockData'

export function useTransactions(userId: string | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    loadTransactions()

    // Real-time subscription
    const subscription = supabase
      .channel('transactions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadTransactions()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const loadTransactions = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const data = await transactionsApi.getAll(userId)
      setTransactions(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateRecurringTransactions = async () => {
    if (!userId) throw new Error('No user ID')
    return transactionsApi.generateRecurringTransactions(userId)
  }

  const createTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!userId) throw new Error('No user ID')
    return transactionsApi.create(userId, transaction)
  }

  const createInstallments = async (firstInstallment: Omit<Transaction, 'id'>) => {
    if (!userId) throw new Error('No user ID')
    return transactionsApi.createInstallments(userId, firstInstallment)
  }

  const cancelFutureRecurring = async (transactionId: string) => {
    if (!userId) throw new Error('No user ID')
    return transactionsApi.cancelFutureRecurring(transactionId, userId)
  }

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    return transactionsApi.update(id, updates)
  }

  const deleteTransaction = async (id: string) => {
    return transactionsApi.delete(id)
  }

  const getByDateRange = async (startDate: string, endDate: string) => {
    if (!userId) throw new Error('No user ID')
    return transactionsApi.getByDateRange(userId, startDate, endDate)
  }

  return {
    transactions,
    loading,
    error,
    createTransaction,
    createInstallments,
    updateTransaction,
    deleteTransaction,
    getByDateRange,
    generateRecurringTransactions,
    cancelFutureRecurring,
    refresh: loadTransactions
  }
}
