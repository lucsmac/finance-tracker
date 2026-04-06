import { useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  X,
  Eye,
  Edit
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEstimates } from '@/lib/hooks/useEstimates';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { useConfig } from '@/lib/hooks/useConfig';
import { useDailyPlans } from '@/lib/hooks/useDailyPlans';
import { useDailyExpenses } from '@/lib/hooks/useDailyExpenses';
import { useCreditCards } from '@/lib/hooks/useCreditCards';
import {
  checkProjectionStatus,
  isCashInflowTransactionType,
  isCashOutflowTransactionType,
  isInvestmentContributionTransactionType,
  isInvestmentRedemptionTransactionType,
} from '../data/mockData';
import { formatDateLocal, getTodayLocal, createDateFromString, formatDateToLocaleString } from '@/lib/utils/dateHelpers';
import {
  getEffectiveVariableCashExpensesTotalForDate,
  getEffectiveVariableExpensesTotalForDate,
  getRecordedVariableExpensesTotalForDate,
  getRecordedVariableExpensesSplitForDate,
  getVariableExpenseEntriesForDate
} from '@/lib/utils/dailyExpenses';
import { formatReferenceMonthLabel, getCreditCardStatementReferenceMonth } from '@/lib/utils/creditCards';
import { isCashImpactTransaction } from '@/lib/utils/transactionPayments';
import { toast } from 'sonner';

interface DashboardProps {
  onNavigate?: (view: string) => void;
  selectedMonth: Date;
  onSelectedMonthChange: (date: Date) => void;
}

type DayStatus = 'neutral' | 'comfortable' | 'good' | 'warning' | 'critical';

const DAY_STATUS_THEME: Record<DayStatus, {
  topBar: string;
}> = {
  neutral: {
    topBar: 'color-mix(in srgb, var(--app-text) 16%, transparent)'
  },
  comfortable: {
    topBar: '#AFFD37'
  },
  good: {
    topBar: '#8537FD'
  },
  warning: {
    topBar: '#FDE837'
  },
  critical: {
    topBar: '#E837FD'
  }
};

const getDayStatusTheme = (status: DayStatus, isToday = false) => {
  const theme = DAY_STATUS_THEME[status] ?? DAY_STATUS_THEME.neutral;

  return {
    ...theme,
    cardStyle: {
      backgroundColor: 'var(--app-surface-soft)',
      borderColor: isToday ? 'var(--app-border-strong)' : 'var(--app-border)',
      boxShadow: 'none'
    }
  };
};

const metricCardClass =
  'min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4 text-left sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-center';
const metricValueClass =
  'max-w-full text-[clamp(1.4rem,7vw,1.875rem)] font-bold leading-tight text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere] sm:text-3xl';
const compactMetricValueClass =
  'max-w-full text-[clamp(1.35rem,8vw,1.75rem)] font-bold leading-tight text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]';
const listAmountClass =
  'max-w-full text-lg font-bold leading-tight tabular-nums [overflow-wrap:anywhere]';
const sectionCardClass =
  'min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4';
const sectionItemClass =
  'flex flex-col gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3 sm:flex-row sm:items-center sm:justify-between';
const sectionInnerCardClass =
  'min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-3';
const neutralNoteClass =
  'rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4';
const modalSummaryCardClass =
  'min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4';
const modalSummaryLabelClass =
  'mb-2 text-xs leading-snug text-[var(--app-text-faint)]';
const modalSummaryValueClass =
  'max-w-full whitespace-nowrap text-[clamp(0.95rem,1.55vw,1.2rem)] font-bold leading-tight tracking-tight tabular-nums';
const modalDetailSummaryValueClass =
  'max-w-full whitespace-nowrap text-[clamp(0.95rem,1.75vw,1.1rem)] font-bold leading-tight tracking-tight tabular-nums';
const modalDetailHighlightValueClass =
  'max-w-full whitespace-nowrap text-[clamp(0.95rem,1.9vw,1.15rem)] font-bold leading-tight tracking-tight tabular-nums';
const neutralBadgeClass =
  'inline-flex rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-2.5 py-1 text-xs font-medium text-[var(--app-text-muted)]';
const dangerBadgeButtonClass =
  'rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/15 dark:text-red-300';
const primaryMonoButtonClass =
  'w-full rounded-xl border border-[var(--app-text)] bg-[var(--app-text)] px-4 py-3 font-semibold text-[var(--app-surface-strong)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
const primaryMonoFlexButtonClass =
  'flex-1 rounded-xl border border-[var(--app-text)] bg-[var(--app-text)] px-4 py-3 font-semibold text-[var(--app-surface-strong)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
const fieldInputClass =
  'w-full rounded-xl border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent';
const fieldInputWithPrefixClass =
  'w-full rounded-xl border border-[var(--app-field-border)] bg-[var(--app-field-bg)] pl-10 pr-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent';
const secondaryButtonClass =
  'app-button-secondary flex-1 rounded-xl px-4 py-3 transition-colors';

export function Dashboard({ onNavigate, selectedMonth, onSelectedMonthChange }: DashboardProps) {
  const { user } = useAuth();
  const { estimates, loading: loadingEstimates } = useEstimates(user?.id);
  const { transactions, loading: loadingTransactions, cancelFutureRecurring, updateTransaction } = useTransactions(user?.id);
  const { config, loading: loadingConfig } = useConfig(user?.id);
  const { loading: loadingPlans, upsertDailyPlan, getPlannedForDate } = useDailyPlans(user?.id);
  const {
    dailyExpenses,
    loading: loadingDailyExpenses,
    createDailyExpense,
    updateDailyExpense,
    deleteDailyExpense,
    getExpensesForDate,
  } = useDailyExpenses(user?.id);
  const { cards, loading: loadingCreditCards } = useCreditCards(user?.id);
  const [savingPlanned, setSavingPlanned] = useState(false);
  const [savingDailyExpense, setSavingDailyExpense] = useState(false);
  const [deletingDailyExpenseId, setDeletingDailyExpenseId] = useState<string | null>(null);
  const [editingDailyExpenseId, setEditingDailyExpenseId] = useState<string | null>(null);

  // Estados do modal unificado com abas
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('expenses'); // 'expenses' ou 'details'
  const [dailyExpenseForm, setDailyExpenseForm] = useState({
    title: '',
    category: '',
    amount: '',
    paymentMethod: 'debit' as 'debit' | 'credit_card',
    creditCardId: '',
  });
  const [plannedForm, setPlannedForm] = useState({
    plannedAmount: ''
  });

  // Estados do modal de projeção "E se?"
  const [isProjectionModalOpen, setIsProjectionModalOpen] = useState(false);
  const [hypotheticalTransactions, setHypotheticalTransactions] = useState<any[]>([]);
  const [projectionForm, setProjectionForm] = useState({
    type: 'expense_variable' as 'expense_variable' | 'expense_fixed' | 'income',
    description: '',
    amount: '',
    date: ''
  });

  // Loading state
  const loading = loadingEstimates || loadingTransactions || loadingConfig || loadingPlans || loadingDailyExpenses || loadingCreditCards;
  const selectedDate = selectedMonth;

  // Calcular valores baseados na data selecionada
  const dailyStandard = config?.dailyStandard || 0;
  const initialBalance = config?.initialBalance || 0;

  // Usar a data real atual
  const today = getTodayLocal();
  const allTransactions = [...transactions, ...hypotheticalTransactions];

  const getPlannedAmountForDate = (dateStr: string) => {
    const customPlanned = getPlannedForDate(dateStr);
    return customPlanned !== null ? customPlanned : dailyStandard;
  };

  const cardsById = useMemo(
    () => new Map(cards.map(card => [card.id, card])),
    [cards],
  );

  const resetDailyExpenseForm = () => {
    setDailyExpenseForm({
      title: '',
      category: '',
      amount: '',
      paymentMethod: 'debit',
      creditCardId: '',
    });
    setEditingDailyExpenseId(null);
  };

  const getDailyExpensePayloadFromForm = () => {
    const amount = parseFloat(dailyExpenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Informe um valor valido maior que zero.')
    }

    const selectedCard = dailyExpenseForm.paymentMethod === 'credit_card'
      ? cards.find(card => card.id === dailyExpenseForm.creditCardId) || null
      : null;

    if (dailyExpenseForm.paymentMethod === 'credit_card' && !selectedCard) {
      throw new Error('Selecione o cartão usado nessa compra.')
    }

    return {
      payload: {
        date: selectedDay,
        title: dailyExpenseForm.title,
        category: dailyExpenseForm.category,
        amount,
        paymentMethod: dailyExpenseForm.paymentMethod,
        creditCardId: selectedCard?.id,
        statementReferenceMonth: selectedCard
          ? getCreditCardStatementReferenceMonth(selectedDay, selectedCard.closingDay)
          : undefined,
      },
      selectedCard,
    };
  };

  const getRecordedVariableExpensesForDate = (dateStr: string) => {
    return getRecordedVariableExpensesTotalForDate(dateStr, dailyExpenses, transactions);
  };

  const getRecordedVariableExpenseSplitForDate = (dateStr: string) => {
    return getRecordedVariableExpensesSplitForDate(dateStr, dailyExpenses, transactions);
  };

  const getEffectiveVariableExpensesForDate = (dateStr: string) => {
    const hypotheticalVariableExpenses = hypotheticalTransactions
      .filter(t => t.type === 'expense_variable' && t.date === dateStr)
      .reduce((sum, t) => sum + t.amount, 0);

    return getEffectiveVariableExpensesTotalForDate({
      date: dateStr,
      plannedAmount: getPlannedAmountForDate(dateStr),
      dailyExpenses,
      transactions,
      additionalVariableExpenses: hypotheticalVariableExpenses,
    });
  };

  const getEffectiveCashVariableExpensesForDate = (dateStr: string) => {
    const hypotheticalVariableExpenses = hypotheticalTransactions
      .filter(t => t.type === 'expense_variable' && t.date === dateStr)
      .reduce((sum, t) => sum + t.amount, 0);

    return getEffectiveVariableCashExpensesTotalForDate({
      date: dateStr,
      plannedAmount: getPlannedAmountForDate(dateStr),
      dailyExpenses,
      transactions,
      additionalVariableExpenses: hypotheticalVariableExpenses,
    });
  };

  const getDayTotals = (dateStr: string, dayTransactions: any[]) => {
    const dayIncomes = dayTransactions
      .filter(t => isCashInflowTransactionType(t.type))
      .reduce((sum, t) => sum + t.amount, 0);

    const nonVariableExpenses = dayTransactions
      .filter(t => isCashOutflowTransactionType(t.type) && t.type !== 'expense_variable')
      .reduce((sum, t) => sum + t.amount, 0);

    const dayExpenses = nonVariableExpenses + getEffectiveVariableExpensesForDate(dateStr);

    return {
      dayIncomes,
      dayExpenses
    };
  };

  const getMonthLastDay = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getSafeMonthDate = (year: number, month: number, day: number) => {
    const normalizedDate = new Date(year, month, 1);
    const normalizedYear = normalizedDate.getFullYear();
    const normalizedMonth = normalizedDate.getMonth();

    return formatDateLocal(
      normalizedYear,
      normalizedMonth,
      Math.min(day, getMonthLastDay(normalizedYear, normalizedMonth))
    );
  };

  const getDateDiffInDays = (startDateStr: string, endDateStr: string) => {
    const startDate = createDateFromString(startDateStr);
    const endDate = createDateFromString(endDateStr);
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Função para calcular o saldo até uma determinada data (planejado vs realizado)
  const calculateBalanceUntilDate = (targetDateStr: string): number => {
    // Usar a data de início do saldo configurada pelo usuário, ou hoje como fallback
    const balanceStartDate = config?.balanceStartDate || today;

    // Para dias anteriores à data de início, retornar apenas o saldo inicial (sem processar)
    if (targetDateStr < balanceStartDate) {
      return initialBalance;
    }

    let balance = initialBalance;

    const [startYear, startMonth, startDay] = balanceStartDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = targetDateStr.split('-').map(Number);

    const startDateObj = new Date(startYear, startMonth - 1, startDay);
    const endDateObj = new Date(endYear, endMonth - 1, endDay);

    for (let date = new Date(startDateObj); date <= endDateObj; date.setDate(date.getDate() + 1)) {
      const dateStr = formatDateLocal(date.getFullYear(), date.getMonth(), date.getDate());
      const dayTransactions = allTransactions.filter(t => t.date === dateStr);

      balance += dayTransactions
        .filter(t => isCashInflowTransactionType(t.type))
        .reduce((sum, t) => sum + t.amount, 0);

      balance -= dayTransactions
        .filter(t => isCashImpactTransaction(t) && t.type !== 'expense_variable')
        .reduce((sum, t) => sum + t.amount, 0);

      balance -= getEffectiveCashVariableExpensesForDate(dateStr);
    }

    return balance;
  };

  const calculateNextIncome = (): { days: number; date: string } => {
    const nextIncomeTransaction = allTransactions
      .filter(t => t.type === 'income' && (t.date > today || (t.date === today && !t.paid)))
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    if (nextIncomeTransaction) {
      return {
        days: getDateDiffInDays(today, nextIncomeTransaction.date),
        date: nextIncomeTransaction.date
      };
    }

    if (!config?.mainIncomeDay) return { days: 0, date: '' };

    const currentDate = createDateFromString(today);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentMonthIncomeDate = getSafeMonthDate(currentYear, currentMonth, config.mainIncomeDay);

    const fallbackDate = today <= currentMonthIncomeDate
      ? currentMonthIncomeDate
      : getSafeMonthDate(currentYear, currentMonth + 1, config.mainIncomeDay);

    return {
      days: getDateDiffInDays(today, fallbackDate),
      date: fallbackDate
    };
  };

  // Calcular gastos comprometidos até a próxima renda
  const calculateCommittedUntilNextIncome = (nextIncomeDate: string): number => {
    if (!nextIncomeDate) return 0;

    return allTransactions
      .filter(t =>
        !t.paid &&
        t.date >= today &&
        t.date < nextIncomeDate &&
        (t.type === 'expense_fixed' || t.type === 'installment') &&
        isCashImpactTransaction(t)
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const calculateProjectedMonthExpenses = (date: Date): number => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getMonthLastDay(year, month);

    let total = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateLocal(year, month, day);
      const dayTransactions = allTransactions.filter(t => t.date === dateStr);
      const nonVariableExpenses = dayTransactions
        .filter(t => isCashImpactTransaction(t) && t.type !== 'expense_variable')
        .reduce((sum, t) => sum + t.amount, 0);

      total += nonVariableExpenses + getEffectiveCashVariableExpensesForDate(dateStr);
    }

    return total;
  };

  const calculateProjectedMonthIncome = (date: Date): number => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthStart = formatDateLocal(year, month, 1);
    const monthEnd = formatDateLocal(year, month, getMonthLastDay(year, month));

    const incomeTransactionsTotal = allTransactions
      .filter(t => t.type === 'income' && t.date >= monthStart && t.date <= monthEnd)
      .reduce((sum, t) => sum + t.amount, 0);

    const todayDate = createDateFromString(today);
    const currentMonthIndex = todayDate.getFullYear() * 12 + todayDate.getMonth();
    const selectedMonthIndex = year * 12 + month;

    if (
      config?.mainIncomeAmount &&
      config.mainIncomeDay &&
      selectedMonthIndex >= currentMonthIndex
    ) {
      const configuredIncomeDate = getSafeMonthDate(year, month, config.mainIncomeDay);
      const hasConfiguredIncomeTransaction = allTransactions.some(
        t => t.type === 'income' && t.date === configuredIncomeDate
      );

      if (!hasConfiguredIncomeTransaction) {
        return incomeTransactionsTotal + config.mainIncomeAmount;
      }
    }

    return incomeTransactionsTotal;
  };

  const availableBalance = calculateBalanceUntilDate(today);
  const todayExpenseSplit = getRecordedVariableExpenseSplitForDate(today);
  const todayExpenses = todayExpenseSplit.total;
  const todayCashExpenses = todayExpenseSplit.debit;
  const todayCreditCardExpenses = todayExpenseSplit.creditCard;
  const todayPlannedAmount = getPlannedAmountForDate(today);
  const todayVariation = todayExpenses - todayPlannedAmount;
  const monthExpensesTotal = calculateProjectedMonthExpenses(selectedDate);
  const monthIncomeTotal = calculateProjectedMonthIncome(selectedDate);
  const monthRemainingTotal = monthIncomeTotal - monthExpensesTotal;

  // Novos cálculos
  const nextIncomeInfo = calculateNextIncome();
  const committedAmount = calculateCommittedUntilNextIncome(nextIncomeInfo.date);
  const projectionStatus = checkProjectionStatus(availableBalance, committedAmount, dailyStandard, nextIncomeInfo.days);

  // Funções de navegação de mês
  const navigateToPreviousMonth = () => {
    onSelectedMonthChange(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const navigateToNextMonth = () => {
    onSelectedMonthChange(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const formatMonthYear = (date: Date) => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatNextIncomeDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = createDateFromString(dateStr);
    const day = date.getDate();
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${day} de ${months[date.getMonth()]}`;
  };

  const getDayOfWeek = (dateStr: string): string => {
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const date = createDateFromString(dateStr);
    return daysOfWeek[date.getDay()];
  };

  // Funções do modal unificado
  const handleDayClick = (dateStr: string, tab: 'expenses' | 'details' = 'expenses') => {
    setSelectedDay(dateStr);
    setActiveTab(tab);
    setIsDayModalOpen(true);
    resetDailyExpenseForm();

    // Carregar o planejado do dia (se existir) ou usar o padrão
    setPlannedForm({
      plannedAmount: getPlannedAmountForDate(dateStr).toString()
    });
  };

  const handleStartDailyExpenseEdit = (expenseId: string) => {
    const expense = dailyExpenses.find((item) => item.id === expenseId);
    if (!expense) return;

    setEditingDailyExpenseId(expense.id);
    setDailyExpenseForm({
      title: expense.title,
      category: expense.category,
      amount: expense.amount.toString(),
      paymentMethod: expense.paymentMethod,
      creditCardId: expense.creditCardId || '',
    });
  };

  const handleCancelDailyExpenseEdit = () => {
    resetDailyExpenseForm();
  };

  const handleSaveDailyExpense = async () => {
    if (!selectedDay) return;

    if (!dailyExpenseForm.title || !dailyExpenseForm.category || !dailyExpenseForm.amount) {
      toast.error('Preencha titulo, categoria e valor do gasto.');
      return;
    }

    try {
      const { payload } = getDailyExpensePayloadFromForm();
      setSavingDailyExpense(true);

      if (editingDailyExpenseId) {
        const previousExpense = dailyExpenses.find((expense) => expense.id === editingDailyExpenseId);
        if (!previousExpense) {
          throw new Error('Lançamento diário não encontrado para edição.')
        }

        await updateDailyExpense(editingDailyExpenseId, payload);

        resetDailyExpenseForm();
        toast.success('Lançamento diário atualizado.');
        return;
      }

      await createDailyExpense(payload);

      resetDailyExpenseForm();
      toast.success('Gasto diario adicionado.');
    } catch (err) {
      console.error('Error creating daily expense:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar gasto diário. Tente novamente.'
      toast.error(errorMessage);
    } finally {
      setSavingDailyExpense(false);
    }
  };

  const handleDeleteDailyExpense = async (id: string) => {
    const confirmed = confirm('Deseja remover este lançamento diário?');
    if (!confirmed) return;

    try {
      setDeletingDailyExpenseId(id);
      await deleteDailyExpense(id);
      if (editingDailyExpenseId === id) {
        resetDailyExpenseForm();
      }
      toast.success('Lancamento diario removido.');
    } catch (err) {
      console.error('Error deleting daily expense:', err);
      toast.error('Erro ao remover gasto diario. Tente novamente.');
    } finally {
      setDeletingDailyExpenseId(null);
    }
  };

  const handleSavePlanned = async () => {
    if (plannedForm.plannedAmount === '') {
      toast.error('Preencha o valor planejado.');
      return;
    }

    const value = parseFloat(plannedForm.plannedAmount);
    if (isNaN(value) || value < 0) {
      toast.error('Valor invalido. Digite um numero valido.');
      return;
    }

    try {
      setSavingPlanned(true);
      await upsertDailyPlan(selectedDay, value);
      toast.success('Planejamento salvo com sucesso.');
    } catch (err: any) {
      console.error('Error saving planned:', err);
      const errorMessage = err?.message || err?.error?.message || JSON.stringify(err);
      toast.error(`Erro ao salvar planejamento: ${errorMessage}`);
    } finally {
      setSavingPlanned(false);
    }
  };

  const handleToggleTransactionPaid = async (transactionId: string, currentPaid: boolean, label: 'pago' | 'recebido') => {
    try {
      await updateTransaction(transactionId, { paid: !currentPaid });
    } catch (error) {
      console.error('Error toggling transaction paid status:', error);
      toast.error(`Erro ao atualizar status de ${label}.`);
    }
  };

  // Funções do modal de projeção "E se?"
  const handleOpenProjection = () => {
    setIsProjectionModalOpen(true);
  };

  const handleAddHypothetical = () => {
    if (!projectionForm.amount || !projectionForm.date || !projectionForm.description) {
      return;
    }

    const newTransaction = {
      id: `hyp-${Date.now()}`,
      type: projectionForm.type,
      description: projectionForm.description,
      amount: parseFloat(projectionForm.amount),
      date: projectionForm.date,
      category: 'Simulação',
      paid: false
    };

    setHypotheticalTransactions([...hypotheticalTransactions, newTransaction]);
    setProjectionForm({
      type: 'expense_variable',
      description: '',
      amount: '',
      date: ''
    });
  };

  const handleRemoveHypothetical = (id: string) => {
    setHypotheticalTransactions(hypotheticalTransactions.filter(t => t.id !== id));
  };

  const handleClearProjection = () => {
    setHypotheticalTransactions([]);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--app-text)]">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Gerar dias do mês para o calendário
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays: any[] = [];

  // Dias do mês anterior para completar a primeira semana
  if (firstDayOfWeek > 0) {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const dateStr = formatDateLocal(prevYear, prevMonth, day);

      // Calcular saldo real para este dia
      const dayBalance = calculateBalanceUntilDate(dateStr);

      // Calcular gastos do dia para exibição
      const dayTransactions = [...transactions, ...hypotheticalTransactions].filter(t => t.date === dateStr);
      const { dayExpenses } = getDayTotals(dateStr, dayTransactions);

      calendarDays.push({
        day,
        dateStr,
        isPast: true,
        isToday: false,
        isFuture: false,
        isOtherMonth: true,
        status: 'neutral',
        balance: dayBalance,
        expense: dayExpenses
      });
    }
  }

  // Dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateLocal(year, month, day);
    const isPast = dateStr < today;
    const isToday = dateStr === today;
    const isFuture = dateStr > today;

    // Calcular saldo até este dia (simples: inicial + entradas - saídas)
    const dayBalance = calculateBalanceUntilDate(dateStr);

    // Calcular gastos do dia para exibição
    const dayTransactions = allTransactions.filter(t => t.date === dateStr);
    const { dayExpenses } = getDayTotals(dateStr, dayTransactions);

    // Determinar status baseado no saldo
    let status: DayStatus = 'neutral';
    if (dayBalance >= 2000) {
      status = 'comfortable';
    } else if (dayBalance < 2000 && dayBalance >= 1000) {
      status = 'good';
    } else if (dayBalance < 1000 && dayBalance >= 0) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    calendarDays.push({
      day,
      dateStr,
      isPast,
      isToday,
      isFuture,
      isOtherMonth: false,
      status,
      balance: dayBalance,
      expense: dayExpenses
    });
  }

  // Dias do próximo mês para completar a última semana
  const remainingDays = 7 - (calendarDays.length % 7);
  if (remainingDays < 7) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    for (let day = 1; day <= remainingDays; day++) {
      const dateStr = formatDateLocal(nextYear, nextMonth, day);

      // Calcular saldo real para este dia
      const dayBalance = calculateBalanceUntilDate(dateStr);

      // Calcular gastos do dia para exibição
      const dayTransactions = [...transactions, ...hypotheticalTransactions].filter(t => t.date === dateStr);
      const { dayExpenses } = getDayTotals(dateStr, dayTransactions);

      calendarDays.push({
        day,
        dateStr,
        isPast: false,
        isToday: false,
        isFuture: true,
        isOtherMonth: true,
        status: 'neutral',
        balance: dayBalance,
        expense: dayExpenses
      });
    }
  }

  const handleCancelRecurring = async (transactionId: string, description: string) => {
    const confirmed = confirm(
      `Tem certeza que deseja cancelar as futuras recorrências de "${description}"?\n\n` +
      'Isso irá:\n' +
      '• Remover o status "recorrente" das transações passadas\n' +
      '• Deletar todas as transações futuras não pagas desta categoria'
    );

    if (!confirmed) return;

    try {
      await cancelFutureRecurring(transactionId);
      toast.success('Recorrencias futuras canceladas com sucesso.');
    } catch (error) {
      console.error('Error canceling recurring transactions:', error);
      toast.error('Erro ao cancelar recorrencias. Tente novamente.');
    }
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="space-y-3 pb-2 pt-4 text-center">
        <p className="app-kicker">Visão financeira</p>
        <h1 className="app-page-title text-3xl font-semibold sm:text-5xl">AutoMoney</h1>
        <p className="mx-auto max-w-2xl text-sm text-[var(--app-text-muted)] sm:text-base">
          Uma leitura do mês, do saldo disponível e da sua margem até a próxima renda.
        </p>

        {/* Month/Year Navigation */}
        <div className="mt-2 flex items-center justify-center gap-2 sm:gap-4">
          <button
            onClick={navigateToPreviousMonth}
            className="app-pill rounded-2xl p-2 transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4 text-[var(--app-text)] sm:h-5 sm:w-5" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="app-pill flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 transition-colors sm:px-4">
                <span className="max-w-[10rem] truncate text-sm font-medium text-[var(--app-text)] sm:max-w-none sm:text-lg">
                  {formatMonthYear(selectedDate)}
                </span>
                <CalendarIcon className="h-4 w-4 text-[var(--app-text)]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="app-panel-strong w-auto border-[var(--app-field-border)] p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onSelectedMonthChange(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <button
            onClick={navigateToNextMonth}
            className="app-pill rounded-2xl p-2 transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4 text-[var(--app-text)] sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="app-panel rounded-[2rem] p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:gap-6">
          {/* Card 1 - Saldo Disponível */}
          <div className={metricCardClass}>
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Saldo disponível</p>
            <p className={metricValueClass}>{availableBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-faint)]">Saldo disponível hoje</p>
          </div>

          {/* Card 2 - Valor Diário Padrão */}
          <div className={`${metricCardClass} sm:border-x sm:border-[var(--app-border)]`}>
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Valor diário padrão</p>
            <p className={metricValueClass}>{dailyStandard.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-faint)]">Base fixa calculada das estimativas</p>
          </div>

          {/* Card 3 - Gasto de Hoje */}
          <div className={`${metricCardClass} sm:border-r sm:border-[var(--app-border)]`}>
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Gasto de hoje</p>
            <p className={metricValueClass}>{todayExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-faint)] [overflow-wrap:anywhere]">
              {todayCashExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no débito • {todayCreditCardExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no cartão
            </p>
            {todayVariation === 0 ? (
              <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-muted)]">Dentro do planejado</p>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-muted)] [overflow-wrap:anywhere]">
                {Math.abs(todayVariation).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} {todayVariation > 0 ? 'acima' : 'abaixo'} do planejado
              </p>
            )}
          </div>

          {/* Card 4 - Gastos do Mês */}
          <div className={metricCardClass}>
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Gastos do mês</p>
            <p className={metricValueClass}>
              {monthExpensesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-muted)] [overflow-wrap:anywhere]">
              {monthRemainingTotal >= 0 ? 'Sobrará ' : 'Faltará '}
              {Math.abs(monthRemainingTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </div>

      {/* Balance Projection Section */}
      <div className="app-panel rounded-[2rem] p-4 sm:p-6">
        <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--app-text)] sm:text-xl">Projeção de saldo</h2>
            <p className="mt-1 text-xs text-[var(--app-text-faint)]">Simule cenários sem sair do contexto do mês.</p>
          </div>
          <button
            onClick={handleOpenProjection}
            className="app-button-secondary inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm sm:w-auto"
          >
            <DollarSign className="h-4 w-4 text-[var(--app-accent)]" />
            <span className="font-medium text-[var(--app-text)]">Simular</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {/* Sub-card 1 - Dias até próxima renda */}
          <div className={metricCardClass}>
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Dias até próxima renda</p>
            {nextIncomeInfo.date ? (
              <>
                <p className={metricValueClass}>
                  {nextIncomeInfo.days === 0 ? 'Hoje' : `${nextIncomeInfo.days} ${nextIncomeInfo.days === 1 ? 'dia' : 'dias'}`}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-faint)]">Próxima renda em {formatNextIncomeDate(nextIncomeInfo.date)}</p>
              </>
            ) : (
              <>
                <p className="mb-1 text-[clamp(1.35rem,8vw,1.875rem)] font-bold leading-tight text-[var(--app-text-faint)] sm:text-3xl">-</p>
                <p className="text-xs leading-relaxed text-[var(--app-text-faint)]">Configure o dia do salário</p>
              </>
            )}
          </div>

          {/* Sub-card 2 - Status da projeção */}
          <div className={`${metricCardClass} sm:border-x sm:border-[var(--app-border)]`}>
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Status da projeção</p>
            <p className={metricValueClass}>
              {projectionStatus === 'positive' ? 'Positivo' : 'Negativo'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-faint)]">
              {projectionStatus === 'positive' ? 'Saldo suficiente' : 'Saldo insuficiente'}
            </p>
          </div>

          {/* Sub-card 3 - Comprometido */}
          <div className={metricCardClass}>
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Comprometido</p>
            <p className={metricValueClass}>{committedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-faint)]">Falta pagar até a próxima renda</p>
          </div>
        </div>
      </div>

      {/* Mobile Calendar - Lista Vertical */}
      <div className="sm:hidden space-y-3">
        <h2 className="mb-3 px-2 text-lg font-semibold text-[var(--app-text)]">Calendário do Mês</h2>

        {calendarDays.map((dayData, index) => {
          if (!dayData) return null;

          // Pular dias de outros meses na versão mobile (só mostrar no desktop)
          if (dayData.isOtherMonth) return null;

          const statusTheme = getDayStatusTheme(dayData.status as DayStatus, dayData.isToday);

          // Calcular entradas e saídas do dia
          const dayTransactions = allTransactions.filter(t => t.date === dayData.dateStr);
          const dayIncomes = dayTransactions
            .filter(t => isCashInflowTransactionType(t.type))
            .reduce((sum, t) => sum + t.amount, 0);
          const { dayExpenses } = getDayTotals(dayData.dateStr, dayTransactions);

          return (
            <div
              key={`${dayData.dateStr}-${index}`}
              onClick={() => handleDayClick(dayData.dateStr)}
              className="relative cursor-pointer overflow-hidden rounded-[1.35rem] border-2 p-4 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={statusTheme.cardStyle}
            >
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: statusTheme.topBar }} />

              {/* Header: Dia da semana + número */}
              <div className="mb-3 flex items-start justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--app-text-faint)]">{getDayOfWeek(dayData.dateStr)}</span>
                  {dayData.isToday ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-badge-bg)] text-lg font-bold text-[var(--app-badge-text)]">{dayData.day}</span>
                  ) : (
                    <span className="ml-0 text-xl font-bold text-[var(--app-text)]">{dayData.day}</span>
                  )}
                  {dayData.isToday && (
                    <span className="inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-text-muted)]">
                      Hoje
                    </span>
                  )}
                </div>
              </div>

              {/* Saldo */}
              <div className="mb-3">
                <p className="mb-1 text-xs text-[var(--app-text-faint)]">Saldo</p>
                <p className={compactMetricValueClass}>
                  {dayData.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>

              {/* Total do Dia */}
              <div className="flex items-center justify-center border-t border-[var(--app-border)] pt-3">
                <div className="text-center">
                  <p className="mb-1 text-xs text-[var(--app-text-faint)]">Total do dia</p>
                  {(() => {
                    const dayTotal = dayIncomes - dayExpenses;
                    return (
                      <p
                        className="max-w-full text-sm font-semibold leading-tight text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]"
                      >
                        {dayTotal >= 0 ? '+' : ''}{dayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Calendar - Grid 7x7 */}
      <div className="app-panel hidden rounded-[2.25rem] p-8 sm:block">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-3 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="py-2 text-center text-sm font-medium text-[var(--app-text-faint)]">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-3">
          {calendarDays.map((dayData, index) => {
            if (!dayData) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            // Estilos especiais para dias de outros meses
            if (dayData.isOtherMonth) {
              const mutedTheme = getDayStatusTheme('neutral');

              // Calcular entradas e saídas do dia
              const dayTransactions = allTransactions.filter(t => t.date === dayData.dateStr);
              const dayIncomes = dayTransactions
                .filter(t => isCashInflowTransactionType(t.type))
                .reduce((sum, t) => sum + t.amount, 0);
              const { dayExpenses } = getDayTotals(dayData.dateStr, dayTransactions);

              return (
                <div
                  key={`${dayData.dateStr}-${index}`}
                  className="relative flex aspect-square cursor-not-allowed flex-col overflow-hidden rounded-2xl border p-2 opacity-45"
                  style={mutedTheme.cardStyle}
                >
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: mutedTheme.topBar, opacity: 0.45 }} />

                  {/* Header: Número do dia */}
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-lg font-bold text-[var(--app-text-muted)]">
                      {dayData.day}
                    </span>
                  </div>

                  {/* Centro: Saldo */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <p className="mb-0.5 text-xs text-[var(--app-text-faint)]">Saldo</p>
                      <p className="text-base font-bold text-[var(--app-text-muted)]">
                        {dayData.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  {/* Footer: Total do Dia */}
                  <div className="flex items-center justify-center border-t border-[var(--app-border)] pt-1 text-xs">
                    {(() => {
                      const dayTotal = dayIncomes - dayExpenses;
                      return (
                        <span className="text-[var(--app-text-muted)]">
                          {dayTotal >= 0 ? '+' : ''}{dayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              );
            }

            const statusTheme = getDayStatusTheme(dayData.status as DayStatus, dayData.isToday);

            // Calcular entradas e saídas do dia (incluindo transações hipotéticas)
            const dayTransactions = allTransactions.filter(t => t.date === dayData.dateStr);
            const dayIncomes = dayTransactions
              .filter(t => isCashInflowTransactionType(t.type))
              .reduce((sum, t) => sum + t.amount, 0);
            const { dayExpenses } = getDayTotals(dayData.dateStr, dayTransactions);

            return (
              <div
                key={`${dayData.dateStr}-${index}`}
                onClick={() => handleDayClick(dayData.dateStr)}
                className="relative flex aspect-square cursor-pointer flex-col overflow-hidden rounded-2xl border p-2 transition-all duration-200 hover:scale-[1.01]"
                style={statusTheme.cardStyle}
              >
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: statusTheme.topBar }} />

                {/* Header: Número do dia */}
                <div className="mb-1 flex items-start justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    {dayData.isToday ? (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-badge-bg)] text-lg font-bold text-[var(--app-badge-text)]">
                        {dayData.day}
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-[var(--app-text)]">
                        {dayData.day}
                      </span>
                    )}
                    {dayData.isToday && (
                      <span className="inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-text-muted)]">
                        Hoje
                      </span>
                    )}
                  </div>
                </div>

                {/* Centro: Saldo */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="mb-0.5 text-[11px] text-[var(--app-text-faint)]">Saldo</p>
                    <p className="text-base font-bold text-[var(--app-text)]">
                      {dayData.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                {/* Footer: Total do Dia */}
                <div className="flex items-center justify-center border-t border-[var(--app-border)] pt-1 text-xs">
                  {(() => {
                    const dayTotal = dayIncomes - dayExpenses;
                    return (
                      <span
                        className="font-semibold text-[var(--app-text)]"
                      >
                        {dayTotal >= 0 ? '+' : ''}{dayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Unificado com Abas */}
      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="app-panel-strong max-w-2xl overflow-hidden rounded-[1.5rem] p-0">
          {activeTab === 'expenses' && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="absolute top-3 right-14 z-10 inline-flex size-11 items-center justify-center rounded-full text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)] sm:top-4 sm:right-14"
                  aria-label="Como funciona"
                >
                  <Info className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="bottom"
                className="w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4 text-sm text-[var(--app-text-muted)] shadow-xl"
              >
                <p>
                  <strong className="text-[var(--app-text)]">Como funciona:</strong> cada gasto diário é um lançamento com
                  título, categoria e valor. O total do dia é a soma desses lançamentos. Se não houver lançamento real,
                  o sistema usa o valor planejado deste dia na projeção.
                </p>
              </PopoverContent>
            </Popover>
          )}
          <div className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pr-20 sm:pr-24">
              <DialogTitle className="text-xl font-bold text-[var(--app-text)] sm:text-2xl">
                {selectedDay && formatDateToLocaleString(selectedDay, 'pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </DialogTitle>
              <DialogDescription className="text-[var(--app-text-muted)]">
                Adicione gastos ou veja os detalhes deste dia
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-1">
              <TabsTrigger value="expenses" className="flex-1 rounded-[1rem] border border-transparent text-[var(--app-text-muted)] data-[state=active]:border-[var(--app-border)] data-[state=active]:bg-[var(--app-surface-strong)] data-[state=active]:text-[var(--app-text)] data-[state=active]:shadow-none hover:text-[var(--app-text)] transition-colors">
                <DollarSign className="w-4 h-4 mr-2" />
                Lançamentos do dia
              </TabsTrigger>
              <TabsTrigger value="details" className="flex-1 rounded-[1rem] border border-transparent text-[var(--app-text-muted)] data-[state=active]:border-[var(--app-border)] data-[state=active]:bg-[var(--app-surface-strong)] data-[state=active]:text-[var(--app-text)] data-[state=active]:shadow-none hover:text-[var(--app-text)] transition-colors">
                <Eye className="w-4 h-4 mr-2" />
                Detalhes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expenses" className="mt-6">
              {(() => {
                const dailyExpenseEntries = getExpensesForDate(selectedDay);
                const recordedVariableEntries = getVariableExpenseEntriesForDate(selectedDay, dailyExpenses, transactions)
                  .filter(entry => entry.source === 'daily_expense' || entry.paid);
                const legacyVariableEntries = recordedVariableEntries.filter(entry => entry.source === 'legacy_transaction');
                const expenseSplit = getRecordedVariableExpenseSplitForDate(selectedDay);
                const recordedTotal = expenseSplit.total;
                const plannedAmount = getPlannedAmountForDate(selectedDay);

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className={modalSummaryCardClass}>
                        <p className={modalSummaryLabelClass}>Gasto lançado</p>
                        <p className={`${modalSummaryValueClass} text-[var(--app-text)]`}>
                          {recordedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div className={modalSummaryCardClass}>
                        <p className={modalSummaryLabelClass}>Saiu do caixa hoje</p>
                        <p className={`${modalSummaryValueClass} text-[var(--app-text)]`}>
                          {expenseSplit.debit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div className={modalSummaryCardClass}>
                        <p className={modalSummaryLabelClass}>Foi para o cartão</p>
                        <p className={`${modalSummaryValueClass} text-[var(--app-text)]`}>
                          {expenseSplit.creditCard.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div className={modalSummaryCardClass}>
                        <p className={modalSummaryLabelClass}>Planejado do dia</p>
                        <p className={`${modalSummaryValueClass} text-[var(--app-text)]`}>
                          {plannedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>

                    <div className={`${sectionCardClass} space-y-4`}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="text-sm font-semibold text-[var(--app-text)]">
                          {editingDailyExpenseId ? 'Editar lançamento diário' : 'Adicionar gasto diário'}
                        </h4>
                        {editingDailyExpenseId && (
                          <button
                            type="button"
                            onClick={handleCancelDailyExpenseEdit}
                            className="text-sm font-medium text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text)]"
                          >
                            Cancelar edição
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                            Título *
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Almoço, Uber, Farmácia"
                            value={dailyExpenseForm.title}
                            onChange={(e) => setDailyExpenseForm({ ...dailyExpenseForm, title: e.target.value })}
                            className={fieldInputClass}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                            Categoria *
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Alimentação, Transporte"
                            value={dailyExpenseForm.category}
                            onChange={(e) => setDailyExpenseForm({ ...dailyExpenseForm, category: e.target.value })}
                            className={fieldInputClass}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                            Como foi pago? *
                          </label>
                          <select
                            value={dailyExpenseForm.paymentMethod}
                            onChange={(e) => setDailyExpenseForm({
                              ...dailyExpenseForm,
                              paymentMethod: e.target.value as 'debit' | 'credit_card',
                              creditCardId: e.target.value === 'credit_card' ? dailyExpenseForm.creditCardId : '',
                            })}
                            className={fieldInputClass}
                          >
                            <option value="debit">Débito / Pix / Dinheiro</option>
                            <option value="credit_card">Cartão de crédito</option>
                          </select>
                        </div>

                        {dailyExpenseForm.paymentMethod === 'credit_card' ? (
                          <div>
                            <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                              Cartão *
                            </label>
                            <select
                              value={dailyExpenseForm.creditCardId}
                              onChange={(e) => setDailyExpenseForm({ ...dailyExpenseForm, creditCardId: e.target.value })}
                              className={fieldInputClass}
                              disabled={cards.length === 0}
                            >
                              <option value="">{cards.length === 0 ? 'Cadastre um cartão primeiro' : 'Selecione um cartão'}</option>
                              {cards.map((card) => (
                                <option key={card.id} value={card.id}>
                                  {card.name}
                                </option>
                              ))}
                            </select>
                            {dailyExpenseForm.creditCardId && cardsById.get(dailyExpenseForm.creditCardId) && (
                              <p className="mt-2 text-xs text-[var(--app-text-faint)]">
                                Vai para a fatura de {formatReferenceMonthLabel(
                                  getCreditCardStatementReferenceMonth(
                                    selectedDay,
                                    cardsById.get(dailyExpenseForm.creditCardId)!.closingDay,
                                  ),
                                  'long',
                                )}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3 text-sm text-[var(--app-text-muted)]">
                            Esse lançamento afeta o saldo disponível no mesmo dia.
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                          Valor *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={dailyExpenseForm.amount}
                            onChange={(e) => setDailyExpenseForm({ ...dailyExpenseForm, amount: e.target.value })}
                            onWheel={(e) => e.currentTarget.blur()}
                            className={fieldInputWithPrefixClass}
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSaveDailyExpense}
                        disabled={savingDailyExpense}
                        className={primaryMonoButtonClass}
                      >
                        {savingDailyExpense
                          ? (editingDailyExpenseId ? 'Salvando edição...' : 'Salvando lançamento...')
                          : (editingDailyExpenseId ? 'Salvar edição' : 'Adicionar lançamento')}
                      </button>
                    </div>

                    <div className={`${sectionCardClass} space-y-3`}>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-[var(--app-text)]">Lançamentos cadastrados</h4>
                        <span className="text-sm text-[var(--app-text-muted)]">
                          {dailyExpenseEntries.length} item(ns)
                        </span>
                      </div>

                      {dailyExpenseEntries.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-[var(--app-text-muted)]">Nenhum gasto diário cadastrado para esta data.</p>
                        </div>
                      ) : (
                        dailyExpenseEntries.map(expense => (
                          <div key={expense.id} className={sectionItemClass}>
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">{expense.title}</p>
                              <p className="text-sm text-[var(--app-text-muted)]">{expense.category}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className={neutralBadgeClass}>
                                  {expense.paymentMethod === 'credit_card'
                                    ? `Cartão${expense.creditCardId ? ` • ${cardsById.get(expense.creditCardId)?.name || 'Sem nome'}` : ''}`
                                    : 'Débito / Pix'}
                                </span>
                                {expense.paymentMethod === 'credit_card' && expense.statementReferenceMonth && (
                                  <span className={neutralBadgeClass}>
                                    Fatura {formatReferenceMonthLabel(expense.statementReferenceMonth)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                              <p className={`${listAmountClass} text-[var(--app-text)]`}>
                                {expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                              <button
                                onClick={() => handleStartDailyExpenseEdit(expense.id)}
                                className="shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-2 text-[var(--app-text-muted)] transition-colors hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
                                title="Editar lançamento"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDailyExpense(expense.id)}
                                disabled={deletingDailyExpenseId === expense.id}
                                className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-700 transition-colors hover:bg-red-500/15 disabled:opacity-50 dark:text-red-300"
                                title="Remover lançamento"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {legacyVariableEntries.length > 0 && (
                      <div className={`${neutralNoteClass} space-y-3`}>
                        <h4 className="text-sm font-semibold text-[var(--app-text)]">Lançamentos legados</h4>
                        <p className="text-xs text-[var(--app-text-faint)]">
                          Estes gastos vieram do modelo antigo de transações variáveis e continuam contando no total do dia.
                        </p>
                        {legacyVariableEntries.map(entry => (
                          <div key={entry.id} className={sectionItemClass}>
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">{entry.title}</p>
                              <p className="text-sm text-[var(--app-text-muted)]">{entry.category}</p>
                            </div>
                            <p className={`${listAmountClass} text-[var(--app-text)]`}>
                              {entry.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={`${sectionCardClass} space-y-4`}>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--app-text)]">Planejamento do dia</h4>
                        <p className="mt-1 text-xs text-[var(--app-text-faint)]">
                          Se não houver lançamentos reais para este dia, a projeção usa este valor. Deixe igual ao padrão ou ajuste se necessário.
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                          Valor planejado para o dia
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder={`Padrão: ${dailyStandard.toFixed(2)}`}
                            value={plannedForm.plannedAmount}
                            onChange={(e) => setPlannedForm({ ...plannedForm, plannedAmount: e.target.value })}
                            onWheel={(e) => e.currentTarget.blur()}
                            className={fieldInputWithPrefixClass}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={() => setIsDayModalOpen(false)}
                          className={secondaryButtonClass}
                        >
                          Fechar
                        </button>
                        <button
                          onClick={handleSavePlanned}
                          disabled={savingPlanned}
                          className={primaryMonoFlexButtonClass}
                        >
                          {savingPlanned ? 'Salvando...' : 'Salvar planejamento'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              <div className="space-y-4">
                {(() => {
                  const dayTransactions = transactions.filter(t => t.date === selectedDay);
                  const dayIncomes = dayTransactions.filter(t => t.type === 'income');
                  const dayRedemptions = dayTransactions.filter(t => isInvestmentRedemptionTransactionType(t.type));
                  const fixedExpenses = dayTransactions.filter(t => t.type === 'expense_fixed');
                  const installments = dayTransactions.filter(t => t.type === 'installment');
                  const investments = dayTransactions.filter(t => isInvestmentContributionTransactionType(t.type));
                  const variableExpenseEntries = getVariableExpenseEntriesForDate(selectedDay, dailyExpenses, transactions)
                    .filter(entry => entry.source === 'daily_expense' || entry.paid);

                  const totalVariableExpenses = variableExpenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
                  const totalFixedExpenses = [...fixedExpenses, ...installments, ...investments]
                    .reduce((sum, transaction) => sum + transaction.amount, 0);
                  const totalExpenses = totalVariableExpenses + totalFixedExpenses;
                  const totalIncomes = [...dayIncomes, ...dayRedemptions].reduce((sum, transaction) => sum + transaction.amount, 0);
                  const balance = totalIncomes - totalExpenses;
                  const plannedAmount = getPlannedAmountForDate(selectedDay);
                  const difference = plannedAmount - totalVariableExpenses;
                  const hasRealExpenses = totalVariableExpenses > 0;

                  return (
                    <>
                      <div className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4 sm:grid-cols-3 sm:gap-4">
                        <div className={`${sectionInnerCardClass} text-left sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-center`}>
                          <p className="mb-1 text-xs text-[var(--app-text-faint)]">Entradas</p>
                          <p className={`${modalDetailSummaryValueClass} text-emerald-700 dark:text-emerald-400`}>{totalIncomes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className={`${sectionInnerCardClass} text-left sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-center`}>
                          <p className="mb-1 text-xs text-[var(--app-text-faint)]">Saídas</p>
                          <p className={`${modalDetailSummaryValueClass} text-red-700 dark:text-red-400`}>{totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className={`${sectionInnerCardClass} text-left sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-center`}>
                          <p className="mb-1 text-xs text-[var(--app-text-faint)]">Saldo do dia</p>
                          <p className={`${modalDetailSummaryValueClass} ${balance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                            {balance >= 0 ? '+' : ''}{balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                        <h4 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Planejado vs Realizado</h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                          <div className={`${sectionInnerCardClass} sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0`}>
                            <p className="mb-1 text-xs text-[var(--app-text-faint)]">Planejado</p>
                            <p className={`${modalDetailHighlightValueClass} text-[var(--app-text)]`}>{plannedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          </div>
                          <div className={`${sectionInnerCardClass} text-left sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-center`}>
                            <p className="mb-1 text-xs text-[var(--app-text-faint)]">Realizado</p>
                            <p className={`${modalDetailHighlightValueClass} ${hasRealExpenses ? 'text-[var(--app-text)]' : 'text-[var(--app-text-faint)]'}`}>
                              {totalVariableExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            {!hasRealExpenses && (
                              <p className="mt-1 text-xs text-[var(--app-text-faint)]">Sem gastos</p>
                            )}
                          </div>
                          <div className={`${sectionInnerCardClass} text-left sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-right`}>
                            <p className="mb-1 text-xs text-[var(--app-text-faint)]">Diferença</p>
                            <p className={`${modalDetailHighlightValueClass} ${difference >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                              {difference >= 0 ? '+' : ''}{difference.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            {difference >= 0 ? (
                              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">Economizou!</p>
                            ) : (
                              <p className="mt-1 text-xs text-red-700 dark:text-red-400">Excedeu</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {dayTransactions.length === 0 && variableExpenseEntries.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-[var(--app-text-muted)]">Nenhum lançamento neste dia</p>
                          </div>
                        ) : (
                          <>
                            {dayIncomes.length > 0 && (
                              <div>
                                <h4 className="mb-2 text-sm font-semibold text-[var(--app-text)]">Entradas</h4>
                                {dayIncomes.map(t => (
                                  <div key={t.id} className={`${sectionItemClass} mb-2`}>
                                    <div className="min-w-0">
                                      <p className="font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">{t.description}</p>
                                      <p className="text-sm text-[var(--app-text-muted)]">{t.category}</p>
                                    </div>
                                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                                      <p className={`${listAmountClass} text-emerald-700 dark:text-emerald-400`}>+{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                        <button
                                          onClick={() => void handleToggleTransactionPaid(t.id, Boolean(t.paid), 'recebido')}
                                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${t.paid ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400' : 'border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-text-muted)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]'}`}
                                          title={t.paid ? 'Desmarcar como recebido' : 'Marcar como recebido'}
                                        >
                                          {t.paid ? '✓ Recebido' : 'Marcar recebido'}
                                        </button>
                                        {t.recurring && (
                                          <div className="flex items-center gap-2">
                                            <span className={neutralBadgeClass}>
                                              Recorrente
                                            </span>
                                            <button
                                              onClick={() => handleCancelRecurring(t.id, t.description)}
                                              className={dangerBadgeButtonClass}
                                              title="Cancelar recorrências futuras"
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {dayRedemptions.length > 0 && (
                              <div>
                                <h4 className="mb-2 text-sm font-semibold text-[var(--app-text)]">Resgates</h4>
                                {dayRedemptions.map(t => (
                                  <div key={t.id} className={`${sectionItemClass} mb-2`}>
                                    <div className="min-w-0">
                                      <p className="font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">{t.description}</p>
                                      <p className="text-sm text-[var(--app-text-muted)]">{t.category}</p>
                                    </div>
                                    <p className={`${listAmountClass} text-emerald-700 dark:text-emerald-400`}>
                                      +{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {variableExpenseEntries.length > 0 && (
                              <div>
                                <h4 className="mb-2 text-sm font-semibold text-[var(--app-text)]">Gastos Diários</h4>
                                {variableExpenseEntries.map(entry => (
                                  <div key={entry.id} className={`${sectionItemClass} mb-2`}>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">{entry.title}</p>
                                        {entry.source === 'legacy_transaction' && (
                                          <span className={neutralBadgeClass}>
                                            Legado
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-[var(--app-text-muted)]">{entry.category}</p>
                                    </div>
                                    <p className={`${listAmountClass} text-[var(--app-text)]`}>{entry.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {fixedExpenses.length > 0 && (
                              <div>
                                <h4 className="mb-2 text-sm font-semibold text-[var(--app-text)]">Gastos Fixos</h4>
                                {fixedExpenses.map(t => (
                                  <div key={t.id} className={`${sectionItemClass} mb-2`}>
                                    <div className="min-w-0">
                                      <p className="font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">{t.description}</p>
                                      <p className="text-sm text-[var(--app-text-muted)]">{t.category}</p>
                                    </div>
                                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                                      <p className={`${listAmountClass} text-[var(--app-text)]`}>{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                        <button
                                          onClick={() => void handleToggleTransactionPaid(t.id, Boolean(t.paid), 'pago')}
                                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${t.paid ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400' : 'border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-text-muted)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]'}`}
                                          title={t.paid ? 'Desmarcar como pago' : 'Marcar como pago'}
                                        >
                                          {t.paid ? '✓ Pago' : 'Marcar pago'}
                                        </button>
                                        {t.recurring && (
                                          <div className="flex items-center gap-2">
                                            <span className={neutralBadgeClass}>
                                              Recorrente
                                            </span>
                                            <button
                                              onClick={() => handleCancelRecurring(t.id, t.description)}
                                              className={dangerBadgeButtonClass}
                                              title="Cancelar recorrências futuras"
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {installments.length > 0 && (
                              <div>
                                <h4 className="mb-2 text-sm font-semibold text-[var(--app-text)]">Parcelas</h4>
                                {installments.map(t => (
                                  <div key={t.id} className={`${sectionItemClass} mb-2`}>
                                    <div className="min-w-0">
                                      <p className="font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">{t.description}</p>
                                      <p className="text-sm text-[var(--app-text-muted)]">
                                        {t.category} • Parcela {t.installmentNumber}/{t.totalInstallments}
                                      </p>
                                    </div>
                                    <p className={`${listAmountClass} text-[var(--app-text)]`}>{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {investments.length > 0 && (
                              <div>
                                <h4 className="mb-2 text-sm font-semibold text-[var(--app-text)]">Investimentos</h4>
                                {investments.map(t => (
                                  <div key={t.id} className={`${sectionItemClass} mb-2`}>
                                    <div className="min-w-0">
                                      <p className="font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">{t.description}</p>
                                      <p className="text-sm text-[var(--app-text-muted)]">{t.category}</p>
                                    </div>
                                    <p className={`${listAmountClass} text-[var(--app-text)]`}>{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Projeção "E se?" */}
      <Dialog open={isProjectionModalOpen} onOpenChange={setIsProjectionModalOpen}>
        <DialogContent className="app-panel-strong max-w-4xl overflow-hidden rounded-[1.5rem] p-0">
          <div className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[var(--app-text)] sm:text-2xl">
                E se?
              </DialogTitle>
              <DialogDescription className="text-[var(--app-text-muted)]">
                Simule transações futuras e veja como elas afetam seus saldos sem precisar cadastrá-las
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
            {/* Alertas sobre transações hipotéticas ativas */}
            {hypotheticalTransactions.length > 0 && (
              <div className="bg-[#AFFD37]/10 border border-[#AFFD37]/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-[#AFFD37] mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-[#AFFD37] mb-1">
                      Projeção Ativa
                    </h4>
                    <p className="text-sm text-[var(--app-text-muted)]">
                      Você tem {hypotheticalTransactions.length} transação(ões) hipotética(s) afetando os saldos do calendário.
                      Os valores mostrados são simulações.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Formulário de Adicionar Transação Hipotética */}
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-6">
              <h3 className="mb-4 text-lg font-semibold text-[var(--app-text)]">Adicionar Transação Hipotética</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Tipo */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                    Tipo *
                  </label>
                  <select
                    value={projectionForm.type}
                    onChange={(e) => setProjectionForm({ ...projectionForm, type: e.target.value as any })}
                    className={fieldInputClass}
                  >
                    <option value="income">Entrada</option>
                    <option value="expense_variable">Gasto Variável</option>
                    <option value="expense_fixed">Gasto Fixo</option>
                  </select>
                </div>

                {/* Descrição */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Salário extra, Compra supermercado"
                    value={projectionForm.description}
                    onChange={(e) => setProjectionForm({ ...projectionForm, description: e.target.value })}
                    className={fieldInputClass}
                  />
                </div>

                {/* Valor */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                    Valor *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={projectionForm.amount}
                    onChange={(e) => setProjectionForm({ ...projectionForm, amount: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className={fieldInputClass}
                  />
                </div>

                {/* Data */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={projectionForm.date}
                    onChange={(e) => setProjectionForm({ ...projectionForm, date: e.target.value })}
                    className={fieldInputClass}
                  />
                </div>
              </div>

              <button
                onClick={handleAddHypothetical}
                disabled={!projectionForm.amount || !projectionForm.date || !projectionForm.description}
                className="mt-4 w-full px-4 py-3 bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-foreground)] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar à Simulação
              </button>
            </div>

            {/* Lista de Transações Hipotéticas */}
            {hypotheticalTransactions.length > 0 && (
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[var(--app-text)]">Transações na Simulação</h3>
                  <button
                    onClick={handleClearProjection}
                    className="px-3 py-1.5 bg-[#C27C75]/20 hover:bg-[#C27C75]/30 text-[#E837FD] rounded-lg text-sm font-medium transition-colors"
                  >
                    Limpar Tudo
                  </button>
                </div>

                <div className="space-y-2">
                  {hypotheticalTransactions.map((transaction: any) => {
                    const isIncome = transaction.type === 'income';
                    const bgColor = isIncome ? 'bg-[#AFFD37]/10' : 'bg-[#E837FD]/10';
                    const borderColor = isIncome ? 'border-[#AFFD37]/30' : 'border-[#E837FD]/30';
                    const textColor = isIncome ? 'text-[#AFFD37]' : 'text-[#E837FD]';

                    return (
                      <div
                        key={transaction.id}
                        className={`${bgColor} ${borderColor} flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <span className={`max-w-full text-lg font-bold leading-tight tabular-nums ${textColor} [overflow-wrap:anywhere]`}>
                              {isIncome ? '+' : '-'}{transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            <span className="font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">
                              {transaction.description}
                            </span>
                            <span className="w-fit rounded bg-[var(--app-surface-hover)] px-2 py-0.5 text-xs text-[var(--app-text-muted)]">
                              {transaction.type === 'income' ? 'Entrada' : transaction.type === 'expense_fixed' ? 'Fixo' : 'Variável'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-[var(--app-text-faint)]">
                            {formatDateToLocaleString(transaction.date, 'pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        <button
                          onClick={() => handleRemoveHypothetical(transaction.id)}
                          className="self-end rounded-lg p-2 transition-colors hover:bg-[var(--app-surface-hover)] sm:self-auto"
                          title="Remover"
                        >
                          <X className="w-5 h-5 text-[#E837FD]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dica de uso */}
            <div className="bg-[#8537FD]/10 border border-[#8537FD]/30 rounded-xl p-4">
              <p className="text-sm text-[var(--app-text-muted)]">
                <strong className="text-[#8537FD]">💡 Dica:</strong> Adicione transações hipotéticas e
                veja em tempo real como elas afetam os saldos futuros no calendário.
                Os dias com transações simuladas mostrarão os valores ajustados.
              </p>
            </div>
          </div>

            {/* Botões de ação */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setIsProjectionModalOpen(false)}
                className={secondaryButtonClass}
              >
                Fechar
              </button>
              {hypotheticalTransactions.length > 0 && (
                <button
                  onClick={() => {
                    handleClearProjection();
                    setIsProjectionModalOpen(false);
                  }}
                  className="flex-1 px-4 py-3 bg-[#C27C75]/20 hover:bg-[#C27C75]/30 text-[#E837FD] rounded-xl font-semibold transition-colors"
                >
                  Limpar e Fechar
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
