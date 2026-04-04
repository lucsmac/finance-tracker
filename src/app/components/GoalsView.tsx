import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Pencil,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { useAuth } from '@/lib/hooks/useAuth'
import { useGoals } from '@/lib/hooks/useGoals'
import { useConfig } from '@/lib/hooks/useConfig'
import { useDailyExpenses } from '@/lib/hooks/useDailyExpenses'
import { useDailyPlans } from '@/lib/hooks/useDailyPlans'
import { useTransactions } from '@/lib/hooks/useTransactions'
import { useInvestments } from '@/lib/hooks/useInvestments'
import { useEstimates } from '@/lib/hooks/useEstimates'
import { useCreditCards } from '@/lib/hooks/useCreditCards'
import { toast } from 'sonner'
import type { Goal } from '@/app/data/mockData'
import { getTodayLocal } from '@/lib/utils/dateHelpers'
import {
  buildEmergencyFundCategoryPresets,
  buildGuidedMissions,
  calculateEmergencyFund,
  calculateFinancialHealthSummary,
  isDebtLikeGoal,
  type EmergencyFundCategoryPreset,
  type GuidedMission,
} from '@/lib/domain/financialHealth'

type GoalType = Goal['type']
type GoalPeriod = 'month' | 'year'
type IncomeProfile = 'stable' | 'variable' | 'autonomous'
type GoalsViewNavigateTarget = 'cards'
type ReserveCategoryFieldSource = EmergencyFundCategoryPreset['source'] | 'manual'

const GOALS_VIEW_MODE_STORAGE_KEY = 'automoney:goals:view-mode'

interface GoalsViewProps {
  onNavigate?: (view: GoalsViewNavigateTarget) => void
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const normalizeText = (value: string | null | undefined) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const parseNumber = (value: string) => {
  const normalized = value.replace(',', '.').trim()
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const formatCurrency = (value: number) => currencyFormatter.format(Number.isFinite(value) ? value : 0)

const formatIsoDate = (value: string | null | undefined) => {
  if (!value) return 'data indisponível'

  const [year, month, day] = value.split('-')

  if (!year || !month || !day) return 'data indisponível'

  return `${day}/${month}/${year}`
}

const getInitialGoalViewMode = (): GoalPeriod => {
  if (typeof window === 'undefined') return 'month'

  const stored = window.localStorage.getItem(GOALS_VIEW_MODE_STORAGE_KEY)
  return stored === 'year' ? 'year' : 'month'
}

const createReserveCategoryField = ({
  amount = '',
  label = '',
  note,
  source = 'manual',
}: {
  amount?: string
  label?: string
  note?: string
  source?: ReserveCategoryFieldSource
}) => ({
  id: `reserve-category-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  label,
  amount,
  note,
  source,
})

const getReserveCategorySourceLabel = (source: ReserveCategoryFieldSource) => {
  switch (source) {
    case 'commitment':
      return 'Baseada nos compromissos'
    case 'estimate':
      return 'Baseada nas estimativas'
    case 'fallback':
      return 'Estimativa inicial'
    case 'manual':
      return 'Categoria manual'
  }
}

const getGoalTypeLabel = (type: GoalType): string => {
  switch (type) {
    case 'save':
    case 'savings':
      return 'Guardar valor'
    case 'invest':
      return 'Investimento'
    case 'max_spending':
      return 'Gastar no máximo'
    case 'savings_rate':
      return 'Taxa de economia'
    case 'category_reduction':
      return 'Reduzir categoria'
  }
}

const getProgressPercentage = (goal: Goal): number => {
  if (!goal.targetAmount || goal.targetAmount <= 0) return 0
  return (goal.currentAmount / goal.targetAmount) * 100
}

const getGoalStatus = (goal: Goal): 'success' | 'warning' | 'danger' => {
  const percentage = getProgressPercentage(goal)

  if (goal.type === 'max_spending') {
    if (percentage > 100) return 'danger'
    if (percentage > 80) return 'warning'
    return 'success'
  }

  if (percentage >= 100) return 'success'
  if (percentage >= 70) return 'warning'
  return 'danger'
}

const getStatusColor = (status: 'success' | 'warning' | 'danger') => {
  switch (status) {
    case 'success':
      return 'var(--app-success)'
    case 'warning':
      return 'var(--app-warning)'
    case 'danger':
      return 'var(--app-danger)'
  }
}

const formatGoalValue = (goal: Goal) => {
  if (goal.type === 'savings_rate' || goal.type === 'category_reduction') {
    return `${goal.currentAmount.toFixed(0)}% / ${goal.targetAmount}%`
  }

  return `${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}`
}

const getConfidenceLabel = (confidence: 'low' | 'medium' | 'high') => {
  switch (confidence) {
    case 'high':
      return 'Leitura alta'
    case 'medium':
      return 'Leitura média'
    case 'low':
      return 'Leitura inicial'
  }
}

const getMissionToneClasses = (tone: GuidedMission['tone']) => {
  switch (tone) {
    case 'danger':
      return {
        badge: 'border-[var(--app-danger)]/25 bg-[var(--app-danger)]/10 text-[var(--app-danger)]',
        bar: 'var(--app-danger)',
      }
    case 'warning':
      return {
        badge: 'border-[var(--app-warning)]/25 bg-[var(--app-warning)]/10 text-[var(--app-warning)]',
        bar: 'var(--app-warning)',
      }
    case 'success':
      return {
        badge: 'border-[var(--app-success)]/25 bg-[var(--app-success)]/10 text-[var(--app-success)]',
        bar: 'var(--app-success)',
      }
    case 'accent':
      return {
        badge: 'border-[var(--app-accent)]/25 bg-[var(--app-accent)]/10 text-[var(--app-accent)]',
        bar: 'var(--app-accent)',
      }
    default:
      return {
        badge: 'border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-text-muted)]',
        bar: 'var(--app-text-muted)',
      }
  }
}

const getCoverageToneClasses = (tone: 'low' | 'medium' | 'high') => {
  switch (tone) {
    case 'high':
      return {
        badge: 'bg-[var(--app-success)]/10 text-[var(--app-success)]',
        bar: 'var(--app-success)',
      }
    case 'medium':
      return {
        badge: 'bg-[var(--app-warning)]/10 text-[var(--app-warning)]',
        bar: 'var(--app-warning)',
      }
    default:
      return {
        badge: 'bg-[var(--app-danger)]/10 text-[var(--app-danger)]',
        bar: 'var(--app-danger)',
      }
  }
}

const getPillarToneClasses = (status: 'healthy' | 'warning' | 'danger') => {
  switch (status) {
    case 'healthy':
      return {
        badge: 'bg-[var(--app-success)]/10 text-[var(--app-success)]',
        bar: 'var(--app-success)',
      }
    case 'warning':
      return {
        badge: 'bg-[var(--app-warning)]/10 text-[var(--app-warning)]',
        bar: 'var(--app-warning)',
      }
    default:
      return {
        badge: 'bg-[var(--app-danger)]/10 text-[var(--app-danger)]',
        bar: 'var(--app-danger)',
      }
  }
}

export function GoalsView({ onNavigate }: GoalsViewProps) {
  const { user } = useAuth()
  const today = getTodayLocal()
  const {
    goals: dbGoals,
    loading: goalsLoading,
    error: goalsError,
    createGoal,
    updateGoal,
    deleteGoal,
  } = useGoals(user?.id)
  const { config, loading: configLoading, error: configError } = useConfig(user?.id)
  const { dailyExpenses, loading: dailyExpensesLoading, error: dailyExpensesError } = useDailyExpenses(user?.id)
  const { dailyPlans, loading: dailyPlansLoading, error: dailyPlansError } = useDailyPlans(user?.id)
  const { transactions, loading: transactionsLoading, error: transactionsError } = useTransactions(user?.id)
  const { investments, loading: investmentsLoading, error: investmentsError } = useInvestments(user?.id)
  const { estimates, loading: estimatesLoading, error: estimatesError } = useEstimates(user?.id)
  const {
    cards,
    statements: cardStatements,
    payments: cardPayments,
    loading: creditCardsLoading,
    error: creditCardsError,
  } = useCreditCards(user?.id)

  const [viewMode, setViewMode] = useState<GoalPeriod>(getInitialGoalViewMode)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [saving, setSaving] = useState(false)
  const [guidedSavingKey, setGuidedSavingKey] = useState<string | null>(null)
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false)
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(false)
  const [calculatorForm, setCalculatorForm] = useState({
    categories: [] as Array<{
      id: string
      label: string
      amount: string
      note?: string
      source: ReserveCategoryFieldSource
    }>,
    currentReserve: '',
    incomeProfile: 'stable' as IncomeProfile,
  })
  const goalsSectionRef = useRef<HTMLElement | null>(null)
  const [goalForm, setGoalForm] = useState({
    name: '',
    type: 'savings' as GoalType,
    period: 'month' as GoalPeriod,
    targetAmount: '',
    currentAmount: '',
    category: '',
  })

  const goals: Goal[] = useMemo(
    () =>
      dbGoals.map((goal) => ({
        ...goal,
        period: (goal.period || 'month') as GoalPeriod,
      })),
    [dbGoals],
  )

  const loading =
    goalsLoading ||
    configLoading ||
    dailyExpensesLoading ||
    dailyPlansLoading ||
    transactionsLoading ||
    investmentsLoading ||
    estimatesLoading ||
    creditCardsLoading

  const error =
    goalsError ||
    configError ||
    dailyExpensesError ||
    dailyPlansError ||
    transactionsError ||
    investmentsError ||
    estimatesError ||
    creditCardsError

  const healthSummary = useMemo(
    () =>
      calculateFinancialHealthSummary({
        cards,
        cardPayments,
        cardStatements,
        config,
        dailyExpenses,
        estimates,
        goals,
        getPlannedAmountForDate: (date) => dailyPlans.find((plan) => plan.date === date)?.plannedAmount,
        investments,
        transactions,
        today,
      }),
    [cards, cardPayments, cardStatements, config, dailyExpenses, dailyPlans, estimates, goals, investments, today, transactions],
  )

  const guidedMissions = useMemo(
    () => buildGuidedMissions(healthSummary),
    [healthSummary],
  )

  const filteredGoals = useMemo(
    () => goals.filter((goal) => (goal.period || 'month') === viewMode),
    [goals, viewMode],
  )

  const monthGoalsCount = useMemo(
    () => goals.filter((goal) => (goal.period || 'month') === 'month').length,
    [goals],
  )

  const yearGoalsCount = useMemo(
    () => goals.filter((goal) => (goal.period || 'month') === 'year').length,
    [goals],
  )

  const alternateViewMode = viewMode === 'month' ? 'year' : 'month'
  const alternateViewGoalsCount = alternateViewMode === 'month' ? monthGoalsCount : yearGoalsCount

  const reserveCategoryPresets = useMemo(
    () =>
      buildEmergencyFundCategoryPresets({
        config,
        estimates,
        today,
        transactions,
      }),
    [config, estimates, today, transactions],
  )

  const buildSuggestedReserveCategories = () => {
    if (reserveCategoryPresets.length > 0) {
      return reserveCategoryPresets.map((preset) =>
        createReserveCategoryField({
          label: preset.label,
          amount: preset.amount > 0 ? preset.amount.toFixed(2) : '',
          note: preset.note,
          source: preset.source,
        }),
      )
    }

    if (healthSummary.monthlyEssentialCost > 0) {
      return [
        createReserveCategoryField({
          label: 'Custo essencial base',
          amount: healthSummary.monthlyEssentialCost.toFixed(2),
          note: 'Estimativa automática inicial',
          source: 'fallback',
        }),
      ]
    }

    return [createReserveCategoryField()]
  }

  const calculatorEssentialCost = useMemo(
    () =>
      Number(
        calculatorForm.categories
          .reduce((total, category) => total + Math.max(parseNumber(category.amount), 0), 0)
          .toFixed(2),
      ),
    [calculatorForm.categories],
  )

  const filledCalculatorCategories = useMemo(
    () =>
      calculatorForm.categories.filter(
        (category) => category.label.trim().length > 0 || parseNumber(category.amount) > 0,
      ),
    [calculatorForm.categories],
  )

  const calculatorPreview = useMemo(
    () => {
      const currentReserve = calculatorForm.currentReserve.trim()
        ? parseNumber(calculatorForm.currentReserve)
        : healthSummary.currentReserve

      return calculateEmergencyFund({
        monthlyEssentialCost: calculatorEssentialCost,
        currentReserve,
        incomeProfile: calculatorForm.incomeProfile,
      })
    },
    [calculatorEssentialCost, calculatorForm.currentReserve, calculatorForm.incomeProfile, healthSummary.currentReserve],
  )
  const coverageTone = getCoverageToneClasses(healthSummary.historyCoverageTone)

  const achievedGoals = filteredGoals.filter((goal) => getGoalStatus(goal) === 'success').length
  const totalGoals = filteredGoals.length

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(GOALS_VIEW_MODE_STORAGE_KEY, viewMode)
  }, [viewMode])

  const restoreSuggestedReserveCategories = () => {
    setCalculatorForm((current) => ({
      ...current,
      categories: buildSuggestedReserveCategories(),
    }))
  }

  const focusGoalsList = () => {
    goalsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openReserveCalculator = () => {
    setCalculatorForm({
      categories: buildSuggestedReserveCategories(),
      currentReserve: healthSummary.currentReserve > 0 ? healthSummary.currentReserve.toFixed(2) : '',
      incomeProfile: 'stable',
    })
    setIsReserveDialogOpen(true)
  }

  const updateReserveCategory = (categoryId: string, field: 'label' | 'amount', value: string) => {
    setCalculatorForm((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId ? { ...category, [field]: value } : category,
      ),
    }))
  }

  const addReserveCategory = () => {
    setCalculatorForm((current) => ({
      ...current,
      categories: [...current.categories, createReserveCategoryField()],
    }))
  }

  const removeReserveCategory = (categoryId: string) => {
    setCalculatorForm((current) => ({
      ...current,
      categories: current.categories.filter((category) => category.id !== categoryId),
    }))
  }

  const resetGoalForm = () => {
    setGoalForm({
      name: '',
      type: 'savings',
      period: 'month',
      targetAmount: '',
      currentAmount: '0',
      category: '',
    })
  }

  const handleOpenAddDialog = () => {
    resetGoalForm()
    setEditingGoal(null)
    setIsAddDialogOpen(true)
  }

  const handleOpenDebtGoalDialog = () => {
    setEditingGoal(null)
    setGoalForm({
      name: 'Quitar atrasos do mês',
      type: 'savings',
      period: 'month',
      targetAmount: healthSummary.overdueAmount > 0 ? healthSummary.overdueAmount.toFixed(2) : '',
      currentAmount: '0',
      category: 'Quitacao',
    })
    setIsAddDialogOpen(true)
  }

  const handleOpenBudgetGoalDialog = () => {
    const suggestedBudget = healthSummary.monthlyVariableBudget || healthSummary.currentMonthVariableSpent

    if (suggestedBudget <= 0) {
      toast.error('Configure um gasto diário ou registre gastos variáveis para gerar um teto mensal.')
      return
    }

    setEditingGoal(null)
    setGoalForm({
      name: 'Teto de gastos variáveis do mês',
      type: 'max_spending',
      period: 'month',
      targetAmount: suggestedBudget.toFixed(2),
      currentAmount: healthSummary.currentMonthVariableSpent.toFixed(2),
      category: 'Controle mensal',
    })
    setIsAddDialogOpen(true)
  }

  const handleEditGoal = (goal: Goal) => {
    setGoalForm({
      name: goal.name,
      type: goal.type === 'save' ? 'savings' : goal.type,
      period: (goal.period || 'month') as GoalPeriod,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      category: goal.category || '',
    })
    setEditingGoal(goal)
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return

    try {
      await deleteGoal(goalId)
    } catch (err) {
      console.error('Error deleting goal:', err)
      toast.error('Erro ao excluir meta. Tente novamente.')
    }
  }

  const handleSaveGoal = async () => {
    if (!goalForm.name || !goalForm.targetAmount) {
      toast.error('Preencha os campos obrigatórios.')
      return
    }

    try {
      setSaving(true)

      const goalData = {
        name: goalForm.name,
        type: goalForm.type,
        targetAmount: parseNumber(goalForm.targetAmount),
        currentAmount: parseNumber(goalForm.currentAmount) || 0,
        deadline: null,
        period: goalForm.period,
        category: goalForm.category || null,
      } as Omit<Goal, 'id'>

      if (editingGoal) {
        await updateGoal(editingGoal.id, goalData)
        toast.success('Meta atualizada.')
      } else {
        await createGoal(goalData)
        toast.success('Meta criada.')
      }

      setIsAddDialogOpen(false)
      setEditingGoal(null)
      resetGoalForm()
    } catch (err) {
      console.error('Error saving goal:', err)
      toast.error('Erro ao salvar meta. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const findGoal = (matcher: (goal: Goal) => boolean) => goals.find(matcher)

  const upsertEmergencyReserveGoal = async () => {
    try {
      setGuidedSavingKey('reserve')
      const existingGoal = findGoal((goal) => normalizeText(goal.category) === 'reserva de emergencia' || normalizeText(goal.name).includes('reserva de emergencia'))
      const payload = {
        name: 'Reserva de emergência',
        type: 'savings' as GoalType,
        targetAmount: calculatorPreview.idealReserve,
        currentAmount: calculatorPreview.currentReserve,
        deadline: null,
        period: 'year' as GoalPeriod,
        category: 'Reserva de emergencia',
      } as Omit<Goal, 'id'>

      if (existingGoal) {
        await updateGoal(existingGoal.id, payload)
        toast.success('Meta de reserva atualizada com o cálculo mais recente.')
      } else {
        await createGoal(payload)
        toast.success('Meta de reserva criada.')
      }

      setIsReserveDialogOpen(false)
      setViewMode('year')
    } catch (err) {
      console.error('Error saving reserve goal:', err)
      toast.error('Não foi possível salvar a meta de reserva.')
    } finally {
      setGuidedSavingKey(null)
    }
  }

  const upsertFirst10kGoal = async () => {
    try {
      setGuidedSavingKey('first10k')
      const existingGoal = findGoal(
        (goal) =>
          normalizeText(goal.category) === 'primeiros 10 mil' ||
          normalizeText(goal.name).includes('10.000') ||
          normalizeText(goal.name).includes('10 mil'),
      )

      const payload = {
        name: 'Investir os primeiros R$ 10.000',
        type: 'invest' as GoalType,
        targetAmount: 10000,
        currentAmount: healthSummary.investmentTotal,
        deadline: null,
        period: 'year' as GoalPeriod,
        category: 'Primeiros 10 mil',
      } as Omit<Goal, 'id'>

      if (existingGoal) {
        await updateGoal(existingGoal.id, payload)
        toast.success('Meta dos primeiros 10 mil atualizada.')
      } else {
        await createGoal(payload)
        toast.success('Meta dos primeiros 10 mil criada.')
      }

      setViewMode('year')
    } catch (err) {
      console.error('Error saving 10k goal:', err)
      toast.error('Não foi possível salvar a meta de investimento.')
    } finally {
      setGuidedSavingKey(null)
    }
  }

  const upsertBudgetGoal = async () => {
    const suggestedBudget = healthSummary.monthlyVariableBudget || healthSummary.currentMonthVariableSpent

    if (suggestedBudget <= 0) {
      toast.error('Configure um gasto diário antes de criar um teto mensal.')
      return
    }

    try {
      setGuidedSavingKey('budget')
      const existingGoal = findGoal(
        (goal) =>
          goal.type === 'max_spending' &&
          (normalizeText(goal.category) === 'controle mensal' || normalizeText(goal.name).includes('teto')),
      )

      const payload = {
        name: 'Teto de gastos variáveis do mês',
        type: 'max_spending' as GoalType,
        targetAmount: suggestedBudget,
        currentAmount: healthSummary.currentMonthVariableSpent,
        deadline: null,
        period: 'month' as GoalPeriod,
        category: 'Controle mensal',
      } as Omit<Goal, 'id'>

      if (existingGoal) {
        await updateGoal(existingGoal.id, payload)
        toast.success('Teto mensal atualizado com os dados atuais.')
      } else {
        await createGoal(payload)
        toast.success('Teto mensal criado.')
      }

      setViewMode('month')
    } catch (err) {
      console.error('Error saving budget goal:', err)
      toast.error('Não foi possível salvar o teto mensal.')
    } finally {
      setGuidedSavingKey(null)
    }
  }

  const upsertDebtGoal = async () => {
    if (healthSummary.overdueAmount <= 0) {
      toast.error('Não existem pendências vencidas para transformar em meta.')
      return
    }

    try {
      setGuidedSavingKey('debt')
      const existingGoal = findGoal((goal) => isDebtLikeGoal(goal) || normalizeText(goal.category) === 'quitacao')
      const payload = {
        name: 'Quitar atrasos do mês',
        type: 'savings' as GoalType,
        targetAmount: healthSummary.overdueAmount,
        currentAmount: existingGoal?.currentAmount || 0,
        deadline: null,
        period: 'month' as GoalPeriod,
        category: 'Quitacao',
      } as Omit<Goal, 'id'>

      if (existingGoal) {
        await updateGoal(existingGoal.id, payload)
        toast.success('Meta de quitação atualizada.')
      } else {
        await createGoal(payload)
        toast.success('Meta de quitação criada.')
      }

      setViewMode('month')
    } catch (err) {
      console.error('Error saving debt goal:', err)
      toast.error('Não foi possível salvar a meta de quitação.')
    } finally {
      setGuidedSavingKey(null)
    }
  }

  const handleMissionAction = async (mission: GuidedMission) => {
    switch (mission.action) {
      case 'open_cards':
        onNavigate?.('cards')
        return
      case 'open_reserve_calculator':
        openReserveCalculator()
        return
      case 'create_first_10k_goal':
        await upsertFirst10kGoal()
        return
      case 'create_budget_goal':
        await upsertBudgetGoal()
        return
      case 'create_debt_goal':
        await upsertDebtGoal()
        return
      default:
        handleOpenAddDialog()
    }
  }

  const primaryAction = (() => {
    if (healthSummary.priorityJourney === 'reduce_credit') {
      return {
        label: 'Revisar cartões',
        onClick: () => onNavigate?.('cards'),
      }
    }

    if (healthSummary.priorityJourney === 'emergency_fund') {
      return {
        label: 'Montar reserva guiada',
        onClick: openReserveCalculator,
      }
    }

    if (healthSummary.priorityJourney === 'first_10k') {
      return {
        label: guidedSavingKey === 'first10k' ? 'Criando...' : 'Criar meta dos 10 mil',
        onClick: () => {
          void upsertFirst10kGoal()
        },
      }
    }

    if (healthSummary.priorityJourney === 'stabilize') {
      return {
        label: healthSummary.overdueCount > 0 ? 'Criar meta de quitação' : 'Criar meta de caixa',
        onClick: () => {
          if (healthSummary.overdueCount > 0) {
            void upsertDebtGoal()
            return
          }

          void upsertBudgetGoal()
        },
      }
    }

    return {
      label: 'Criar primeira meta',
      onClick: handleOpenAddDialog,
    }
  })()

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--app-accent)] border-t-transparent" />
          <p className="text-[var(--app-text)]">Carregando plano de metas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[var(--app-text)]">Erro ao carregar metas</h3>
          <p className="mb-4 text-[var(--app-text-muted)]">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[var(--app-accent)] px-4 py-2 text-[var(--app-accent-foreground)] transition-opacity hover:opacity-90"
          >
            Recarregar página
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 pb-2 pt-4">
        <p className="app-kicker">Metas guiadas</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <h1 className="app-page-title text-4xl font-semibold">Seu plano financeiro agora</h1>
            <p className="max-w-3xl text-[var(--app-text-muted)]">
              A tela de metas agora cruza caixa, crédito e patrimônio: mostra o nível atual, sugere a trilha certa
              e transforma objetivos grandes em passos menores.
            </p>
            <button
              onClick={focusGoalsList}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-2 text-sm font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)]"
            >
              <Target className="h-4 w-4" />
              Ver minhas metas
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={primaryAction.onClick}
              className="app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-medium text-[var(--app-accent-foreground)]"
            >
              <Sparkles className="h-4 w-4" />
              {primaryAction.label}
            </button>
            <button
              onClick={handleOpenAddDialog}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-5 py-3 font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)]"
            >
              <Plus className="h-4 w-4" />
              Meta manual
            </button>
          </div>
        </div>
      </div>

      <section className="app-panel overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.55fr,0.95fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-text-faint)]">
                {healthSummary.levelLabel}
              </span>
              <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-1 text-xs font-medium text-[var(--app-text-muted)]">
                {getConfidenceLabel(healthSummary.confidence)}
              </span>
            </div>

            <div>
              <h2 className="text-3xl font-semibold text-[var(--app-text)]">{healthSummary.title}</h2>
              <p className="mt-2 max-w-2xl text-[var(--app-text-muted)]">{healthSummary.description}</p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--app-text-faint)]">Foco recomendado</p>
              <p className="mt-2 text-lg font-medium text-[var(--app-text)]">{healthSummary.focusLabel}</p>
              <p className="mt-3 text-sm text-[var(--app-text-muted)]">{healthSummary.nextMilestoneLabel}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {healthSummary.reasons.slice(0, 3).map((reason) => (
                <span
                  key={reason}
                  className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-2 text-sm text-[var(--app-text-muted)]"
                >
                  {reason}
                </span>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {healthSummary.pillars.map((pillar) => {
                const tone = getPillarToneClasses(pillar.status)

                return (
                  <div
                    key={pillar.id}
                    className="rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.16em] text-[var(--app-text-faint)]">{pillar.label}</p>
                        <p className="mt-2 text-base font-semibold text-[var(--app-text)]">{pillar.title}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}>
                        {pillar.status === 'healthy' ? 'Saudável' : pillar.status === 'warning' ? 'Atenção' : 'Pressão'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--app-text-muted)]">{pillar.detail}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-[var(--app-text-faint)]">
                      <span>{pillar.metricLabel}</span>
                      <span>{Math.round(pillar.progress)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-surface-strong)]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${clamp(pillar.progress, 0, 100)}%`,
                          backgroundColor: tone.bar,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <Collapsible open={isCriteriaOpen} onOpenChange={setIsCriteriaOpen}>
              <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-[var(--app-text-faint)]">Entender o nível</p>
                    <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                      Veja a regra aplicada e a sequência usada pelo diagnóstico.
                    </p>
                  </div>

                  <CollapsibleTrigger className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-2.5 text-sm font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)]">
                    {isCriteriaOpen ? 'Ocultar critérios' : 'Ver critérios'}
                    {isCriteriaOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="pt-4">
                  <div className="grid gap-4 xl:grid-cols-[0.92fr,1.08fr]">
                    <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
                      <p className="text-sm uppercase tracking-[0.16em] text-[var(--app-text-faint)]">
                        Regra aplicada agora
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">{healthSummary.matchedRuleTitle}</p>
                      <p className="mt-2 text-sm text-[var(--app-text-muted)]">{healthSummary.matchedRuleDescription}</p>
                    </div>

                    <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
                      <p className="text-sm uppercase tracking-[0.16em] text-[var(--app-text-faint)]">Sequência das regras</p>
                      <div className="mt-3 space-y-2 text-sm text-[var(--app-text-muted)]">
                        <div>1. Menos de 60% da base pronta: Nível 0</div>
                        <div>2. Base pronta, mas com atrasos, fatura vencida, crédito crítico ou mês fechando no negativo: Nível 1</div>
                        <div>3. Sem esse descontrole, mas reserva abaixo de 1 mês: Nível 2</div>
                        <div>4. Reserva entre 1 e 6 meses: Nível 3</div>
                        <div>5. Reserva de 6+ meses, mas investimentos abaixo de R$ 10.000: Nível 4</div>
                        <div>6. Reserva de 6+ meses e investimentos de R$ 10.000+: Nível 5</div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-[var(--app-text-faint)]">Progresso para o próximo nível</span>
              <span className="text-sm font-semibold text-[var(--app-text)]">
                {Math.round(healthSummary.progressToNextLevel)}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--app-surface-soft)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${clamp(healthSummary.progressToNextLevel, 0, 100)}%`,
                  background:
                    'linear-gradient(90deg, var(--app-accent) 0%, color-mix(in srgb, var(--app-accent) 70%, white) 100%)',
                }}
              />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                <div className="mb-2 flex items-center gap-2 text-[var(--app-text-faint)]">
                  <PiggyBank className="h-4 w-4" />
                  <span className="text-sm">Reserva atual</span>
                </div>
                <p className="text-xl font-semibold text-[var(--app-text)]">{formatCurrency(healthSummary.currentReserve)}</p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  {healthSummary.reserveCoverageMonths.toFixed(1)} mes(es) de custo essencial
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                <div className="mb-2 flex items-center gap-2 text-[var(--app-text-faint)]">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Investimentos</span>
                </div>
                <p className="text-xl font-semibold text-[var(--app-text)]">{formatCurrency(healthSummary.investmentTotal)}</p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">Meta de referência: R$ 10.000</p>
              </div>

              <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                <div className="mb-2 flex items-center gap-2 text-[var(--app-text-faint)]">
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm">Fechamento do mês</span>
                </div>
                <p className="text-xl font-semibold text-[var(--app-text)]">{formatCurrency(healthSummary.projectedMonthEndBalance)}</p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  Projeção em {formatIsoDate(healthSummary.projectedMonthEndDate)}
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                <div className="mb-2 flex items-center gap-2 text-[var(--app-text-faint)]">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm">Crédito</span>
                </div>
                <p className="text-xl font-semibold text-[var(--app-text)]">
                  {Math.round(healthSummary.creditUtilizationRate * 100)}%
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  {formatCurrency(healthSummary.creditUsedLimit)} usados de {formatCurrency(healthSummary.creditUnlockedLimit)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-[var(--app-text-faint)]">Critérios do nível</span>
                <span className="text-xs text-[var(--app-text-muted)]">misturados ao resumo</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {healthSummary.criteria.map((criterion) => (
                  <div
                    key={criterion.id}
                    className="rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--app-text)]">{criterion.label}</p>
                        <p className="mt-1 text-xs text-[var(--app-text-muted)]">{criterion.detail}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          criterion.met
                            ? 'bg-[var(--app-success)]/10 text-[var(--app-success)]'
                            : 'bg-[var(--app-warning)]/10 text-[var(--app-warning)]'
                        }`}
                      >
                        {criterion.met ? 'OK' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="app-kicker">Missões em foco</p>
            <h2 className="text-2xl font-semibold text-[var(--app-text)]">Os próximos passos com maior impacto</h2>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {guidedMissions.map((mission) => {
            const tone = getMissionToneClasses(mission.tone)

            return (
              <div key={mission.id} className="app-panel rounded-[1.75rem] p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tone.badge}`}>
                    Missão ativa
                  </span>
                  <Sparkles className="h-4 w-4 text-[var(--app-text-faint)]" />
                </div>

                <h3 className="text-xl font-semibold text-[var(--app-text)]">{mission.title}</h3>
                <p className="mt-2 text-sm text-[var(--app-text-muted)]">{mission.description}</p>
                <p className="mt-4 text-sm text-[var(--app-text)]">{mission.whyItMatters}</p>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--app-text-faint)]">{mission.metricLabel}</span>
                    <span className="font-medium text-[var(--app-text)]">{Math.round(mission.progress)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--app-surface-soft)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${clamp(mission.progress, 0, 100)}%`,
                        backgroundColor: tone.bar,
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    void handleMissionAction(mission)
                  }}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)]"
                >
                  {mission.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="app-panel rounded-[1.75rem] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="app-kicker">Reserva de emergência</p>
              <h2 className="text-2xl font-semibold text-[var(--app-text)]">Calculadora rápida</h2>
              <p className="mt-2 max-w-xl text-[var(--app-text-muted)]">
                Estimamos seu custo essencial com base no que já existe no app. Você pode ajustar antes de transformar isso em meta.
              </p>
            </div>
            <button
              onClick={openReserveCalculator}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 text-sm font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)]"
            >
              <Calculator className="h-4 w-4" />
              Abrir calculadora
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
              <span className="text-sm text-[var(--app-text-faint)]">Custo essencial estimado</span>
              <p className="mt-2 text-xl font-semibold text-[var(--app-text)]">{formatCurrency(healthSummary.monthlyEssentialCost)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
              <span className="text-sm text-[var(--app-text-faint)]">Reserva ideal inicial</span>
              <p className="mt-2 text-xl font-semibold text-[var(--app-text)]">{formatCurrency(healthSummary.reserveTargetAmount)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
              <span className="text-sm text-[var(--app-text-faint)]">Quanto já existe</span>
              <p className="mt-2 text-xl font-semibold text-[var(--app-text)]">{formatCurrency(healthSummary.currentReserve)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
              <span className="text-sm text-[var(--app-text-faint)]">Cobertura atual</span>
              <p className="mt-2 text-xl font-semibold text-[var(--app-text)]">{healthSummary.reserveCoverageMonths.toFixed(1)} mes(es)</p>
            </div>
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--app-text)]">Base histórica da estimativa</p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">{healthSummary.historyCoverageMessage}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${coverageTone.badge}`}>
                {healthSummary.historicalDataMonths}/{healthSummary.recommendedHistoryMonths} meses
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--app-surface-strong)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${clamp(healthSummary.historyCoverageProgress, 0, 100)}%`,
                  backgroundColor: coverageTone.bar,
                }}
              />
            </div>
          </div>
        </div>

        <div className="app-panel rounded-[1.75rem] p-6">
          <p className="app-kicker">Objetivos guiados</p>
          <h2 className="text-2xl font-semibold text-[var(--app-text)]">Templates prontos para ativar</h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
              <div className="flex items-center gap-3">
                <PiggyBank className="h-5 w-5 text-[var(--app-accent)]" />
                <div>
                  <h3 className="font-semibold text-[var(--app-text)]">Montar reserva de emergência</h3>
                  <p className="text-sm text-[var(--app-text-muted)]">Usa custo essencial estimado e aporte sugerido.</p>
                </div>
              </div>
              <button
                onClick={openReserveCalculator}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)]"
              >
                Abrir calculadora
              </button>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-[var(--app-success)]" />
                <div>
                  <h3 className="font-semibold text-[var(--app-text)]">Investir os primeiros R$ 10.000</h3>
                  <p className="text-sm text-[var(--app-text-muted)]">Cria uma meta anual guiada com o acumulado atual.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  void upsertFirst10kGoal()
                }}
                disabled={guidedSavingKey === 'first10k'}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guidedSavingKey === 'first10k' ? 'Criando...' : 'Criar meta guiada'}
              </button>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--app-warning)]" />
                <div>
                  <h3 className="font-semibold text-[var(--app-text)]">Estabilizar o mês</h3>
                  <p className="text-sm text-[var(--app-text-muted)]">
                    Gere uma meta de quitação ou um teto de gasto para reduzir pressão no caixa.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <button
                  onClick={() => {
                    void upsertDebtGoal()
                  }}
                  disabled={guidedSavingKey === 'debt' || healthSummary.overdueAmount <= 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guidedSavingKey === 'debt' ? 'Criando...' : 'Meta de quitação'}
                </button>
                <button
                  onClick={() => {
                    void upsertBudgetGoal()
                  }}
                  disabled={guidedSavingKey === 'budget'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guidedSavingKey === 'budget' ? 'Criando...' : 'Criar teto mensal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="app-panel rounded-[1.5rem] p-5">
          <div className="mb-3 flex items-center gap-3">
            <Target className="h-5 w-5 text-[var(--app-accent)]" />
            <span className="text-sm text-[var(--app-text-faint)]">Metas no período</span>
          </div>
          <p className="text-3xl font-bold text-[var(--app-text)]">{totalGoals}</p>
        </div>

        <div className="app-panel rounded-[1.5rem] p-5">
          <div className="mb-3 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-[var(--app-success)]" />
            <span className="text-sm text-[var(--app-text-faint)]">Concluídas</span>
          </div>
          <p className="text-3xl font-bold text-[var(--app-success)]">{achievedGoals}</p>
        </div>

        <div className="app-panel rounded-[1.5rem] p-5">
          <div className="mb-3 flex items-center gap-3">
            <PiggyBank className="h-5 w-5 text-[var(--app-warning)]" />
            <span className="text-sm text-[var(--app-text-faint)]">Reserva alvo</span>
          </div>
          <p className="text-3xl font-bold text-[var(--app-text)]">{formatCurrency(healthSummary.reserveTargetAmount)}</p>
        </div>

        <div className="app-panel rounded-[1.5rem] p-5">
          <div className="mb-3 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-[var(--app-accent)]" />
            <span className="text-sm text-[var(--app-text-faint)]">Teto variável</span>
          </div>
          <p className="text-3xl font-bold text-[var(--app-text)]">{formatCurrency(healthSummary.monthlyVariableBudget)}</p>
        </div>
      </section>

      <section ref={goalsSectionRef} className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="app-kicker">Metas em acompanhamento</p>
            <h2 className="text-2xl font-semibold text-[var(--app-text)]">Seus objetivos atuais</h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="app-pill flex items-center gap-2 rounded-2xl p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`rounded-xl px-6 py-2 font-medium transition-all ${
                  viewMode === 'month'
                    ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                Mês ({monthGoalsCount})
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`rounded-xl px-6 py-2 font-medium transition-all ${
                  viewMode === 'year'
                    ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                Ano ({yearGoalsCount})
              </button>
            </div>

            <button
              onClick={handleOpenAddDialog}
              className="app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-medium text-[var(--app-accent-foreground)]"
            >
              <Plus className="h-4 w-4" />
              Nova meta
            </button>
          </div>
        </div>

        {filteredGoals.length === 0 ? (
          <div className="app-panel rounded-[1.75rem] p-12 text-center">
            <Target className="mx-auto mb-4 h-16 w-16 text-[var(--app-text-faint)]" />
            <p className="mb-2 text-lg text-[var(--app-text-muted)]">Nenhuma meta cadastrada neste período</p>
            {alternateViewGoalsCount > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--app-text-faint)]">
                  Você tem {alternateViewGoalsCount} meta(s) no período {alternateViewMode === 'month' ? 'mensal' : 'anual'}.
                </p>
                <button
                  onClick={() => setViewMode(alternateViewMode)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-2 text-sm font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)]"
                >
                  Ver metas {alternateViewMode === 'month' ? 'mensais' : 'anuais'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-[var(--app-text-faint)]">
                Use os templates guiados acima ou crie uma meta manual para começar.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGoals.map((goal) => {
              const status = getGoalStatus(goal)
              const statusColor = getStatusColor(status)
              const percentage = getProgressPercentage(goal)

              return (
                <div
                  key={goal.id}
                  className="app-panel rounded-[1.75rem] p-5 transition-all hover:border-[var(--app-border-strong)] sm:p-6"
                >
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <Target className="h-5 w-5" style={{ color: statusColor }} />
                        <h3 className="break-words text-xl font-semibold text-[var(--app-text)]">{goal.name}</h3>
                      </div>
                      <p className="mb-1 break-words text-sm text-[var(--app-text-faint)]">
                        {getGoalTypeLabel(goal.type)}
                        {goal.category && ` • ${goal.category}`}
                      </p>
                      <p className="break-words font-medium text-[var(--app-text)]">{formatGoalValue(goal)}</p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => handleEditGoal(goal)}
                        className="rounded-lg p-2 transition-colors hover:bg-[var(--app-surface-hover)]"
                      >
                        <Pencil className="h-4 w-4 text-[var(--app-accent)]" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="rounded-lg p-2 transition-colors hover:bg-[var(--app-surface-hover)]"
                      >
                        <Trash2 className="h-4 w-4 text-[var(--app-danger)]" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--app-text-faint)]">Progresso</span>
                      <span className="font-medium" style={{ color: statusColor }}>
                        {Math.min(percentage, 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--app-surface-hover)]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(clamp(percentage, 0, 100), 100)}%`,
                          backgroundColor: statusColor,
                        }}
                      />
                    </div>
                    {percentage >= 100 && goal.type !== 'max_spending' && (
                      <p className="text-sm font-medium text-[var(--app-success)]">Meta alcançada!</p>
                    )}
                    {percentage > 100 && goal.type === 'max_spending' && (
                      <p className="text-sm font-medium text-[var(--app-danger)]">
                        Orçamento ultrapassado em {formatCurrency(goal.currentAmount - goal.targetAmount)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <Dialog
        open={isAddDialogOpen || editingGoal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setEditingGoal(null)
          }
        }}
      >
        <DialogContent className="app-panel-strong w-[calc(100vw-1.5rem)] max-w-md overflow-hidden rounded-[1.5rem] p-0">
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[var(--app-text)]">
                {editingGoal ? 'Editar meta' : 'Nova meta'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div>
                <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Título da meta</label>
                <input
                  type="text"
                  value={goalForm.name}
                  onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })}
                  placeholder="Ex: Economizar R$ 2.000"
                  className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:border-[var(--app-accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Tipo de meta</label>
                <select
                  value={goalForm.type}
                  onChange={(event) => setGoalForm({ ...goalForm, type: event.target.value as GoalType })}
                  className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] focus:border-[var(--app-accent)] focus:outline-none"
                >
                  <option value="savings">Guardar valor</option>
                  <option value="invest">Investimento</option>
                  <option value="max_spending">Gastar no máximo</option>
                  <option value="savings_rate">Taxa de economia (%)</option>
                  <option value="category_reduction">Reduzir categoria (%)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Período</label>
                <select
                  value={goalForm.period}
                  onChange={(event) => setGoalForm({ ...goalForm, period: event.target.value as GoalPeriod })}
                  className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] focus:border-[var(--app-accent)] focus:outline-none"
                >
                  <option value="month">Mensal</option>
                  <option value="year">Anual</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Valor alvo</label>
                <input
                  type="number"
                  value={goalForm.targetAmount}
                  onChange={(event) => setGoalForm({ ...goalForm, targetAmount: event.target.value })}
                  placeholder="Ex: 2000"
                  onWheel={(event) => event.currentTarget.blur()}
                  className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:border-[var(--app-accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Valor atual</label>
                <input
                  type="number"
                  value={goalForm.currentAmount}
                  onChange={(event) => setGoalForm({ ...goalForm, currentAmount: event.target.value })}
                  placeholder="Ex: 500"
                  onWheel={(event) => event.currentTarget.blur()}
                  className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:border-[var(--app-accent)] focus:outline-none"
                />
              </div>

              {goalForm.type === 'category_reduction' && (
                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Categoria</label>
                  <input
                    type="text"
                    value={goalForm.category}
                    onChange={(event) => setGoalForm({ ...goalForm, category: event.target.value })}
                    placeholder="Ex: Alimentação"
                    className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:border-[var(--app-accent)] focus:outline-none"
                  />
                </div>
              )}

              {goalForm.type !== 'category_reduction' && (
                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Etiqueta opcional</label>
                  <input
                    type="text"
                    value={goalForm.category}
                    onChange={(event) => setGoalForm({ ...goalForm, category: event.target.value })}
                    placeholder="Ex: Reserva, Investimentos, Quitação"
                    className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:border-[var(--app-accent)] focus:outline-none"
                  />
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
                <button
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setEditingGoal(null)
                  }}
                  className="app-button-secondary flex-1 rounded-2xl px-4 py-3"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveGoal}
                  disabled={saving || !goalForm.name || !goalForm.targetAmount}
                  className="app-button-primary flex-1 rounded-2xl px-4 py-3 font-medium text-[var(--app-accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingGoal ? 'Salvar' : 'Criar meta'}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReserveDialogOpen} onOpenChange={setIsReserveDialogOpen}>
        <DialogContent className="app-panel-strong w-[calc(100vw-1.5rem)] max-w-2xl overflow-hidden rounded-[1.5rem] p-0">
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[var(--app-text)]">Calculadora de reserva ideal</DialogTitle>
            </DialogHeader>

            <div className="mt-4 grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
              <div className="space-y-4">
                <div>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <label className="block text-sm text-[var(--app-text-muted)]">Custos essenciais por categoria</label>
                      <p className="mt-2 text-xs text-[var(--app-text-faint)]">
                        Preenchemos com base nos compromissos salvos. Ajuste os valores, remova o que não entra e adicione categorias para ver o total ideal da reserva.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={restoreSuggestedReserveCategories}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-xs font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)]"
                      >
                        Restaurar sugestões
                      </button>
                      <button
                        type="button"
                        onClick={addReserveCategory}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-xs font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar categoria
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {calculatorForm.categories.length === 0 ? (
                      <div className="rounded-[1.25rem] border border-dashed border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4 text-sm text-[var(--app-text-muted)]">
                        Nenhuma categoria adicionada ainda. Use o botão acima para começar a montar o custo essencial.
                      </div>
                    ) : (
                      calculatorForm.categories.map((category) => (
                        <div
                          key={category.id}
                          className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4"
                        >
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr),170px,44px] sm:items-start">
                            <div>
                              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--app-text-faint)]">
                                Categoria
                              </label>
                              <input
                                type="text"
                                value={category.label}
                                onChange={(event) => updateReserveCategory(category.id, 'label', event.target.value)}
                                placeholder="Ex: Aluguel"
                                className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:border-[var(--app-accent)] focus:outline-none"
                              />
                              <p className="mt-2 text-xs text-[var(--app-text-faint)]">
                                {category.note || getReserveCategorySourceLabel(category.source)}
                              </p>
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--app-text-faint)]">
                                Valor mensal
                              </label>
                              <input
                                type="number"
                                value={category.amount}
                                onChange={(event) => updateReserveCategory(category.id, 'amount', event.target.value)}
                                placeholder="0,00"
                                onWheel={(event) => event.currentTarget.blur()}
                                className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:border-[var(--app-accent)] focus:outline-none"
                              />
                            </div>

                            <div className="flex sm:justify-end">
                              <button
                                type="button"
                                onClick={() => removeReserveCategory(category.id)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-text-muted)] transition-colors hover:border-[var(--app-border-strong)] hover:text-[var(--app-danger)]"
                                aria-label={`Remover categoria ${category.label || 'sem nome'}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[var(--app-text-faint)]">Custo essencial total</span>
                      <span className="text-lg font-semibold text-[var(--app-text)]">
                        {formatCurrency(calculatorEssentialCost)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Quanto você já tem protegido</label>
                  <input
                    type="number"
                    value={calculatorForm.currentReserve}
                    onChange={(event) => setCalculatorForm((current) => ({ ...current, currentReserve: event.target.value }))}
                    placeholder="Ex: 1200"
                    onWheel={(event) => event.currentTarget.blur()}
                    className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:border-[var(--app-accent)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Perfil de renda</label>
                  <select
                    value={calculatorForm.incomeProfile}
                    onChange={(event) => setCalculatorForm((current) => ({ ...current, incomeProfile: event.target.value as IncomeProfile }))}
                    className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] focus:border-[var(--app-accent)] focus:outline-none"
                  >
                    <option value="stable">Renda estável</option>
                    <option value="variable">Renda variável</option>
                    <option value="autonomous">Autônomo / freelancer</option>
                  </select>
                </div>

                <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-[var(--app-text-faint)]">Cobertura histórica da estimativa</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${coverageTone.badge}`}>
                      {healthSummary.historicalDataMonths}/{healthSummary.recommendedHistoryMonths} meses
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--app-text-muted)]">{healthSummary.historyCoverageMessage}</p>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--app-surface-strong)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${clamp(healthSummary.historyCoverageProgress, 0, 100)}%`,
                        backgroundColor: coverageTone.bar,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                  <p className="text-sm text-[var(--app-text-faint)]">Aportes sugeridos</p>
                  <div className="mt-3 space-y-2">
                    {calculatorPreview.suggestions.map((suggestion) => (
                      <div key={suggestion.months} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--app-text-muted)]">Fechar em {suggestion.months} meses</span>
                        <span className="font-semibold text-[var(--app-text)]">
                          {formatCurrency(suggestion.monthlyAmount)}/mês
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-5">
                  <div className="flex items-center gap-2 text-[var(--app-text-faint)]">
                    <Calculator className="h-4 w-4" />
                    <span className="text-sm">Resultado da calculadora</span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
                      <span className="text-sm text-[var(--app-text-faint)]">Multiplicador</span>
                      <p className="mt-2 text-xl font-semibold text-[var(--app-text)]">{calculatorPreview.multiplier} meses</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
                      <span className="text-sm text-[var(--app-text-faint)]">Meses cobertos hoje</span>
                      <p className="mt-2 text-xl font-semibold text-[var(--app-text)]">{calculatorPreview.coveredMonths.toFixed(1)}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4 sm:col-span-2">
                      <span className="text-sm text-[var(--app-text-faint)]">Reserva ideal</span>
                      <p className="mt-2 text-2xl font-semibold text-[var(--app-text)]">{formatCurrency(calculatorPreview.idealReserve)}</p>
                      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                        Falta {formatCurrency(calculatorPreview.shortfall)} para completar o alvo.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-[var(--app-surface-strong)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${clamp((calculatorPreview.currentReserve / Math.max(calculatorPreview.idealReserve || 1, 1)) * 100, 0, 100)}%`,
                        background:
                          'linear-gradient(90deg, var(--app-success) 0%, color-mix(in srgb, var(--app-success) 70%, white) 100%)',
                      }}
                    />
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                    <button
                      onClick={() => setIsReserveDialogOpen(false)}
                      className="app-button-secondary flex-1 rounded-2xl px-4 py-3"
                    >
                      Fechar
                    </button>
                    <button
                      onClick={() => {
                        void upsertEmergencyReserveGoal()
                      }}
                      disabled={guidedSavingKey === 'reserve' || calculatorPreview.idealReserve <= 0}
                      className="app-button-primary flex-1 rounded-2xl px-4 py-3 font-medium text-[var(--app-accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {guidedSavingKey === 'reserve' ? 'Salvando...' : 'Transformar em meta'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--app-text)]">Categorias consideradas no cálculo</p>
                      <span className="rounded-full bg-[var(--app-success)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--app-success)]">
                        Editável
                      </span>
                    </div>

                    {filledCalculatorCategories.length === 0 ? (
                      <p className="text-sm text-[var(--app-text-muted)]">
                        Adicione pelo menos uma categoria com valor mensal para montar a base da reserva.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {filledCalculatorCategories.map((category) => (
                          <div
                            key={category.id}
                            className="rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-[var(--app-text)]">{category.label || 'Categoria sem nome'}</p>
                                <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                                  {category.note || getReserveCategorySourceLabel(category.source)}
                                </p>
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-[var(--app-text)]">
                                {formatCurrency(parseNumber(category.amount))}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--app-text)]">Ficou fora por enquanto</p>
                      <span className="rounded-full bg-[var(--app-warning)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--app-warning)]">
                        Não essencial
                      </span>
                    </div>

                    {healthSummary.essentialCostExcludedBreakdown.length === 0 ? (
                      <p className="text-sm text-[var(--app-text-muted)]">
                        Não encontramos estimativas ativas fora do custo essencial neste momento.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {healthSummary.essentialCostExcludedBreakdown.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-[var(--app-text)]">{item.label}</p>
                                <p className="mt-1 text-xs text-[var(--app-text-muted)]">{item.reason}</p>
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-[var(--app-text)]">
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
