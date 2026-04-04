import { type Estimate, type Goal, type Investment, type Transaction } from '@/app/data/mockData'
import type { CreditCard, CreditCardPayment, CreditCardStatement } from '@/lib/api/creditCards'
import type { DailyExpense } from '@/lib/api/dailyExpenses'
import { calculateAvailableBalanceUntilDate } from '@/lib/domain/availableBalance'
import type { UserConfig } from '@/lib/api/config'
import { createDateFromString, formatDateLocal } from '@/lib/utils/dateHelpers'

type FinancialLevelKey = 'setup' | 'organizing' | 'stabilizing' | 'protected' | 'accumulating' | 'investor'
type JourneyType = 'setup' | 'stabilize' | 'reduce_credit' | 'emergency_fund' | 'first_10k'
type MissionAction =
  | 'none'
  | 'open_reserve_calculator'
  | 'create_budget_goal'
  | 'create_first_10k_goal'
  | 'create_debt_goal'
  | 'open_cards'
type MissionTone = 'neutral' | 'accent' | 'warning' | 'danger' | 'success'
type FinancialPillarKey = 'cash' | 'credit' | 'assets'
type FinancialPillarStatus = 'healthy' | 'warning' | 'danger'

interface FinancialHealthInput {
  cards: CreditCard[]
  cardPayments: CreditCardPayment[]
  cardStatements: CreditCardStatement[]
  config: UserConfig | null
  dailyExpenses: DailyExpense[]
  estimates: Estimate[]
  goals: Goal[]
  getPlannedAmountForDate?: (date: string) => number | null | undefined
  investments: Investment[]
  transactions: Transaction[]
  today: string
}

export interface EmergencyFundCalculation {
  monthlyEssentialCost: number
  multiplier: number
  idealReserve: number
  currentReserve: number
  coveredMonths: number
  shortfall: number
  suggestions: Array<{
    months: number
    monthlyAmount: number
  }>
}

export interface EssentialCostBreakdownItem {
  id: string
  label: string
  amount: number
  reason: string
  included: boolean
}

export interface FinancialHealthSummary {
  level: number
  levelKey: FinancialLevelKey
  levelLabel: string
  title: string
  description: string
  focusLabel: string
  confidence: 'low' | 'medium' | 'high'
  setupProgress: number
  progressToNextLevel: number
  nextMilestoneLabel: string
  recommendedActionLabel: string
  priorityJourney: JourneyType
  reasons: string[]
  overdueCount: number
  overdueAmount: number
  recentOverrunDays: number
  trackedBudgetDays: number
  currentReserve: number
  reserveCoverageMonths: number
  reserveTargetAmount: number
  monthlyEssentialCost: number
  investmentTotal: number
  currentBalance: number
  projectedMonthEndBalance: number
  projectedMonthEndDate: string
  monthEndsPositive: boolean
  cardsCount: number
  creditTotalLimit: number
  creditUnlockedLimit: number
  creditUsedLimit: number
  creditAvailableLimit: number
  creditUtilizationRate: number
  openCardStatementsAmount: number
  overdueCardStatementsCount: number
  overdueCardStatementsAmount: number
  monthlyVariableBudget: number
  currentMonthVariableSpent: number
  activeGoalsCount: number
  matchedRuleTitle: string
  matchedRuleDescription: string
  historicalDataMonths: number
  recommendedHistoryMonths: number
  historyCoverageProgress: number
  historyCoverageMessage: string
  historyCoverageTone: 'low' | 'medium' | 'high'
  essentialCostIncludedBreakdown: EssentialCostBreakdownItem[]
  essentialCostExcludedBreakdown: EssentialCostBreakdownItem[]
  criteria: Array<{
    id: string
    label: string
    detail: string
    met: boolean
  }>
  pillars: Array<{
    id: FinancialPillarKey
    label: string
    title: string
    detail: string
    metricLabel: string
    progress: number
    status: FinancialPillarStatus
  }>
}

export interface GuidedMission {
  id: string
  title: string
  description: string
  whyItMatters: string
  metricLabel: string
  progress: number
  action: MissionAction
  actionLabel: string
  tone: MissionTone
}

const essentialCategoryKeywords = [
  'aluguel',
  'moradia',
  'condominio',
  'condominio',
  'agua',
  'luz',
  'energia',
  'gas',
  'internet',
  'telefone',
  'celular',
  'mercado',
  'supermercado',
  'alimentacao',
  'alimentacao',
  'transporte',
  'combustivel',
  'farmacia',
  'saude',
  'plano de saude',
  'educacao',
  'escola',
  'creche',
  'seguro',
]

const reserveKeywords = [
  'reserva',
  'emergencia',
  'caixinha',
  'liquidez',
  'selic',
  'cdi',
]

const debtKeywords = [
  'cartao',
  'fatura',
  'rotativo',
  'divida',
  'emprestimo',
]

const mandatoryTypes = new Set<Transaction['type']>(['expense_fixed', 'installment'])

const normalizeText = (value: string | null | undefined) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const hasKeyword = (value: string | null | undefined, keywords: string[]) => {
  const normalized = normalizeText(value)
  return keywords.some((keyword) => normalized.includes(keyword))
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const roundCurrency = (value: number) => Math.round(value * 100) / 100

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const addDays = (dateStr: string, days: number) => {
  const date = createDateFromString(dateStr)
  date.setDate(date.getDate() + days)
  return formatDateLocal(date.getFullYear(), date.getMonth(), date.getDate())
}

const getMonthEndDate = (dateStr: string) => {
  const date = createDateFromString(dateStr)
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return formatDateLocal(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate())
}

const formatIsoDateForDisplay = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'data indisponível'

  const [year, month, day] = dateStr.split('-')

  if (!year || !month || !day) return 'data indisponível'

  return `${day}/${month}/${year}`
}

const sumAmounts = <T>(items: T[], selector: (item: T) => number) =>
  roundCurrency(items.reduce((total, item) => total + selector(item), 0))

const average = (values: number[]) => {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

const addBreakdownItem = (
  items: EssentialCostBreakdownItem[],
  {
    label,
    amount,
    reason,
    included,
  }: Omit<EssentialCostBreakdownItem, 'id'>,
) => {
  if (amount <= 0) return

  const key = normalizeText(label)
  const existingItem = items.find((item) => normalizeText(item.label) === key && item.included === included)

  if (existingItem) {
    existingItem.amount = roundCurrency(existingItem.amount + amount)

    if (!existingItem.reason.includes(reason)) {
      existingItem.reason = `${existingItem.reason} • ${reason}`
    }

    return
  }

  items.push({
    id: `${included ? 'in' : 'out'}-${key || items.length}`,
    label,
    amount: roundCurrency(amount),
    reason,
    included,
  })
}

const sortBreakdown = (items: EssentialCostBreakdownItem[]) =>
  [...items].sort((left, right) => right.amount - left.amount || left.label.localeCompare(right.label))

const getReferenceMandatoryTransactions = (transactions: Transaction[], today: string) => {
  const currentMonthKey = today.slice(0, 7)
  const last30Days = addDays(today, -30)
  const next30Days = addDays(today, 30)
  const mandatoryTransactions = transactions.filter((transaction) => mandatoryTypes.has(transaction.type))

  const currentMonthTransactions = mandatoryTransactions.filter((transaction) => transaction.date.startsWith(currentMonthKey))
  if (currentMonthTransactions.length > 0) {
    return {
      transactions: currentMonthTransactions,
      label: 'compromisso obrigatório do mês atual',
    }
  }

  const rollingFutureTransactions = mandatoryTransactions.filter(
    (transaction) => transaction.date >= today && transaction.date <= next30Days,
  )
  if (rollingFutureTransactions.length > 0) {
    return {
      transactions: rollingFutureTransactions,
      label: 'compromisso obrigatório dos próximos 30 dias',
    }
  }

  const rollingHistoricalTransactions = mandatoryTransactions.filter(
    (transaction) => transaction.paid && transaction.date >= last30Days && transaction.date <= today,
  )
  if (rollingHistoricalTransactions.length > 0) {
    return {
      transactions: rollingHistoricalTransactions,
      label: 'compromisso obrigatório dos últimos 30 dias',
    }
  }

  return {
    transactions: [] as Transaction[],
    label: 'compromisso obrigatório',
  }
}

const buildEssentialCostProfile = (
  estimates: Estimate[],
  transactions: Transaction[],
  config: UserConfig | null,
  today: string,
) => {
  const activeEstimates = estimates.filter((estimate) => estimate.active)
  const includedBreakdown: EssentialCostBreakdownItem[] = []
  const excludedBreakdown: EssentialCostBreakdownItem[] = []
  const referenceMandatory = getReferenceMandatoryTransactions(transactions, today)
  const mandatoryMonthlyCost = sumAmounts(referenceMandatory.transactions, (transaction) => transaction.amount)

  referenceMandatory.transactions.forEach((transaction) => {
    addBreakdownItem(includedBreakdown, {
      label: transaction.category,
      amount: transaction.amount,
      reason: referenceMandatory.label,
      included: true,
    })
  })

  const essentialEstimates = activeEstimates.filter((estimate) => hasKeyword(estimate.category, essentialCategoryKeywords))
  const nonEssentialEstimates = activeEstimates.filter((estimate) => !hasKeyword(estimate.category, essentialCategoryKeywords))
  const essentialEstimateTotal = sumAmounts(essentialEstimates, (estimate) => estimate.monthlyAmount)
  const fallbackEstimateTotal = essentialEstimateTotal > 0
    ? essentialEstimateTotal
    : roundCurrency(sumAmounts(activeEstimates, (estimate) => estimate.monthlyAmount) * 0.6)

  if (essentialEstimates.length > 0) {
    essentialEstimates.forEach((estimate) => {
      addBreakdownItem(includedBreakdown, {
        label: estimate.category,
        amount: estimate.monthlyAmount,
        reason: 'estimativa reconhecida como essencial',
        included: true,
      })
    })
  } else if (fallbackEstimateTotal > 0) {
    addBreakdownItem(includedBreakdown, {
      label: 'Variáveis essenciais estimadas',
      amount: fallbackEstimateTotal,
      reason: 'fallback de 60% das estimativas ativas enquanto faltam categorias essenciais mais claras',
      included: true,
    })
  }

  nonEssentialEstimates.forEach((estimate) => {
    addBreakdownItem(excludedBreakdown, {
      label: estimate.category,
      amount: estimate.monthlyAmount,
      reason: 'estimativa ativa que ficou fora do custo essencial',
      included: false,
    })
  })

  const dailyBudgetFloor = roundCurrency((config?.dailyStandard || 0) * 30 * 0.45)
  const baseTotal = roundCurrency(mandatoryMonthlyCost + fallbackEstimateTotal)
  let monthlyEssentialCost = roundCurrency(Math.max(baseTotal, mandatoryMonthlyCost, dailyBudgetFloor))

  if (monthlyEssentialCost > baseTotal) {
    addBreakdownItem(includedBreakdown, {
      label: 'Ajuste pelo gasto diário planejado',
      amount: monthlyEssentialCost - baseTotal,
      reason: 'piso para cobrir variáveis essenciais baseado no gasto diário configurado',
      included: true,
    })
  }

  return {
    monthlyEssentialCost,
    includedBreakdown: sortBreakdown(includedBreakdown),
    excludedBreakdown: sortBreakdown(excludedBreakdown),
  }
}

const estimateReserveCurrent = (goals: Goal[], investments: Investment[]) => {
  const reserveGoalAmount = sumAmounts(
    goals.filter(
      (goal) => hasKeyword(goal.name, reserveKeywords) || hasKeyword(goal.category, reserveKeywords),
    ),
    (goal) => goal.currentAmount,
  )

  const reserveInvestmentsAmount = sumAmounts(
    investments.filter((investment) => investment.countsAsReserve === true),
    (investment) => investment.amount,
  )
  const reserveLikeInvestmentsAmount = sumAmounts(
    investments.filter((investment) => hasKeyword(investment.category, reserveKeywords)),
    (investment) => investment.amount,
  )

  if (reserveGoalAmount > 0 && reserveInvestmentsAmount > 0) {
    return roundCurrency(Math.max(reserveGoalAmount, reserveInvestmentsAmount))
  }

  if (reserveGoalAmount > 0) return reserveGoalAmount
  if (reserveInvestmentsAmount > 0) return reserveInvestmentsAmount
  if (reserveLikeInvestmentsAmount > 0) return reserveLikeInvestmentsAmount

  return 0
}

const getCreditHealthSnapshot = (
  cards: CreditCard[],
  statements: CreditCardStatement[],
  payments: CreditCardPayment[],
  today: string,
) => {
  const paidByStatement = new Map<string, number>()

  payments.forEach((payment) => {
    paidByStatement.set(
      payment.statementId,
      (paidByStatement.get(payment.statementId) || 0) + payment.amount,
    )
  })

  const statementSummaries = statements.map((statement) => {
    const paidAmount = paidByStatement.get(statement.id) || 0
    const remainingAmount = roundCurrency(Math.max(statement.totalAmount - paidAmount, 0))

    return {
      statement,
      paidAmount,
      remainingAmount,
      overdue: remainingAmount > 0 && statement.dueDate < today,
    }
  })

  const totalLimit = sumAmounts(cards, (card) => card.totalLimit)
  const totalBlockedLimit = sumAmounts(cards, (card) => card.blockedLimit)
  const totalUnlockedLimit = roundCurrency(Math.max(totalLimit - totalBlockedLimit, 0))
  const totalUsedLimit = sumAmounts(cards, (card) => card.usedLimit)
  const totalFreeLimit = roundCurrency(Math.max(totalUnlockedLimit - totalUsedLimit, 0))
  const openStatementsAmount = sumAmounts(
    statementSummaries.filter((summary) => summary.remainingAmount > 0),
    (summary) => summary.remainingAmount,
  )
  const overdueStatements = statementSummaries.filter((summary) => summary.overdue)
  const overdueStatementsAmount = sumAmounts(overdueStatements, (summary) => summary.remainingAmount)
  const utilizationRate =
    totalUnlockedLimit > 0
      ? clamp(totalUsedLimit / totalUnlockedLimit, 0, 1)
      : totalUsedLimit > 0
        ? 1
        : 0

  return {
    cardsCount: cards.length,
    totalLimit,
    totalUnlockedLimit,
    totalUsedLimit,
    totalFreeLimit,
    openStatementsAmount,
    overdueStatementsCount: overdueStatements.length,
    overdueStatementsAmount,
    utilizationRate,
  }
}

const inferConfidence = ({
  config,
  estimates,
  transactions,
  reserveCurrent,
  investmentTotal,
}: {
  config: UserConfig | null
  estimates: Estimate[]
  transactions: Transaction[]
  reserveCurrent: number
  investmentTotal: number
}) => {
  let score = 0

  if (config?.dailyStandard && config.dailyStandard > 0) score += 1
  if (estimates.some((estimate) => estimate.active) || transactions.some((transaction) => mandatoryTypes.has(transaction.type))) score += 1
  if (transactions.some((transaction) => transaction.type === 'income')) score += 1
  if (reserveCurrent > 0 || investmentTotal > 0) score += 1

  if (score >= 4) return 'high'
  if (score >= 2) return 'medium'
  return 'low'
}

const getHistoricalDataMonths = (transactions: Transaction[], today: string) => {
  const monthKeys = new Set(
    transactions
      .filter((transaction) => transaction.date <= today)
      .map((transaction) => transaction.date.slice(0, 7)),
  )

  return monthKeys.size
}

const getBudgetWindowStats = (transactions: Transaction[], dailyStandard: number, today: string) => {
  if (dailyStandard <= 0) {
    return {
      overrunDays: 0,
      trackedDays: 0,
      underControlDays: 0,
    }
  }

  const startDate = addDays(today, -13)
  const dailyVariableTotals = new Map<string, number>()

  transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense_variable' &&
        transaction.paid &&
        transaction.date >= startDate &&
        transaction.date <= today,
    )
    .forEach((transaction) => {
      dailyVariableTotals.set(
        transaction.date,
        (dailyVariableTotals.get(transaction.date) || 0) + transaction.amount,
      )
    })

  const totals = Array.from(dailyVariableTotals.values())

  return {
    overrunDays: totals.filter((amount) => amount > dailyStandard).length,
    trackedDays: totals.length,
    underControlDays: totals.filter((amount) => amount <= dailyStandard).length,
  }
}

const getLevelMeta = (levelKey: FinancialLevelKey) => {
  switch (levelKey) {
    case 'setup':
      return {
        level: 0,
        levelLabel: 'Nivel 0',
        title: 'Sem base suficiente',
        description: 'Ainda faltam alguns sinais minimos para o app sugerir prioridades com mais confianca.',
        focusLabel: 'Completar a base do mes e ganhar previsibilidade.',
        recommendedActionLabel: 'Organizar a base',
      }
    case 'organizing':
      return {
        level: 1,
        levelLabel: 'Nivel 1',
        title: 'Organizando a casa',
        description: 'Ja existe base de dados, mas o foco ainda deve ser reduzir atritos do fluxo mensal.',
        focusLabel: 'Zerar atrasos e reduzir rompimentos do limite diario.',
        recommendedActionLabel: 'Estabilizar o mes',
      }
    case 'stabilizing':
      return {
        level: 2,
        levelLabel: 'Nivel 2',
        title: 'Estabilizando',
        description: 'Voce ja tem alguma previsibilidade. Agora o objetivo e montar o primeiro colchao.',
        focusLabel: 'Chegar ao primeiro mes de reserva de emergencia.',
        recommendedActionLabel: 'Montar reserva',
      }
    case 'protected':
      return {
        level: 3,
        levelLabel: 'Nivel 3',
        title: 'Protegido parcialmente',
        description: 'A reserva ja existe, mas ainda nao cobre o conforto ideal para imprevistos maiores.',
        focusLabel: 'Levar a reserva para um patamar mais robusto.',
        recommendedActionLabel: 'Completar reserva',
      }
    case 'accumulating':
      return {
        level: 4,
        levelLabel: 'Nivel 4',
        title: 'Acumulando patrimonio',
        description: 'A base esta mais forte. O proximo passo e consolidar aportes recorrentes.',
        focusLabel: 'Investir com constancia ate os primeiros 10 mil.',
        recommendedActionLabel: 'Investir os primeiros 10 mil',
      }
    case 'investor':
      return {
        level: 5,
        levelLabel: 'Nivel 5',
        title: 'Investidor em evolucao',
        description: 'A reserva minima esta formada e voce ja entrou em fase de acumulacao mais consistente.',
        focusLabel: 'Manter consistencia e aumentar a qualidade dos aportes.',
        recommendedActionLabel: 'Aprofundar estrategia',
      }
  }
}

export const calculateEmergencyFund = ({
  monthlyEssentialCost,
  currentReserve,
  incomeProfile,
}: {
  monthlyEssentialCost: number
  currentReserve: number
  incomeProfile: 'stable' | 'variable' | 'autonomous'
}): EmergencyFundCalculation => {
  const multiplier = incomeProfile === 'autonomous' ? 12 : incomeProfile === 'variable' ? 9 : 6
  const idealReserve = roundCurrency(monthlyEssentialCost * multiplier)
  const shortfall = roundCurrency(Math.max(idealReserve - currentReserve, 0))
  const coveredMonths = monthlyEssentialCost > 0 ? currentReserve / monthlyEssentialCost : 0

  return {
    monthlyEssentialCost: roundCurrency(monthlyEssentialCost),
    multiplier,
    idealReserve,
    currentReserve: roundCurrency(currentReserve),
    coveredMonths,
    shortfall,
    suggestions: [6, 12, 18].map((months) => ({
      months,
      monthlyAmount: shortfall > 0 ? roundCurrency(shortfall / months) : 0,
    })),
  }
}

export const calculateFinancialHealthSummary = ({
  cards,
  cardPayments,
  cardStatements,
  config,
  dailyExpenses,
  estimates,
  goals,
  getPlannedAmountForDate,
  investments,
  transactions,
  today,
}: FinancialHealthInput): FinancialHealthSummary => {
  const creditSnapshot = getCreditHealthSnapshot(cards, cardStatements, cardPayments, today)
  const {
    cardsCount,
    totalLimit: creditTotalLimit,
    totalUnlockedLimit: creditUnlockedLimit,
    totalUsedLimit: creditUsedLimit,
    totalFreeLimit: creditAvailableLimit,
    openStatementsAmount: openCardStatementsAmount,
    overdueStatementsCount: overdueCardStatementsCount,
    overdueStatementsAmount: overdueCardStatementsAmount,
    utilizationRate: creditUtilizationRate,
  } = creditSnapshot
  const investmentTotal = sumAmounts(investments, (investment) => investment.amount)
  const currentReserve = estimateReserveCurrent(goals, investments)
  const essentialCostProfile = buildEssentialCostProfile(estimates, transactions, config, today)
  const monthlyEssentialCost = essentialCostProfile.monthlyEssentialCost
  const reserveCoverageMonths = monthlyEssentialCost > 0 ? currentReserve / monthlyEssentialCost : 0
  const historicalDataMonths = getHistoricalDataMonths(transactions, today)
  const recommendedHistoryMonths = 6
  const overdueTransactions = transactions.filter(
    (transaction) => mandatoryTypes.has(transaction.type) && !transaction.paid && transaction.date < today,
  )
  const overdueAmount = sumAmounts(overdueTransactions, (transaction) => transaction.amount)
  const currentBalance = calculateAvailableBalanceUntilDate({
    initialBalance: config?.initialBalance || 0,
    transactions,
    dailyExpenses,
    dailyStandard: config?.dailyStandard || 0,
    balanceStartDate: config?.balanceStartDate,
    targetDate: today,
    getPlannedAmountForDate,
  })
  const projectedMonthEndDate = getMonthEndDate(today)
  const projectedMonthEndBalance = calculateAvailableBalanceUntilDate({
    initialBalance: config?.initialBalance || 0,
    transactions,
    dailyExpenses,
    dailyStandard: config?.dailyStandard || 0,
    balanceStartDate: config?.balanceStartDate,
    targetDate: projectedMonthEndDate,
    getPlannedAmountForDate,
  })
  const monthEndsPositive = projectedMonthEndBalance >= 0
  const { overrunDays, trackedDays, underControlDays } = getBudgetWindowStats(
    transactions,
    config?.dailyStandard || 0,
    today,
  )
  const hasCriticalCreditPressure =
    overdueCardStatementsCount > 0 ||
    creditUtilizationRate >= 0.85 ||
    (openCardStatementsAmount > 0 && openCardStatementsAmount > Math.max(currentBalance, 0))
  const hasActiveCreditUse = creditUsedLimit > 0 || openCardStatementsAmount > 0
  const hasCreditDependence =
    hasActiveCreditUse &&
    (
      creditUtilizationRate >= 0.45 ||
      creditUsedLimit >= 1500 ||
      (monthlyEssentialCost > 0 && openCardStatementsAmount >= monthlyEssentialCost * 0.5)
    )
  const shouldPrioritizeCredit = hasCriticalCreditPressure || (reserveCoverageMonths >= 0.5 && hasCreditDependence)

  const recurringIncomeCount = transactions.filter((transaction) => transaction.type === 'income' && transaction.recurring).length
  const setupChecks = [
    Boolean(config),
    (config?.dailyStandard || 0) > 0,
    recurringIncomeCount > 0 || (config?.mainIncomeAmount || 0) > 0,
    estimates.some((estimate) => estimate.active),
    transactions.some((transaction) => mandatoryTypes.has(transaction.type)),
  ]
  const completedSetupSteps = setupChecks.filter(Boolean).length
  const setupProgress = completedSetupSteps / setupChecks.length

  let levelKey: FinancialLevelKey = 'setup'

  if (setupProgress < 0.6) {
    levelKey = 'setup'
  } else if (overdueTransactions.length > 0 || !monthEndsPositive || hasCriticalCreditPressure) {
    levelKey = 'organizing'
  } else if (reserveCoverageMonths < 1) {
    levelKey = 'stabilizing'
  } else if (reserveCoverageMonths < 6) {
    levelKey = 'protected'
  } else if (investmentTotal < 10000) {
    levelKey = 'accumulating'
  } else {
    levelKey = 'investor'
  }

  const reasons: string[] = []

  if (setupProgress < 1) {
    reasons.push(`${completedSetupSteps}/${setupChecks.length} fundamentos configurados`)
  }
  if (overdueTransactions.length > 0) {
    reasons.push(`${overdueTransactions.length} compromisso(s) vencido(s) aguardando quitação`)
  }
  if (!monthEndsPositive) {
    reasons.push(`projeção de fechamento do mês em ${formatCurrency(projectedMonthEndBalance)}`)
  }
  if (overdueCardStatementsCount > 0) {
    reasons.push(`${overdueCardStatementsCount} fatura(s) de cartão vencida(s)`)
  }
  if (hasActiveCreditUse) {
    reasons.push(`${Math.round(creditUtilizationRate * 100)}% do limite desbloqueado do cartão em uso`)
  }
  if (monthlyEssentialCost > 0) {
    reasons.push(`${reserveCoverageMonths.toFixed(1)} mes(es) de reserva cobertos`)
  }

  const currentMonthKey = today.slice(0, 7)
  const monthlyVariableBudget = roundCurrency((config?.dailyStandard || 0) * 30)
  const currentMonthVariableSpent = sumAmounts(
    transactions.filter(
      (transaction) => transaction.type === 'expense_variable' && transaction.paid && transaction.date.startsWith(currentMonthKey),
    ),
    (transaction) => transaction.amount,
  )

  const progressToNextLevel = (() => {
    switch (levelKey) {
      case 'setup':
        return clamp(setupProgress * 100, 0, 100)
      case 'organizing': {
        const overdueProgress = overdueTransactions.length === 0 ? 1 : clamp(1 - overdueTransactions.length / 3, 0, 1)
        const monthEndProgress = monthEndsPositive
          ? 1
          : clamp(1 - Math.abs(projectedMonthEndBalance) / Math.max(monthlyEssentialCost || 1, 1), 0, 1)
        const creditProgress = hasCriticalCreditPressure ? clamp((1 - creditUtilizationRate) * 100, 0, 100) / 100 : 1
        return clamp(average([overdueProgress, monthEndProgress, creditProgress]) * 100, 0, 100)
      }
      case 'stabilizing':
        return clamp(reserveCoverageMonths * 100, 0, 100)
      case 'protected':
        return clamp(((reserveCoverageMonths - 1) / 5) * 100, 0, 100)
      case 'accumulating':
        return clamp((investmentTotal / 10000) * 100, 0, 100)
      case 'investor':
        return 100
    }
  })()

  const nextMilestoneLabel = (() => {
    switch (levelKey) {
      case 'setup':
        return 'Completar a base para o app recomendar um plano melhor'
      case 'organizing':
        if (overdueTransactions.length > 0 || overdueCardStatementsCount > 0) {
          return 'Eliminar atrasos do caixa e do cartão'
        }

        if (hasCriticalCreditPressure) {
          return 'Trazer o uso do crédito para uma zona mais segura'
        }

        return 'Fechar o mês no positivo com mais folga'
      case 'stabilizing':
        return 'Chegar a 1 mes de custo essencial protegido'
      case 'protected':
        return 'Completar 6 meses de reserva'
      case 'accumulating':
        return 'Investir os primeiros R$ 10.000'
      case 'investor':
        return 'Manter consistencia e abrir metas maiores'
    }
  })()

  const priorityJourney: JourneyType = (() => {
    if (levelKey === 'setup') return 'setup'
    if (overdueCardStatementsCount > 0) return 'reduce_credit'
    if (overdueTransactions.length > 0 || !monthEndsPositive) return 'stabilize'
    if (shouldPrioritizeCredit) return 'reduce_credit'
    if (reserveCoverageMonths < 6) return 'emergency_fund'
    return 'first_10k'
  })()

  const levelMeta = getLevelMeta(levelKey)
  const focusLabel = (() => {
    if (levelKey === 'setup') return levelMeta.focusLabel
    if (overdueTransactions.length > 0 || overdueCardStatementsCount > 0) {
      return 'Limpar urgências do caixa e tirar pressão do crédito.'
    }
    if (!monthEndsPositive) {
      return 'Virar o fechamento do mês para o azul antes de acelerar outras metas.'
    }
    if (shouldPrioritizeCredit) {
      return 'Reduzir a dependência do cartão e voltar ao débito como padrão.'
    }
    if (reserveCoverageMonths < 1) {
      return 'Construir a primeira camada da reserva de emergência.'
    }
    if (reserveCoverageMonths < 6) {
      return 'Completar uma reserva mais robusta antes de acelerar risco.'
    }
    if (investmentTotal < 10000) {
      return 'Transformar a estabilidade atual em patrimônio investido.'
    }

    return levelMeta.focusLabel
  })()
  const criteria = [
    {
      id: 'setup',
      label: 'Base mínima configurada',
      detail: `${completedSetupSteps}/${setupChecks.length} fundamentos configurados`,
      met: setupProgress >= 0.6,
    },
    {
      id: 'overdue',
      label: 'Sem compromissos vencidos',
      detail:
        overdueTransactions.length === 0
          ? 'Nenhuma pendência vencida'
          : `${overdueTransactions.length} pendência(s) vencida(s)`,
      met: overdueTransactions.length === 0,
    },
    {
      id: 'month_end',
      label: 'Fechamento do mês no positivo',
      detail: `Projeção em ${formatIsoDateForDisplay(projectedMonthEndDate)}: ${formatCurrency(projectedMonthEndBalance)}`,
      met: monthEndsPositive,
    },
    {
      id: 'credit',
      label: 'Uso do crédito sob controle',
      detail:
        cardsCount === 0
          ? 'Nenhum cartão impactando o plano'
          : overdueCardStatementsCount > 0
            ? `${overdueCardStatementsCount} fatura(s) vencida(s)`
            : creditUnlockedLimit <= 0
              ? 'Sem limite liberado no momento'
              : `${Math.round(creditUtilizationRate * 100)}% do limite desbloqueado em uso`,
      met: overdueCardStatementsCount === 0 && creditUtilizationRate < 0.85,
    },
    {
      id: 'reserve_1m',
      label: 'Reserva cobre ao menos 1 mês',
      detail: `${reserveCoverageMonths.toFixed(1)} mes(es) cobertos`,
      met: reserveCoverageMonths >= 1,
    },
    {
      id: 'reserve_6m',
      label: 'Reserva cobre ao menos 6 meses',
      detail: `${reserveCoverageMonths.toFixed(1)} mes(es) cobertos`,
      met: reserveCoverageMonths >= 6,
    },
    {
      id: 'invest_10k',
      label: 'Investimentos chegaram a R$ 10.000',
      detail: `R$ ${investmentTotal.toFixed(2)} acumulados`,
      met: investmentTotal >= 10000,
    },
  ]

  const matchedRule = (() => {
    if (levelKey === 'setup') {
      return {
        title: 'Nível 0',
        description: 'A base ainda está incompleta. Enquanto menos de 60% dos fundamentos estiverem configurados, o diagnóstico para aqui.',
      }
    }

    if (levelKey === 'organizing') {
      return {
        title: 'Nível 1',
        description: 'A base já existe, mas ainda há atraso no caixa, fechamento projetado negativo ou pressão de cartão relevante.',
      }
    }

    if (levelKey === 'stabilizing') {
      return {
        title: 'Nível 2',
        description: 'Sem atrasos relevantes e sem descontrole forte recente, mas a reserva ainda cobre menos de 1 mês.',
      }
    }

    if (levelKey === 'protected') {
      return {
        title: 'Nível 3',
        description: 'A reserva já cobre pelo menos 1 mês, mas ainda está abaixo da faixa de 6 meses.',
      }
    }

    if (levelKey === 'accumulating') {
      return {
        title: 'Nível 4',
        description: 'A reserva já cobre pelo menos 6 meses. Agora o critério que falta é alcançar R$ 10.000 investidos.',
      }
    }

    return {
      title: 'Nível 5',
      description: 'A reserva já cobre pelo menos 6 meses e o total investido já alcançou R$ 10.000.',
    }
  })()

  const historyCoverage = (() => {
    if (historicalDataMonths <= 0) {
      return {
        progress: 0,
        tone: 'low' as const,
        message: 'Ainda faltam meses preenchidos para a estimativa ganhar confiança. Vale montar pelo menos 6 meses de histórico.',
      }
    }

    if (historicalDataMonths < recommendedHistoryMonths) {
      return {
        progress: clamp((historicalDataMonths / recommendedHistoryMonths) * 100, 0, 100),
        tone: 'medium' as const,
        message: `Hoje a estimativa usa ${historicalDataMonths} mes(es) de dados. Tente preencher pelo menos 6 meses para deixá-la mais assertiva.`,
      }
    }

    return {
      progress: 100,
      tone: 'high' as const,
      message: `Já existem ${historicalDataMonths} mes(es) de dados preenchidos. Isso deixa a estimativa mais consistente.`,
    }
  })()
  const cashPillar = (() => {
    const status: FinancialPillarStatus =
      overdueTransactions.length > 0 || !monthEndsPositive
        ? 'danger'
        : projectedMonthEndBalance < Math.max((config?.dailyStandard || 0) * 5, monthlyEssentialCost * 0.15)
          ? 'warning'
          : 'healthy'

    const detail =
      overdueTransactions.length > 0
        ? `${overdueTransactions.length} pendência(s) vencida(s) ainda pressionam o fechamento do mês`
        : !monthEndsPositive
          ? `Hoje a projeção aponta fechamento em ${formatCurrency(projectedMonthEndBalance)}`
          : projectedMonthEndBalance < Math.max((config?.dailyStandard || 0) * 5, monthlyEssentialCost * 0.15)
            ? `O mês fecha positivo, mas com folga curta em ${formatCurrency(projectedMonthEndBalance)}`
            : `O mês tende a fechar no positivo em ${formatCurrency(projectedMonthEndBalance)}`

    return {
      id: 'cash' as const,
      label: 'Caixa',
      title:
        status === 'healthy'
          ? 'Mês fechando no azul'
          : status === 'warning'
            ? 'Caixa com pouca folga'
            : 'Mês ameaçando fechar no vermelho',
      detail,
      metricLabel: `${formatCurrency(projectedMonthEndBalance)} no fim do mês`,
      progress:
        status === 'danger'
          ? clamp(average([
              overdueTransactions.length === 0 ? 100 : clamp((1 - overdueTransactions.length / 3) * 100, 0, 100),
              clamp((1 - Math.abs(projectedMonthEndBalance) / Math.max(monthlyEssentialCost || 1, 1)) * 100, 0, 100),
            ]), 0, 100)
          : status === 'warning'
            ? clamp((projectedMonthEndBalance / Math.max(monthlyEssentialCost || 1, 1)) * 100, 40, 100)
            : 100,
      status,
    }
  })()
  const creditPillar = (() => {
    const status: FinancialPillarStatus =
      hasCriticalCreditPressure
        ? 'danger'
        : hasActiveCreditUse
          ? 'warning'
          : 'healthy'

    const detail =
      cardsCount === 0
        ? 'Sem cartão influenciando sua prioridade atual'
        : overdueCardStatementsCount > 0
          ? `${overdueCardStatementsCount} fatura(s) vencida(s) somando ${formatCurrency(overdueCardStatementsAmount)}`
          : hasActiveCreditUse
            ? `${formatCurrency(creditUsedLimit)} usados de ${formatCurrency(creditUnlockedLimit)} liberados`
            : 'Cartões sem saldo usado relevante neste momento'

    return {
      id: 'credit' as const,
      label: 'Crédito',
      title:
        status === 'healthy'
          ? 'Crédito leve'
          : status === 'warning'
            ? 'Dependência do cartão'
            : 'Crédito pressionando o plano',
      detail,
      metricLabel:
        cardsCount === 0
          ? 'Sem pressão ativa'
          : `${Math.round(creditUtilizationRate * 100)}% do limite desbloqueado em uso`,
      progress:
        cardsCount === 0
          ? 100
          : hasCriticalCreditPressure
            ? clamp((1 - creditUtilizationRate) * 100, 0, 100)
            : hasActiveCreditUse
              ? clamp((1 - creditUtilizationRate) * 100, 0, 100)
              : 100,
      status,
    }
  })()
  const assetsPillar = (() => {
    const status: FinancialPillarStatus =
      reserveCoverageMonths < 1
        ? 'danger'
        : reserveCoverageMonths < 6 || investmentTotal < 10000
          ? 'warning'
          : 'healthy'

    const detail =
      reserveCoverageMonths < 1
        ? `${reserveCoverageMonths.toFixed(1)} mes(es) de reserva hoje`
        : reserveCoverageMonths < 6
          ? `${reserveCoverageMonths.toFixed(1)} mes(es) cobertos; ainda falta robustez`
          : investmentTotal < 10000
            ? `${formatCurrency(investmentTotal)} acumulados rumo aos primeiros R$ 10 mil`
            : 'Reserva e patrimônio em um patamar mais resiliente'

    const progress =
      reserveCoverageMonths < 1
        ? clamp(reserveCoverageMonths * 100, 0, 100)
        : reserveCoverageMonths < 6
          ? clamp(((reserveCoverageMonths - 1) / 5) * 100, 0, 100)
          : investmentTotal < 10000
            ? clamp((investmentTotal / 10000) * 100, 0, 100)
            : 100

    return {
      id: 'assets' as const,
      label: 'Patrimônio',
      title:
        status === 'healthy'
          ? 'Reserva e patrimônio consistentes'
          : status === 'warning'
            ? 'Patrimônio em construção'
            : 'Reserva ainda curta',
      detail,
      metricLabel: `${reserveCoverageMonths.toFixed(1)} mes(es) de reserva`,
      progress,
      status,
    }
  })()
  const pillars = [cashPillar, creditPillar, assetsPillar]

  return {
    ...levelMeta,
    focusLabel,
    confidence: inferConfidence({
      config,
      estimates,
      transactions,
      reserveCurrent: currentReserve,
      investmentTotal,
    }),
    setupProgress,
    progressToNextLevel,
    nextMilestoneLabel,
    priorityJourney,
    reasons,
    overdueCount: overdueTransactions.length,
    overdueAmount,
    recentOverrunDays: overrunDays,
    trackedBudgetDays: trackedDays,
    currentReserve: roundCurrency(currentReserve),
    reserveCoverageMonths,
    reserveTargetAmount: roundCurrency(monthlyEssentialCost * 6),
    monthlyEssentialCost,
    investmentTotal,
    currentBalance,
    projectedMonthEndBalance,
    projectedMonthEndDate,
    monthEndsPositive,
    cardsCount,
    creditTotalLimit,
    creditUnlockedLimit,
    creditUsedLimit,
    creditAvailableLimit,
    creditUtilizationRate,
    openCardStatementsAmount,
    overdueCardStatementsCount,
    overdueCardStatementsAmount,
    monthlyVariableBudget,
    currentMonthVariableSpent,
    activeGoalsCount: goals.length,
    matchedRuleTitle: matchedRule.title,
    matchedRuleDescription: matchedRule.description,
    historicalDataMonths,
    recommendedHistoryMonths,
    historyCoverageProgress: historyCoverage.progress,
    historyCoverageMessage: historyCoverage.message,
    historyCoverageTone: historyCoverage.tone,
    essentialCostIncludedBreakdown: essentialCostProfile.includedBreakdown,
    essentialCostExcludedBreakdown: essentialCostProfile.excludedBreakdown,
    criteria,
    pillars,
  }
}

export const buildGuidedMissions = (
  summary: FinancialHealthSummary,
): GuidedMission[] => {
  const missions: GuidedMission[] = []

  if (summary.cardsCount > 0 && (summary.creditUsedLimit > 0 || summary.openCardStatementsAmount > 0)) {
    missions.push({
      id: 'reduce-card-dependence',
      title: summary.overdueCardStatementsCount > 0 ? 'Regularizar cartões' : 'Reduzir dependência do cartão',
      description:
        summary.overdueCardStatementsCount > 0
          ? 'Use a área de cartões para atacar as faturas vencidas e enxugar o limite que continua te puxando para o crédito.'
          : 'Ajuste o limite desbloqueado e acompanhe a queda do saldo usado até o débito voltar a ser o padrão.',
      whyItMatters:
        summary.overdueCardStatementsCount > 0
          ? `${summary.overdueCardStatementsCount} fatura(s) vencida(s) somam ${formatCurrency(summary.overdueCardStatementsAmount)} e travam o caixa.`
          : `${formatCurrency(summary.creditUsedLimit)} do crédito ainda estão ocupados. Quanto menor essa dependência, mais real fica o plano em débito.`,
      metricLabel: `${formatCurrency(summary.creditUsedLimit)} usados de ${formatCurrency(summary.creditUnlockedLimit)} liberados`,
      progress:
        summary.creditUnlockedLimit > 0
          ? clamp((1 - summary.creditUtilizationRate) * 100, 0, 100)
          : summary.creditUsedLimit > 0
            ? 0
            : 100,
      action: 'open_cards',
      actionLabel: 'Revisar cartões',
      tone: summary.overdueCardStatementsCount > 0 || summary.creditUtilizationRate >= 0.85 ? 'danger' : 'warning',
    })
  }

  if (summary.overdueCount > 0) {
    missions.push({
      id: 'clear-overdue',
      title: 'Zerar compromissos vencidos',
      description: 'Transforme o passivo mais urgente do mes em uma meta visivel e atacavel.',
      whyItMatters: `${summary.overdueCount} pendencia(s) atrasada(s) pressionam seu caixa e tiram previsibilidade.`,
      metricLabel: `R$ ${summary.overdueAmount.toFixed(2)} ainda pendente`,
      progress: 0,
      action: 'create_debt_goal',
      actionLabel: 'Criar meta de quitacao',
      tone: 'danger',
    })
  }

  if (summary.monthlyVariableBudget > 0 && !summary.monthEndsPositive) {
    missions.push({
      id: 'month-end-positive',
      title: 'Fechar o mês no positivo',
      description: 'Use um teto de gasto mensal para virar a projeção do fechamento e recuperar folga no caixa.',
      whyItMatters: `Com a projeção atual em ${formatCurrency(summary.projectedMonthEndBalance)}, o mês ainda tende a terminar no vermelho.`,
      metricLabel: `Fechamento projetado em ${formatIsoDateForDisplay(summary.projectedMonthEndDate)}`,
      progress: clamp((1 - Math.abs(summary.projectedMonthEndBalance) / Math.max(summary.monthlyEssentialCost || 1, 1)) * 100, 0, 100),
      action: 'create_budget_goal',
      actionLabel: 'Criar meta de caixa',
      tone: 'warning',
    })
  }

  if (summary.currentReserve < 1000) {
    missions.push({
      id: 'reserve-first-1000',
      title: 'Construir os primeiros R$ 1.000',
      description: 'Este e o primeiro marco emocional de protecao contra imprevistos pequenos.',
      whyItMatters: 'Antes de pensar em velocidade, vale garantir um amortecedor minimo.',
      metricLabel: `R$ ${summary.currentReserve.toFixed(2)} de R$ 1.000`,
      progress: clamp((summary.currentReserve / 1000) * 100, 0, 100),
      action: 'open_reserve_calculator',
      actionLabel: 'Usar calculadora',
      tone: 'warning',
    })
  }

  if (summary.monthlyEssentialCost > 0 && summary.reserveCoverageMonths < 1) {
    missions.push({
      id: 'reserve-first-month',
      title: 'Chegar a 1 mes de reserva',
      description: 'Converta o custo essencial estimado em uma meta concreta com aporte sugerido.',
      whyItMatters: 'Quando a reserva cobre pelo menos um mes, o caixa deixa de ficar tao exposto.',
      metricLabel: `${summary.reserveCoverageMonths.toFixed(1)} de 1,0 mes protegido`,
      progress: clamp(summary.reserveCoverageMonths * 100, 0, 100),
      action: 'open_reserve_calculator',
      actionLabel: 'Transformar em meta',
      tone: 'accent',
    })
  }

  if (summary.reserveCoverageMonths >= 1 && summary.investmentTotal < 10000) {
    missions.push({
      id: 'first-10k',
      title: 'Investir os primeiros R$ 10.000',
      description: 'Com a base mais forte, vale transformar acumulacao em uma meta visivel.',
      whyItMatters: 'Os primeiros 10 mil sao um marco simples de entender e facil de acompanhar.',
      metricLabel: `R$ ${summary.investmentTotal.toFixed(2)} de R$ 10.000`,
      progress: clamp((summary.investmentTotal / 10000) * 100, 0, 100),
      action: 'create_first_10k_goal',
      actionLabel: 'Criar meta guiada',
      tone: 'success',
    })
  }

  if (missions.length === 0) {
    missions.push({
      id: 'keep-momentum',
      title: 'Manter o ritmo',
      description: 'Voce chegou a um ponto bom da jornada. Agora o foco e sustentar a consistencia.',
      whyItMatters: 'A fase de acumulacao depende mais de repeticao do que de grandes movimentos.',
      metricLabel: `${summary.activeGoalsCount} meta(s) ativa(s) em acompanhamento`,
      progress: clamp(summary.progressToNextLevel, 0, 100),
      action: 'create_first_10k_goal',
      actionLabel: 'Criar proxima meta',
      tone: 'success',
    })
  }

  return missions.slice(0, 3)
}

export const isDebtLikeGoal = (goal: Goal) =>
  hasKeyword(goal.name, debtKeywords) || hasKeyword(goal.category, debtKeywords)
