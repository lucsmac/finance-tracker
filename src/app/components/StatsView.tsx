import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3
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
import { type Transaction } from '../data/mockData';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEstimates } from '../../lib/hooks/useEstimates';
import { useTransactions } from '../../lib/hooks/useTransactions';
import { useConfig } from '../../lib/hooks/useConfig';
import { useDailyExpenses } from '@/lib/hooks/useDailyExpenses';
import { useDailyPlans } from '@/lib/hooks/useDailyPlans';
import {
  getRecordedVariableExpensesTotalForDate
} from '@/lib/utils/dailyExpenses';
import { formatDateLocal } from '@/lib/utils/dateHelpers';

type ViewMode = 'month' | 'year';

// Função para formatar valores em Real brasileiro
const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export function StatsView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

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
          <p className="text-white/70">Carregando análises...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white/70">Erro ao carregar dados: {error.message}</p>
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
        .filter(transaction => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      balance -= dayTransactions
        .filter(transaction => transaction.type === 'expense_fixed')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      balance -= dayTransactions
        .filter(transaction => transaction.type === 'installment')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      balance -= dayTransactions
        .filter(transaction => transaction.type === 'investment')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      const recordedVariableExpenses = getRecordedVariableExpensesTotalForDate(dateStr, dailyExpenses, transactions);
      balance -= recordedVariableExpenses > 0 ? recordedVariableExpenses : getPlannedAmountForDate(dateStr);
    }

    return balance;
  };

  // Funções de navegação
  const navigatePrevious = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setSelectedDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setSelectedDate(newDate);
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
    .filter(t => t.type !== 'income')
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
      if (t.type === 'income') {
        balance += t.amount;
      } else {
        balance -= t.amount;
      }
    });
    return balance;
  };

  // Calcular saldo no início do período (antes do primeiro dia)
  // e saldo no final do período (após o último dia)
  const transactionsBeforeFirstDay = transactions.filter(t => t.date < firstDayStr);
  const transactionsUntilLastDay = transactions.filter(t => t.date <= lastDayStr);
  const dailyExpensesBeforeFirstDay = dailyExpenses.filter(expense => expense.date < firstDayStr);
  const dailyExpensesUntilLastDay = dailyExpenses.filter(expense => expense.date <= lastDayStr);

  const balanceBeforePeriod = calculateBalanceForAnalysis(
    config?.initialBalance || 0,
    transactionsBeforeFirstDay
  ) - dailyExpensesBeforeFirstDay.reduce((sum, expense) => sum + expense.amount, 0);

  const balanceAfterPeriod = calculateBalanceForAnalysis(
    config?.initialBalance || 0,
    transactionsUntilLastDay
  ) - dailyExpensesUntilLastDay.reduce((sum, expense) => sum + expense.amount, 0);

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
        .filter(t => t.date === dateStr && t.type !== 'income')
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
        .filter(t => t.type !== 'income' && t.date >= monthStartStr && t.date <= monthEndStr)
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
    .filter(t => t.type !== 'income')
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
  const pieColors = ['#8537FD', '#E837FD', '#AFFD37', '#FDE837', '#FFFFFF', '#8537FD', '#E837FD', '#AFFD37'];

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
                  ? 'bg-[var(--app-accent)] text-white'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'year'
                  ? 'bg-[var(--app-accent)] text-white'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Ano
            </button>
          </div>
        </div>

        {/* Period Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={navigatePrevious}
            className="app-pill rounded-2xl p-2 transition-colors"
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--app-accent)]" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="app-pill flex items-center gap-2 rounded-2xl px-4 py-2 transition-colors">
                <span className="text-[var(--app-accent)] text-lg font-medium">
                  {formatPeriod(selectedDate)}
                </span>
                <CalendarIcon className="w-4 h-4 text-[var(--app-accent)]" />
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
            onClick={navigateNext}
            className="app-pill rounded-2xl p-2 transition-colors"
            aria-label="Próximo período"
          >
            <ChevronRight className="w-5 h-5 text-[var(--app-accent)]" />
          </button>
        </div>
      </div>

      {/* Visão Geral */}
      <div className="app-panel rounded-[2rem] p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Visão Geral</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-6">
          <div className="text-center">
            <p className="text-[#9CA3AF] text-sm mb-1">Total de Entradas</p>
            <p className="text-3xl font-bold text-[var(--app-success)] mb-1">R$ {formatCurrency(totalIncome)}</p>
            <p className="text-xs text-[#9CA3AF]">Receitas do período</p>
          </div>

          <div className="text-center border-x border-white/10">
            <p className="text-[#9CA3AF] text-sm mb-1">Total de Gastos</p>
            <p className="text-3xl font-bold text-[var(--app-danger)] mb-1">R$ {formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-[#9CA3AF]">Todas as despesas</p>
          </div>

          <div className="text-center border-r border-white/10">
            <p className="text-[#9CA3AF] text-sm mb-1">Variação do Saldo</p>
            <p className={`text-3xl font-bold mb-1 ${periodBalanceChange >= 0 ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'}`}>
              {periodBalanceChange >= 0 ? '+' : ''}R$ {formatCurrency(Math.abs(periodBalanceChange))}
            </p>
            <p className="text-xs text-[#9CA3AF]">Saldo final - Saldo inicial</p>
          </div>

          <div className="text-center">
            <p className="text-[#9CA3AF] text-sm mb-1">Taxa de Poupança</p>
            <p className={`text-3xl font-bold mb-1 ${savingsRate >= 20 ? 'text-[var(--app-success)]' : savingsRate >= 10 ? 'text-[var(--app-warning)]' : 'text-[var(--app-danger)]'}`}>
              {savingsRate.toFixed(0)}%
            </p>
            <p className="text-xs text-[#9CA3AF]">da renda total</p>
          </div>
        </div>
      </div>

      {/* Gráfico de Saldo Diário (apenas modo mês) */}
      {viewMode === 'month' && dailyBalanceData.length > 0 && (
        <div className="app-panel rounded-[2rem] p-6">
          <h3 className="text-xl font-semibold text-white mb-2">Curva de Saldo Diário</h3>
          <p className="text-sm text-white/50 mb-6">
            Evolução do saldo ao longo do mês, usando gastos reais quando existirem e o planejado como fallback.
          </p>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyBalanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis
                dataKey="dia"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                label={{ value: 'Dia do mês', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
              />
              <YAxis
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip
              contentStyle={{
                backgroundColor: '#181818',
                border: '1px solid #ffffff20',
                borderRadius: '8px'
              }}
                formatter={(value: any) => `R$ ${formatCurrency(value)}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="#8537FD"
                fill="#8537FD"
                fillOpacity={0.3}
                name="Saldo diário"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico: Entradas vs Saídas */}
      <div className="app-panel rounded-[2rem] p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Entradas vs Saídas</h3>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={incomeVsExpenses}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis
              dataKey="label"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `R$ ${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#181818',
                border: '1px solid #ffffff20',
                borderRadius: '8px'
              }}
              formatter={(value: any) => `R$ ${formatCurrency(value)}`}
            />
            <Legend />
            <Bar dataKey="entradas" fill="#AFFD37" name="Entradas" radius={[8, 8, 0, 0]} />
            <Bar dataKey="saidas" fill="#E837FD" name="Saídas" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Gráfico: Gastos por Categoria (Barras) */}
        <div className="app-panel rounded-[2rem] p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Gastos por Categoria</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryChartData.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis
                type="number"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                width={100}
              />
              <Tooltip
              contentStyle={{
                backgroundColor: '#181818',
                border: '1px solid #ffffff20',
                borderRadius: '8px'
              }}
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
          <h3 className="text-xl font-semibold text-white mb-6">Distribuição de Gastos</h3>

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
              contentStyle={{
                backgroundColor: '#181818',
                border: '1px solid #ffffff20',
                borderRadius: '8px'
              }}
                formatter={(value: any) => `R$ ${formatCurrency(value)}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resumo de Tipos de Gasto */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-[#8537FD]/20 bg-[#8537FD]/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#8537FD]/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[#8537FD]" />
            </div>
            <div>
              <p className="text-sm text-[#8537FD]">Gastos Variáveis</p>
              <p className="text-2xl font-bold text-white">R$ {formatCurrency(variableExpenses)}</p>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-[#8537FD]"
              style={{ width: `${variableExpenseShare}%` }}
            />
          </div>
          <p className="text-xs text-white/50 mt-2">
            {variableExpenseShare.toFixed(0)}% do total de gastos
          </p>
        </div>

        <div className="rounded-[2rem] border border-[#FDE837]/20 bg-[#FDE837]/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#FDE837]/20 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-[#FDE837]" />
            </div>
            <div>
              <p className="text-sm text-[#FDE837]">Gastos Fixos</p>
              <p className="text-2xl font-bold text-white">R$ {formatCurrency(fixedExpenses)}</p>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-[#FDE837]"
              style={{ width: `${fixedExpenseShare}%` }}
            />
          </div>
          <p className="text-xs text-white/50 mt-2">
            {fixedExpenseShare.toFixed(0)}% do total de gastos
          </p>
        </div>
      </div>

      {/* Insights Automáticos */}
      <div className="app-panel rounded-[2rem] p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Insights Automáticos</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            const bgColor = insight.type === 'positive' ? 'bg-[#AFFD37]/10' : insight.type === 'warning' ? 'bg-[#FDE837]/10' : 'bg-[#8537FD]/10';
            const borderColor = insight.type === 'positive' ? 'border-[#AFFD37]/30' : insight.type === 'warning' ? 'border-[#FDE837]/30' : 'border-[#8537FD]/30';
            const iconColor = insight.type === 'positive' ? 'text-[#AFFD37]' : insight.type === 'warning' ? 'text-[#FDE837]' : 'text-[#8537FD]';

            return (
              <div
                key={index}
                className={`${bgColor} ${borderColor} border rounded-xl p-4 flex items-start gap-3`}
              >
                <Icon className={`w-6 h-6 ${iconColor} mt-0.5 flex-shrink-0`} />
                <div>
                  <h4 className={`font-semibold ${iconColor} mb-1`}>{insight.title}</h4>
                  <p className="text-sm text-white/70">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
