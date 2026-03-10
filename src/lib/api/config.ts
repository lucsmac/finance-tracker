import { supabase } from '../supabase'

export interface UserConfig {
  id: string
  userId: string
  initialBalance: number
  monthStartDay: number
  mainIncomeDay: number
  mainIncomeAmount: number
  dailyStandard: number
  balanceStartDate?: string // YYYY-MM-DD format
}

export const configApi = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from('user_configs')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return {
      id: data.id,
      userId: data.user_id,
      initialBalance: parseFloat(data.initial_balance),
      monthStartDay: data.month_start_day,
      mainIncomeDay: data.main_income_day,
      mainIncomeAmount: parseFloat(data.main_income_amount),
      dailyStandard: parseFloat(data.daily_standard || 0),
      balanceStartDate: data.balance_start_date || undefined
    } as UserConfig
  },

  async create(userId: string, config: Omit<UserConfig, 'id' | 'userId'>) {
    const { data, error } = await supabase
      .from('user_configs')
      .insert([{
        user_id: userId,
        initial_balance: config.initialBalance,
        month_start_day: config.monthStartDay,
        main_income_day: config.mainIncomeDay,
        main_income_amount: config.mainIncomeAmount,
        daily_standard: config.dailyStandard || 0,
        balance_start_date: config.balanceStartDate || new Date().toISOString().split('T')[0]
      }])
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      userId: data.user_id,
      initialBalance: parseFloat(data.initial_balance),
      monthStartDay: data.month_start_day,
      mainIncomeDay: data.main_income_day,
      mainIncomeAmount: parseFloat(data.main_income_amount),
      dailyStandard: parseFloat(data.daily_standard || 0),
      balanceStartDate: data.balance_start_date || undefined
    } as UserConfig
  },

  async update(userId: string, updates: Partial<Omit<UserConfig, 'id' | 'userId'>>) {
    const dbUpdates: any = {}
    if (updates.initialBalance !== undefined) dbUpdates.initial_balance = updates.initialBalance
    if (updates.monthStartDay !== undefined) dbUpdates.month_start_day = updates.monthStartDay
    if (updates.mainIncomeDay !== undefined) dbUpdates.main_income_day = updates.mainIncomeDay
    if (updates.mainIncomeAmount !== undefined) dbUpdates.main_income_amount = updates.mainIncomeAmount
    if (updates.dailyStandard !== undefined) dbUpdates.daily_standard = updates.dailyStandard
    if (updates.balanceStartDate !== undefined) dbUpdates.balance_start_date = updates.balanceStartDate

    const { data, error } = await supabase
      .from('user_configs')
      .update(dbUpdates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      userId: data.user_id,
      initialBalance: parseFloat(data.initial_balance),
      monthStartDay: data.month_start_day,
      mainIncomeDay: data.main_income_day,
      mainIncomeAmount: parseFloat(data.main_income_amount),
      dailyStandard: parseFloat(data.daily_standard || 0),
      balanceStartDate: data.balance_start_date || undefined
    } as UserConfig
  }
}
