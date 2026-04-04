import {
  isCashInflowTransactionType,
  isCashOutflowTransactionType,
  type Transaction,
} from '@/app/data/mockData'
import type { DailyExpense } from '@/lib/api/dailyExpenses'
import { createDateFromString, formatDateLocal } from '@/lib/utils/dateHelpers'
import { getEffectiveVariableExpensesTotalForDate } from '@/lib/utils/dailyExpenses'

interface CalculateAvailableBalanceUntilDateInput {
  initialBalance: number
  transactions: Transaction[]
  dailyExpenses: DailyExpense[]
  dailyStandard: number
  balanceStartDate?: string
  targetDate: string
  getPlannedAmountForDate?: (date: string) => number | null | undefined
}

export const calculateAvailableBalanceUntilDate = ({
  initialBalance,
  transactions,
  dailyExpenses,
  dailyStandard,
  balanceStartDate,
  targetDate,
  getPlannedAmountForDate,
}: CalculateAvailableBalanceUntilDateInput) => {
  const effectiveStartDate = balanceStartDate || targetDate

  if (targetDate < effectiveStartDate) {
    return initialBalance
  }

  let balance = initialBalance
  const startDate = createDateFromString(effectiveStartDate)
  const endDate = createDateFromString(targetDate)

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateStr = formatDateLocal(date.getFullYear(), date.getMonth(), date.getDate())
    const dayTransactions = transactions.filter((transaction) => transaction.date === dateStr)
    const plannedAmount = getPlannedAmountForDate?.(dateStr)
    const effectivePlannedAmount = plannedAmount ?? dailyStandard

    balance += dayTransactions
      .filter((transaction) => isCashInflowTransactionType(transaction.type))
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    balance -= dayTransactions
      .filter((transaction) => isCashOutflowTransactionType(transaction.type) && transaction.type !== 'expense_variable')
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    balance -= getEffectiveVariableExpensesTotalForDate({
      date: dateStr,
      plannedAmount: effectivePlannedAmount,
      dailyExpenses,
      transactions,
    })
  }

  return balance
}
