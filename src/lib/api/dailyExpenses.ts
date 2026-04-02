import { supabase } from '../supabase'

export interface DailyExpense {
  id: string
  userId: string
  date: string
  title: string
  category: string
  amount: number
  createdAt: string
}

export interface CreateDailyExpenseInput {
  date: string
  title: string
  category: string
  amount: number
}

const mapDailyExpense = (item: any): DailyExpense => ({
  id: item.id,
  userId: item.user_id,
  date: item.date,
  title: item.title,
  category: item.category,
  amount: parseFloat(item.amount),
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
        amount: expense.amount
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
