import { supabase } from '../supabase'

export interface CreditCard {
  id: string
  userId: string
  name: string
  issuer?: string
  brand?: string
  totalLimit: number
  blockedLimit: number
  usedLimit: number
  closingDay: number
  dueDay: number
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreditCardStatement {
  id: string
  userId: string
  cardId: string
  referenceMonth: string
  closingDate: string
  dueDate: string
  totalAmount: number
  notes?: string
  commitmentTransactionId?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreditCardPayment {
  id: string
  userId: string
  statementId: string
  amount: number
  paidAt: string
  notes?: string
  paymentTransactionId?: string | null
  createdAt?: string
  updatedAt?: string
}

const mapCard = (item: any): CreditCard => ({
  id: item.id,
  userId: item.user_id,
  name: item.name,
  issuer: item.issuer || undefined,
  brand: item.brand || undefined,
  totalLimit: parseFloat(item.total_limit),
  blockedLimit: parseFloat(item.blocked_limit || 0),
  usedLimit: parseFloat(item.used_limit || 0),
  closingDay: item.closing_day,
  dueDay: item.due_day,
  notes: item.notes || undefined,
  createdAt: item.created_at || undefined,
  updatedAt: item.updated_at || undefined,
})

const mapStatement = (item: any): CreditCardStatement => ({
  id: item.id,
  userId: item.user_id,
  cardId: item.card_id,
  referenceMonth: item.reference_month,
  closingDate: item.closing_date,
  dueDate: item.due_date,
  totalAmount: parseFloat(item.total_amount || 0),
  notes: item.notes || undefined,
  commitmentTransactionId: item.commitment_transaction_id || undefined,
  createdAt: item.created_at || undefined,
  updatedAt: item.updated_at || undefined,
})

const mapPayment = (item: any): CreditCardPayment => ({
  id: item.id,
  userId: item.user_id,
  statementId: item.statement_id,
  amount: parseFloat(item.amount || 0),
  paidAt: item.paid_at,
  notes: item.notes || undefined,
  paymentTransactionId: item.payment_transaction_id || undefined,
  createdAt: item.created_at || undefined,
  updatedAt: item.updated_at || undefined,
})

export const creditCardsApi = {
  async getCards(userId: string) {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (error) throw error

    return (data || []).map(mapCard)
  },

  async getStatements(userId: string) {
    const { data, error } = await supabase
      .from('credit_card_statements')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: false })

    if (error) throw error

    return (data || []).map(mapStatement)
  },

  async getPayments(userId: string) {
    const { data, error } = await supabase
      .from('credit_card_payments')
      .select('*')
      .eq('user_id', userId)
      .order('paid_at', { ascending: false })

    if (error) throw error

    return (data || []).map(mapPayment)
  },

  async createCard(userId: string, card: Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('credit_cards')
      .insert([{
        user_id: userId,
        name: card.name,
        issuer: card.issuer || null,
        brand: card.brand || null,
        total_limit: card.totalLimit,
        blocked_limit: card.blockedLimit,
        used_limit: card.usedLimit,
        closing_day: card.closingDay,
        due_day: card.dueDay,
        notes: card.notes || null,
      }])
      .select()
      .single()

    if (error) throw error

    return mapCard(data)
  },

  async updateCard(id: string, updates: Partial<Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) {
    const dbUpdates: any = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.issuer !== undefined) dbUpdates.issuer = updates.issuer || null
    if (updates.brand !== undefined) dbUpdates.brand = updates.brand || null
    if (updates.totalLimit !== undefined) dbUpdates.total_limit = updates.totalLimit
    if (updates.blockedLimit !== undefined) dbUpdates.blocked_limit = updates.blockedLimit
    if (updates.usedLimit !== undefined) dbUpdates.used_limit = updates.usedLimit
    if (updates.closingDay !== undefined) dbUpdates.closing_day = updates.closingDay
    if (updates.dueDay !== undefined) dbUpdates.due_day = updates.dueDay
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null

    const { data, error } = await supabase
      .from('credit_cards')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return mapCard(data)
  },

  async deleteCard(id: string) {
    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async createStatement(userId: string, statement: Omit<CreditCardStatement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('credit_card_statements')
      .insert([{
        user_id: userId,
        card_id: statement.cardId,
        reference_month: statement.referenceMonth,
        closing_date: statement.closingDate,
        due_date: statement.dueDate,
        total_amount: statement.totalAmount,
        notes: statement.notes || null,
        commitment_transaction_id: statement.commitmentTransactionId || null,
      }])
      .select()
      .single()

    if (error) throw error

    return mapStatement(data)
  },

  async updateStatement(id: string, updates: Partial<Omit<CreditCardStatement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) {
    const dbUpdates: any = {}
    if (updates.cardId !== undefined) dbUpdates.card_id = updates.cardId
    if (updates.referenceMonth !== undefined) dbUpdates.reference_month = updates.referenceMonth
    if (updates.closingDate !== undefined) dbUpdates.closing_date = updates.closingDate
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate
    if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null
    if (updates.commitmentTransactionId !== undefined) dbUpdates.commitment_transaction_id = updates.commitmentTransactionId || null

    const { data, error } = await supabase
      .from('credit_card_statements')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return mapStatement(data)
  },

  async deleteStatement(id: string) {
    const { error } = await supabase
      .from('credit_card_statements')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async createPayment(userId: string, payment: Omit<CreditCardPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('credit_card_payments')
      .insert([{
        user_id: userId,
        statement_id: payment.statementId,
        amount: payment.amount,
        paid_at: payment.paidAt,
        notes: payment.notes || null,
        payment_transaction_id: payment.paymentTransactionId || null,
      }])
      .select()
      .single()

    if (error) throw error

    return mapPayment(data)
  },

  async updatePayment(id: string, updates: Partial<Omit<CreditCardPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) {
    const dbUpdates: any = {}
    if (updates.statementId !== undefined) dbUpdates.statement_id = updates.statementId
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount
    if (updates.paidAt !== undefined) dbUpdates.paid_at = updates.paidAt
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null
    if (updates.paymentTransactionId !== undefined) dbUpdates.payment_transaction_id = updates.paymentTransactionId || null

    const { data, error } = await supabase
      .from('credit_card_payments')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return mapPayment(data)
  },

  async deletePayment(id: string) {
    const { error } = await supabase
      .from('credit_card_payments')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
