import { useState, useEffect } from 'react';
import {
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Eye
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
import {
  checkProjectionStatus
} from '../data/mockData';
import { formatDateLocal, getTodayLocal, createDateFromString, formatDateToLocaleString } from '@/lib/utils/dateHelpers';
import {
  getRecordedVariableExpensesTotalForDate,
  getVariableExpenseEntriesForDate
} from '@/lib/utils/dailyExpenses';

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

type DayStatus = 'neutral' | 'comfortable' | 'good' | 'warning' | 'critical';

const DAY_STATUS_THEME: Record<DayStatus, {
  topBar: string;
}> = {
  neutral: {
    topBar: 'rgba(255,255,255,0.18)'
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
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderColor: isToday ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
      boxShadow: 'none'
    }
  };
};

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const { estimates, loading: loadingEstimates } = useEstimates(user?.id);
  const { transactions, loading: loadingTransactions, cancelFutureRecurring } = useTransactions(user?.id);
  const { config, loading: loadingConfig, createConfig } = useConfig(user?.id);
  const { loading: loadingPlans, upsertDailyPlan, getPlannedForDate, refresh: refreshDailyPlans } = useDailyPlans(user?.id);
  const {
    dailyExpenses,
    loading: loadingDailyExpenses,
    createDailyExpense,
    deleteDailyExpense,
    getExpensesForDate,
    refresh: refreshDailyExpenses
  } = useDailyExpenses(user?.id);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Data atual
  const [savingPlanned, setSavingPlanned] = useState(false);
  const [savingDailyExpense, setSavingDailyExpense] = useState(false);
  const [deletingDailyExpenseId, setDeletingDailyExpenseId] = useState<string | null>(null);
  const [configCreationAttempted, setConfigCreationAttempted] = useState(false);

  // Auto-create default config if user doesn't have one
  useEffect(() => {
    if (!loadingConfig && !config && user?.id && !configCreationAttempted) {
      setConfigCreationAttempted(true);
      createConfig({
        initialBalance: 0,
        monthStartDay: 1,
        mainIncomeDay: 5,
        mainIncomeAmount: 0,
        dailyStandard: 0,
        balanceStartDate: getTodayLocal()
      }).catch((err: any) => {
        // Silently ignore errors - if config exists, that's fine
        // The config will be loaded by the useConfig hook
        console.log('Config creation skipped (may already exist)');
      });
    }
  }, [config, loadingConfig, user?.id, createConfig, configCreationAttempted]);

  // Estados do modal unificado com abas
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('expenses'); // 'expenses' ou 'details'
  const [dailyExpenseForm, setDailyExpenseForm] = useState({
    title: '',
    category: '',
    amount: ''
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
  const loading = loadingEstimates || loadingTransactions || loadingConfig || loadingPlans || loadingDailyExpenses;

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

  const getRecordedVariableExpensesForDate = (dateStr: string) => {
    return getRecordedVariableExpensesTotalForDate(dateStr, dailyExpenses, transactions);
  };

  const getProjectedVariableExpensesForDate = (dateStr: string) => {
    const hypotheticalVariableExpenses = hypotheticalTransactions
      .filter(t => t.type === 'expense_variable' && t.date === dateStr)
      .reduce((sum, t) => sum + t.amount, 0);

    return getRecordedVariableExpensesForDate(dateStr) + hypotheticalVariableExpenses;
  };

  const getEffectiveVariableExpensesForDate = (dateStr: string) => {
    const projectedVariableExpenses = getProjectedVariableExpensesForDate(dateStr);
    return projectedVariableExpenses > 0 ? projectedVariableExpenses : getPlannedAmountForDate(dateStr);
  };

  const getDayTotals = (dateStr: string, dayTransactions: any[]) => {
    const dayIncomes = dayTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const nonVariableExpenses = dayTransactions
      .filter(t => t.type !== 'income' && t.type !== 'expense_variable')
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
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      balance -= dayTransactions
        .filter(t => t.type === 'expense_fixed')
        .reduce((sum, t) => sum + t.amount, 0);

      balance -= dayTransactions
        .filter(t => t.type === 'installment')
        .reduce((sum, t) => sum + t.amount, 0);

      balance -= dayTransactions
        .filter(t => t.type === 'investment')
        .reduce((sum, t) => sum + t.amount, 0);

      balance -= getEffectiveVariableExpensesForDate(dateStr);
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
        (t.type === 'expense_fixed' || t.type === 'installment')
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
        .filter(t => t.type !== 'income' && t.type !== 'expense_variable')
        .reduce((sum, t) => sum + t.amount, 0);

      total += nonVariableExpenses + getEffectiveVariableExpensesForDate(dateStr);
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
  const todayExpenses = getRecordedVariableExpensesForDate(today);
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
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const navigateToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
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
    setDailyExpenseForm({
      title: '',
      category: '',
      amount: ''
    });

    // Carregar o planejado do dia (se existir) ou usar o padrão
    setPlannedForm({
      plannedAmount: getPlannedAmountForDate(dateStr).toString()
    });
  };

  const handleAddDailyExpense = async () => {
    if (!selectedDay) return;

    if (!dailyExpenseForm.title || !dailyExpenseForm.category || !dailyExpenseForm.amount) {
      alert('Preencha título, categoria e valor do gasto.');
      return;
    }

    const amount = parseFloat(dailyExpenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    try {
      setSavingDailyExpense(true);
      await createDailyExpense({
        date: selectedDay,
        title: dailyExpenseForm.title,
        category: dailyExpenseForm.category,
        amount
      });
      await refreshDailyExpenses();
      setDailyExpenseForm({
        title: '',
        category: '',
        amount: ''
      });
    } catch (err) {
      console.error('Error creating daily expense:', err);
      alert('Erro ao adicionar gasto diário. Tente novamente.');
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
      await refreshDailyExpenses();
    } catch (err) {
      console.error('Error deleting daily expense:', err);
      alert('Erro ao remover gasto diário. Tente novamente.');
    } finally {
      setDeletingDailyExpenseId(null);
    }
  };

  const handleSavePlanned = async () => {
    if (plannedForm.plannedAmount === '') {
      alert('Preencha o valor planejado');
      return;
    }

    const value = parseFloat(plannedForm.plannedAmount);
    if (isNaN(value) || value < 0) {
      alert('Valor inválido. Digite um número válido.');
      return;
    }

    try {
      setSavingPlanned(true);
      await upsertDailyPlan(selectedDay, value);
      await refreshDailyPlans(); // Reload data after saving
      alert('Planejamento salvo com sucesso!');
    } catch (err: any) {
      console.error('Error saving planned:', err);
      const errorMessage = err?.message || err?.error?.message || JSON.stringify(err);
      alert(`Erro ao salvar planejamento: ${errorMessage}`);
    } finally {
      setSavingPlanned(false);
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
          <p className="text-white">Carregando dashboard...</p>
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
      alert('Recorrências futuras canceladas com sucesso!');
    } catch (error) {
      console.error('Error canceling recurring transactions:', error);
      alert('Erro ao cancelar recorrências. Tente novamente.');
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
        <div className="flex items-center justify-center gap-2 sm:gap-4 mt-2">
          <button
            onClick={navigateToPreviousMonth}
            className="app-pill rounded-2xl p-2 transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="app-pill flex items-center gap-2 rounded-2xl px-3 py-2 transition-colors sm:px-4">
                <span className="text-base font-medium text-white sm:text-lg">
                  {formatMonthYear(selectedDate)}
                </span>
                <CalendarIcon className="w-4 h-4 text-white" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#181818] border-white/20">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <button
            onClick={navigateToNextMonth}
            className="app-pill rounded-2xl p-2 transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="app-panel rounded-[2rem] p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1 - Saldo Disponível */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Saldo disponível</p>
            <p className="mb-1 text-2xl font-bold text-white sm:text-3xl">{availableBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="text-xs text-[var(--app-text-faint)]">Saldo disponível hoje</p>
          </div>

          {/* Card 2 - Valor Diário Padrão */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:rounded-none sm:border-0 sm:border-x sm:border-white/10 sm:bg-transparent sm:p-0">
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Valor diário padrão</p>
            <p className="mb-1 text-2xl font-bold text-white sm:text-3xl">{dailyStandard.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="text-xs text-[var(--app-text-faint)]">Base fixa calculada das estimativas</p>
          </div>

          {/* Card 3 - Gasto de Hoje */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:rounded-none sm:border-0 sm:border-r sm:border-white/10 sm:bg-transparent sm:p-0">
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Gasto de hoje</p>
            <p className="mb-1 text-2xl font-bold text-white sm:text-3xl">{todayExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            {todayVariation === 0 ? (
              <p className="text-xs text-[var(--app-text-muted)]">Dentro do planejado</p>
            ) : (
              <p className="text-xs text-[var(--app-text-muted)]">
                {Math.abs(todayVariation).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} {todayVariation > 0 ? 'acima' : 'abaixo'} do planejado
              </p>
            )}
          </div>

          {/* Card 4 - Gastos do Mês */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Gastos do mês</p>
            <p className="mb-1 text-2xl font-bold text-white sm:text-3xl">
              {monthExpensesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-[var(--app-text-muted)]">
              {monthRemainingTotal >= 0 ? 'Sobrará ' : 'Faltará '}
              {Math.abs(monthRemainingTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </div>

      {/* Balance Projection Section */}
      <div className="app-panel rounded-[2rem] p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white sm:text-xl">Projeção de saldo</h2>
            <p className="mt-1 text-xs text-[var(--app-text-faint)]">Simule cenários sem sair do contexto do mês.</p>
          </div>
          <button
            onClick={handleOpenProjection}
            className="app-button-secondary inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm"
          >
            <DollarSign className="h-4 w-4 text-[var(--app-accent)]" />
            <span className="font-medium text-[var(--app-text)]">Simular</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Sub-card 1 - Dias até próxima renda */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Dias até próxima renda</p>
            {nextIncomeInfo.date ? (
              <>
                <p className="mb-1 text-2xl font-bold text-white sm:text-3xl">
                  {nextIncomeInfo.days === 0 ? 'Hoje' : `${nextIncomeInfo.days} ${nextIncomeInfo.days === 1 ? 'dia' : 'dias'}`}
                </p>
                <p className="text-xs text-[var(--app-text-faint)]">Próxima renda em {formatNextIncomeDate(nextIncomeInfo.date)}</p>
              </>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold text-white/50 mb-1">-</p>
                <p className="text-xs text-[var(--app-text-faint)]">Configure o dia do salário</p>
              </>
            )}
          </div>

          {/* Sub-card 2 - Status da projeção */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:rounded-none sm:border-0 sm:border-x sm:border-white/10 sm:bg-transparent sm:p-0">
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Status da projeção</p>
            <p className="mb-1 text-2xl font-bold text-white sm:text-3xl">
              {projectionStatus === 'positive' ? 'Positivo' : 'Negativo'}
            </p>
            <p className="text-xs text-[var(--app-text-faint)]">
              {projectionStatus === 'positive' ? 'Saldo suficiente' : 'Saldo insuficiente'}
            </p>
          </div>

          {/* Sub-card 3 - Comprometido */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Comprometido</p>
            <p className="mb-1 text-2xl font-bold text-white sm:text-3xl">{committedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="text-xs text-[var(--app-text-faint)]">Falta pagar até a próxima renda</p>
          </div>
        </div>
      </div>

      {/* Mobile Calendar - Lista Vertical */}
      <div className="sm:hidden space-y-3">
        <h2 className="text-lg font-semibold text-white mb-3 px-2">Calendário do Mês</h2>

        {calendarDays.map((dayData, index) => {
          if (!dayData) return null;

          // Pular dias de outros meses na versão mobile (só mostrar no desktop)
          if (dayData.isOtherMonth) return null;

          const statusTheme = getDayStatusTheme(dayData.status as DayStatus, dayData.isToday);

          // Calcular entradas e saídas do dia
          const dayTransactions = allTransactions.filter(t => t.date === dayData.dateStr);
          const dayIncomes = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
          const { dayExpenses } = getDayTotals(dayData.dateStr, dayTransactions);

          return (
            <div
              key={`${dayData.dateStr}-${index}`}
              onClick={() => handleDayClick(dayData.dateStr)}
              className="relative overflow-hidden rounded-[1.35rem] border-2 p-4 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={statusTheme.cardStyle}
            >
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: statusTheme.topBar }} />

              {/* Header: Dia da semana + número */}
              <div className="mb-3 flex items-start justify-between gap-3 pt-1">
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--app-text-faint)]">{getDayOfWeek(dayData.dateStr)}</span>
                  <span className="ml-2 text-xl font-bold text-white">{dayData.day}</span>
                </div>
              </div>

              {/* Saldo */}
              <div className="mb-3">
                <p className="mb-1 text-xs text-[var(--app-text-faint)]">Saldo</p>
                <p className="text-2xl font-bold text-white">
                  {dayData.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>

              {/* Total do Dia */}
              <div className="flex items-center justify-center pt-3 border-t border-white/10">
                <div className="text-center">
                  <p className="mb-1 text-xs text-[var(--app-text-faint)]">Total do dia</p>
                  {(() => {
                    const dayTotal = dayIncomes - dayExpenses;
                    return (
                      <p
                        className="text-sm font-semibold text-white"
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
              const dayIncomes = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
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
                    <span className="text-lg font-bold text-white/70">
                      {dayData.day}
                    </span>
                  </div>

                  {/* Centro: Saldo */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xs text-white/40 mb-0.5">Saldo</p>
                      <p className="text-base font-bold text-white/70">
                        {dayData.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  {/* Footer: Total do Dia */}
                  <div className="flex items-center justify-center text-xs pt-1 border-t border-white/10">
                    {(() => {
                      const dayTotal = dayIncomes - dayExpenses;
                      return (
                        <span className="text-white/65">
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
            const dayIncomes = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
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
                  <span className="text-lg font-bold text-white">
                    {dayData.day}
                  </span>
                </div>

                {/* Centro: Saldo */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="mb-0.5 text-[11px] text-[var(--app-text-faint)]">Saldo</p>
                    <p className="text-base font-bold text-white">
                      {dayData.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                {/* Footer: Total do Dia */}
                <div className="flex items-center justify-center text-xs pt-1 border-t border-white/10">
                  {(() => {
                    const dayTotal = dayIncomes - dayExpenses;
                    return (
                      <span
                        className="font-semibold text-white/80"
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[2rem] app-panel-strong">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {selectedDay && formatDateToLocaleString(selectedDay, 'pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Adicione gastos ou veja os detalhes deste dia
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="w-full bg-white/5 border border-white/10 grid grid-cols-2">
              <TabsTrigger value="expenses" className="flex-1 text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:text-white transition-colors">
                <DollarSign className="w-4 h-4 mr-2" />
                Lançamentos do dia
              </TabsTrigger>
              <TabsTrigger value="details" className="flex-1 text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:text-white transition-colors">
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
                const recordedTotal = getRecordedVariableExpensesForDate(selectedDay);
                const plannedAmount = getPlannedAmountForDate(selectedDay);

                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#8537FD]/10 border border-[#8537FD]/30 rounded-xl">
                      <p className="text-sm text-white/70">
                        <strong className="text-[#8537FD]">ℹ️ Como funciona:</strong> cada gasto diário agora é um lançamento com
                        título, categoria e valor. O total do dia é a soma desses lançamentos. Se não houver lançamento real,
                        o sistema usa o valor planejado deste dia na projeção.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <p className="text-xs text-[#9CA3AF] mb-1">Gasto lançado</p>
                        <p className="text-2xl font-bold text-white">
                          {recordedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <p className="text-xs text-[#9CA3AF] mb-1">Planejado do dia</p>
                        <p className="text-2xl font-bold text-[#8537FD]">
                          {plannedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <p className="text-xs text-[#9CA3AF] mb-1">Valor diário padrão</p>
                        <p className="text-2xl font-bold text-white">
                          {dailyStandard.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                      <h4 className="text-sm font-semibold text-white">Adicionar gasto diário</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                            Título *
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Almoço, Uber, Farmácia"
                            value={dailyExpenseForm.title}
                            onChange={(e) => setDailyExpenseForm({ ...dailyExpenseForm, title: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                            Categoria *
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Alimentação, Transporte"
                            value={dailyExpenseForm.category}
                            onChange={(e) => setDailyExpenseForm({ ...dailyExpenseForm, category: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                          Valor *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={dailyExpenseForm.amount}
                            onChange={(e) => setDailyExpenseForm({ ...dailyExpenseForm, amount: e.target.value })}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleAddDailyExpense}
                        disabled={savingDailyExpense}
                        className="w-full px-4 py-3 bg-[var(--app-accent)] hover:opacity-90 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingDailyExpense ? 'Salvando lançamento...' : 'Adicionar lançamento'}
                      </button>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">Lançamentos cadastrados</h4>
                        <span className="text-sm text-[#9CA3AF]">
                          {dailyExpenseEntries.length} item(ns)
                        </span>
                      </div>

                      {dailyExpenseEntries.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-[#9CA3AF]">Nenhum gasto diário cadastrado para esta data.</p>
                        </div>
                      ) : (
                        dailyExpenseEntries.map(expense => (
                          <div key={expense.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                            <div>
                              <p className="font-medium text-white">{expense.title}</p>
                              <p className="text-sm text-[#9CA3AF]">{expense.category}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-lg font-bold text-white">
                                {expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                              <button
                                onClick={() => handleDeleteDailyExpense(expense.id)}
                                disabled={deletingDailyExpenseId === expense.id}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-300 transition-colors disabled:opacity-50"
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
                      <div className="bg-[#8537FD]/10 border border-[#8537FD]/20 rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-white">Lançamentos legados</h4>
                        <p className="text-xs text-white/50">
                          Estes gastos vieram do modelo antigo de transações variáveis e continuam contando no total do dia.
                        </p>
                        {legacyVariableEntries.map(entry => (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                            <div>
                              <p className="font-medium text-white">{entry.title}</p>
                              <p className="text-sm text-[#9CA3AF]">{entry.category}</p>
                            </div>
                            <p className="text-lg font-bold text-white">
                              {entry.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">Planejamento do dia</h4>
                        <p className="text-xs text-white/50 mt-1">
                          Se não houver lançamentos reais para este dia, a projeção usa este valor. Deixe igual ao padrão ou ajuste se necessário.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                          Valor planejado para o dia
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder={`Padrão: ${dailyStandard.toFixed(2)}`}
                            value={plannedForm.plannedAmount}
                            onChange={(e) => setPlannedForm({ ...plannedForm, plannedAmount: e.target.value })}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setIsDayModalOpen(false)}
                          className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-xl transition-colors"
                        >
                          Fechar
                        </button>
                        <button
                          onClick={handleSavePlanned}
                          disabled={savingPlanned}
                          className="flex-1 px-4 py-3 bg-[var(--app-accent)] hover:opacity-90 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  const fixedExpenses = dayTransactions.filter(t => t.type === 'expense_fixed');
                  const installments = dayTransactions.filter(t => t.type === 'installment');
                  const investments = dayTransactions.filter(t => t.type === 'investment');
                  const variableExpenseEntries = getVariableExpenseEntriesForDate(selectedDay, dailyExpenses, transactions)
                    .filter(entry => entry.source === 'daily_expense' || entry.paid);

                  const totalVariableExpenses = variableExpenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
                  const totalFixedExpenses = [...fixedExpenses, ...installments, ...investments]
                    .reduce((sum, transaction) => sum + transaction.amount, 0);
                  const totalExpenses = totalVariableExpenses + totalFixedExpenses;
                  const totalIncomes = dayIncomes.reduce((sum, transaction) => sum + transaction.amount, 0);
                  const balance = totalIncomes - totalExpenses;
                  const plannedAmount = getPlannedAmountForDate(selectedDay);
                  const difference = plannedAmount - totalVariableExpenses;
                  const hasRealExpenses = totalVariableExpenses > 0;

                  return (
                    <>
                      <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="text-center">
                          <p className="text-xs text-[#9CA3AF] mb-1">Entradas</p>
                          <p className="text-lg font-bold text-[#AFFD37]">{totalIncomes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="text-center border-x border-white/10">
                          <p className="text-xs text-[#9CA3AF] mb-1">Saídas</p>
                          <p className="text-lg font-bold text-[#E837FD]">{totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-[#9CA3AF] mb-1">Saldo do dia</p>
                          <p className={`text-lg font-bold ${balance >= 0 ? 'text-[#AFFD37]' : 'text-[#E837FD]'}`}>
                            {balance >= 0 ? '+' : ''}{balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <h4 className="text-sm font-semibold text-white mb-3">Planejado vs Realizado</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-[#9CA3AF] mb-1">Planejado</p>
                            <p className="text-xl font-bold text-[#8537FD]">{plannedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          </div>
                          <div className="text-center border-x border-white/10">
                            <p className="text-xs text-[#9CA3AF] mb-1">Realizado</p>
                            <p className={`text-xl font-bold ${hasRealExpenses ? 'text-white' : 'text-white/30'}`}>
                              {totalVariableExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            {!hasRealExpenses && (
                              <p className="text-xs text-white/50 mt-1">Sem gastos</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[#9CA3AF] mb-1">Diferença</p>
                            <p className={`text-xl font-bold ${difference >= 0 ? 'text-[#AFFD37]' : 'text-[#E837FD]'}`}>
                              {difference >= 0 ? '+' : ''}{difference.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            {difference >= 0 ? (
                              <p className="text-xs text-[#AFFD37] mt-1">Economizou!</p>
                            ) : (
                              <p className="text-xs text-[#E837FD] mt-1">Excedeu</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {dayTransactions.length === 0 && variableExpenseEntries.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-[#9CA3AF]">Nenhum lançamento neste dia</p>
                          </div>
                        ) : (
                          <>
                            {dayIncomes.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-[#AFFD37] mb-2">Entradas</h4>
                                {dayIncomes.map(t => (
                                  <div key={t.id} className="flex items-center justify-between p-3 bg-[#AFFD37]/10 border border-[#AFFD37]/30 rounded-lg mb-2">
                                    <div>
                                      <p className="font-medium text-white">{t.description}</p>
                                      <p className="text-sm text-[#9CA3AF]">{t.category}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                      <p className="text-lg font-bold text-[#AFFD37]">+{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                      {t.recurring && (
                                        <div className="flex items-center gap-2">
                                          <span className="inline-block text-xs px-2 py-0.5 bg-[#AFFD37]/20 text-[#AFFD37] rounded">
                                            Recorrente
                                          </span>
                                          <button
                                            onClick={() => handleCancelRecurring(t.id, t.description)}
                                            className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                                            title="Cancelar recorrências futuras"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {variableExpenseEntries.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-[#8537FD] mb-2">Gastos Diários</h4>
                                {variableExpenseEntries.map(entry => (
                                  <div key={entry.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg mb-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-white">{entry.title}</p>
                                        {entry.source === 'legacy_transaction' && (
                                          <span className="inline-block text-xs px-2 py-0.5 bg-[#8537FD]/20 text-[#8537FD] rounded">
                                            Legado
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-[#9CA3AF]">{entry.category}</p>
                                    </div>
                                    <p className="text-lg font-bold text-white">{entry.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {fixedExpenses.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-[#747C8B] mb-2">Gastos Fixos</h4>
                                {fixedExpenses.map(t => (
                                  <div key={t.id} className="flex items-center justify-between p-3 bg-[#747C8B]/10 border border-[#747C8B]/30 rounded-lg mb-2">
                                    <div>
                                      <p className="font-medium text-white">{t.description}</p>
                                      <p className="text-sm text-[#9CA3AF]">{t.category}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                      <p className="text-lg font-bold text-white">{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                      {t.recurring && (
                                        <div className="flex items-center gap-2">
                                          <span className="inline-block text-xs px-2 py-0.5 bg-[#747C8B]/20 text-[#747C8B] rounded">
                                            Recorrente
                                          </span>
                                          <button
                                            onClick={() => handleCancelRecurring(t.id, t.description)}
                                            className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                                            title="Cancelar recorrências futuras"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {installments.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-[#747C8B] mb-2">Parcelas</h4>
                                {installments.map(t => (
                                  <div key={t.id} className="flex items-center justify-between p-3 bg-[#747C8B]/10 border border-[#747C8B]/30 rounded-lg mb-2">
                                    <div>
                                      <p className="font-medium text-white">{t.description}</p>
                                      <p className="text-sm text-[#9CA3AF]">
                                        {t.category} • Parcela {t.installmentNumber}/{t.totalInstallments}
                                      </p>
                                    </div>
                                    <p className="text-lg font-bold text-white">{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {investments.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-[#8537FD] mb-2">Investimentos</h4>
                                {investments.map(t => (
                                  <div key={t.id} className="flex items-center justify-between p-3 bg-[#8537FD]/10 border border-[#8537FD]/30 rounded-lg mb-2">
                                    <div>
                                      <p className="font-medium text-white">{t.description}</p>
                                      <p className="text-sm text-[#9CA3AF]">{t.category}</p>
                                    </div>
                                    <p className="text-lg font-bold text-[#8537FD]">{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
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
        </DialogContent>
      </Dialog>

      {/* Modal de Projeção "E se?" */}
      <Dialog open={isProjectionModalOpen} onOpenChange={setIsProjectionModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[2rem] app-panel-strong">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              E se?
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
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
                    <p className="text-sm text-white/70">
                      Você tem {hypotheticalTransactions.length} transação(ões) hipotética(s) afetando os saldos do calendário.
                      Os valores mostrados são simulações.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Formulário de Adicionar Transação Hipotética */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Adicionar Transação Hipotética</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                    Tipo *
                  </label>
                  <select
                    value={projectionForm.type}
                    onChange={(e) => setProjectionForm({ ...projectionForm, type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
                  >
                    <option value="income" className="bg-[#111214]">Entrada</option>
                    <option value="expense_variable" className="bg-[#111214]">Gasto Variável</option>
                    <option value="expense_fixed" className="bg-[#111214]">Gasto Fixo</option>
                  </select>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Salário extra, Compra supermercado"
                    value={projectionForm.description}
                    onChange={(e) => setProjectionForm({ ...projectionForm, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
                  />
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                    Valor *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={projectionForm.amount}
                    onChange={(e) => setProjectionForm({ ...projectionForm, amount: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
                  />
                </div>

                {/* Data */}
                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={projectionForm.date}
                    onChange={(e) => setProjectionForm({ ...projectionForm, date: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={handleAddHypothetical}
                disabled={!projectionForm.amount || !projectionForm.date || !projectionForm.description}
                className="mt-4 w-full px-4 py-3 bg-[var(--app-accent)] hover:opacity-90 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar à Simulação
              </button>
            </div>

            {/* Lista de Transações Hipotéticas */}
            {hypotheticalTransactions.length > 0 && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Transações na Simulação</h3>
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
                        className={`${bgColor} ${borderColor} border rounded-lg p-4 flex items-center justify-between`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className={`text-lg font-bold ${textColor}`}>
                              {isIncome ? '+' : '-'}{transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            <span className="text-white font-medium">
                              {transaction.description}
                            </span>
                            <span className="px-2 py-0.5 bg-white/10 text-white/70 rounded text-xs">
                              {transaction.type === 'income' ? 'Entrada' : transaction.type === 'expense_fixed' ? 'Fixo' : 'Variável'}
                            </span>
                          </div>
                          <p className="text-sm text-white/50 mt-1">
                            {formatDateToLocaleString(transaction.date, 'pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        <button
                          onClick={() => handleRemoveHypothetical(transaction.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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
              <p className="text-sm text-white/70">
                <strong className="text-[#8537FD]">💡 Dica:</strong> Adicione transações hipotéticas e
                veja em tempo real como elas afetam os saldos futuros no calendário.
                Os dias com transações simuladas mostrarão os valores ajustados.
              </p>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsProjectionModalOpen(false)}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-xl transition-colors"
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
