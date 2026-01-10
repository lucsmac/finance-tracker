import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Eye
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import {
  mockEstimates,
  mockTransactions,
  mockConfig,
  calculateDailyStandard,
  calculateCurrentBalance,
  getVariableExpensesForDate,
  calculateAccumulatedVariation,
  calculateDaysUntilNextIncome,
  calculateCommittedAmount,
  checkProjectionStatus
} from '../data/mockData';

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 0, 8)); // Janeiro 2026, dia 8

  // Estados do modal de cadastro de gasto
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: '',
    time: '',
    location: ''
  });

  // Estados do modal de detalhes do dia
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
  const [detailDay, setDetailDay] = useState<string>('');

  // Estados do modal de projeção "E se?"
  const [isProjectionModalOpen, setIsProjectionModalOpen] = useState(false);
  const [hypotheticalTransactions, setHypotheticalTransactions] = useState<any[]>([]);
  const [projectionForm, setProjectionForm] = useState({
    type: 'expense_variable' as 'expense_variable' | 'expense_fixed' | 'income',
    description: '',
    amount: '',
    date: ''
  });

  // Calcular valores baseados na data selecionada
  const currentDateStr = selectedDate.toISOString().split('T')[0];
  const dailyStandard = calculateDailyStandard(mockEstimates);
  const currentBalance = calculateCurrentBalance(mockConfig.initialBalance, mockTransactions);

  const today = '2026-01-08';
  const todayExpenses = getVariableExpensesForDate(today, mockTransactions);
  const todayVariation = dailyStandard - todayExpenses;

  // Novos cálculos
  const accumulatedVariation = calculateAccumulatedVariation(dailyStandard, mockTransactions, today);
  const nextIncomeInfo = calculateDaysUntilNextIncome(today, mockTransactions);
  const committedAmount = calculateCommittedAmount(mockTransactions, today);
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
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${day} de ${months[date.getMonth()]}`;
  };

  // Funções do modal de gasto
  const handleDayClick = (dateStr: string) => {
    setSelectedDay(dateStr);
    setIsExpenseModalOpen(true);
    // Definir hora atual como padrão
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setExpenseForm({ amount: '', category: '', time: currentTime, location: '' });
  };

  const handleSaveExpense = () => {
    // TODO: Implementar salvamento real do gasto
    console.log('Salvando gasto:', {
      date: selectedDay,
      ...expenseForm
    });
    setIsExpenseModalOpen(false);
    setExpenseForm({ amount: '', category: '', time: '', location: '' });
  };

  // Funções do modal de detalhes do dia
  const handleOpenDayDetail = (dateStr: string) => {
    setDetailDay(dateStr);
    setIsDayDetailModalOpen(true);
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

  // Gerar dias do mês para o calendário
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays = [];

  // Dias vazios antes do primeiro dia
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Combinar transações reais com hipotéticas para projeção
  const allTransactions = [...mockTransactions, ...hypotheticalTransactions];

  // Calcular saldo para cada dia
  let runningBalance = mockConfig.initialBalance;
  const todayDate = new Date(today);

  // Primeiro, processar todas as transações até hoje para ter o saldo correto
  const sortedTransactions = [...allTransactions]
    .filter(t => t.paid || hypotheticalTransactions.some(ht => ht.id === t.id))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Criar um mapa de saldos por dia (dias passados)
  const balanceByDay = new Map<string, number>();
  let tempBalance = mockConfig.initialBalance;

  sortedTransactions.forEach(t => {
    const tDate = t.date;
    if (t.type === 'income') {
      tempBalance += t.amount;
    } else {
      tempBalance -= t.amount;
    }
    balanceByDay.set(tDate, tempBalance);
  });

  // Resetar runningBalance para começar do saldo atual
  runningBalance = currentBalance;

  // Dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    const isPast = date < todayDate;
    const isToday = dateStr === today;
    const isFuture = date > todayDate;

    let status = 'neutral';
    let dayBalance = 0;
    let dayExpense = 0;

    if (isPast) {
      // Dia passado: usar saldo calculado do histórico
      dayBalance = balanceByDay.get(dateStr) || tempBalance;
      dayExpense = getVariableExpensesForDate(dateStr, mockTransactions);
    } else if (isToday) {
      // Hoje: usar saldo atual
      dayBalance = currentBalance;
      dayExpense = getVariableExpensesForDate(dateStr, mockTransactions);
    } else {
      // Projeção futura
      // Buscar compromissos do dia (incluindo transações hipotéticas)
      const dayCommitments = allTransactions.filter(t =>
        (!t.paid || hypotheticalTransactions.some(ht => ht.id === t.id)) &&
        t.date === dateStr &&
        (t.type === 'expense_fixed' || t.type === 'installment')
      );
      const commitmentsTotal = dayCommitments.reduce((sum, c) => sum + c.amount, 0);

      // Adicionar entradas hipotéticas futuras
      const dayHypotheticalIncomes = hypotheticalTransactions.filter(t =>
        t.date === dateStr && t.type === 'income'
      );
      const hypotheticalIncomesTotal = dayHypotheticalIncomes.reduce((sum, t) => sum + t.amount, 0);

      // Adicionar gastos variáveis hipotéticos
      const dayHypotheticalExpenses = hypotheticalTransactions.filter(t =>
        t.date === dateStr && t.type === 'expense_variable'
      );
      const hypotheticalExpensesTotal = dayHypotheticalExpenses.reduce((sum, t) => sum + t.amount, 0);

      // Calcular saldo projetado (incluindo transações hipotéticas)
      runningBalance = runningBalance - dailyStandard - commitmentsTotal - hypotheticalExpensesTotal + hypotheticalIncomesTotal;
      dayBalance = runningBalance;
      dayExpense = dailyStandard + commitmentsTotal + hypotheticalExpensesTotal; // Gasto projetado
    }

    // Determinar status baseado no saldo
    if (dayBalance >= 2000) {
      status = 'comfortable';
    } else if (dayBalance < 2000 && dayBalance >= 1000) {
      status = 'good';
    } else if (dayBalance < 1000 && dayBalance >= 0) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    calendarDays.push({ day, dateStr, isPast, isToday, isFuture, status, balance: dayBalance, expense: dayExpense });
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-4xl font-bold text-white mb-2">AutoMoney</h1>

        {/* Month/Year Navigation */}
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={navigateToPreviousMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5 text-[#9B97CE]" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors">
                <span className="text-[#9B97CE] text-lg font-medium">
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
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-5 h-5 text-[#9B97CE]" />
          </button>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="grid grid-cols-4 gap-6">
          {/* Card 1 - Saldo Disponível */}
          <div className="text-center">
            <p className="text-[#9CA3AF] text-sm mb-1">Saldo Disponível</p>
            <p className="text-3xl font-bold text-white mb-1">R$ {currentBalance.toFixed(2)}</p>
            <p className="text-xs text-[#9CA3AF]">Saldo atual em conta</p>
          </div>

          {/* Card 2 - Valor Diário Padrão */}
          <div className="text-center border-x border-white/10">
            <p className="text-[#9CA3AF] text-sm mb-1">Valor Diário Padrão</p>
            <p className="text-3xl font-bold text-white mb-1">R$ {dailyStandard.toFixed(2)}</p>
            <p className="text-xs text-[#9CA3AF]">Base fixa calculada das estimativas</p>
          </div>

          {/* Card 3 - Gasto de Hoje */}
          <div className="text-center border-r border-white/10">
            <p className="text-[#9CA3AF] text-sm mb-1">Gasto de Hoje</p>
            <p className="text-3xl font-bold text-white mb-1">R$ {todayExpenses.toFixed(2)}</p>
            <p className={`text-xs ${todayVariation >= 0 ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
              {todayVariation >= 0 ? 'Economizou' : 'Gastou'} R$ {Math.abs(todayVariation).toFixed(2)}
            </p>
          </div>

          {/* Card 4 - Gastos do Mês */}
          <div className="text-center">
            <p className="text-[#9CA3AF] text-sm mb-1">Gastos do Mês</p>
            <p className={`text-3xl font-bold mb-1 ${accumulatedVariation >= 0 ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
              {accumulatedVariation >= 0 ? '+' : ''}R$ {accumulatedVariation.toFixed(2)}
            </p>
            <p className="text-xs text-[#9CA3AF]">{formatMonthYear(selectedDate)}</p>
          </div>
        </div>
      </div>

      {/* Balance Projection Section */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-4">Projeção de Saldo</h2>

        <div className="grid grid-cols-3 gap-6">
          {/* Sub-card 1 - Dias até próxima renda */}
          <div className="text-center">
            <p className="text-[#9CA3AF] text-sm mb-1">Dias até próxima renda</p>
            <p className="text-3xl font-bold text-white mb-1">{nextIncomeInfo.days} dias</p>
            <p className="text-xs text-[#9CA3AF]">Salário em {formatNextIncomeDate(nextIncomeInfo.date)}</p>
          </div>

          {/* Sub-card 2 - Status da projeção */}
          <div className="text-center border-x border-white/10">
            <p className="text-[#9CA3AF] text-sm mb-1">Status da projeção</p>
            <p className={`text-3xl font-bold mb-1 ${projectionStatus === 'positive' ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
              {projectionStatus === 'positive' ? 'Positivo' : 'Negativo'}
            </p>
            <p className={`text-xs ${projectionStatus === 'positive' ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
              {projectionStatus === 'positive' ? 'Saldo suficiente' : 'Saldo insuficiente'}
            </p>
          </div>

          {/* Sub-card 3 - Comprometido */}
          <div className="text-center">
            <p className="text-[#9CA3AF] text-sm mb-1">Comprometido</p>
            <p className="text-3xl font-bold text-white mb-1">R$ {committedAmount.toFixed(2)}</p>
            <p className="text-xs text-[#9CA3AF]">Fixos + Parcelas futuras</p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
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
            const dayExpenses = dayTransactions.filter(t => t.type !== 'income').reduce((sum, t) => sum + t.amount, 0);

            return (
              <div
                key={dayData.day}
                className={`aspect-square ${bgColor} ${borderColor} border-2 rounded-2xl p-2 hover:scale-102 transition-all relative flex flex-col`}
              >
                {/* Header: Número do dia (esq) e Botões (dir) */}
                <div className="flex items-start justify-between mb-1">
                  {/* Número do dia */}
                  <span className={`text-lg font-bold ${dayNumberColor}`}>
                    {dayData.day}
                  </span>

                  {/* Botões de ação */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDayClick(dayData.dateStr);
                      }}
                      className="p-1 bg-[#76C893]/80 hover:bg-[#76C893] text-[#161618] rounded transition-colors"
                      title="Adicionar gasto"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDayDetail(dayData.dateStr);
                      }}
                      className="p-1 bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Centro: Saldo */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-white/50 mb-0.5">Saldo</p>
                    <p className={`text-base font-bold ${dayNumberColor}`}>
                      R$ {dayData.balance.toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Footer: Resumo de Entradas e Saídas */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                  <div className="flex items-center gap-1">
                    <span className="text-[#76C893]">↑</span>
                    <span className="text-white/70">{dayIncomes > 0 ? `R$ ${dayIncomes.toFixed(0)}` : '-'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[#D97B7B]">↓</span>
                    <span className="text-white/70">{dayExpenses > 0 ? `R$ ${dayExpenses.toFixed(0)}` : '-'}</span>
                  </div>
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
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleDayClick(today)}
          className="bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-2xl p-6 flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl hover:scale-105"
        >
          <Plus className="w-6 h-6" />
          <span className="font-semibold">Adicionar Gasto</span>
        </button>

        <button
          onClick={handleOpenProjection}
          className="bg-white/10 backdrop-blur-xl border-2 border-[#a6c88c]/30 hover:border-[#a6c88c] text-white rounded-2xl p-6 flex items-center justify-center gap-3 transition-all hover:scale-105"
        >
          <DollarSign className="w-6 h-6" />
          <span className="font-semibold">Projeção "E se?"</span>
        </button>
      </div>

      {/* Modal de Cadastro de Gasto */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Adicionar Gasto
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              {selectedDay && new Date(selectedDay).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Valor *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Categoria *
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              >
                <option value="" className="bg-[#161618]">Selecione uma categoria</option>
                {mockEstimates.map((estimate) => (
                  <option key={estimate.id} value={estimate.category} className="bg-[#161618]">
                    {estimate.icon} {estimate.category}
                  </option>
                ))}
              </select>
            </div>

            {/* Horário */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Horário *
              </label>
              <input
                type="time"
                value={expenseForm.time}
                onChange={(e) => setExpenseForm({ ...expenseForm, time: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Local */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Local
              </label>
              <input
                type="text"
                placeholder="Ex: Supermercado Central"
                value={expenseForm.location}
                onChange={(e) => setExpenseForm({ ...expenseForm, location: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsExpenseModalOpen(false)}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveExpense}
              disabled={!expenseForm.amount || !expenseForm.category || !expenseForm.time}
              className="flex-1 px-4 py-3 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Gasto
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Dia */}
      <Dialog open={isDayDetailModalOpen} onOpenChange={setIsDayDetailModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Detalhes do Dia
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              {detailDay && new Date(detailDay).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {(() => {
              // Filtrar transações do dia
              const dayTransactions = mockTransactions.filter(t => t.date === detailDay);
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
                      <p className="text-lg font-bold text-[#76C893]">R$ {totalIncomes.toFixed(2)}</p>
                    </div>
                    <div className="text-center border-x border-white/10">
                      <p className="text-xs text-[#9CA3AF] mb-1">Saídas</p>
                      <p className="text-lg font-bold text-[#D97B7B]">R$ {totalExpenses.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#9CA3AF] mb-1">Saldo do Dia</p>
                      <p className={`text-lg font-bold ${balance >= 0 ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
                        {balance >= 0 ? '+' : ''}R$ {balance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Padrão vs Realizado (apenas para gastos variáveis) */}
                  {(() => {
                    const variableExpenses = dayTransactions
                      .filter(t => t.type === 'expense_variable')
                      .reduce((sum, t) => sum + t.amount, 0);
                    const difference = dailyStandard - variableExpenses;

                    return (
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[#9CA3AF]">Padrão Diário</p>
                            <p className="text-2xl font-bold text-white">R$ {dailyStandard.toFixed(2)}</p>
                          </div>
                          <div className="text-center px-4">
                            <p className="text-sm text-[#9CA3AF]">Gasto Real</p>
                            <p className="text-2xl font-bold text-white">R$ {variableExpenses.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-[#9CA3AF]">Diferença</p>
                            <p className={`text-2xl font-bold ${difference >= 0 ? 'text-[#76C893]' : 'text-[#D97B7B]'}`}>
                              {difference >= 0 ? '+' : ''}R$ {difference.toFixed(2)}
                            </p>
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
                                <p className="text-lg font-bold text-[#76C893]">+R$ {t.amount.toFixed(2)}</p>
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
                                  <p className="text-lg font-bold text-white">R$ {t.amount.toFixed(2)}</p>
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
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-white">R$ {t.amount.toFixed(2)}</p>
                                    {t.recurring && (
                                      <span className="inline-block text-xs px-2 py-0.5 bg-[#8B7AB8]/20 text-[#8B7AB8] rounded">
                                        Recorrente
                                      </span>
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
                                  <p className="text-lg font-bold text-white">R$ {t.amount.toFixed(2)}</p>
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
                                  <p className="text-lg font-bold text-[#9B97CE]">R$ {t.amount.toFixed(2)}</p>
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

          {/* Botão de fechar */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsDayDetailModalOpen(false)}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-xl transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                setIsDayDetailModalOpen(false);
                handleDayClick(detailDay);
              }}
              className="flex-1 px-4 py-3 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-xl font-semibold transition-colors"
            >
              Adicionar Gasto neste Dia
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Projeção "E se?" */}
      <Dialog open={isProjectionModalOpen} onOpenChange={setIsProjectionModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Projeção "E se?"
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
                              {isIncome ? '+' : '-'}R$ {transaction.amount.toFixed(2)}
                            </span>
                            <span className="text-white font-medium">
                              {transaction.description}
                            </span>
                            <span className="px-2 py-0.5 bg-white/10 text-white/70 rounded text-xs">
                              {transaction.type === 'income' ? 'Entrada' : transaction.type === 'expense_fixed' ? 'Fixo' : 'Variável'}
                            </span>
                          </div>
                          <p className="text-sm text-white/50 mt-1">
                            {new Date(transaction.date).toLocaleDateString('pt-BR', {
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