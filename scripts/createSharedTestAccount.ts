import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@automoney.test'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'AutomoneyDemo2026!'

const demoConfig = {
  initialBalance: 2500,
  monthStartDay: 1,
  mainIncomeDay: 5,
  mainIncomeAmount: 6200,
  dailyStandard: 100,
  balanceStartDate: '2026-04-01',
}

const demoEstimates = [
  { category: 'Mercado', monthly_amount: 1200, active: true, icon: '🛒', color: '#76C893' },
  { category: 'Transporte', monthly_amount: 500, active: true, icon: '🚗', color: '#9B97CE' },
  { category: 'Lazer', monthly_amount: 600, active: true, icon: '🎉', color: '#F4A261' },
  { category: 'Saude', monthly_amount: 300, active: true, icon: '💊', color: '#D97B7B' },
  { category: 'Extras', monthly_amount: 400, active: true, icon: '📦', color: '#95A5A6' },
]

const demoTransactions = [
  { date: '2026-04-03', type: 'expense_variable', category: 'Mercado', description: 'Compra da semana', amount: 210, paid: true },
  { date: '2026-04-05', type: 'income', category: 'Salario', description: 'Salario principal', amount: 6200, recurring: true, paid: true },
  { date: '2026-04-06', type: 'expense_variable', category: 'Restaurante', description: 'Almoco com cliente', amount: 42, paid: true },
  { date: '2026-04-08', type: 'expense_fixed', category: 'Moradia', description: 'Aluguel', amount: 1800, recurring: true, paid: true },
  { date: '2026-04-10', type: 'expense_fixed', category: 'Utilidades', description: 'Internet fibra', amount: 120, recurring: true, paid: true },
  { date: '2026-04-11', type: 'expense_variable', category: 'Transporte', description: 'Gasolina', amount: 180, paid: true },
  { date: '2026-04-12', type: 'expense_fixed', category: 'Saude', description: 'Academia', amount: 99, recurring: true, paid: true },
  { date: '2026-04-15', type: 'installment', category: 'Eletronicos', description: 'Notebook trabalho', amount: 289, installment_group: 'demo-notebook', installment_number: 4, total_installments: 10, paid: false },
  { date: '2026-04-18', type: 'income', category: 'Freelance', description: 'Projeto avulso', amount: 850, paid: true },
  { date: '2026-04-20', type: 'investment', category: 'Tesouro Selic', description: 'Aporte mensal', amount: 500, paid: true },
  { date: '2026-05-05', type: 'income', category: 'Salario', description: 'Salario principal', amount: 6200, recurring: true, paid: false },
  { date: '2026-05-08', type: 'expense_fixed', category: 'Moradia', description: 'Aluguel', amount: 1800, recurring: true, paid: false },
] as const

const demoDailyPlans = [
  { date: '2026-04-12', planned_amount: 160 },
  { date: '2026-04-18', planned_amount: 40 },
]

const demoDailyExpenses = [
  { date: '2026-04-02', title: 'Padaria', category: 'Mercado', amount: 18 },
  { date: '2026-04-09', title: 'Farmacia', category: 'Saude', amount: 57 },
  { date: '2026-04-18', title: 'Cinema', category: 'Lazer', amount: 64 },
]

const demoInvestments = [
  { category: 'Tesouro Selic', amount: 4500, last_update: '2026-04-20' },
  { category: 'Reserva CDI', amount: 3100, last_update: '2026-04-20' },
]

const demoGoals = [
  {
    name: 'Reserva de emergencia',
    type: 'savings',
    target_amount: 10000,
    current_amount: 4200,
    deadline: '2026-12-31',
    period: 'year',
  },
  {
    name: 'Investir R$ 1.000 no mes',
    type: 'savings_rate',
    target_amount: 1000,
    current_amount: 500,
    deadline: '2026-04-30',
    period: 'month',
  },
]

const readEnvFile = (filePath: string) => {
  if (!existsSync(filePath)) return {}

  return readFileSync(filePath, 'utf8')
    .split('\n')
    .reduce<Record<string, string>>((acc, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return acc

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) return acc

      const key = trimmed.slice(0, separatorIndex).trim()
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
      acc[key] = value
      return acc
    }, {})
}

const readSupabaseCredentials = () => {
  const envLocal = readEnvFile(join(process.cwd(), '.env.local'))
  const env = { ...envLocal, ...process.env }

  const envUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const envServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (envUrl && envServiceRoleKey) {
    return { url: envUrl, serviceRoleKey: envServiceRoleKey }
  }

  const fallbackSource = readFileSync(join(process.cwd(), 'scripts', 'seedMockData.ts'), 'utf8')
  const urlMatch = fallbackSource.match(/const supabaseUrl = '([^']+)'/)
  const keyMatch = fallbackSource.match(/const supabaseServiceKey = '([^']+)'/)

  if (!urlMatch?.[1] || !keyMatch?.[1]) {
    throw new Error('Nao foi possivel encontrar as credenciais administrativas do Supabase.')
  }

  return {
    url: urlMatch[1],
    serviceRoleKey: keyMatch[1],
  }
}

async function ensureDemoUser() {
  const { url, serviceRoleKey } = readSupabaseCredentials()
  const supabase = createClient(url, serviceRoleKey)

  const { data: listedUsers, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) throw listError

  const existingUser = listedUsers.users.find((user) => user.email?.toLowerCase() === DEMO_EMAIL.toLowerCase())

  const authUser = existingUser
    ? (await supabase.auth.admin.updateUserById(existingUser.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: 'Conta Demo AutoMoney' },
      })).data.user
    : (await supabase.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: 'Conta Demo AutoMoney' },
      })).data.user

  if (!authUser) {
    throw new Error('Nao foi possivel criar ou atualizar a conta demo.')
  }

  const userId = authUser.id

  const { error: publicUserError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email: DEMO_EMAIL,
    }, {
      onConflict: 'id',
    })

  if (publicUserError) throw publicUserError

  const tablesToReset = [
    'daily_expenses',
    'daily_plans',
    'goals',
    'investments',
    'transactions',
    'estimates',
  ]

  for (const table of tablesToReset) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId)
    if (error) throw error
  }

  const { error: configError } = await supabase
    .from('user_configs')
    .upsert({
      user_id: userId,
      initial_balance: demoConfig.initialBalance,
      month_start_day: demoConfig.monthStartDay,
      main_income_day: demoConfig.mainIncomeDay,
      main_income_amount: demoConfig.mainIncomeAmount,
      daily_standard: demoConfig.dailyStandard,
      balance_start_date: demoConfig.balanceStartDate,
    }, {
      onConflict: 'user_id',
    })

  if (configError) throw configError

  const { error: estimatesError } = await supabase
    .from('estimates')
    .insert(demoEstimates.map((estimate) => ({ ...estimate, user_id: userId })))

  if (estimatesError) throw estimatesError

  const { error: transactionsError } = await supabase
    .from('transactions')
    .insert(demoTransactions.map((transaction) => ({ ...transaction, user_id: userId })))

  if (transactionsError) throw transactionsError

  const { error: dailyPlansError } = await supabase
    .from('daily_plans')
    .insert(demoDailyPlans.map((plan) => ({ ...plan, user_id: userId })))

  if (dailyPlansError) throw dailyPlansError

  const { error: dailyExpensesError } = await supabase
    .from('daily_expenses')
    .insert(demoDailyExpenses.map((expense) => ({ ...expense, user_id: userId })))

  if (dailyExpensesError) throw dailyExpensesError

  const { error: investmentsError } = await supabase
    .from('investments')
    .insert(demoInvestments.map((investment) => ({ ...investment, user_id: userId })))

  if (investmentsError) throw investmentsError

  const { error: goalsError } = await supabase
    .from('goals')
    .insert(demoGoals.map((goal) => ({ ...goal, user_id: userId })))

  if (goalsError) throw goalsError

  console.log('Conta demo pronta.')
  console.log(`Email: ${DEMO_EMAIL}`)
  console.log(`Senha: ${DEMO_PASSWORD}`)
  console.log(`User ID: ${userId}`)
}

ensureDemoUser().catch((error) => {
  console.error('Falha ao provisionar a conta demo:', error)
  process.exit(1)
})
