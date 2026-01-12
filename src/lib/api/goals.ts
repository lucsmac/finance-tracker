import { supabase } from '../supabase'
import type { Goal } from '@/app/data/mockData'

export const goalsApi = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      targetAmount: parseFloat(item.target_amount),
      currentAmount: parseFloat(item.current_amount),
      deadline: item.deadline,
      period: item.period,
      category: item.category
    })) as Goal[]
  },

  async create(userId: string, goal: Omit<Goal, 'id'>) {
    const { data, error } = await supabase
      .from('goals')
      .insert([{
        user_id: userId,
        name: goal.name,
        type: goal.type,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount || 0,
        deadline: goal.deadline,
        period: (goal as any).period,
        category: (goal as any).category
      }])
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      targetAmount: parseFloat(data.target_amount),
      currentAmount: parseFloat(data.current_amount),
      deadline: data.deadline,
      period: data.period,
      category: data.category
    } as Goal
  },

  async update(id: string, updates: Partial<Goal>) {
    const dbUpdates: any = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.type !== undefined) dbUpdates.type = updates.type
    if (updates.targetAmount !== undefined) dbUpdates.target_amount = updates.targetAmount
    if (updates.currentAmount !== undefined) dbUpdates.current_amount = updates.currentAmount
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline
    if ((updates as any).period !== undefined) dbUpdates.period = (updates as any).period
    if ((updates as any).category !== undefined) dbUpdates.category = (updates as any).category

    const { data, error } = await supabase
      .from('goals')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      targetAmount: parseFloat(data.target_amount),
      currentAmount: parseFloat(data.current_amount),
      deadline: data.deadline,
      period: data.period,
      category: data.category
    } as Goal
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
