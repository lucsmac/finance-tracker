import type { DailyExpense } from '@/lib/api/dailyExpenses'
import type { CreditCard } from '@/lib/api/creditCards'
import type { Transaction } from '@/app/data/mockData'
import { isCreditCardTransaction } from '@/lib/utils/transactionPayments'

export const clampCurrency = (value: number) => Math.round(Math.max(value, 0) * 100) / 100

const createUsageDelta = () => new Map<string, number>()

const appendUsageDelta = (deltas: Map<string, number>, cardId: string | undefined, amount: number) => {
  if (!cardId || amount === 0) return
  deltas.set(cardId, clampCurrency((deltas.get(cardId) || 0) + amount))
}

const getDailyExpenseCardUsage = (expense: Pick<DailyExpense, 'amount' | 'paymentMethod' | 'creditCardId'> | null | undefined) => {
  if (!expense || expense.paymentMethod !== 'credit_card' || !expense.creditCardId) {
    return null
  }

  return {
    cardId: expense.creditCardId,
    amount: expense.amount,
  }
}

const getTransactionCardUsage = (
  transaction: Pick<Transaction, 'type' | 'amount' | 'paymentMethod' | 'creditCardId' | 'paid'> | null | undefined,
) => {
  if (!transaction || !transaction.paid || !isCreditCardTransaction(transaction) || !transaction.creditCardId) {
    return null
  }

  return {
    cardId: transaction.creditCardId,
    amount: transaction.amount,
  }
}

const buildDeltaBetweenUsages = (
  previousUsage: { cardId: string; amount: number } | null,
  nextUsage: { cardId: string; amount: number } | null,
) => {
  const deltas = createUsageDelta()

  if (previousUsage) {
    appendUsageDelta(deltas, previousUsage.cardId, -previousUsage.amount)
  }

  if (nextUsage) {
    appendUsageDelta(deltas, nextUsage.cardId, nextUsage.amount)
  }

  return deltas
}

export const getDailyExpenseCardUsageDelta = (
  previousExpense: Pick<DailyExpense, 'amount' | 'paymentMethod' | 'creditCardId'> | null | undefined,
  nextExpense: Pick<DailyExpense, 'amount' | 'paymentMethod' | 'creditCardId'> | null | undefined,
) => buildDeltaBetweenUsages(getDailyExpenseCardUsage(previousExpense), getDailyExpenseCardUsage(nextExpense))

export const getTransactionCardUsageDelta = (
  previousTransaction: Pick<Transaction, 'type' | 'amount' | 'paymentMethod' | 'creditCardId' | 'paid'> | null | undefined,
  nextTransaction: Pick<Transaction, 'type' | 'amount' | 'paymentMethod' | 'creditCardId' | 'paid'> | null | undefined,
) => buildDeltaBetweenUsages(getTransactionCardUsage(previousTransaction), getTransactionCardUsage(nextTransaction))

export const applyCardUsageDelta = async ({
  cardsById,
  deltas,
  updateCard,
}: {
  cardsById: Map<string, CreditCard>
  deltas: Map<string, number>
  updateCard: (id: string, updates: Partial<Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<CreditCard>
}) => {
  const appliedSnapshots: Array<{ cardId: string; usedLimit: number }> = []

  try {
    for (const [cardId, delta] of deltas.entries()) {
      if (delta === 0) continue

      const card = cardsById.get(cardId)
      if (!card) {
        throw new Error('Cartão vinculado não encontrado para ajustar o limite usado.')
      }

      appliedSnapshots.push({ cardId, usedLimit: card.usedLimit })
      await updateCard(cardId, {
        usedLimit: clampCurrency(card.usedLimit + delta),
      })
    }
  } catch (error) {
    for (const snapshot of [...appliedSnapshots].reverse()) {
      try {
        await updateCard(snapshot.cardId, { usedLimit: snapshot.usedLimit })
      } catch (rollbackError) {
        console.error('Error rolling back credit card used limit:', rollbackError)
      }
    }

    throw error
  }
}
