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
import { mockEstimates, mockTransactions, mockInvestments, mockGoals, mockConfig } from '../src/app/data/mockData'

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
