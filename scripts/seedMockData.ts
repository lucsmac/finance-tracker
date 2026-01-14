/**
 * Seed Script - Populate Supabase with mock data
 *
 * Run this script AFTER creating your first user account.
 *
 * Usage:
 * 1. Create account in the app (signup)
 * 2. Get your user ID from Supabase Dashboard: Authentication > Users
 * 3. Update USER_ID constant below
 * 4. Run: npx tsx scripts/seedMockData.ts
 */

import { createClient } from '@supabase/supabase-js'

// Mock data is now defined locally in this script since it was removed from mockData.ts
const mockConfig = {
  initialBalance: 2500,
  monthStartDay: 5,
  mainIncomeDay: 5,
  mainIncomeAmount: 3000,
}

const mockEstimates = [
  { id: '1', category: 'Mercado', monthlyAmount: 800, active: true, icon: '🛒', color: '#76C893' },
  { id: '2', category: 'Transporte', monthlyAmount: 300, active: true, icon: '🚗', color: '#9B97CE' },
  { id: '3', category: 'Farmácia', monthlyAmount: 150, active: true, icon: '💊', color: '#D97B7B' },
  { id: '4', category: 'Comidinhas/Saídas', monthlyAmount: 450, active: true, icon: '🍕', color: '#FFA500' },
  { id: '5', category: 'Lazer', monthlyAmount: 200, active: false, icon: '🎮', color: '#4ECDC4' },
  { id: '6', category: 'Outros', monthlyAmount: 100, active: true, icon: '📦', color: '#95A5A6' },
]

const mockTransactions = [
  // Income
  { id: '1', date: '2026-01-05', type: 'income' as const, category: 'Salário', description: 'Salário Janeiro', amount: 3000, recurring: true, paid: true },
  { id: '2', date: '2026-02-05', type: 'income' as const, category: 'Salário', description: 'Salário Fevereiro', amount: 3000, recurring: true, paid: false },

  // Fixed expenses
  { id: '3', date: '2026-01-10', type: 'expense_fixed' as const, category: 'Moradia', description: 'Aluguel', amount: 1200, recurring: true, paid: true },
  { id: '4', date: '2026-01-15', type: 'expense_fixed' as const, category: 'Utilidades', description: 'Conta de Luz', amount: 150, recurring: true, paid: false },
  { id: '5', date: '2026-01-20', type: 'expense_fixed' as const, category: 'Utilidades', description: 'Internet', amount: 100, recurring: true, paid: false },

  // Variable expenses
  { id: '6', date: '2026-01-06', type: 'expense_variable' as const, category: 'Mercado', description: 'Supermercado Extra', amount: 180, paid: true },
  { id: '7', date: '2026-01-07', type: 'expense_variable' as const, category: 'Transporte', description: 'Uber', amount: 25, paid: true },
  { id: '8', date: '2026-01-08', type: 'expense_variable' as const, category: 'Comidinhas/Saídas', description: 'Restaurante', amount: 85, paid: true },
  { id: '9', date: '2026-01-09', type: 'expense_variable' as const, category: 'Farmácia', description: 'Farmácia São João', amount: 45, paid: true },
  { id: '10', date: '2026-01-10', type: 'expense_variable' as const, category: 'Mercado', description: 'Padaria', amount: 30, paid: true },

  // Installments
  { id: '11', date: '2026-01-15', type: 'installment' as const, category: 'Eletrônicos', description: 'Notebook Dell', amount: 200, installmentGroup: 'notebook-2025-12', installmentNumber: 2, totalInstallments: 10, paid: false },
  { id: '12', date: '2026-02-15', type: 'installment' as const, category: 'Eletrônicos', description: 'Notebook Dell', amount: 200, installmentGroup: 'notebook-2025-12', installmentNumber: 3, totalInstallments: 10, paid: false },

  // Investments
  { id: '13', date: '2026-01-05', type: 'investment' as const, category: 'Tesouro Direto', description: 'Aplicação Tesouro Selic', amount: 500, paid: true },
  { id: '14', date: '2026-01-05', type: 'investment' as const, category: 'CDB', description: 'CDB Nubank', amount: 300, paid: true },
  { id: '15', date: '2026-01-10', type: 'investment' as const, category: 'Ações', description: 'PETR4', amount: 200, paid: true },
  { id: '16', date: '2026-01-12', type: 'investment' as const, category: 'Fundos', description: 'Fundo Imobiliário HGLG11', amount: 150, paid: true },
]

const mockInvestments = [
  { id: '1', category: 'Tesouro Direto', amount: 8500, lastUpdate: '2026-01-08' },
  { id: '2', category: 'CDB', amount: 12300, lastUpdate: '2026-01-08' },
  { id: '3', category: 'Ações', amount: 5600, lastUpdate: '2026-01-08' },
  { id: '4', category: 'Fundos Imobiliários', amount: 3200, lastUpdate: '2026-01-08' },
]

const mockGoals = [
  {
    id: '1',
    name: 'Economizar R$ 2.000 este mês',
    type: 'savings' as const,
    targetAmount: 2000,
    currentAmount: 800,
    deadline: '2026-01-31',
    period: 'month' as const,
  },
  {
    id: '2',
    name: 'Investir R$ 500 por mês',
    type: 'savings_rate' as const,
    targetAmount: 500,
    currentAmount: 500,
    deadline: '2026-01-31',
    period: 'month' as const,
  },
  {
    id: '3',
    name: 'Reduzir gastos com Mercado em 20%',
    type: 'category_reduction' as const,
    targetAmount: 640,
    currentAmount: 210,
    deadline: '2026-01-31',
    period: 'month' as const,
    category: 'Mercado',
  },
]

// IMPORTANT: Update this with your actual user ID after signup
const USER_ID = '743d0e3a-8f59-44f4-b99a-f02f2bf6600f' // Get from Supabase Dashboard > Authentication > Users

const supabaseUrl = 'https://urprwefnujrdrqwkafan.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVycHJ3ZWZudWpyZHJxd2thZmFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MDQ5MSwiZXhwIjoyMDgzNzM2NDkxfQ.qeWA9gQdpse9W7Q2oiv7rtVQIcMN8aZTRRLqMksXJWw' // Get from Supabase Dashboard > Settings > API > service_role key

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedData() {
  console.log('🌱 Starting seed process...\n')

  try {
    // 0. Get user email from auth
    console.log('👤 Getting user info from auth...')
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(USER_ID)

    if (authError || !authUser.user) {
      console.error('❌ Error getting user from auth:', authError)
      throw new Error('User not found in auth. Make sure you created an account first.')
    }
    console.log(`✅ Found user: ${authUser.user.email}\n`)

    // 0.1. Insert user into public.users table (if not exists)
    console.log('👤 Inserting user into public.users...')
    const { error: userError } = await supabase.from('users').upsert({
      id: USER_ID,
      email: authUser.user.email
    }, {
      onConflict: 'id'
    })

    if (userError) {
      console.error('❌ Error inserting user:', userError)
      throw userError
    }
    console.log('✅ User inserted\n')

    // 1. Insert user config
    console.log('📝 Inserting user config...')
    const { error: configError } = await supabase.from('user_configs').insert({
      user_id: USER_ID,
      initial_balance: mockConfig.initialBalance,
      month_start_day: mockConfig.monthStartDay,
      main_income_day: mockConfig.mainIncomeDay,
      main_income_amount: mockConfig.mainIncomeAmount
    })

    if (configError) {
      console.error('❌ Error inserting config:', configError)
      throw configError
    }
    console.log('✅ Config inserted\n')

    // 2. Insert estimates
    console.log('📊 Inserting estimates...')
    const estimatesData = mockEstimates.map(e => ({
      user_id: USER_ID,
      category: e.category,
      monthly_amount: e.monthlyAmount,
      active: e.active,
      icon: e.icon,
      color: e.color
    }))

    const { error: estimatesError } = await supabase.from('estimates').insert(estimatesData)

    if (estimatesError) {
      console.error('❌ Error inserting estimates:', estimatesError)
      throw estimatesError
    }
    console.log(`✅ ${estimatesData.length} estimates inserted\n`)

    // 3. Insert transactions
    console.log('💸 Inserting transactions...')
    const transactionsData = mockTransactions.map(t => ({
      user_id: USER_ID,
      date: t.date,
      type: t.type,
      category: t.category,
      description: t.description,
      amount: t.amount,
      installment_group: t.installmentGroup,
      installment_number: t.installmentNumber,
      total_installments: t.totalInstallments,
      recurring: t.recurring || false,
      paid: t.paid || false
    }))

    const { error: transactionsError } = await supabase.from('transactions').insert(transactionsData)

    if (transactionsError) {
      console.error('❌ Error inserting transactions:', transactionsError)
      throw transactionsError
    }
    console.log(`✅ ${transactionsData.length} transactions inserted\n`)

    // 4. Insert investments
    console.log('📈 Inserting investments...')
    const investmentsData = mockInvestments.map(i => ({
      user_id: USER_ID,
      category: i.category,
      amount: i.amount,
      last_update: i.lastUpdate
    }))

    const { error: investmentsError } = await supabase.from('investments').insert(investmentsData)

    if (investmentsError) {
      console.error('❌ Error inserting investments:', investmentsError)
      throw investmentsError
    }
    console.log(`✅ ${investmentsData.length} investments inserted\n`)

    // 5. Insert goals
    console.log('🎯 Inserting goals...')
    const goalsData = mockGoals.map(g => ({
      user_id: USER_ID,
      name: g.name,
      type: g.type,
      target_amount: g.targetAmount,
      current_amount: g.currentAmount,
      deadline: g.deadline
    }))

    const { error: goalsError } = await supabase.from('goals').insert(goalsData)

    if (goalsError) {
      console.error('❌ Error inserting goals:', goalsError)
      throw goalsError
    }
    console.log(`✅ ${goalsData.length} goals inserted\n`)

    console.log('🎉 Seed completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`   - 1 user config`)
    console.log(`   - ${estimatesData.length} estimates`)
    console.log(`   - ${transactionsData.length} transactions`)
    console.log(`   - ${investmentsData.length} investments`)
    console.log(`   - ${goalsData.length} goals`)

  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  }
}

// Run seed
if (USER_ID === 'YOUR_USER_ID_HERE') {
  console.error('❌ Error: Please update USER_ID in scripts/seedMockData.ts')
  console.log('\n📝 Steps:')
  console.log('   1. Create account in the app (signup)')
  console.log('   2. Get your user ID from: https://supabase.com/dashboard/project/urprwefnujrdrqwkafan/auth/users')
  console.log('   3. Update USER_ID constant in this script')
  console.log('   4. Get service_role key from: https://supabase.com/dashboard/project/urprwefnujrdrqwkafan/settings/api')
  console.log('   5. Update supabaseServiceKey constant in this script')
  console.log('   6. Run: npx tsx scripts/seedMockData.ts\n')
  process.exit(1)
}

if (supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('❌ Error: Please update supabaseServiceKey in scripts/seedMockData.ts')
  console.log('\n📝 Get it from: https://supabase.com/dashboard/project/urprwefnujrdrqwkafan/settings/api')
  console.log('   Look for "service_role" key (starts with "eyJ...")\n')
  process.exit(1)
}

seedData()
