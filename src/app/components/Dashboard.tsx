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
import {
  calculateCurrentBalance,
  getVariableExpensesForDate,
  checkProjectionStatus
} from '../data/mockData';
import { formatDateLocal, getTodayLocal, parseDateString, createDateFromString, formatDateToLocaleString } from '@/lib/utils/dateHelpers';

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const { estimates, loading: loadingEstimates } = useEstimates(user?.id);
  const { transactions, loading: loadingTransactions, createTransaction, cancelFutureRecurring } = useTransactions(user?.id);
  const { config, loading: loadingConfig, createConfig } = useConfig(user?.id);
  const { dailyPlans, loading: loadingPlans, upsertDailyPlan, getPlannedForDate, refresh: refreshDailyPlans } = useDailyPlans(user?.id);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Data atual
  const [saving, setSaving] = useState(false);

  // Auto-create default config if user doesn't have one
  useEffect(() => {
    if (!loadingConfig && !config && user?.id) {
      createConfig({
        initialBalance: 0,
        monthStartDay: 1,
        mainIncomeDay: 5,
        mainIncomeAmount: 0,
        dailyStandard: 0
      }).catch((err: any) => {
        console.error('Error creating default config:', err);
      });
    }
  }, [config, loadingConfig, user?.id, createConfig]);

  // Estados do modal unificado com abas
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('planned'); // 'planned' ou 'details'
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
  const loading = loadingEstimates || loadingTransactions || loadingConfig || loadingPlans;

  // Calcular valores baseados na data selecionada
  const currentDateStr = formatDateLocal(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const dailyStandard = config?.dailyStandard || 0;
  const initialBalance = config?.initialBalance || 0;
  const currentBalance = calculateCurrentBalance(initialBalance, transactions);

  // Usar a data real atual
  const today = getTodayLocal();
  const todayExpenses = getVariableExpensesForDate(today, transactions);
  const todayVariation = dailyStandard - todayExpenses;

  // Calcular próxima renda baseado no config do usuário
  const calculateNextIncome = (): { days: number; date: string } => {
    if (!config?.mainIncomeDay) return { days: 0, date: '' };

    const currentDate = createDateFromString(today);
    const currentDay = currentDate.getDate();
    const incomeDay = config.mainIncomeDay;

    let nextIncomeYear: number;
    let nextIncomeMonth: number;

    if (currentDay < incomeDay) {
      // Próximo salário é neste mês
      nextIncomeYear = currentDate.getFullYear();
      nextIncomeMonth = currentDate.getMonth();
    } else {
      // Próximo salário é no próximo mês
      const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      nextIncomeYear = tempDate.getFullYear();
      nextIncomeMonth = tempDate.getMonth();
    }

    const nextIncomeDate = new Date(nextIncomeYear, nextIncomeMonth, incomeDay);
    const diffTime = nextIncomeDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      days: diffDays,
      date: formatDateLocal(nextIncomeYear, nextIncomeMonth, incomeDay)
    };
  };

  // Calcular gastos comprometidos até a próxima renda
  const calculateCommittedUntilNextIncome = (nextIncomeDate: string): number => {
    // Gastos fixos e parcelas entre hoje e próxima renda
    const committed = transactions
      .filter(t =>
        t.date >= today &&
        t.date < nextIncomeDate &&
        (t.type === 'expense_fixed' || t.type === 'installment')
      )
      .reduce((sum, t) => sum + t.amount, 0);

    return committed;
  };

  // Calcular variação acumulada do mês (considera planejado vs realizado)
  const calculateMonthVariation = (): number => {
    const todayObj = createDateFromString(today);
    const currentMonth = todayObj.getMonth();
    const currentYear = todayObj.getFullYear();
    const monthStart = formatDateLocal(currentYear, currentMonth, 1);

    let totalVariation = 0;

    // Processar cada dia desde o início do mês até hoje
    const startDay = 1;
    const endDay = todayObj.getDate();

    for (let day = startDay; day <= endDay; day++) {
      const dateStr = formatDateLocal(currentYear, currentMonth, day);

      // Pegar gastos variáveis do dia
      const dayVariableExpenses = transactions
        .filter(t => t.type === 'expense_variable' && t.date === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);

      if (dayVariableExpenses > 0) {
        // Tem gastos reais: comparar com o padrão
        totalVariation += (dailyStandard - dayVariableExpenses);
      } else {
        // Não tem gastos: verificar se tem planejado customizado
        const customPlanned = getPlannedForDate(dateStr);
        const plannedAmount = customPlanned !== null ? customPlanned : dailyStandard;
        totalVariation += (dailyStandard - plannedAmount);
      }
    }

    return totalVariation;
  };

  // Novos cálculos
  const accumulatedVariation = calculateMonthVariation();
  const nextIncomeInfo = calculateNextIncome();
  const committedAmount = calculateCommittedUntilNextIncome(nextIncomeInfo.date);
  const projectionStatus = checkProjectionStatus(currentBalance, committedAmount, dailyStandard, nextIncomeInfo.days);

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
  const handleDayClick = (dateStr: string, tab: 'planned' | 'details' = 'planned') => {
    setSelectedDay(dateStr);
    setActiveTab(tab);
    setIsDayModalOpen(true);

    // Carregar o planejado do dia (se existir) ou usar o padrão
    const customPlanned = getPlannedForDate(dateStr);
    setPlannedForm({
      plannedAmount: customPlanned !== null ? customPlanned.toString() : dailyStandard.toString()
    });
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
      setSaving(true);
      await upsertDailyPlan(selectedDay, value);
      await refreshDailyPlans(); // Reload data after saving
      alert('Planejamento salvo com sucesso!');
      setIsDayModalOpen(false);
    } catch (err: any) {
      console.error('Error saving planned:', err);
      const errorMessage = err?.message || err?.error?.message || JSON.stringify(err);
      alert(`Erro ao salvar planejamento: ${errorMessage}`);
    } finally {
      setSaving(false);
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
          <div className="w-12 h-12 border-4 border-[#76C893] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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

  // Função para calcular o saldo até uma determinada data (planejado vs realizado)
  const calculateBalanceUntilDate = (targetDateStr: string): number => {
    // Para dias anteriores a hoje, retornar apenas o saldo inicial (sem processar)
    if (targetDateStr < today) {
      return initialBalance;
    }

    // Saldo inicial
    let balance = initialBalance;

    // A contagem começa de HOJE (data de cadastro do saldo) até a data alvo
    const startDate = today;
    const endDate = targetDateStr;

    const allDates: string[] = [];

    // Parse start and end dates
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

    const startDateObj = new Date(startYear, startMonth - 1, startDay);
    const endDateObj = new Date(endYear, endMonth - 1, endDay);

    // Generate all dates between start and end
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      allDates.push(formatDateLocal(d.getFullYear(), d.getMonth(), d.getDate()));
    }

    // Processar cada dia desde hoje até a data alvo
    allDates.forEach(dateStr => {
      // Pegar todas as transações deste dia específico
      const dayTransactions = [...transactions, ...hypotheticalTransactions].filter(t => t.date === dateStr);

      // 1. ENTRADAS (income) - SOMAR
      const incomes = dayTransactions.filter(t => t.type === 'income');
      incomes.forEach(t => {
        balance += t.amount;
      });

      // 2. GASTOS FIXOS (expense_fixed) - SUBTRAIR
      const fixedExpenses = dayTransactions.filter(t => t.type === 'expense_fixed');
      fixedExpenses.forEach(t => {
        balance -= t.amount;
      });

      // 3. PARCELAS (installment) - SUBTRAIR
      const installments = dayTransactions.filter(t => t.type === 'installment');
      installments.forEach(t => {
        balance -= t.amount;
      });

      // 4. INVESTIMENTOS (investment) - SUBTRAIR
      const investments = dayTransactions.filter(t => t.type === 'investment');
      investments.forEach(t => {
        balance -= t.amount;
      });

      // 5. GASTOS VARIÁVEIS - usar REALIZADO se existir, senão usar PLANEJADO
      const variableExpenses = dayTransactions.filter(t => t.type === 'expense_variable');

      if (variableExpenses.length > 0) {
        // Tem gasto real: usar o total real
        const totalReal = variableExpenses.reduce((sum, t) => sum + t.amount, 0);
        balance -= totalReal;
      } else {
        // Não tem gasto real: descontar o planejado (customizado ou padrão)
        const customPlanned = getPlannedForDate(dateStr);
        const plannedAmount = customPlanned !== null ? customPlanned : dailyStandard;
        balance -= plannedAmount;
      }
    });

    return balance;
  };

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
      const dayExpenses = dayTransactions
        .filter(t => t.type !== 'income')
        .reduce((sum, t) => sum + t.amount, 0);

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

  // Combinar transações reais com hipotéticas para projeção
  const allTransactions = [...transactions, ...hypotheticalTransactions];

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
    const dayExpenses = dayTransactions
      .filter(t => t.type !== 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    // Determinar status baseado no saldo
    let status = 'neutral';
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
      const dayExpenses = dayTransactions
        .filter(t => t.type !== 'income')
        .reduce((sum, t) => sum + t.amount, 0);

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
      <div className="text-center pt-4 pb-2">
        <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">AutoMoney</h1>

        {/* Month/Year Navigation */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mt-2">
          <button
            onClick={navigateToPreviousMonth}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#9B97CE]" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-white/10 rounded-lg transition-colors">
                <span className="text-[#9B97CE] text-base sm:text-lg font-medium">
                  {formatMonthYear(selectedDate)}
                </span>
                <CalendarIcon className="w-4 h-4 text-[#9B97CE]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#161618] border-white/20">
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
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#9B97CE]" />
          </button>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1 - Saldo Disponível */}
          <div className="text-center p-4 sm:p-0 bg-white/5 sm:bg-transparent rounded-xl sm:rounded-none border border-white/10 sm:border-0">
            <p className="text-[#9CA3AF] text-sm mb-1">Saldo disponível</p>
            <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="text-xs text-[#9CA3AF]">Saldo atual em conta</p>
          </div>

          {/* Card 2 - Valor Diário Padrão */}
          <div className="text-center p-4 sm:p-0 bg-white/5 sm:bg-transparent rounded-xl sm:rounded-none border border-white/10 sm:border-0 sm:border-x sm:border-white/10">
            <p className="text-[#9CA3AF] text-sm mb-1">Valor diário padrão</p>
            <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{dailyStandard.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="text-xs text-[#9CA3AF]">Base fixa calculada das estimativas</p>
          </div>

          {/* Card 3 - Gasto de Hoje */}
          <div className="text-center p-4 sm:p-0 bg-white/5 sm:bg-transparent rounded-xl sm:rounded-none border border-white/10 sm:border-0 sm:border-r sm:border-white/10">
            <p className="text-[#9CA3AF] text-sm mb-1">Gasto de hoje</p>
            <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{todayExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className={`text-xs ${todayVariation >= 0 ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
              {todayVariation >= 0 ? 'Economizou' : 'Gastou'} {Math.abs(todayVariation).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>

          {/* Card 4 - Gastos do Mês */}
          <div className="text-center p-4 sm:p-0 bg-white/5 sm:bg-transparent rounded-xl sm:rounded-none border border-white/10 sm:border-0">
            <p className="text-[#9CA3AF] text-sm mb-1">Gastos do mês</p>
            <p className={`text-2xl sm:text-3xl font-bold mb-1 ${accumulatedVariation >= 0 ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
              {accumulatedVariation >= 0 ? '+' : ''}{accumulatedVariation.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-[#9CA3AF]">{formatMonthYear(selectedDate)}</p>
          </div>
        </div>
      </div>

      {/* Balance Projection Section */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Projeção de saldo</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Sub-card 1 - Dias até próxima renda */}
          <div className="text-center p-4 sm:p-0 bg-white/5 sm:bg-transparent rounded-xl sm:rounded-none border border-white/10 sm:border-0">
            <p className="text-[#9CA3AF] text-sm mb-1">Dias até próxima renda</p>
            {nextIncomeInfo.days > 0 ? (
              <>
                <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{nextIncomeInfo.days} dias</p>
                <p className="text-xs text-[#9CA3AF]">Salário em {formatNextIncomeDate(nextIncomeInfo.date)}</p>
              </>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold text-white/50 mb-1">-</p>
                <p className="text-xs text-[#9CA3AF]">Configure o dia do salário</p>
              </>
            )}
          </div>

          {/* Sub-card 2 - Status da projeção */}
          <div className="text-center p-4 sm:p-0 bg-white/5 sm:bg-transparent rounded-xl sm:rounded-none border border-white/10 sm:border-0 sm:border-x sm:border-white/10">
            <p className="text-[#9CA3AF] text-sm mb-1">Status da projeção</p>
            <p className={`text-2xl sm:text-3xl font-bold mb-1 ${projectionStatus === 'positive' ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
              {projectionStatus === 'positive' ? 'Positivo' : 'Negativo'}
            </p>
            <p className={`text-xs ${projectionStatus === 'positive' ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
              {projectionStatus === 'positive' ? 'Saldo suficiente' : 'Saldo insuficiente'}
            </p>
          </div>

          {/* Sub-card 3 - Comprometido */}
          <div className="text-center p-4 sm:p-0 bg-white/5 sm:bg-transparent rounded-xl sm:rounded-none border border-white/10 sm:border-0">
            <p className="text-[#9CA3AF] text-sm mb-1">Comprometido</p>
            <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{committedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="text-xs text-[#9CA3AF]">Fixos + Parcelas futuras</p>
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

          let bgColor = 'bg-white/5';
          let borderColor = 'border-white/10';
          let dayNumberColor = 'text-white';
          let balanceColor = 'text-white';

          // Cores baseadas no saldo
          if (dayData.status === 'comfortable') {
            bgColor = 'bg-[#76C893]/10';
            borderColor = 'border-[#76C893]/50';
            dayNumberColor = 'text-[#76C893]';
            balanceColor = 'text-[#76C893]';
          } else if (dayData.status === 'good') {
            bgColor = 'bg-[#9B97CE]/10';
            borderColor = 'border-[#9B97CE]/50';
            dayNumberColor = 'text-[#9B97CE]';
            balanceColor = 'text-[#9B97CE]';
          } else if (dayData.status === 'warning') {
            bgColor = 'bg-[#E6C563]/10';
            borderColor = 'border-[#E6C563]/50';
            dayNumberColor = 'text-[#E6C563]';
            balanceColor = 'text-[#E6C563]';
          } else if (dayData.status === 'critical') {
            bgColor = 'bg-[#D97B7B]/10';
            borderColor = 'border-[#D97B7B]/50';
            dayNumberColor = 'text-[#D97B7B]';
            balanceColor = 'text-[#D97B7B]';
          }

          // Destaque especial para hoje
          if (dayData.isToday) {
            borderColor = 'border-[#76C893] border-4';
          }

          // Calcular entradas e saídas do dia
          const dayTransactions = allTransactions.filter(t => t.date === dayData.dateStr);
          const dayIncomes = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

          // Calcular saídas: considerar valor planejado se não houver gastos variáveis
          const variableExpenses = dayTransactions.filter(t => t.type === 'expense_variable');
          const otherExpenses = dayTransactions.filter(t => t.type !== 'income' && t.type !== 'expense_variable');
          const otherExpensesTotal = otherExpenses.reduce((sum, t) => sum + t.amount, 0);

          let dayExpenses = otherExpensesTotal;
          if (variableExpenses.length > 0) {
            // Tem gastos reais variáveis: usar o total real
            dayExpenses += variableExpenses.reduce((sum, t) => sum + t.amount, 0);
          } else {
            // Não tem gastos reais: usar o planejado (customizado ou padrão)
            const customPlanned = getPlannedForDate(dayData.dateStr);
            const plannedAmount = customPlanned !== null ? customPlanned : dailyStandard;
            dayExpenses += plannedAmount;
          }

          return (
            <div
              key={`${dayData.dateStr}-${index}`}
              onClick={() => handleDayClick(dayData.dateStr)}
              className={`${bgColor} ${borderColor} border-2 rounded-xl p-4 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform`}
            >
              {/* Header: Dia da semana + número */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs text-[#9CA3AF] uppercase">{getDayOfWeek(dayData.dateStr)}</span>
                  <span className={`ml-2 text-xl font-bold ${dayNumberColor}`}>{dayData.day}</span>
                </div>
              </div>

              {/* Saldo */}
              <div className="mb-3">
                <p className="text-xs text-[#9CA3AF] mb-1">Saldo</p>
                <p className={`text-2xl font-bold ${balanceColor}`}>
                  {dayData.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>

              {/* Total do Dia */}
              <div className="flex items-center justify-center pt-3 border-t border-white/10">
                <div className="text-center">
                  <p className="text-xs text-[#9CA3AF] mb-1">Total do dia</p>
                  {(() => {
                    const dayTotal = dayIncomes - dayExpenses;
                    return (
                      <p className={`text-sm font-medium ${dayTotal >= 0 ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
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
      <div className="hidden sm:block bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-3 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="text-center text-sm text-[#9CA3AF] font-medium py-2">
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
              // Calcular entradas e saídas do dia
              const dayTransactions = allTransactions.filter(t => t.date === dayData.dateStr);
              const dayIncomes = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

              // Calcular saídas: considerar valor planejado se não houver gastos variáveis
              const variableExpenses = dayTransactions.filter(t => t.type === 'expense_variable');
              const otherExpenses = dayTransactions.filter(t => t.type !== 'income' && t.type !== 'expense_variable');
              const otherExpensesTotal = otherExpenses.reduce((sum, t) => sum + t.amount, 0);

              let dayExpenses = otherExpensesTotal;
              if (variableExpenses.length > 0) {
                dayExpenses += variableExpenses.reduce((sum, t) => sum + t.amount, 0);
              } else {
                const customPlanned = getPlannedForDate(dayData.dateStr);
                const plannedAmount = customPlanned !== null ? customPlanned : dailyStandard;
                dayExpenses += plannedAmount;
              }

              return (
                <div
                  key={`${dayData.dateStr}-${index}`}
                  className="aspect-square bg-white/5 border border-white/5 rounded-2xl p-2 opacity-40 cursor-not-allowed relative flex flex-col"
                >
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
                        <span className={`text-white/50 ${dayTotal >= 0 ? 'text-[#76C893]/70' : 'text-[#D97B7B]/70'}`}>
                          {dayTotal >= 0 ? '+' : ''}{dayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              );
            }

            let bgColor = 'bg-white/5';
            let borderColor = 'border-white/10';
            let dayNumberColor = 'text-white';

            // Cores baseadas no saldo
            if (dayData.status === 'comfortable') {
              bgColor = 'bg-[#76C893]/10';
              borderColor = 'border-[#76C893]/50';
              dayNumberColor = 'text-[#76C893]';
            } else if (dayData.status === 'good') {
              bgColor = 'bg-[#9B97CE]/10';
              borderColor = 'border-[#9B97CE]/50';
              dayNumberColor = 'text-[#9B97CE]';
            } else if (dayData.status === 'warning') {
              bgColor = 'bg-[#E6C563]/10';
              borderColor = 'border-[#E6C563]/50';
              dayNumberColor = 'text-[#E6C563]';
            } else if (dayData.status === 'critical') {
              bgColor = 'bg-[#D97B7B]/10';
              borderColor = 'border-[#D97B7B]/50';
              dayNumberColor = 'text-[#D97B7B]';
            }

            // Destaque especial para hoje
            if (dayData.isToday) {
              borderColor = 'border-[#76C893] border-4';
            }

            // Calcular entradas e saídas do dia (incluindo transações hipotéticas)
            const dayTransactions = allTransactions.filter(t => t.date === dayData.dateStr);
            const dayIncomes = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

            // Calcular saídas: considerar valor planejado se não houver gastos variáveis
            const variableExpenses = dayTransactions.filter(t => t.type === 'expense_variable');
            const otherExpenses = dayTransactions.filter(t => t.type !== 'income' && t.type !== 'expense_variable');
            const otherExpensesTotal = otherExpenses.reduce((sum, t) => sum + t.amount, 0);

            let dayExpenses = otherExpensesTotal;
            if (variableExpenses.length > 0) {
              dayExpenses += variableExpenses.reduce((sum, t) => sum + t.amount, 0);
            } else {
              const customPlanned = getPlannedForDate(dayData.dateStr);
              const plannedAmount = customPlanned !== null ? customPlanned : dailyStandard;
              dayExpenses += plannedAmount;
            }

            return (
              <div
                key={`${dayData.dateStr}-${index}`}
                onClick={() => handleDayClick(dayData.dateStr)}
                className={`aspect-square ${bgColor} ${borderColor} border-2 rounded-2xl p-2 hover:scale-105 cursor-pointer transition-all relative flex flex-col`}
              >
                {/* Header: Número do dia */}
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-lg font-bold ${dayNumberColor}`}>
                    {dayData.day}
                  </span>
                </div>

                {/* Centro: Saldo */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-white/50 mb-0.5">Saldo</p>
                    <p className={`text-base font-bold ${dayNumberColor}`}>
                      {dayData.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                {/* Footer: Total do Dia */}
                <div className="flex items-center justify-center text-xs pt-1 border-t border-white/10">
                  {(() => {
                    const dayTotal = dayIncomes - dayExpenses;
                    return (
                      <span className={`${dayTotal >= 0 ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
                        {dayTotal >= 0 ? '+' : ''}{dayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#76C893]/30 border-2 border-[#76C893]/50"></div>
            <span className="text-sm text-white/70">Confortável ≥ R$ 2000 ✓</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#9B97CE]/20 border-2 border-[#9B97CE]/50"></div>
            <span className="text-sm text-white/70">Bom ≥ R$ 1000 ✓</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#E6C563]/20 border-2 border-[#E6C563]/50"></div>
            <span className="text-sm text-white/70">Atenção &lt; R$ 1000 ⚠</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#D97B7B]/20 border-2 border-[#D97B7B]/50"></div>
            <span className="text-sm text-white/70">Crítico (negativo) ✕</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        <button
          onClick={handleOpenProjection}
          className="bg-white/10 backdrop-blur-xl border-2 border-[#a6c88c]/30 hover:border-[#a6c88c] text-white rounded-2xl p-4 sm:p-6 flex items-center justify-center gap-3 transition-all hover:scale-105"
        >
          <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="font-semibold text-sm sm:text-base">E se?</span>
        </button>
      </div>

      {/* Modal Unificado com Abas */}
      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <TabsTrigger value="planned" className="flex-1 text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:text-white transition-colors">
                <DollarSign className="w-4 h-4 mr-2" />
                Gasto do dia
              </TabsTrigger>
              <TabsTrigger value="details" className="flex-1 text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:text-white transition-colors">
                <Eye className="w-4 h-4 mr-2" />
                Detalhes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="planned" className="mt-6">
              <div className="space-y-4">
                {/* Info sobre planejado */}
                <div className="p-4 bg-[#9B97CE]/10 border border-[#9B97CE]/30 rounded-xl">
                  <p className="text-sm text-white/70">
                    <strong className="text-[#9B97CE]">ℹ️ Como funciona:</strong> Se você não registrar gastos reais neste dia,
                    o sistema vai descontar automaticamente o valor planejado do seu saldo.
                    Defina um valor customizado aqui ou deixe em branco para usar o padrão.
                  </p>
                </div>

                {/* Valor Padrão */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-xs text-[#9CA3AF] mb-1">Valor diário padrão (global)</p>
                  <p className="text-2xl font-bold text-white">{dailyStandard.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>

                {/* Valor Planejado Customizado para este dia */}
                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                    Valor gasto neste dia
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
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    Deixe em branco para usar o valor padrão. Defina um valor específico se este dia for diferente.
                  </p>
                </div>

                {/* Botões de ação */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setIsDayModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSavePlanned}
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Salvando...' : 'Salvar planejamento'}
                  </button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              <div className="space-y-4">
                {(() => {
                  // Filtrar transações do dia
                  const dayTransactions = transactions.filter(t => t.date === selectedDay);
                  const dayExpenses = dayTransactions.filter(t => t.type !== 'income');
                  const dayIncomes = dayTransactions.filter(t => t.type === 'income');

                  const totalExpenses = dayExpenses.reduce((sum, t) => sum + t.amount, 0);
                  const totalIncomes = dayIncomes.reduce((sum, t) => sum + t.amount, 0);
                  const balance = totalIncomes - totalExpenses;

                  return (
                    <>
                      {/* Resumo do Dia */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="text-center">
                          <p className="text-xs text-[#9CA3AF] mb-1">Entradas</p>
                          <p className="text-lg font-bold text-[#76C893]">{totalIncomes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="text-center border-x border-white/10">
                          <p className="text-xs text-[#9CA3AF] mb-1">Saídas</p>
                          <p className="text-lg font-bold text-[#D97B7B]">{totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-[#9CA3AF] mb-1">Saldo do dia</p>
                          <p className={`text-lg font-bold ${balance >= 0 ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
                            {balance >= 0 ? '+' : ''}{balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>

                      {/* Planejado vs Realizado */}
                      {(() => {
                        const variableExpenses = dayTransactions
                          .filter(t => t.type === 'expense_variable')
                          .reduce((sum, t) => sum + t.amount, 0);

                        // Pegar o planejado (customizado ou padrão)
                        const customPlanned = getPlannedForDate(selectedDay);
                        const plannedAmount = customPlanned !== null ? customPlanned : dailyStandard;
                        const difference = plannedAmount - variableExpenses;
                        const hasRealExpenses = variableExpenses > 0;

                        return (
                          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <h4 className="text-sm font-semibold text-white mb-3">Planejado vs Realizado</h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-[#9CA3AF] mb-1">Planejado</p>
                                <p className="text-xl font-bold text-[#9B97CE]">{plannedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                {customPlanned !== null && (
                                  <p className="text-xs text-[#9B97CE] mt-1">Customizado</p>
                                )}
                              </div>
                              <div className="text-center border-x border-white/10">
                                <p className="text-xs text-[#9CA3AF] mb-1">Realizado</p>
                                <p className={`text-xl font-bold ${hasRealExpenses ? 'text-white' : 'text-white/30'}`}>
                                  {variableExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                                {!hasRealExpenses && (
                                  <p className="text-xs text-white/50 mt-1">Sem gastos</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-[#9CA3AF] mb-1">Diferença</p>
                                <p className={`text-xl font-bold ${difference >= 0 ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
                                  {difference >= 0 ? '+' : ''}{difference.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                                {difference >= 0 ? (
                                  <p className="text-xs text-[#76C893] mt-1">Economizou!</p>
                                ) : (
                                  <p className="text-xs text-[#D97B7B] mt-1">Excedeu</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Lista de Transações */}
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {dayTransactions.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-[#9CA3AF]">Nenhuma transação neste dia</p>
                          </div>
                        ) : (
                          <>
                            {/* Entradas */}
                            {dayIncomes.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-[#76C893] mb-2">Entradas</h4>
                                {dayIncomes.map(t => (
                                  <div key={t.id} className="flex items-center justify-between p-3 bg-[#76C893]/10 border border-[#76C893]/30 rounded-lg mb-2">
                                    <div>
                                      <p className="font-medium text-white">{t.description}</p>
                                      <p className="text-sm text-[#9CA3AF]">{t.category}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                      <p className="text-lg font-bold text-[#76C893]">+{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                      {t.recurring && (
                                        <div className="flex items-center gap-2">
                                          <span className="inline-block text-xs px-2 py-0.5 bg-[#76C893]/20 text-[#76C893] rounded">
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

                            {/* Gastos Variáveis */}
                            {(() => {
                              const variableExpenses = dayExpenses.filter(t => t.type === 'expense_variable');
                              return variableExpenses.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-[#9B97CE] mb-2">Gastos Variáveis</h4>
                                  {variableExpenses.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg mb-2">
                                      <div>
                                        <p className="font-medium text-white">{t.description}</p>
                                        <p className="text-sm text-[#9CA3AF]">{t.category}</p>
                                      </div>
                                      <p className="text-lg font-bold text-white">{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Gastos Fixos */}
                            {(() => {
                              const fixedExpenses = dayExpenses.filter(t => t.type === 'expense_fixed');
                              return fixedExpenses.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-[#8B7AB8] mb-2">Gastos Fixos</h4>
                                  {fixedExpenses.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-[#8B7AB8]/10 border border-[#8B7AB8]/30 rounded-lg mb-2">
                                      <div>
                                        <p className="font-medium text-white">{t.description}</p>
                                        <p className="text-sm text-[#9CA3AF]">{t.category}</p>
                                      </div>
                                      <div className="text-right flex flex-col items-end gap-1">
                                        <p className="text-lg font-bold text-white">{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        {t.recurring && (
                                          <div className="flex items-center gap-2">
                                            <span className="inline-block text-xs px-2 py-0.5 bg-[#8B7AB8]/20 text-[#8B7AB8] rounded">
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
                              );
                            })()}

                            {/* Parcelas */}
                            {(() => {
                              const installments = dayExpenses.filter(t => t.type === 'installment');
                              return installments.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-[#8B7AB8] mb-2">Parcelas</h4>
                                  {installments.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-[#8B7AB8]/10 border border-[#8B7AB8]/30 rounded-lg mb-2">
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
                              );
                            })()}

                            {/* Investimentos */}
                            {(() => {
                              const investments = dayTransactions.filter(t => t.type === 'investment');
                              return investments.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-[#9B97CE] mb-2">Investimentos</h4>
                                  {investments.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-[#9B97CE]/10 border border-[#9B97CE]/30 rounded-lg mb-2">
                                      <div>
                                        <p className="font-medium text-white">{t.description}</p>
                                        <p className="text-sm text-[#9CA3AF]">{t.category}</p>
                                      </div>
                                      <p className="text-lg font-bold text-[#9B97CE]">{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
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
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <div className="bg-[#76C893]/10 border border-[#76C893]/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-[#76C893] mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-[#76C893] mb-1">
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
                  >
                    <option value="income" className="bg-[#161618]">Entrada</option>
                    <option value="expense_variable" className="bg-[#161618]">Gasto Variável</option>
                    <option value="expense_fixed" className="bg-[#161618]">Gasto Fixo</option>
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={handleAddHypothetical}
                disabled={!projectionForm.amount || !projectionForm.date || !projectionForm.description}
                className="mt-4 w-full px-4 py-3 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="px-3 py-1.5 bg-[#D97B7B]/20 hover:bg-[#D97B7B]/30 text-[#D97B7B] rounded-lg text-sm font-medium transition-colors"
                  >
                    Limpar Tudo
                  </button>
                </div>

                <div className="space-y-2">
                  {hypotheticalTransactions.map((transaction: any) => {
                    const isIncome = transaction.type === 'income';
                    const bgColor = isIncome ? 'bg-[#76C893]/10' : 'bg-[#D97B7B]/10';
                    const borderColor = isIncome ? 'border-[#76C893]/30' : 'border-[#D97B7B]/30';
                    const textColor = isIncome ? 'text-[#76C893]' : 'text-[#D97B7B]';

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
                          <X className="w-5 h-5 text-[#D97B7B]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dica de uso */}
            <div className="bg-[#9B97CE]/10 border border-[#9B97CE]/30 rounded-xl p-4">
              <p className="text-sm text-white/70">
                <strong className="text-[#9B97CE]">💡 Dica:</strong> Adicione transações hipotéticas e
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
                className="flex-1 px-4 py-3 bg-[#D97B7B]/20 hover:bg-[#D97B7B]/30 text-[#D97B7B] rounded-xl font-semibold transition-colors"
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