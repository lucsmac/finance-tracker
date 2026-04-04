import { calculateCurrentBalance, type Estimate, type Goal, type Investment, type Transaction } from '@/app/data/mockData'
import type { UserConfig } from '@/lib/api/config'
import { createDateFromString, formatDateLocal } from '@/lib/utils/dateHelpers'

type FinancialLevelKey = 'setup' | 'organizing' | 'stabilizing' | 'protected' | 'accumulating' | 'investor'
type JourneyType = 'setup' | 'stabilize' | 'emergency_fund' | 'first_10k'
type MissionAction = 'none' | 'open_reserve_calculator' | 'create_budget_goal' | 'create_first_10k_goal' | 'create_debt_goal'
type MissionTone = 'neutral' | 'accent' | 'warning' | 'danger' | 'success'

interface FinancialHealthInput {
  config: UserConfig | null
  estimates: Estimate[]
  goals: Goal[]
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

const addDays = (dateStr: string, days: number) => {
  const date = createDateFromString(dateStr)
  date.setDate(date.getDate() + days)
  return formatDateLocal(date.getFullYear(), date.getMonth(), date.getDate())
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
  config,
  estimates,
  goals,
  investments,
  transactions,
  today,
}: FinancialHealthInput): FinancialHealthSummary => {
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
  const { overrunDays, trackedDays, underControlDays } = getBudgetWindowStats(
    transactions,
    config?.dailyStandard || 0,
    today,
  )

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
  } else if (overdueTransactions.length > 0 || overrunDays >= 5) {
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
  if (overrunDays > 0 && trackedDays > 0) {
    reasons.push(`${overrunDays} dia(s) acima do limite nos ultimos 14 dias`)
  }
  if (monthlyEssentialCost > 0) {
    reasons.push(`${reserveCoverageMonths.toFixed(1)} mes(es) de reserva cobertos`)
  }

  const currentBalance = calculateCurrentBalance(
    config?.initialBalance || 0,
    transactions,
    config?.balanceStartDate,
    today,
  )

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
        const budgetProgress = trackedDays === 0 ? 0.5 : clamp(1 - overrunDays / 7, 0, 1)
        return clamp(average([overdueProgress, budgetProgress]) * 100, 0, 100)
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
        return overdueTransactions.length > 0
          ? 'Zerar compromissos vencidos'
          : 'Passar duas semanas com menos rompimentos do limite diario'
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
    if (levelKey === 'organizing') return 'stabilize'
    if (reserveCoverageMonths < 6) return 'emergency_fund'
    return 'first_10k'
  })()

  const levelMeta = getLevelMeta(levelKey)
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
      id: 'budget',
      label: 'Controle recente do gasto diário',
      detail:
        trackedDays === 0
          ? 'Ainda sem histórico suficiente'
          : `${overrunDays} dia(s) acima do limite nos últimos 14`,
      met: trackedDays === 0 ? false : overrunDays < 5,
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
        description: 'A base já existe, mas ainda há atraso em compromissos ou 5+ dias acima do limite diário nos últimos 14 dias.',
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

  return {
    ...levelMeta,
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
  }
}

export const buildGuidedMissions = (
  summary: FinancialHealthSummary,
): GuidedMission[] => {
  const missions: GuidedMission[] = []

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

  if (summary.monthlyVariableBudget > 0 && summary.recentOverrunDays >= 5) {
    const underControlDays = Math.max(summary.trackedBudgetDays - summary.recentOverrunDays, 0)

    missions.push({
      id: 'budget-control',
      title: 'Passar 7 dias dentro do planejado',
      description: 'Use um teto de gasto mensal para transformar disciplina diaria em uma meta visivel.',
      whyItMatters: `${summary.recentOverrunDays} dias acima do limite nos ultimos 14 indicam fuga de comportamento.`,
      metricLabel: `${underControlDays} de 7 dias dentro do alvo`,
      progress: clamp((underControlDays / 7) * 100, 0, 100),
      action: 'create_budget_goal',
      actionLabel: 'Criar teto mensal',
      tone: 'warning',
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
