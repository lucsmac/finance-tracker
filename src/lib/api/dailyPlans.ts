import { supabase } from '../supabase'

export interface DailyPlan {
  id: string
  userId: string
  date: string
  plannedAmount: number
}

export const dailyPlansApi = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      date: item.date,
      plannedAmount: parseFloat(item.planned_amount)
    })) as DailyPlan[]
  },

  async getByDate(userId: string, date: string) {
    const { data, error } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return {
      id: data.id,
      userId: data.user_id,
      date: data.date,
      plannedAmount: parseFloat(data.planned_amount)
    } as DailyPlan
  },

  async upsert(userId: string, date: string, plannedAmount: number) {
    const { data, error } = await supabase
      .from('daily_plans')
      .upsert({
        user_id: userId,
        date: date,
        planned_amount: plannedAmount
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      userId: data.user_id,
      date: data.date,
      plannedAmount: parseFloat(data.planned_amount)
    } as DailyPlan
  },

  async delete(userId: string, date: string) {
    const { error } = await supabase
      .from('daily_plans')
      .delete()
      .eq('user_id', userId)
      .eq('date', date)

    if (error) throw error
  }
}
