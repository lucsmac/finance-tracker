import { supabase } from '../supabase'
import type { Investment } from '@/app/data/mockData'

export const investmentsApi = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return (data || []).map(item => ({
      id: item.id,
      category: item.category,
      amount: parseFloat(item.amount),
      lastUpdate: item.last_update,
      countsAsReserve: Boolean(item.counts_as_reserve),
    })) as Investment[]
  },

  async create(userId: string, investment: Omit<Investment, 'id'>) {
    const { data, error } = await supabase
      .from('investments')
      .insert([{
        user_id: userId,
        category: investment.category,
        amount: investment.amount,
        last_update: investment.lastUpdate,
        counts_as_reserve: investment.countsAsReserve || false,
      }])
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      category: data.category,
      amount: parseFloat(data.amount),
      lastUpdate: data.last_update,
      countsAsReserve: Boolean(data.counts_as_reserve),
    } as Investment
  },

  async update(id: string, updates: Partial<Investment>) {
    const dbUpdates: any = {}
    if (updates.category !== undefined) dbUpdates.category = updates.category
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount
    if (updates.lastUpdate !== undefined) dbUpdates.last_update = updates.lastUpdate
    if (updates.countsAsReserve !== undefined) dbUpdates.counts_as_reserve = updates.countsAsReserve

    const { data, error } = await supabase
      .from('investments')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      category: data.category,
      amount: parseFloat(data.amount),
      lastUpdate: data.last_update,
      countsAsReserve: Boolean(data.counts_as_reserve),
    } as Investment
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getByCategory(userId: string, category: string) {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return {
      id: data.id,
      category: data.category,
      amount: parseFloat(data.amount),
      lastUpdate: data.last_update,
      countsAsReserve: Boolean(data.counts_as_reserve),
    } as Investment
  }
}
