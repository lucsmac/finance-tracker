import { supabase } from '../supabase'
import type { Transaction } from '@/app/data/mockData'

const mapTransaction = (item: any): Transaction => ({
  id: item.id,
  date: item.date,
  type: item.type,
  category: item.category,
  description: item.description,
  amount: parseFloat(item.amount),
  investmentId: item.investment_id || undefined,
  paymentMethod: item.payment_method || 'debit',
  creditCardId: item.credit_card_id || undefined,
  statementReferenceMonth: item.statement_reference_month || undefined,
  installmentGroup: item.installment_group,
  installmentNumber: item.installment_number,
  totalInstallments: item.total_installments,
  recurring: item.recurring,
  paid: item.paid
})

export const transactionsApi = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) throw error

    return (data || []).map(mapTransaction)
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

    return (data || []).map(mapTransaction)
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
        investment_id: transaction.investmentId,
        payment_method: transaction.paymentMethod || 'debit',
        credit_card_id: transaction.creditCardId || null,
        statement_reference_month: transaction.statementReferenceMonth || null,
        installment_group: transaction.installmentGroup,
        installment_number: transaction.installmentNumber,
        total_installments: transaction.totalInstallments,
        recurring: transaction.recurring || false,
        paid: transaction.paid || false
      }])
      .select()
      .single()

    if (error) throw error

    return mapTransaction(data)
  },

  /**
   * Cria todas as parcelas de um parcelamento automaticamente
   * Recebe os dados da primeira parcela e gera as demais nos meses seguintes
   * Se a parcela inicial não for 1, cria apenas as parcelas restantes
   */
  async createInstallments(userId: string, firstInstallment: Omit<Transaction, 'id'>) {
    if (firstInstallment.type !== 'installment' || !firstInstallment.totalInstallments || !firstInstallment.installmentGroup) {
      throw new Error('Invalid installment data')
    }

    const startDate = new Date(firstInstallment.date + 'T00:00:00')
    const dayOfMonth = startDate.getDate()
    const startInstallment = firstInstallment.installmentNumber || 1
    const totalInstallments = firstInstallment.totalInstallments

    const installmentsToCreate = []

    // Calcular quantas parcelas criar (da parcela inicial até a última)
    const remainingInstallments = totalInstallments - startInstallment + 1

    // Gerar apenas as parcelas restantes
    for (let i = 0; i < remainingInstallments; i++) {
      const installmentNumber = startInstallment + i
      const installmentDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, dayOfMonth)
      const installmentDateStr = installmentDate.toISOString().split('T')[0]

      installmentsToCreate.push({
        user_id: userId,
        date: installmentDateStr,
        type: 'installment',
        category: firstInstallment.category,
        description: firstInstallment.description,
        amount: firstInstallment.amount,
        investment_id: null,
        payment_method: firstInstallment.paymentMethod || 'debit',
        credit_card_id: firstInstallment.creditCardId || null,
        statement_reference_month: firstInstallment.statementReferenceMonth || null,
        installment_group: firstInstallment.installmentGroup,
        installment_number: installmentNumber,
        total_installments: totalInstallments,
        recurring: false,
        paid: i === 0 ? (firstInstallment.paid || false) : false
      })
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(installmentsToCreate)
      .select()

    if (error) throw error

    return (data || []).map(mapTransaction)
  },

  async update(id: string, updates: Partial<Transaction>) {
    const dbUpdates: any = {}
    if (updates.date !== undefined) dbUpdates.date = updates.date
    if (updates.type !== undefined) dbUpdates.type = updates.type
    if (updates.category !== undefined) dbUpdates.category = updates.category
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount
    if ('investmentId' in updates) dbUpdates.investment_id = updates.investmentId || null
    if ('paymentMethod' in updates) dbUpdates.payment_method = updates.paymentMethod
    if ('creditCardId' in updates) dbUpdates.credit_card_id = updates.creditCardId || null
    if ('statementReferenceMonth' in updates) dbUpdates.statement_reference_month = updates.statementReferenceMonth || null
    if ('installmentGroup' in updates) dbUpdates.installment_group = updates.installmentGroup || null
    if ('installmentNumber' in updates) dbUpdates.installment_number = updates.installmentNumber || null
    if ('totalInstallments' in updates) dbUpdates.total_installments = updates.totalInstallments || null
    if (updates.recurring !== undefined) dbUpdates.recurring = updates.recurring
    if (updates.paid !== undefined) dbUpdates.paid = updates.paid

    const { data, error } = await supabase
      .from('transactions')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return mapTransaction(data)
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  /**
   * Gera transações recorrentes para os próximos meses
   * Para cada transação marcada como recorrente, verifica se já existe
   * uma transação similar no mês seguinte. Se não existir, cria automaticamente.
   */
  async generateRecurringTransactions(userId: string) {
    // Buscar todas as transações recorrentes
    const { data: recurringTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('recurring', true)
      .order('date', { ascending: false })

    if (fetchError) throw fetchError
    if (!recurringTransactions || recurringTransactions.length === 0) return

    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    // Gerar transações para os próximos 3 meses
    const monthsToGenerate = 3
    const createdTransactions: Transaction[] = []

    for (const recurring of recurringTransactions) {
      const originalDate = new Date(recurring.date + 'T00:00:00')
      const dayOfMonth = originalDate.getDate()

      for (let monthOffset = 1; monthOffset <= monthsToGenerate; monthOffset++) {
        const targetDate = new Date(currentYear, currentMonth + monthOffset, dayOfMonth)
        const targetDateStr = targetDate.toISOString().split('T')[0]

        // Verificar se já existe uma transação similar nesse mês
        const { data: existing } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('category', recurring.category)
          .eq('type', recurring.type)
          .eq('date', targetDateStr)
          .maybeSingle()

        // Se não existe, criar
        if (!existing) {
          const { data: created, error: createError } = await supabase
            .from('transactions')
            .insert([{
              user_id: userId,
              date: targetDateStr,
              type: recurring.type,
              category: recurring.category,
              description: recurring.description,
              amount: recurring.amount,
              investment_id: recurring.investment_id,
              payment_method: recurring.payment_method || 'debit',
              credit_card_id: recurring.credit_card_id || null,
              statement_reference_month: recurring.statement_reference_month || null,
              recurring: true,
              paid: false
            }])
            .select()
            .single()

          if (createError) {
            console.error('Error creating recurring transaction:', createError)
            continue
          }

          if (created) {
            createdTransactions.push(mapTransaction(created))
          }
        }
      }
    }

    return createdTransactions
  },

  /**
   * Cancela recorrências futuras de uma transação sem afetar as passadas
   * Remove o flag 'recurring' e deleta todas as transações futuras não pagas
   * da mesma categoria e tipo
   */
  async cancelFutureRecurring(transactionId: string, userId: string) {
    // Buscar a transação original
    const { data: originalTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single()

    if (fetchError) throw fetchError
    if (!originalTransaction) throw new Error('Transaction not found')

    const today = new Date().toISOString().split('T')[0]

    // 1. Remover flag recurring da transação original e de todas as passadas/presentes
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ recurring: false })
      .eq('user_id', userId)
      .eq('category', originalTransaction.category)
      .eq('type', originalTransaction.type)
      .lte('date', today)

    if (updateError) throw updateError

    // 2. Deletar todas as transações futuras não pagas da mesma categoria/tipo
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .eq('category', originalTransaction.category)
      .eq('type', originalTransaction.type)
      .eq('paid', false)
      .gt('date', today)

    if (deleteError) throw deleteError

    return { success: true }
  }
}
