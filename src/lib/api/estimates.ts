import { supabase } from '../supabase'
import type { Estimate } from '@/app/data/mockData'

export const estimatesApi = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('estimates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Transform snake_case from DB to camelCase for frontend
    return (data || []).map(item => ({
      id: item.id,
      category: item.category,
      monthlyAmount: item.monthly_amount,
      active: item.active,
      icon: item.icon,
      color: item.color
    })) as Estimate[]
  },

  async create(userId: string, estimate: Omit<Estimate, 'id'>) {
    const { data, error } = await supabase
      .from('estimates')
      .insert([{
        user_id: userId,
        category: estimate.category,
        monthly_amount: estimate.monthlyAmount,
        active: estimate.active,
        icon: estimate.icon,
        color: estimate.color
      }])
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      category: data.category,
      monthlyAmount: data.monthly_amount,
      active: data.active,
      icon: data.icon,
      color: data.color
    } as Estimate
  },

  async update(id: string, updates: Partial<Estimate>) {
    const dbUpdates: any = {}
    if (updates.category !== undefined) dbUpdates.category = updates.category
    if (updates.monthlyAmount !== undefined) dbUpdates.monthly_amount = updates.monthlyAmount
    if (updates.active !== undefined) dbUpdates.active = updates.active
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon
    if (updates.color !== undefined) dbUpdates.color = updates.color

    const { data, error } = await supabase
      .from('estimates')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      category: data.category,
      monthlyAmount: data.monthly_amount,
      active: data.active,
      icon: data.icon,
      color: data.color
    } as Estimate
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('estimates')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
