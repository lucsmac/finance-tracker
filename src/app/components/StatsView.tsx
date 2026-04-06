import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3,
  Download,
  Copy,
  Share2,
  LoaderCircle,
  Image as ImageIcon
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  isCashInflowTransactionType,
  isExpenseAnalysisTransactionType,
  type Transaction,
} from '../data/mockData';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEstimates } from '../../lib/hooks/useEstimates';
import { useTransactions } from '../../lib/hooks/useTransactions';
import { useConfig } from '../../lib/hooks/useConfig';
import { useDailyExpenses } from '@/lib/hooks/useDailyExpenses';
import { useDailyPlans } from '@/lib/hooks/useDailyPlans';
import {
  getEffectiveVariableCashExpensesTotalForDate,
  sumDailyExpensesUntilDate,
} from '@/lib/utils/dailyExpenses';
import { isCashImpactTransaction } from '@/lib/utils/transactionPayments';
import { formatDateLocal } from '@/lib/utils/dateHelpers';
import {
  buildReportFilename,
  copyBlobAsImage,
  downloadBlobAsFile,
  renderReportShareImage,
  shareBlobAsImage,
  type ReportSharePayload,
} from '@/lib/utils/reportShare';

type ViewMode = 'month' | 'year';
type ReportAction = 'download' | 'copy' | 'share';

interface ReportFeedback {
  tone: 'success' | 'error' | 'info';
  message: string;
}

interface StatsViewProps {
  selectedMonth: Date;
  onSelectedMonthChange: (date: Date) => void;
}

// Função para formatar valores em Real brasileiro
const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export function StatsView({ selectedMonth, onSelectedMonthChange }: StatsViewProps) {
  const selectedDate = selectedMonth;
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [reportAction, setReportAction] = useState<ReportAction | null>(null);
  const [reportFeedback, setReportFeedback] = useState<ReportFeedback | null>(null);

  // Get authenticated user
  const { user } = useAuth();

  // Fetch data from Supabase
  const { estimates, loading: estimatesLoading, error: estimatesError } = useEstimates(user?.id);
  const { transactions, loading: transactionsLoading, error: transactionsError } = useTransactions(user?.id);
  const { config, loading: configLoading, error: configError } = useConfig(user?.id);
  const { dailyExpenses, loading: dailyExpensesLoading, error: dailyExpensesError } = useDailyExpenses(user?.id);
  const { getPlannedForDate, loading: dailyPlansLoading, error: dailyPlansError } = useDailyPlans(user?.id);

  const loading = estimatesLoading || transactionsLoading || configLoading || dailyExpensesLoading || dailyPlansLoading;
  const error = estimatesError || transactionsError || configError || dailyExpensesError || dailyPlansError;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--app-accent)] mx-auto mb-4"></div>
          <p className="text-[var(--app-text-muted)]">Carregando análises...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-[var(--app-text-muted)]">Erro ao carregar dados: {error.message}</p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  // Cálculos básicos
  const dailyStandard = config?.dailyStandard || 0;
  const initialBalance = config?.initialBalance || 0;
  const balanceStartDate = config?.balanceStartDate || today;

  const getPlannedAmountForDate = (dateStr: string) => {
    const customPlanned = getPlannedForDate(dateStr);
    return customPlanned !== null ? customPlanned : dailyStandard;
  };

  const getEffectiveCashVariableExpensesForDate = (dateStr: string) => {
    return getEffectiveVariableCashExpensesTotalForDate({
      date: dateStr,
      plannedAmount: getPlannedAmountForDate(dateStr),
      dailyExpenses,
      transactions,
    });
  };

  const calculateBalanceUntilDate = (targetDateStr: string): number => {
    if (targetDateStr < balanceStartDate) {
      return initialBalance;
    }

    let balance = initialBalance;

    const [startYear, startMonth, startDay] = balanceStartDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = targetDateStr.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = formatDateLocal(date.getFullYear(), date.getMonth(), date.getDate());
      const dayTransactions = transactions.filter(transaction => transaction.date === dateStr);

      balance += dayTransactions
        .filter(transaction => isCashInflowTransactionType(transaction.type))
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      balance -= dayTransactions
        .filter(transaction => isCashImpactTransaction(transaction) && transaction.type !== 'expense_variable')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      balance -= getEffectiveCashVariableExpensesForDate(dateStr);
    }

    return balance;
  };

  // Funções de navegação
  const navigatePrevious = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') {
      onSelectedMonthChange(new Date(newDate.getFullYear(), newDate.getMonth() - 1, 1));
    } else {
      newDate.setFullYear(newDate.getFullYear() - 1);
      onSelectedMonthChange(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    }
  };

  const navigateNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') {
      onSelectedMonthChange(new Date(newDate.getFullYear(), newDate.getMonth() + 1, 1));
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
      onSelectedMonthChange(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    }
  };

  const formatPeriod = (date: Date) => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    if (viewMode === 'month') {
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    } else {
      return `${date.getFullYear()}`;
    }
  };

  // Análise de dados baseada no modo de visualização
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  let lastDay: Date;

  if (viewMode === 'month') {
    lastDay = new Date(year, month + 1, 0);
  } else {
    lastDay = new Date(year, 11, 31);
  }

  // Usar comparação de strings para evitar problemas de timezone
  const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDayStr = viewMode === 'month'
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    : `${year}-12-31`;

  const transactionsInPeriod = transactions.filter(t => {
    return t.date >= firstDayStr && t.date <= lastDayStr;
  });
  const dailyExpensesInPeriod = dailyExpenses.filter(expense => expense.date >= firstDayStr && expense.date <= lastDayStr);

  // Métricas gerais - incluir tanto pagas quanto não pagas para análise completa
  const totalIncome = transactionsInPeriod
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactionsInPeriod
    .filter(t => isExpenseAnalysisTransactionType(t.type))
    .reduce((sum, t) => sum + t.amount, 0) +
    dailyExpensesInPeriod.reduce((sum, expense) => sum + expense.amount, 0);

  const variableExpenses = transactionsInPeriod
    .filter(t => t.type === 'expense_variable')
    .reduce((sum, t) => sum + t.amount, 0) +
    dailyExpensesInPeriod.reduce((sum, expense) => sum + expense.amount, 0);

  const fixedExpenses = transactionsInPeriod
    .filter(t => (t.type === 'expense_fixed' || t.type === 'installment'))
    .reduce((sum, t) => sum + t.amount, 0);

  // Função auxiliar para calcular saldo sem filtro de 'paid' (para análise)
  const calculateBalanceForAnalysis = (initialBalance: number, transactionsToInclude: Transaction[]): number => {
    let balance = initialBalance;
    transactionsToInclude.forEach(t => {
      if (isCashInflowTransactionType(t.type)) {
        balance += t.amount;
      } else if (isCashImpactTransaction(t)) {
        balance -= t.amount;
      }
    });
    return balance;
  };

  // Calcular saldo no início do período (antes do primeiro dia)
  // e saldo no final do período (após o último dia)
  const transactionsBeforeFirstDay = transactions.filter(t => t.date < firstDayStr);
  const transactionsUntilLastDay = transactions.filter(t => t.date <= lastDayStr);
  const firstDayDate = new Date(`${firstDayStr}T12:00:00`);
  firstDayDate.setDate(firstDayDate.getDate() - 1);
  const dayBeforeFirstDayStr = formatDateLocal(
    firstDayDate.getFullYear(),
    firstDayDate.getMonth(),
    firstDayDate.getDate(),
  );
  const cashDailyExpensesBeforeFirstDay = sumDailyExpensesUntilDate(dailyExpenses, dayBeforeFirstDayStr, undefined, { cashImpactOnly: true });
  const cashDailyExpensesUntilLastDay = sumDailyExpensesUntilDate(dailyExpenses, lastDayStr, undefined, { cashImpactOnly: true });

  const balanceBeforePeriod = calculateBalanceForAnalysis(
    config?.initialBalance || 0,
    transactionsBeforeFirstDay
  ) - cashDailyExpensesBeforeFirstDay;

  const balanceAfterPeriod = calculateBalanceForAnalysis(
    config?.initialBalance || 0,
    transactionsUntilLastDay
  ) - cashDailyExpensesUntilLastDay;

  const periodBalanceChange = balanceAfterPeriod - balanceBeforePeriod;

  // Dados para gráfico de entradas vs saídas
  const incomeVsExpenses = [];

  if (viewMode === 'month') {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];

      const dayIncome = transactions
        .filter(t => t.date === dateStr && t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const dayExpense = transactions
        .filter(t => t.date === dateStr && isExpenseAnalysisTransactionType(t.type))
        .reduce((sum, t) => sum + t.amount, 0) +
        dailyExpenses.filter(expense => expense.date === dateStr).reduce((sum, expense) => sum + expense.amount, 0);

      if (dayIncome > 0 || dayExpense > 0) {
        incomeVsExpenses.push({
          label: `Dia ${day}`,
          entradas: parseFloat(dayIncome.toFixed(2)),
          saidas: parseFloat(dayExpense.toFixed(2))
        });
      }
    }
  } else {
    // Visualização anual
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let m = 0; m < 12; m++) {
      const monthStartStr = `${year}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(year, m + 1, 0).getDate();
      const monthEndStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      const monthIncome = transactions
        .filter(t => t.type === 'income' && t.date >= monthStartStr && t.date <= monthEndStr)
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpense = transactions
        .filter(t => isExpenseAnalysisTransactionType(t.type) && t.date >= monthStartStr && t.date <= monthEndStr)
        .reduce((sum, t) => sum + t.amount, 0) +
        dailyExpenses
          .filter(expense => expense.date >= monthStartStr && expense.date <= monthEndStr)
          .reduce((sum, expense) => sum + expense.amount, 0);

      incomeVsExpenses.push({
        label: monthNames[m],
        entradas: parseFloat(monthIncome.toFixed(2)),
        saidas: parseFloat(monthExpense.toFixed(2))
      });
    }
  }

  // Dados para gráfico de gastos por categoria
  const expensesByCategory = transactionsInPeriod
    .filter(t => isExpenseAnalysisTransactionType(t.type))
    .reduce((acc: any, t) => {
      if (!acc[t.category]) {
        acc[t.category] = 0;
      }
      acc[t.category] += t.amount;
      return acc;
    }, {});

  dailyExpensesInPeriod.forEach(expense => {
    if (!expensesByCategory[expense.category]) {
      expensesByCategory[expense.category] = 0;
    }

    expensesByCategory[expense.category] += expense.amount;
  });

  const categoryChartData = Object.entries(expensesByCategory)
    .map(([category, amount]: [string, any]) => ({
      name: category,
      value: parseFloat(amount.toFixed(2)),
      percentage: totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => b.value - a.value);

  // Dados para gráfico de pizza
  const pieColors = ['var(--app-accent)', 'var(--app-danger)', 'var(--app-success)', 'var(--app-warning)', 'var(--app-text)', 'var(--app-accent)', 'var(--app-danger)', 'var(--app-success)'];
  const chartGridColor = 'color-mix(in srgb, var(--app-text) 12%, transparent)';
  const chartAxisColor = 'var(--app-text-muted)';
  const chartTooltipStyle = {
    backgroundColor: 'var(--app-surface-strong)',
    border: '1px solid var(--app-border)',
    borderRadius: '12px',
    color: 'var(--app-text)',
  } as const;
  const chartLegendStyle = {
    color: 'var(--app-text-muted)',
    fontSize: '12px',
  } as const;

  // Dados da curva diária de saldo (apenas para visualização mensal)
  const dailyBalanceData = [];

  if (viewMode === 'month') {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateLocal(year, month, day);
      const dailyBalance = calculateBalanceUntilDate(dateStr);

      dailyBalanceData.push({
        dia: `${day}`,
        saldo: parseFloat(dailyBalance.toFixed(2))
      });
    }
  }

  // Insights automáticos
  const insights = [];

  if (categoryChartData.length > 0) {
    const topCategory = categoryChartData[0];
    insights.push({
      type: 'info',
      title: 'Maior gasto por categoria',
      description: `${topCategory.name} representa ${topCategory.percentage}% dos seus gastos (R$ ${formatCurrency(topCategory.value)}).`,
      icon: PieChartIcon
    });
  }

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const variableExpenseShare = totalExpenses > 0 ? (variableExpenses / totalExpenses) * 100 : 0;
  const fixedExpenseShare = totalExpenses > 0 ? (fixedExpenses / totalExpenses) * 100 : 0;
  if (savingsRate > 20) {
    insights.push({
      type: 'positive',
      title: 'Ótima taxa de poupança!',
      description: `Você está poupando ${savingsRate.toFixed(0)}% da sua renda.`,
      icon: TrendingUp
    });
  } else if (savingsRate < 10 && savingsRate > 0) {
    insights.push({
      type: 'warning',
      title: 'Taxa de poupança baixa',
      description: `Você está poupando apenas ${savingsRate.toFixed(0)}% da sua renda. Considere reduzir gastos.`,
      icon: TrendingDown
    });
  }

  const canCopyReport = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.write) && typeof ClipboardItem !== 'undefined';
  const canNativeShareReport = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const reportPayload: ReportSharePayload = {
    periodMode: viewMode,
    periodLabel: formatPeriod(selectedDate),
    generatedAtLabel: new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date()),
    openingBalance: balanceBeforePeriod,
    closingBalance: balanceAfterPeriod,
    totalIncome,
    totalExpenses,
    variableExpenses,
    fixedExpenses,
    balanceChange: periodBalanceChange,
    savingsRate,
    dailyStandard,
    activeEstimates: estimates.filter((estimate) => estimate.active).length,
    transactionCount: transactionsInPeriod.length + dailyExpensesInPeriod.length,
    topCategories: categoryChartData.slice(0, 5).map((category) => ({
      name: category.name,
      value: category.value,
      percentage: Number.parseFloat(category.percentage),
    })),
  };

  const handleReportAction = async (action: ReportAction) => {
    setReportAction(action);
    setReportFeedback({
      tone: 'info',
      message: 'Gerando a imagem do relatorio no seu navegador...',
    });

    try {
      const blob = await renderReportShareImage(reportPayload);
      const filename = buildReportFilename(viewMode, selectedDate);
      const reportTitle = `Relatório ${viewMode === 'month' ? 'mensal' : 'anual'} • ${reportPayload.periodLabel}`;
      const reportText = 'Resumo financeiro gerado localmente no AutoMoney.';

      if (action === 'download') {
        downloadBlobAsFile(blob, filename);
        setReportFeedback({
          tone: 'success',
          message: 'Imagem pronta e baixada no seu dispositivo.',
        });
        return;
      }

      if (action === 'copy') {
        await copyBlobAsImage(blob);
        setReportFeedback({
          tone: 'success',
          message: 'Imagem copiada. Agora você pode colar onde quiser.',
        });
        return;
      }

      await shareBlobAsImage(blob, filename, reportTitle, reportText);
      setReportFeedback({
        tone: 'success',
        message: 'Relatório enviado para o menu de compartilhamento do seu dispositivo.',
      });
    } catch (reportError) {
      if (reportError instanceof DOMException && reportError.name === 'AbortError') {
        setReportFeedback({
          tone: 'info',
          message: 'Compartilhamento cancelado.',
        });
        return;
      }

      console.error('Error generating shared report:', reportError);
      const errorMessage = reportError instanceof Error
        ? reportError.message
        : 'Nao foi possivel gerar o relatorio agora.'

      setReportFeedback({
        tone: 'error',
        message: errorMessage,
      });
    } finally {
      setReportAction(null);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="app-kicker mb-2">Financial intelligence</p>
            <h2 className="app-page-title text-3xl font-semibold">Análise Financeira</h2>
            <p className="mt-2 text-sm text-[var(--app-text-muted)]">
              Tendências, distribuição de gastos e sinais de eficiência do período selecionado.
            </p>
          </div>

          {/* Toggle Mês/Ano */}
          <div className="app-pill flex items-center gap-2 rounded-2xl p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'year'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Ano
            </button>
          </div>
        </div>

        {/* Period Navigation */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={navigatePrevious}
            className="app-pill rounded-2xl p-2 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text)]"
            aria-label="Período anterior"
          >
            <ChevronLeft className="h-5 w-5 text-[var(--app-text)]" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="app-pill flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 transition-colors sm:px-4">
                <span className="max-w-[10.5rem] truncate text-sm font-medium text-[var(--app-text)] sm:max-w-none sm:text-lg">
                  {formatPeriod(selectedDate)}
                </span>
                <CalendarIcon className="h-4 w-4 text-[var(--app-text-muted)]" />
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
            onClick={navigateNext}
            className="app-pill rounded-2xl p-2 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text)]"
            aria-label="Próximo período"
          >
            <ChevronRight className="h-5 w-5 text-[var(--app-text)]" />
          </button>
        </div>

      </div>

      {/* Visão Geral */}
      <div className="app-panel rounded-[2rem] p-6">
        <h3 className="mb-6 text-xl font-semibold text-[var(--app-text)]">Visão Geral</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-6">
          <div className="text-center">
            <p className="mb-1 text-sm text-[var(--app-text-faint)]">Total de Entradas</p>
            <p className="mb-1 text-3xl font-bold text-[var(--app-success)]">R$ {formatCurrency(totalIncome)}</p>
            <p className="text-xs text-[var(--app-text-faint)]">Receitas do período</p>
          </div>

          <div className="border-x border-[var(--app-border)] text-center">
            <p className="mb-1 text-sm text-[var(--app-text-faint)]">Total de Gastos</p>
            <p className="mb-1 text-3xl font-bold text-[var(--app-danger)]">R$ {formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-[var(--app-text-faint)]">Todas as despesas</p>
          </div>

          <div className="border-r border-[var(--app-border)] text-center">
            <p className="mb-1 text-sm text-[var(--app-text-faint)]">Variação do Saldo</p>
            <p className={`text-3xl font-bold mb-1 ${periodBalanceChange >= 0 ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'}`}>
              {periodBalanceChange >= 0 ? '+' : ''}R$ {formatCurrency(Math.abs(periodBalanceChange))}
            </p>
            <p className="text-xs text-[var(--app-text-faint)]">Saldo final - Saldo inicial</p>
          </div>

          <div className="text-center">
            <p className="mb-1 text-sm text-[var(--app-text-faint)]">Taxa de Poupança</p>
            <p className={`text-3xl font-bold mb-1 ${savingsRate >= 20 ? 'text-[var(--app-success)]' : savingsRate >= 10 ? 'text-[var(--app-warning)]' : 'text-[var(--app-danger)]'}`}>
              {savingsRate.toFixed(0)}%
            </p>
            <p className="text-xs text-[var(--app-text-faint)]">da renda total</p>
          </div>
        </div>
      </div>

      {/* Gráfico de Saldo Diário (apenas modo mês) */}
      {viewMode === 'month' && dailyBalanceData.length > 0 && (
        <div className="app-panel rounded-[2rem] p-6">
          <h3 className="mb-2 text-xl font-semibold text-[var(--app-text)]">Curva de Saldo Diário</h3>
          <p className="mb-6 text-sm text-[var(--app-text-faint)]">
            Evolução do saldo ao longo do mês, usando gastos reais quando existirem e o planejado como fallback.
          </p>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyBalanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis
                dataKey="dia"
                stroke={chartAxisColor}
                tick={{ fill: chartAxisColor, fontSize: 12 }}
                label={{ value: 'Dia do mês', position: 'insideBottom', offset: -5, fill: chartAxisColor }}
              />
              <YAxis
                stroke={chartAxisColor}
                tick={{ fill: chartAxisColor, fontSize: 12 }}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: any) => `R$ ${formatCurrency(value)}`}
              />
              <Legend wrapperStyle={chartLegendStyle} />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="var(--app-accent)"
                fill="var(--app-accent)"
                fillOpacity={0.3}
                name="Saldo diário"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico: Entradas vs Saídas */}
      <div className="app-panel rounded-[2rem] p-6">
        <h3 className="mb-6 text-xl font-semibold text-[var(--app-text)]">Entradas vs Saídas</h3>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={incomeVsExpenses}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
            <XAxis
              dataKey="label"
              stroke={chartAxisColor}
              tick={{ fill: chartAxisColor, fontSize: 12 }}
            />
            <YAxis
              stroke={chartAxisColor}
              tick={{ fill: chartAxisColor, fontSize: 12 }}
              tickFormatter={(value) => `R$ ${value}`}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value: any) => `R$ ${formatCurrency(value)}`}
            />
            <Legend wrapperStyle={chartLegendStyle} />
            <Bar dataKey="entradas" fill="var(--app-success)" name="Entradas" radius={[8, 8, 0, 0]} />
            <Bar dataKey="saidas" fill="var(--app-danger)" name="Saídas" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Gráfico: Gastos por Categoria (Barras) */}
        <div className="app-panel rounded-[2rem] p-6">
          <h3 className="mb-6 text-xl font-semibold text-[var(--app-text)]">Gastos por Categoria</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryChartData.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis
                type="number"
                stroke={chartAxisColor}
                tick={{ fill: chartAxisColor, fontSize: 12 }}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke={chartAxisColor}
                tick={{ fill: chartAxisColor, fontSize: 12 }}
                width={100}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: any, name: any, props: any) => [
                  `R$ ${formatCurrency(value)} (${props.payload.percentage}%)`,
                  'Valor'
                ]}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {categoryChartData.slice(0, 5).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico: Distribuição de Gastos (Pizza) */}
        <div className="app-panel rounded-[2rem] p-6">
          <h3 className="mb-6 text-xl font-semibold text-[var(--app-text)]">Distribuição de Gastos</h3>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: any) => `R$ ${formatCurrency(value)}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resumo de Tipos de Gasto */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-[color:var(--app-border-strong)] bg-[var(--app-accent-soft)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--app-accent-soft)]">
              <BarChart3 className="w-6 h-6 text-[var(--app-accent)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--app-accent)]">Gastos Variáveis</p>
              <p className="text-2xl font-bold text-[var(--app-text)]">R$ {formatCurrency(variableExpenses)}</p>
            </div>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--app-surface-hover)]">
            <div
              className="h-full bg-[var(--app-accent)]"
              style={{ width: `${variableExpenseShare}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--app-text-faint)]">
            {variableExpenseShare.toFixed(0)}% do total de gastos
          </p>
        </div>

        <div className="rounded-[2rem] border border-[var(--app-warning-border)] bg-[var(--app-warning-surface)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--app-warning-surface)]">
              <CalendarIcon className="w-6 h-6 text-[var(--app-warning)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--app-warning)]">Gastos Fixos</p>
              <p className="text-2xl font-bold text-[var(--app-text)]">R$ {formatCurrency(fixedExpenses)}</p>
            </div>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--app-surface-hover)]">
            <div
              className="h-full bg-[var(--app-warning)]"
              style={{ width: `${fixedExpenseShare}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--app-text-faint)]">
            {fixedExpenseShare.toFixed(0)}% do total de gastos
          </p>
        </div>
      </div>

      {/* Insights Automáticos */}
      <div className="app-panel rounded-[2rem] p-6">
        <h3 className="mb-6 text-xl font-semibold text-[var(--app-text)]">Insights Automáticos</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            const bgColor = insight.type === 'positive' ? 'bg-[var(--app-success-surface)]' : insight.type === 'warning' ? 'bg-[var(--app-warning-surface)]' : 'bg-[var(--app-accent-soft)]';
            const borderColor = insight.type === 'positive' ? 'border-[var(--app-success-border)]' : insight.type === 'warning' ? 'border-[var(--app-warning-border)]' : 'border-[var(--app-border-strong)]';
            const iconColor = insight.type === 'positive' ? 'text-[var(--app-success)]' : insight.type === 'warning' ? 'text-[var(--app-warning)]' : 'text-[var(--app-accent)]';

            return (
              <div
                key={index}
                className={`${bgColor} ${borderColor} border rounded-xl p-4 flex items-start gap-3`}
              >
                <Icon className={`w-6 h-6 ${iconColor} mt-0.5 flex-shrink-0`} />
                <div>
                  <h4 className={`font-semibold ${iconColor} mb-1`}>{insight.title}</h4>
                  <p className="text-sm text-[var(--app-text-muted)]">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="app-panel rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[var(--app-text-muted)]">
              <ImageIcon className="h-3.5 w-3.5" />
              Relatorio compartilhavel
            </div>
            <h3 className="text-lg font-semibold text-[var(--app-text)] sm:text-xl">
              Gere uma imagem do {viewMode === 'month' ? 'mês' : 'ano'} em tempo real
            </h3>
            <p className="mt-2 text-sm text-[var(--app-text-muted)]">
              O arquivo é montado localmente na hora, pronto para baixar, copiar ou compartilhar. Nada fica salvo no servidor.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleReportAction('download')}
              disabled={reportAction !== null}
              className="app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reportAction === 'download' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar imagem
            </button>

            {canCopyReport && (
              <button
                type="button"
                onClick={() => handleReportAction('copy')}
                disabled={reportAction !== null}
                className="app-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reportAction === 'copy' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Copiar imagem
              </button>
            )}

            {canNativeShareReport && (
              <button
                type="button"
                onClick={() => handleReportAction('share')}
                disabled={reportAction !== null}
                className="app-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reportAction === 'share' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Compartilhar
              </button>
            )}
          </div>
        </div>

        {reportFeedback && (
          <div
            className={`mt-4 rounded-2xl p-4 text-sm ${
              reportFeedback.tone === 'success'
                ? 'app-note-success'
                : reportFeedback.tone === 'error'
                  ? 'app-note-danger'
                  : 'app-note'
            }`}
          >
            {reportFeedback.message}
          </div>
        )}
      </div>
    </div>
  );
}
