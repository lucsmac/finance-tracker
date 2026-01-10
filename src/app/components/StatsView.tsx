import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import {
  LineChart,
  Line,
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
  mockEstimates,
  mockTransactions,
  mockConfig,
  calculateDailyStandard,
  calculateCurrentBalance,
  getVariableExpensesForDate,
  calculateAccumulatedVariation
} from '../data/mockData';

type ViewMode = 'month' | 'year';

export function StatsView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 0, 8));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const today = '2026-01-08';

  // Cálculos básicos
  const dailyStandard = calculateDailyStandard(mockEstimates);
  const currentBalance = calculateCurrentBalance(mockConfig.initialBalance, mockTransactions);
  const accumulatedVariation = calculateAccumulatedVariation(dailyStandard, mockTransactions, today);

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

  let firstDay: Date, lastDay: Date;

  if (viewMode === 'month') {
    firstDay = new Date(year, month, 1);
    lastDay = new Date(year, month + 1, 0);
  } else {
    firstDay = new Date(year, 0, 1);
    lastDay = new Date(year, 11, 31);
  }

  const transactionsInPeriod = mockTransactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= firstDay && tDate <= lastDay;
  });

  // Métricas gerais
  const totalIncome = transactionsInPeriod
    .filter(t => t.type === 'income' && t.paid)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactionsInPeriod
    .filter(t => t.type !== 'income' && t.paid)
    .reduce((sum, t) => sum + t.amount, 0);

  const variableExpenses = transactionsInPeriod
    .filter(t => t.type === 'expense_variable' && t.paid)
    .reduce((sum, t) => sum + t.amount, 0);

  const fixedExpenses = transactionsInPeriod
    .filter(t => (t.type === 'expense_fixed' || t.type === 'installment') && t.paid)
    .reduce((sum, t) => sum + t.amount, 0);

  // Dados para gráfico de linha do saldo
  const balanceOverTime = [];
  let runningBalance = mockConfig.initialBalance;

  if (viewMode === 'month') {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];

      const dayTransactions = mockTransactions.filter(t => t.date === dateStr && t.paid);
      dayTransactions.forEach(t => {
        if (t.type === 'income') {
          runningBalance += t.amount;
        } else {
          runningBalance -= t.amount;
        }
      });

      balanceOverTime.push({
        label: `${day}`,
        saldo: parseFloat(runningBalance.toFixed(2)),
        date: dateStr
      });
    }
  } else {
    // Visualização anual - agregar por mês
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1);
      const monthEnd = new Date(year, m + 1, 0);

      const monthTransactions = mockTransactions.filter(t => {
        const tDate = new Date(t.date);
        return t.paid && tDate >= monthStart && tDate <= monthEnd;
      });

      monthTransactions.forEach(t => {
        if (t.type === 'income') {
          runningBalance += t.amount;
        } else {
          runningBalance -= t.amount;
        }
      });

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      balanceOverTime.push({
        label: monthNames[m],
        saldo: parseFloat(runningBalance.toFixed(2))
      });
    }
  }

  // Dados para gráfico de entradas vs saídas
  const incomeVsExpenses = [];

  if (viewMode === 'month') {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];

      const dayIncome = mockTransactions
        .filter(t => t.date === dateStr && t.type === 'income' && t.paid)
        .reduce((sum, t) => sum + t.amount, 0);

      const dayExpense = mockTransactions
        .filter(t => t.date === dateStr && t.type !== 'income' && t.paid)
        .reduce((sum, t) => sum + t.amount, 0);

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
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1);
      const monthEnd = new Date(year, m + 1, 0);

      const monthIncome = mockTransactions
        .filter(t => {
          const tDate = new Date(t.date);
          return t.paid && t.type === 'income' && tDate >= monthStart && tDate <= monthEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpense = mockTransactions
        .filter(t => {
          const tDate = new Date(t.date);
          return t.paid && t.type !== 'income' && tDate >= monthStart && tDate <= monthEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      incomeVsExpenses.push({
        label: monthNames[m],
        entradas: parseFloat(monthIncome.toFixed(2)),
        saidas: parseFloat(monthExpense.toFixed(2))
      });
    }
  }

  // Dados para gráfico de gastos por categoria
  const expensesByCategory = transactionsInPeriod
    .filter(t => t.type !== 'income' && t.paid)
    .reduce((acc: any, t) => {
      if (!acc[t.category]) {
        acc[t.category] = 0;
      }
      acc[t.category] += t.amount;
      return acc;
    }, {});

  const categoryChartData = Object.entries(expensesByCategory)
    .map(([category, amount]: [string, any]) => ({
      name: category,
      value: parseFloat(amount.toFixed(2)),
      percentage: ((amount / totalExpenses) * 100).toFixed(1)
    }))
    .sort((a, b) => b.value - a.value);

  // Dados para gráfico de pizza
  const pieColors = ['#76C893', '#9B97CE', '#8B7AB8', '#E6C563', '#D97B7B', '#C9B574', '#7FB77E', '#A69FBD'];

  // Dados de performance diária (apenas para visualização mensal)
  const performanceData = [];

  if (viewMode === 'month') {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayExpenses = getVariableExpensesForDate(dateStr, mockTransactions);

      if (date <= new Date(today) && dayExpenses > 0) {
        performanceData.push({
          dia: `${day}`,
          padrão: parseFloat(dailyStandard.toFixed(2)),
          real: parseFloat(dayExpenses.toFixed(2)),
          diferença: parseFloat((dailyStandard - dayExpenses).toFixed(2))
        });
      }
    }
  }

  // Insights automáticos
  const insights = [];

  if (accumulatedVariation >= 0) {
    insights.push({
      type: 'positive',
      title: 'Você está economizando!',
      description: `Você economizou R$ ${accumulatedVariation.toFixed(2)} em relação ao padrão ${viewMode === 'month' ? 'mensal' : 'anual'}.`,
      icon: CheckCircle
    });
  } else {
    insights.push({
      type: 'warning',
      title: 'Gastos acima do padrão',
      description: `Você gastou R$ ${Math.abs(accumulatedVariation).toFixed(2)} a mais que o planejado.`,
      icon: AlertCircle
    });
  }

  if (categoryChartData.length > 0) {
    const topCategory = categoryChartData[0];
    insights.push({
      type: 'info',
      title: 'Maior gasto por categoria',
      description: `${topCategory.name} representa ${topCategory.percentage}% dos seus gastos (R$ ${topCategory.value.toFixed(2)}).`,
      icon: PieChartIcon
    });
  }

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Análise Financeira</h2>

          {/* Toggle Mês/Ano */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-[#76C893] text-[#161618]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'year'
                  ? 'bg-[#76C893] text-[#161618]'
                  : 'text-white/70 hover:text-white'
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
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-5 h-5 text-[#9B97CE]" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors">
                <span className="text-[#9B97CE] text-lg font-medium">
                  {formatPeriod(selectedDate)}
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
            onClick={navigateNext}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Próximo período"
          >
            <ChevronRight className="w-5 h-5 text-[#9B97CE]" />
          </button>
        </div>
      </div>

      {/* Visão Geral */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-xl font-semibold text-white mb-6">Visão Geral</h3>

        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-[#9CA3AF] text-sm mb-1">Total de Entradas</p>
            <p className="text-3xl font-bold text-[#76C893] mb-1">R$ {totalIncome.toFixed(2)}</p>
            <p className="text-xs text-[#9CA3AF]">Receitas do período</p>
          </div>

          <div className="text-center border-x border-white/10">
            <p className="text-[#9CA3AF] text-sm mb-1">Total de Gastos</p>
            <p className="text-3xl font-bold text-[#D97B7B] mb-1">R$ {totalExpenses.toFixed(2)}</p>
            <p className="text-xs text-[#9CA3AF]">Todas as despesas</p>
          </div>

          <div className="text-center border-r border-white/10">
            <p className="text-[#9CA3AF] text-sm mb-1">Saldo do Período</p>
            <p className={`text-3xl font-bold mb-1 ${(totalIncome - totalExpenses) >= 0 ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
              {(totalIncome - totalExpenses) >= 0 ? '+' : ''}R$ {(totalIncome - totalExpenses).toFixed(2)}
            </p>
            <p className="text-xs text-[#9CA3AF]">Entradas - Gastos</p>
          </div>

          <div className="text-center">
            <p className="text-[#9CA3AF] text-sm mb-1">Taxa de Poupança</p>
            <p className={`text-3xl font-bold mb-1 ${savingsRate >= 20 ? 'text-[#76C893]' : savingsRate >= 10 ? 'text-[#E6C563]' : 'text-[#D97B7B]'}`}>
              {savingsRate.toFixed(0)}%
            </p>
            <p className="text-xs text-[#9CA3AF]">da renda total</p>
          </div>
        </div>
      </div>

      {/* Gráfico: Evolução do Saldo */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-xl font-semibold text-white mb-6">Evolução do Saldo</h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={balanceOverTime}>
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
                backgroundColor: '#161618',
                border: '1px solid #ffffff20',
                borderRadius: '8px'
              }}
              formatter={(value: any) => [`R$ ${value.toFixed(2)}`, 'Saldo']}
            />
            <Line
              type="monotone"
              dataKey="saldo"
              stroke="#76C893"
              strokeWidth={3}
              dot={{ fill: '#76C893', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico: Entradas vs Saídas */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
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
                backgroundColor: '#161618',
                border: '1px solid #ffffff20',
                borderRadius: '8px'
              }}
              formatter={(value: any) => `R$ ${value.toFixed(2)}`}
            />
            <Legend />
            <Bar dataKey="entradas" fill="#76C893" name="Entradas" radius={[8, 8, 0, 0]} />
            <Bar dataKey="saidas" fill="#D97B7B" name="Saídas" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-2 gap-6">
        {/* Gráfico: Gastos por Categoria (Barras) */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
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
                  backgroundColor: '#161618',
                  border: '1px solid #ffffff20',
                  borderRadius: '8px'
                }}
                formatter={(value: any, name: any, props: any) => [
                  `R$ ${value.toFixed(2)} (${props.payload.percentage}%)`,
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
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
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
                  backgroundColor: '#161618',
                  border: '1px solid #ffffff20',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => `R$ ${value.toFixed(2)}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Performance Diária (apenas modo mês) */}
      {viewMode === 'month' && performanceData.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-xl font-semibold text-white mb-6">Performance Diária vs Padrão</h3>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData.slice(-15)}>
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
                  backgroundColor: '#161618',
                  border: '1px solid #ffffff20',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => `R$ ${value.toFixed(2)}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="padrão"
                stroke="#9B97CE"
                fill="#9B97CE"
                fillOpacity={0.3}
                name="Padrão Diário"
              />
              <Area
                type="monotone"
                dataKey="real"
                stroke="#76C893"
                fill="#76C893"
                fillOpacity={0.3}
                name="Gasto Real"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Resumo de Tipos de Gasto */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#76C893]/10 border border-[#76C893]/30 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#76C893]/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[#76C893]" />
            </div>
            <div>
              <p className="text-sm text-[#76C893]">Gastos Variáveis</p>
              <p className="text-2xl font-bold text-white">R$ {variableExpenses.toFixed(2)}</p>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-[#76C893]"
              style={{ width: `${(variableExpenses / totalExpenses) * 100}%` }}
            />
          </div>
          <p className="text-xs text-white/50 mt-2">
            {((variableExpenses / totalExpenses) * 100).toFixed(0)}% do total de gastos
          </p>
        </div>

        <div className="bg-[#8B7AB8]/10 border border-[#8B7AB8]/30 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#8B7AB8]/20 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-[#8B7AB8]" />
            </div>
            <div>
              <p className="text-sm text-[#8B7AB8]">Gastos Fixos</p>
              <p className="text-2xl font-bold text-white">R$ {fixedExpenses.toFixed(2)}</p>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-[#8B7AB8]"
              style={{ width: `${(fixedExpenses / totalExpenses) * 100}%` }}
            />
          </div>
          <p className="text-xs text-white/50 mt-2">
            {((fixedExpenses / totalExpenses) * 100).toFixed(0)}% do total de gastos
          </p>
        </div>
      </div>

      {/* Insights Automáticos */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-xl font-semibold text-white mb-6">Insights Automáticos</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            const bgColor = insight.type === 'positive' ? 'bg-[#76C893]/10' : insight.type === 'warning' ? 'bg-[#E6C563]/10' : 'bg-[#9B97CE]/10';
            const borderColor = insight.type === 'positive' ? 'border-[#76C893]/30' : insight.type === 'warning' ? 'border-[#E6C563]/30' : 'border-[#9B97CE]/30';
            const iconColor = insight.type === 'positive' ? 'text-[#76C893]' : insight.type === 'warning' ? 'text-[#E6C563]' : 'text-[#9B97CE]';

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
