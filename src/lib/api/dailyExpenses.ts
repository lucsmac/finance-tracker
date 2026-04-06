import { supabase } from '../supabase'

export type DailyExpensePaymentMethod = 'debit' | 'credit_card'

export interface DailyExpense {
  id: string
  userId: string
  date: string
  title: string
  category: string
  amount: number
  paymentMethod: DailyExpensePaymentMethod
  creditCardId?: string
  statementReferenceMonth?: string
  createdAt: string
}

export interface CreateDailyExpenseInput {
  date: string
  title: string
  category: string
  amount: number
  paymentMethod?: DailyExpensePaymentMethod
  creditCardId?: string
  statementReferenceMonth?: string
}

export type UpdateDailyExpenseInput = Partial<CreateDailyExpenseInput>

const mapDailyExpense = (item: any): DailyExpense => ({
  id: item.id,
  userId: item.user_id,
  date: item.date,
  title: item.title,
  category: item.category,
  amount: parseFloat(item.amount),
  paymentMethod: item.payment_method || 'debit',
  creditCardId: item.credit_card_id || undefined,
  statementReferenceMonth: item.statement_reference_month || undefined,
  createdAt: item.created_at
})

const isMissingDailyExpensesTableError = (error: any) => {
  const message = error?.message || ''
  return error?.code === 'PGRST205' || message.includes("Could not find the table 'public.daily_expenses'")
}

const createMissingTableError = () => new Error(
  'A tabela daily_expenses ainda não existe no banco conectado. Aplique a migration 20260401_add_daily_expenses.sql no Supabase.'
)

export const dailyExpensesApi = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('daily_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      if (isMissingDailyExpensesTableError(error)) {
        return []
      }

      throw error
    }

    return (data || []).map(mapDailyExpense) as DailyExpense[]
  },

  async create(userId: string, expense: CreateDailyExpenseInput) {
    const { data, error } = await supabase
      .from('daily_expenses')
      .insert([{
        user_id: userId,
        date: expense.date,
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        payment_method: expense.paymentMethod || 'debit',
        credit_card_id: expense.creditCardId || null,
        statement_reference_month: expense.statementReferenceMonth || null,
      }])
      .select()
      .single()

    if (error) {
      if (isMissingDailyExpensesTableError(error)) {
        throw createMissingTableError()
      }

      throw error
    }

    return mapDailyExpense(data)
  },

  async update(id: string, updates: UpdateDailyExpenseInput) {
    const dbUpdates: any = {}
    if (updates.date !== undefined) dbUpdates.date = updates.date
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.category !== undefined) dbUpdates.category = updates.category
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount
    if ('paymentMethod' in updates) dbUpdates.payment_method = updates.paymentMethod
    if ('creditCardId' in updates) dbUpdates.credit_card_id = updates.creditCardId || null
    if ('statementReferenceMonth' in updates) dbUpdates.statement_reference_month = updates.statementReferenceMonth || null

    const { data, error } = await supabase
      .from('daily_expenses')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (isMissingDailyExpensesTableError(error)) {
        throw createMissingTableError()
      }

      throw error
    }

    return mapDailyExpense(data)
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('daily_expenses')
      .delete()
      .eq('id', id)

    if (error) {
      if (isMissingDailyExpensesTableError(error)) {
        throw createMissingTableError()
      }

      throw error
    }
  }
}
