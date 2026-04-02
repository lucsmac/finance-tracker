import type { Transaction } from '@/app/data/mockData'
import type { DailyExpense } from '@/lib/api/dailyExpenses'

export interface VariableExpenseEntry {
  id: string
  date: string
  title: string
  category: string
  amount: number
  source: 'daily_expense' | 'legacy_transaction'
  paid?: boolean
}

export const getDailyExpensesForDate = (date: string, dailyExpenses: DailyExpense[]) => {
  return dailyExpenses.filter(expense => expense.date === date)
}

export const getDailyExpensesTotalForDate = (date: string, dailyExpenses: DailyExpense[]) => {
  return getDailyExpensesForDate(date, dailyExpenses)
    .reduce((sum, expense) => sum + expense.amount, 0)
}

export const getLegacyVariableTransactionsForDate = (
  date: string,
  transactions: Transaction[],
  options?: { onlyPaid?: boolean }
) => {
  return transactions.filter(transaction => {
    if (transaction.type !== 'expense_variable' || transaction.date !== date) {
      return false
    }

    if (options?.onlyPaid) {
      return !!transaction.paid
    }

    return true
  })
}

export const getLegacyVariableExpensesTotalForDate = (
  date: string,
  transactions: Transaction[],
  options?: { onlyPaid?: boolean }
) => {
  return getLegacyVariableTransactionsForDate(date, transactions, options)
    .reduce((sum, transaction) => sum + transaction.amount, 0)
}

export const getRecordedVariableExpensesTotalForDate = (
  date: string,
  dailyExpenses: DailyExpense[],
  transactions: Transaction[]
) => {
  return getDailyExpensesTotalForDate(date, dailyExpenses) +
    getLegacyVariableExpensesTotalForDate(date, transactions, { onlyPaid: true })
}

export const getVariableExpenseEntriesForDate = (
  date: string,
  dailyExpenses: DailyExpense[],
  transactions: Transaction[]
): VariableExpenseEntry[] => {
  const dailyExpenseEntries: VariableExpenseEntry[] = getDailyExpensesForDate(date, dailyExpenses)
    .map(expense => ({
      id: expense.id,
      date: expense.date,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      source: 'daily_expense' as const
    }))

  const legacyEntries: VariableExpenseEntry[] = getLegacyVariableTransactionsForDate(date, transactions)
    .map(transaction => ({
      id: transaction.id,
      date: transaction.date,
      title: transaction.description,
      category: transaction.category,
      amount: transaction.amount,
      source: 'legacy_transaction' as const,
      paid: transaction.paid
    }))

  return [...dailyExpenseEntries, ...legacyEntries]
}

export const sumDailyExpensesUntilDate = (
  dailyExpenses: DailyExpense[],
  endDate: string,
  startDate?: string
) => {
  return dailyExpenses
    .filter(expense => expense.date <= endDate && (!startDate || expense.date >= startDate))
    .reduce((sum, expense) => sum + expense.amount, 0)
}
