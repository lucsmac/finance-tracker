import type { Transaction } from '@/app/data/mockData'
import type { DailyExpense, DailyExpensePaymentMethod } from '@/lib/api/dailyExpenses'
import { isCreditCardTransaction } from '@/lib/utils/transactionPayments'

export interface VariableExpenseEntry {
  id: string
  date: string
  title: string
  category: string
  amount: number
  source: 'daily_expense' | 'legacy_transaction'
  paid?: boolean
  paymentMethod?: DailyExpensePaymentMethod | 'legacy_transaction'
  creditCardId?: string
  statementReferenceMonth?: string
}

interface DailyExpenseFilterOptions {
  cashImpactOnly?: boolean
  paymentMethod?: DailyExpensePaymentMethod
}

export interface VariableExpenseRecordedSplit {
  total: number
  debit: number
  creditCard: number
}

export const isCreditCardDailyExpense = (expense: DailyExpense) => expense.paymentMethod === 'credit_card'

export const isCashImpactDailyExpense = (expense: DailyExpense) => expense.paymentMethod !== 'credit_card'

const matchesDailyExpenseFilters = (expense: DailyExpense, options?: DailyExpenseFilterOptions) => {
  if (options?.paymentMethod && expense.paymentMethod !== options.paymentMethod) {
    return false
  }

  if (options?.cashImpactOnly && !isCashImpactDailyExpense(expense)) {
    return false
  }

  return true
}

export const getDailyExpensesForDate = (
  date: string,
  dailyExpenses: DailyExpense[],
  options?: DailyExpenseFilterOptions,
) => {
  return dailyExpenses.filter((expense) => expense.date === date && matchesDailyExpenseFilters(expense, options))
}

export const getDailyExpensesTotalForDate = (
  date: string,
  dailyExpenses: DailyExpense[],
  options?: DailyExpenseFilterOptions,
) => {
  return getDailyExpensesForDate(date, dailyExpenses, options)
    .reduce((sum, expense) => sum + expense.amount, 0)
}

export const getLegacyVariableTransactionsForDate = (
  date: string,
  transactions: Transaction[],
  options?: { onlyPaid?: boolean; cashImpactOnly?: boolean; paymentMethod?: DailyExpensePaymentMethod }
) => {
  return transactions.filter(transaction => {
    if (transaction.type !== 'expense_variable' || transaction.date !== date) {
      return false
    }

    if (options?.onlyPaid && !transaction.paid) {
      return false
    }

    if (options?.paymentMethod === 'credit_card' && !isCreditCardTransaction(transaction)) {
      return false
    }

    if (options?.paymentMethod === 'debit' && isCreditCardTransaction(transaction)) {
      return false
    }

    if (options?.cashImpactOnly && isCreditCardTransaction(transaction)) {
      return false
    }

    return true
  })
}

export const getLegacyVariableExpensesTotalForDate = (
  date: string,
  transactions: Transaction[],
  options?: { onlyPaid?: boolean; cashImpactOnly?: boolean; paymentMethod?: DailyExpensePaymentMethod }
) => {
  return getLegacyVariableTransactionsForDate(date, transactions, options)
    .reduce((sum, transaction) => sum + transaction.amount, 0)
}

export const getRecordedVariableExpensesTotalForDate = (
  date: string,
  dailyExpenses: DailyExpense[],
  transactions: Transaction[],
  options?: { cashImpactOnly?: boolean }
) => {
  return getDailyExpensesTotalForDate(date, dailyExpenses, { cashImpactOnly: options?.cashImpactOnly }) +
    getLegacyVariableExpensesTotalForDate(date, transactions, { onlyPaid: true, cashImpactOnly: options?.cashImpactOnly })
}

export const getRecordedVariableExpensesSplitForDate = (
  date: string,
  dailyExpenses: DailyExpense[],
  transactions: Transaction[],
): VariableExpenseRecordedSplit => {
  const creditCard =
    getDailyExpensesTotalForDate(date, dailyExpenses, { paymentMethod: 'credit_card' }) +
    getLegacyVariableExpensesTotalForDate(date, transactions, { onlyPaid: true, paymentMethod: 'credit_card' })
  const debit =
    getDailyExpensesTotalForDate(date, dailyExpenses, { cashImpactOnly: true }) +
    getLegacyVariableExpensesTotalForDate(date, transactions, { onlyPaid: true, cashImpactOnly: true })

  return {
    total: debit + creditCard,
    debit,
    creditCard,
  }
}

interface EffectiveVariableExpensesParams {
  date: string
  plannedAmount: number
  dailyExpenses: DailyExpense[]
  transactions: Transaction[]
  additionalVariableExpenses?: number
}

export const getEffectiveVariableExpensesTotalForDate = ({
  date,
  plannedAmount,
  dailyExpenses,
  transactions,
  additionalVariableExpenses = 0,
}: EffectiveVariableExpensesParams) => {
  const recordedDailyExpenses = getDailyExpensesTotalForDate(date, dailyExpenses)
  const committedVariableExpenses = getLegacyVariableExpensesTotalForDate(date, transactions, { onlyPaid: true })
  const hasExplicitVariableEntries =
    getDailyExpensesForDate(date, dailyExpenses).length > 0 ||
    getLegacyVariableTransactionsForDate(date, transactions, { onlyPaid: true }).length > 0 ||
    additionalVariableExpenses > 0

  // The fallback is replaced whenever there is an explicit real launch for the day,
  // whether it came from the new daily-expense flow or the legacy variable transactions.
  const fallbackOrDailyExpense = hasExplicitVariableEntries ? recordedDailyExpenses : plannedAmount

  return fallbackOrDailyExpense + committedVariableExpenses + additionalVariableExpenses
}

export const getEffectiveVariableCashExpensesTotalForDate = ({
  date,
  plannedAmount,
  dailyExpenses,
  transactions,
  additionalVariableExpenses = 0,
}: EffectiveVariableExpensesParams) => {
  const recordedCashDailyExpenses = getDailyExpensesTotalForDate(date, dailyExpenses, { cashImpactOnly: true })
  const committedCashVariableExpenses = getLegacyVariableExpensesTotalForDate(date, transactions, {
    onlyPaid: true,
    cashImpactOnly: true,
  })
  const hasExplicitVariableEntries =
    getDailyExpensesForDate(date, dailyExpenses).length > 0 ||
    getLegacyVariableTransactionsForDate(date, transactions, { onlyPaid: true }).length > 0 ||
    additionalVariableExpenses > 0

  const fallbackOrDailyExpense = hasExplicitVariableEntries ? recordedCashDailyExpenses : plannedAmount

  return fallbackOrDailyExpense + committedCashVariableExpenses + additionalVariableExpenses
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
      source: 'daily_expense' as const,
      paymentMethod: expense.paymentMethod,
      creditCardId: expense.creditCardId,
      statementReferenceMonth: expense.statementReferenceMonth,
    }))

  const legacyEntries: VariableExpenseEntry[] = getLegacyVariableTransactionsForDate(date, transactions)
    .map(transaction => ({
      id: transaction.id,
      date: transaction.date,
      title: transaction.description,
      category: transaction.category,
      amount: transaction.amount,
      source: 'legacy_transaction' as const,
      paid: transaction.paid,
      paymentMethod: transaction.paymentMethod || 'legacy_transaction',
      creditCardId: transaction.creditCardId,
      statementReferenceMonth: transaction.statementReferenceMonth,
    }))

  return [...dailyExpenseEntries, ...legacyEntries]
}

export const sumDailyExpensesUntilDate = (
  dailyExpenses: DailyExpense[],
  endDate: string,
  startDate?: string,
  options?: DailyExpenseFilterOptions,
) => {
  return dailyExpenses
    .filter(expense => expense.date <= endDate && (!startDate || expense.date >= startDate) && matchesDailyExpenseFilters(expense, options))
    .reduce((sum, expense) => sum + expense.amount, 0)
}
