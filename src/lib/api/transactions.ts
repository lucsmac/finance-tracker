import { supabase } from '../supabase'
import type { Transaction } from '@/app/data/mockData'

export const transactionsApi = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) throw error

    return (data || []).map(item => ({
      id: item.id,
      date: item.date,
      type: item.type,
      category: item.category,
      description: item.description,
      amount: parseFloat(item.amount),
      installmentGroup: item.installment_group,
      installmentNumber: item.installment_number,
      totalInstallments: item.total_installments,
      recurring: item.recurring,
      paid: item.paid
    })) as Transaction[]
  },

  async getByDateRange(userId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) throw error

    return (data || []).map(item => ({
      id: item.id,
      date: item.date,
      type: item.type,
      category: item.category,
      description: item.description,
      amount: parseFloat(item.amount),
      installmentGroup: item.installment_group,
      installmentNumber: item.installment_number,
      totalInstallments: item.total_installments,
      recurring: item.recurring,
      paid: item.paid
    })) as Transaction[]
  },

  async create(userId: string, transaction: Omit<Transaction, 'id'>) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        date: transaction.date,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        amount: transaction.amount,
        installment_group: transaction.installmentGroup,
        installment_number: transaction.installmentNumber,
        total_installments: transaction.totalInstallments,
        recurring: transaction.recurring || false,
        paid: transaction.paid || false
      }])
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      date: data.date,
      type: data.type,
      category: data.category,
      description: data.description,
      amount: parseFloat(data.amount),
      installmentGroup: data.installment_group,
      installmentNumber: data.installment_number,
      totalInstallments: data.total_installments,
      recurring: data.recurring,
      paid: data.paid
    } as Transaction
  },

  async update(id: string, updates: Partial<Transaction>) {
    const dbUpdates: any = {}
    if (updates.date !== undefined) dbUpdates.date = updates.date
    if (updates.type !== undefined) dbUpdates.type = updates.type
    if (updates.category !== undefined) dbUpdates.category = updates.category
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount
    if (updates.installmentGroup !== undefined) dbUpdates.installment_group = updates.installmentGroup
    if (updates.installmentNumber !== undefined) dbUpdates.installment_number = updates.installmentNumber
    if (updates.totalInstallments !== undefined) dbUpdates.total_installments = updates.totalInstallments
    if (updates.recurring !== undefined) dbUpdates.recurring = updates.recurring
    if (updates.paid !== undefined) dbUpdates.paid = updates.paid

    const { data, error } = await supabase
      .from('transactions')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      date: data.date,
      type: data.type,
      category: data.category,
      description: data.description,
      amount: parseFloat(data.amount),
      installmentGroup: data.installment_group,
      installmentNumber: data.installment_number,
      totalInstallments: data.total_installments,
      recurring: data.recurring,
      paid: data.paid
    } as Transaction
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
