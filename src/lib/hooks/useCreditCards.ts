import { useEffect, useState } from 'react'
import {
  creditCardsApi,
  type CreditCard,
  type CreditCardPayment,
  type CreditCardStatement,
} from '../api/creditCards'
import { supabase } from '../supabase'
import { emitDataSync, subscribeDataSync } from '../utils/dataSync'

const sortCards = (items: CreditCard[]) =>
  [...items].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))

const sortStatements = (items: CreditCardStatement[]) =>
  [...items].sort((left, right) => right.dueDate.localeCompare(left.dueDate))

const sortPayments = (items: CreditCardPayment[]) =>
  [...items].sort((left, right) => right.paidAt.localeCompare(left.paidAt))

export function useCreditCards(userId: string | undefined) {
  const [cards, setCards] = useState<CreditCard[]>([])
  const [statements, setStatements] = useState<CreditCardStatement[]>([])
  const [payments, setPayments] = useState<CreditCardPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    void loadAll()

    const subscription = supabase
      .channel('credit_cards_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'credit_cards',
        filter: `user_id=eq.${userId}`,
      }, () => {
        void loadAll()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'credit_card_statements',
        filter: `user_id=eq.${userId}`,
      }, () => {
        void loadAll()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'credit_card_payments',
        filter: `user_id=eq.${userId}`,
      }, () => {
        void loadAll()
      })
      .subscribe()

    const unsubscribeDataSync = subscribeDataSync('credit-cards', () => {
      void loadAll()
    })

    return () => {
      subscription.unsubscribe()
      unsubscribeDataSync()
    }
  }, [userId])

  const loadAll = async () => {
    if (!userId) return

    try {
      setLoading(true)

      const [nextCards, nextStatements, nextPayments] = await Promise.all([
        creditCardsApi.getCards(userId),
        creditCardsApi.getStatements(userId),
        creditCardsApi.getPayments(userId),
      ])

      setCards(sortCards(nextCards))
      setStatements(sortStatements(nextStatements))
      setPayments(sortPayments(nextPayments))
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error loading credit cards data:', err)
    } finally {
      setLoading(false)
    }
  }

  const createCard = async (card: Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('No user ID')
    const createdCard = await creditCardsApi.createCard(userId, card)
    setCards((current) => sortCards([...current, createdCard]))
    setError(null)
    emitDataSync('credit-cards')
    return createdCard
  }

  const updateCard = async (id: string, updates: Partial<Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    const updatedCard = await creditCardsApi.updateCard(id, updates)
    setCards((current) => sortCards(current.map((card) => (card.id === id ? updatedCard : card))))
    setError(null)
    emitDataSync('credit-cards')
    return updatedCard
  }

  const deleteCard = async (id: string) => {
    await creditCardsApi.deleteCard(id)
    setCards((current) => current.filter((card) => card.id !== id))
    setError(null)
    emitDataSync('credit-cards')
  }

  const createStatement = async (statement: Omit<CreditCardStatement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('No user ID')
    const createdStatement = await creditCardsApi.createStatement(userId, statement)
    setStatements((current) => sortStatements([...current, createdStatement]))
    setError(null)
    emitDataSync('credit-cards')
    return createdStatement
  }

  const updateStatement = async (id: string, updates: Partial<Omit<CreditCardStatement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    const updatedStatement = await creditCardsApi.updateStatement(id, updates)
    setStatements((current) => sortStatements(current.map((statement) => (statement.id === id ? updatedStatement : statement))))
    setError(null)
    emitDataSync('credit-cards')
    return updatedStatement
  }

  const deleteStatement = async (id: string) => {
    await creditCardsApi.deleteStatement(id)
    setStatements((current) => current.filter((statement) => statement.id !== id))
    setError(null)
    emitDataSync('credit-cards')
  }

  const createPayment = async (payment: Omit<CreditCardPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('No user ID')
    const createdPayment = await creditCardsApi.createPayment(userId, payment)
    setPayments((current) => sortPayments([...current, createdPayment]))
    setError(null)
    emitDataSync('credit-cards')
    return createdPayment
  }

  const updatePayment = async (id: string, updates: Partial<Omit<CreditCardPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    const updatedPayment = await creditCardsApi.updatePayment(id, updates)
    setPayments((current) => sortPayments(current.map((payment) => (payment.id === id ? updatedPayment : payment))))
    setError(null)
    emitDataSync('credit-cards')
    return updatedPayment
  }

  const deletePayment = async (id: string) => {
    await creditCardsApi.deletePayment(id)
    setPayments((current) => current.filter((payment) => payment.id !== id))
    setError(null)
    emitDataSync('credit-cards')
  }

  return {
    cards,
    statements,
    payments,
    loading,
    error,
    createCard,
    updateCard,
    deleteCard,
    createStatement,
    updateStatement,
    deleteStatement,
    createPayment,
    updatePayment,
    deletePayment,
    refresh: loadAll,
  }
}
