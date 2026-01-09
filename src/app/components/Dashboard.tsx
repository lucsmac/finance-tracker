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

  const handleQuickAddExpense = () => {
    handleDayClick(today); // Abre modal de cadastro para hoje
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

  // Calcular saldo para cada dia
  let runningBalance = mockConfig.initialBalance;
  const todayDate = new Date(today);

  // Primeiro, processar todas as transações até hoje para ter o saldo correto
  const sortedTransactions = [...mockTransactions]
    .filter(t => t.paid)
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
      // Buscar compromissos do dia
      const dayCommitments = mockTransactions.filter(t =>
        !t.paid &&
        t.date === dateStr &&
        (t.type === 'expense_fixed' || t.type === 'installment')
      );
      const commitmentsTotal = dayCommitments.reduce((sum, c) => sum + c.amount, 0);

      // Calcular saldo projetado
      runningBalance = runningBalance - dailyStandard - commitmentsTotal;
      dayBalance = runningBalance;
      dayExpense = dailyStandard + commitmentsTotal; // Gasto projetado
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
            <ChevronLeft className="w-5 h-5 text-[#B4B0EE]" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors">
                <span className="text-[#B4B0EE] text-lg font-medium">
                  {formatMonthYear(selectedDate)}
                </span>
                <CalendarIcon className="w-4 h-4 text-[#B4B0EE]" />
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
            <ChevronRight className="w-5 h-5 text-[#B4B0EE]" />
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
            <p className={`text-xs ${todayVariation >= 0 ? 'text-[#CEF05D]' : 'text-red-500'}`}>
              {todayVariation >= 0 ? 'Economizou' : 'Gastou'} R$ {Math.abs(todayVariation).toFixed(2)}
            </p>
          </div>

          {/* Card 4 - Gastos do Mês */}
          <div className="text-center">
            <p className="text-[#9CA3AF] text-sm mb-1">Gastos do Mês</p>
            <p className={`text-3xl font-bold mb-1 ${accumulatedVariation >= 0 ? 'text-[#CEF05D]' : 'text-red-500'}`}>
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
            <p className={`text-3xl font-bold mb-1 ${projectionStatus === 'positive' ? 'text-[#CEF05D]' : 'text-red-500'}`}>
              {projectionStatus === 'positive' ? 'Positivo' : 'Negativo'}
            </p>
            <p className={`text-xs ${projectionStatus === 'positive' ? 'text-[#CEF05D]' : 'text-red-500'}`}>
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
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Calendário</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleQuickAddExpense}
              className="p-2 bg-[#CEF05D] hover:bg-[#B4B0EE] text-[#161618] rounded-lg transition-colors"
              title="Adicionar gasto"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleOpenDayDetail(today)}
              className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-colors"
              title="Ver detalhes do dia"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </div>

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
            let statusIndicator = null;

            // Cores baseadas no saldo
            if (dayData.status === 'comfortable') {
              bgColor = 'bg-[#CEF05D]/10';
              borderColor = 'border-[#CEF05D]/50';
              dayNumberColor = 'text-[#CEF05D]';
              statusIndicator = '✓';
            } else if (dayData.status === 'good') {
              bgColor = 'bg-[#B4B0EE]/10';
              borderColor = 'border-[#B4B0EE]/50';
              dayNumberColor = 'text-[#B4B0EE]';
              statusIndicator = '✓';
            } else if (dayData.status === 'warning') {
              bgColor = 'bg-yellow-500/10';
              borderColor = 'border-yellow-500/50';
              dayNumberColor = 'text-yellow-500';
              statusIndicator = '⚠';
            } else if (dayData.status === 'critical') {
              bgColor = 'bg-red-500/10';
              borderColor = 'border-red-500/50';
              dayNumberColor = 'text-red-500';
              statusIndicator = '✕';
            }

            // Destaque especial para hoje
            if (dayData.isToday) {
              borderColor = 'border-[#CEF05D] border-4';
            }

            // Cor do gasto: verde se <= planejado, vermelho se > planejado
            const expenseColor = dayData.expense <= dailyStandard ? 'text-[#CEF05D]' : 'text-red-500';

            return (
              <div
                key={dayData.day}
                onClick={() => handleDayClick(dayData.dateStr)}
                className={`aspect-square ${bgColor} ${borderColor} border-2 rounded-2xl p-3 cursor-pointer hover:scale-105 transition-all relative`}
              >
                {/* Número do dia - canto superior esquerdo */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className={`text-lg font-bold ${dayNumberColor}`}>
                    {dayData.day}
                  </span>
                </div>

                {/* Status indicator - canto superior direito */}
                {statusIndicator && (
                  <div className="absolute top-2 right-2">
                    <span className={`text-sm ${dayNumberColor}`}>{statusIndicator}</span>
                  </div>
                )}

                {/* Centro: "Saldo" e valor */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-xs text-white/50 mb-0.5">Saldo</p>
                  <p className="text-sm font-semibold text-white">
                    R$ {dayData.balance.toFixed(0)}
                  </p>
                </div>

                {/* Gasto do dia - canto inferior direito */}
                <div className="absolute bottom-2 right-2">
                  <span className={`text-xs font-bold ${expenseColor}`}>
                    R$ {dayData.expense.toFixed(0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#CEF05D]/30 border-2 border-[#CEF05D]/50"></div>
            <span className="text-sm text-white/70">Confortável ≥ R$ 2000 ✓</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#B4B0EE]/20 border-2 border-[#B4B0EE]/50"></div>
            <span className="text-sm text-white/70">Bom ≥ R$ 1000 ✓</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50"></div>
            <span className="text-sm text-white/70">Atenção &lt; R$ 1000 ⚠</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500/20 border-2 border-red-500/50"></div>
            <span className="text-sm text-white/70">Crítico (negativo) ✕</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleDayClick(today)}
          className="bg-[#CEF05D] hover:bg-[#B4B0EE] text-[#161618] rounded-2xl p-6 flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl hover:scale-105"
        >
          <Plus className="w-6 h-6" />
          <span className="font-semibold">Adicionar Gasto</span>
        </button>

        <button className="bg-white/10 backdrop-blur-xl border-2 border-[#a6c88c]/30 hover:border-[#a6c88c] text-white rounded-2xl p-6 flex items-center justify-center gap-3 transition-all hover:scale-105">
          <DollarSign className="w-6 h-6" />
          <span className="font-semibold">Ver Projeção</span>
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
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
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
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
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
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
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
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
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
              className="flex-1 px-4 py-3 bg-[#CEF05D] hover:bg-[#B4B0EE] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <p className="text-lg font-bold text-[#CEF05D]">R$ {totalIncomes.toFixed(2)}</p>
                    </div>
                    <div className="text-center border-x border-white/10">
                      <p className="text-xs text-[#9CA3AF] mb-1">Saídas</p>
                      <p className="text-lg font-bold text-red-500">R$ {totalExpenses.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#9CA3AF] mb-1">Saldo do Dia</p>
                      <p className={`text-lg font-bold ${balance >= 0 ? 'text-[#CEF05D]' : 'text-red-500'}`}>
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
                            <p className={`text-2xl font-bold ${difference >= 0 ? 'text-[#CEF05D]' : 'text-red-500'}`}>
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
                            <h4 className="text-sm font-semibold text-[#CEF05D] mb-2">Entradas</h4>
                            {dayIncomes.map(t => (
                              <div key={t.id} className="flex items-center justify-between p-3 bg-[#CEF05D]/10 border border-[#CEF05D]/30 rounded-lg mb-2">
                                <div>
                                  <p className="font-medium text-white">{t.description}</p>
                                  <p className="text-sm text-[#9CA3AF]">{t.category}</p>
                                </div>
                                <p className="text-lg font-bold text-[#CEF05D]">+R$ {t.amount.toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Gastos Variáveis */}
                        {(() => {
                          const variableExpenses = dayExpenses.filter(t => t.type === 'expense_variable');
                          return variableExpenses.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-[#B4B0EE] mb-2">Gastos Variáveis</h4>
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
                              <h4 className="text-sm font-semibold text-[#9D4EDD] mb-2">Gastos Fixos</h4>
                              {fixedExpenses.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 rounded-lg mb-2">
                                  <div>
                                    <p className="font-medium text-white">{t.description}</p>
                                    <p className="text-sm text-[#9CA3AF]">{t.category}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-white">R$ {t.amount.toFixed(2)}</p>
                                    {t.recurring && (
                                      <span className="inline-block text-xs px-2 py-0.5 bg-[#9D4EDD]/20 text-[#9D4EDD] rounded">
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
                              <h4 className="text-sm font-semibold text-[#9D4EDD] mb-2">Parcelas</h4>
                              {installments.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 rounded-lg mb-2">
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
                              <h4 className="text-sm font-semibold text-[#B4B0EE] mb-2">Investimentos</h4>
                              {investments.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-[#B4B0EE]/10 border border-[#B4B0EE]/30 rounded-lg mb-2">
                                  <div>
                                    <p className="font-medium text-white">{t.description}</p>
                                    <p className="text-sm text-[#9CA3AF]">{t.category}</p>
                                  </div>
                                  <p className="text-lg font-bold text-[#B4B0EE]">R$ {t.amount.toFixed(2)}</p>
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
              className="flex-1 px-4 py-3 bg-[#CEF05D] hover:bg-[#B4B0EE] text-[#161618] rounded-xl font-semibold transition-colors"
            >
              Adicionar Gasto neste Dia
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}