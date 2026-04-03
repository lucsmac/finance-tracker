import { useState, useEffect } from 'react'
import { transactionsApi } from '../api/transactions'
import { supabase } from '../supabase'
import type { Transaction } from '@/app/data/mockData'
import { emitDataSync, subscribeDataSync } from '../utils/dataSync'

const sortTransactions = (items: Transaction[]) =>
  [...items].sort((left, right) => right.date.localeCompare(left.date))

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

    const unsubscribeDataSync = subscribeDataSync('transactions', () => {
      void loadTransactions()
    })

    return () => {
      subscription.unsubscribe()
      unsubscribeDataSync()
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
    const createdTransaction = await transactionsApi.create(userId, transaction)
    setTransactions((current) => sortTransactions([...current, createdTransaction]))
    setError(null)
    emitDataSync('transactions')
    return createdTransaction
  }

  const createInstallments = async (firstInstallment: Omit<Transaction, 'id'>) => {
    if (!userId) throw new Error('No user ID')
    const createdInstallments = await transactionsApi.createInstallments(userId, firstInstallment)
    setTransactions((current) => sortTransactions([...current, ...createdInstallments]))
    setError(null)
    emitDataSync('transactions')
    return createdInstallments
  }

  const cancelFutureRecurring = async (transactionId: string) => {
    if (!userId) throw new Error('No user ID')
    const result = await transactionsApi.cancelFutureRecurring(transactionId, userId)
    await loadTransactions()
    emitDataSync('transactions')
    return result
  }

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const updatedTransaction = await transactionsApi.update(id, updates)
    setTransactions((current) =>
      sortTransactions(current.map((transaction) => (
        transaction.id === id ? updatedTransaction : transaction
      ))),
    )
    setError(null)
    emitDataSync('transactions')
    return updatedTransaction
  }

  const deleteTransaction = async (id: string) => {
    await transactionsApi.delete(id)
    setTransactions((current) => current.filter((transaction) => transaction.id !== id))
    setError(null)
    emitDataSync('transactions')
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
