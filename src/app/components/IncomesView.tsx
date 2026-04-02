import { useState } from 'react';
import { Calendar as CalendarIcon, Check, X, AlertCircle, Plus, ChevronLeft, ChevronRight, Edit, DollarSign, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { getTodayLocal, formatDateToLocaleString, createDateFromString } from '@/lib/utils/dateHelpers';

export function IncomesView() {
  const { user } = useAuth();
  const { transactions, loading, createTransaction, updateTransaction, deleteTransaction, refresh } = useTransactions(user?.id);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Mês atual
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Estados do modal de cadastro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>('');

  // Estados do modal de confirmação de delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string>('');
  const [deletingDescription, setDeletingDescription] = useState<string>('');
  const [incomeForm, setIncomeForm] = useState({
    description: '',
    category: '',
    amount: '',
    date: '',
    recurring: false,
    generateNextMonths: false,
  });

  // Filtrar entradas do mês selecionado
  const incomes = transactions
    .filter(t =>
      t.type === 'income' &&
      createDateFromString(t.date).getMonth() === selectedDate.getMonth() &&
      createDateFromString(t.date).getFullYear() === selectedDate.getFullYear()
    )
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        comparison = createDateFromString(a.date).getTime() - createDateFromString(b.date).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortBy === 'description') {
        comparison = a.description.localeCompare(b.description);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const received = incomes.filter(c => c.paid);
  const pending = incomes.filter(c => !c.paid);
  const todayStr = getTodayLocal();
  const overdue = pending.filter(c => c.date < todayStr);
  const upcomingPending = pending.filter(c => c.date >= todayStr);

  const totalExpected = incomes.reduce((sum, c) => sum + c.amount, 0);
  const totalReceived = received.reduce((sum, c) => sum + c.amount, 0);
  const totalPending = pending.reduce((sum, c) => sum + c.amount, 0);
  const upcomingPendingTotal = upcomingPending.reduce((sum, c) => sum + c.amount, 0);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#9CA3AF]">Carregando entradas...</p>
        </div>
      </div>
    );
  }

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

  // Função para salvar entrada
  const handleSaveIncome = async () => {
    if (!incomeForm.description || !incomeForm.category || !incomeForm.amount || !incomeForm.date) {
      return;
    }

    setSaving(true);
    try {
      await createTransaction({
        type: 'income',
        category: incomeForm.category,
        description: incomeForm.description,
        amount: parseFloat(incomeForm.amount),
        date: incomeForm.date,
        recurring: incomeForm.recurring,
        paid: false, // Por padrão, começa como não recebido
      });

      // Se marcou para gerar próximos meses e é recorrente, criar mais 2 réplicas
      if (incomeForm.recurring && incomeForm.generateNextMonths) {
        const originalDate = new Date(incomeForm.date + 'T00:00:00');
        const dayOfMonth = originalDate.getDate();

        // Criar réplica para o próximo mês
        const nextMonth1 = new Date(originalDate.getFullYear(), originalDate.getMonth() + 1, dayOfMonth);
        await createTransaction({
          type: 'income',
          category: incomeForm.category,
          description: incomeForm.description,
          amount: parseFloat(incomeForm.amount),
          date: nextMonth1.toISOString().split('T')[0],
          recurring: true,
          paid: false
        });

        // Criar réplica para o segundo mês seguinte
        const nextMonth2 = new Date(originalDate.getFullYear(), originalDate.getMonth() + 2, dayOfMonth);
        await createTransaction({
          type: 'income',
          category: incomeForm.category,
          description: incomeForm.description,
          amount: parseFloat(incomeForm.amount),
          date: nextMonth2.toISOString().split('T')[0],
          recurring: true,
          paid: false
        });
      }

      // Force refresh to update the list immediately
      await refresh();
      setIsAddModalOpen(false);
      setIncomeForm({
        description: '',
        category: '',
        amount: '',
        date: '',
        recurring: false,
        generateNextMonths: false,
      });
    } catch (error) {
      console.error('Erro ao salvar entrada:', error);
    } finally {
      setSaving(false);
    }
  };

  // Função para abrir modal de cadastro
  const handleOpenModal = () => {
    setIsAddModalOpen(true);
    // Definir data padrão como hoje
    const todayStr = getTodayLocal();
    setIncomeForm({ ...incomeForm, date: todayStr });
  };

  // Função para abrir modal de edição
  const handleEditIncome = (income: any) => {
    setEditingId(income.id);
    setIncomeForm({
      description: income.description,
      category: income.category,
      amount: income.amount.toString(),
      date: income.date,
      recurring: income.recurring || false,
    });
    setIsEditModalOpen(true);
  };

  // Função para salvar edição
  const handleSaveEdit = async () => {
    if (!incomeForm.description || !incomeForm.category || !incomeForm.amount || !incomeForm.date) {
      return;
    }

    setSaving(true);
    try {
      await updateTransaction(editingId, {
        description: incomeForm.description,
        category: incomeForm.category,
        amount: parseFloat(incomeForm.amount),
        date: incomeForm.date,
        recurring: incomeForm.recurring,
      });

      // Force refresh to update the list immediately
      await refresh();
      setIsEditModalOpen(false);
      setEditingId('');
      setIncomeForm({
        description: '',
        category: '',
        amount: '',
        date: '',
        recurring: false,
        generateNextMonths: false,
      });
    } catch (error) {
      console.error('Erro ao editar entrada:', error);
    } finally {
      setSaving(false);
    }
  };

  // Função para marcar como recebido
  const handleTogglePaid = async (incomeId: string, currentPaid: boolean) => {
    try {
      await updateTransaction(incomeId, {
        paid: !currentPaid,
      });
      // Force refresh to update the list immediately
      await refresh();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  // Função para abrir modal de confirmação de delete
  const handleOpenDeleteModal = (id: string, description: string) => {
    setDeletingId(id);
    setDeletingDescription(description);
    setIsDeleteModalOpen(true);
  };

  // Função para deletar entrada
  const handleDeleteIncome = async () => {
    if (!deletingId) return;

    try {
      setSaving(true);
      await deleteTransaction(deletingId);
      // Force refresh to update the list immediately
      await refresh();
      setIsDeleteModalOpen(false);
      setDeletingId('');
      setDeletingDescription('');
    } catch (err) {
      console.error('Error deleting income:', err);
      alert('Erro ao deletar entrada. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Entradas</h2>

          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 rounded-lg bg-[var(--app-accent)] px-4 py-2 font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="w-5 h-5" />
            Adicionar Entrada
          </button>
        </div>

        {/* Month/Year Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={navigateToPreviousMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--app-accent)]" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors">
                <span className="text-[var(--app-accent)] text-lg font-medium">
                  {formatMonthYear(selectedDate)}
                </span>
                <CalendarIcon className="w-4 h-4 text-[var(--app-accent)]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#111214] border-white/20">
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
            <ChevronRight className="w-5 h-5 text-[var(--app-accent)]" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <p className="text-sm text-[#9CA3AF] mb-2">Total Esperado</p>
          <p className="text-3xl font-bold text-white">{totalExpected.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="text-xs text-[#9CA3AF] mt-1">{incomes.length} entradas</p>
        </div>

        <div className="rounded-xl border border-[#AFFD37]/30 bg-[#AFFD37]/10 p-6">
          <p className="mb-2 text-sm text-[#AFFD37]">Recebidos</p>
          <p className="text-3xl font-bold text-[#AFFD37]">{totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="mt-1 text-xs text-[#AFFD37]">{received.length} itens</p>
        </div>

        <div className="rounded-xl border border-[#8537FD]/30 bg-[#8537FD]/10 p-6">
          <p className="mb-2 text-sm text-[#8537FD]">A Receber</p>
          <p className="text-3xl font-bold text-[#8537FD]">{totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="mt-1 text-xs text-[#8537FD]">{pending.length} itens</p>
        </div>

        <div className="rounded-xl border border-[#E837FD]/40 bg-[#E837FD]/10 p-6">
          <p className="mb-2 text-sm text-[#E837FD]">Atrasados</p>
          <p className="text-3xl font-bold text-[#E837FD]">
            {overdue.length > 0 ? overdue.length : '0'}
          </p>
          <p className="mt-1 text-xs text-[#E837FD]">
            {overdue.length > 0 ? 'Necessita atenção' : 'Tudo em dia'}
          </p>
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[#9CA3AF] font-medium">Ordenar por:</span>

          <button
            onClick={() => setSortBy('date')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'date'
                ? 'bg-[var(--app-accent)] text-white'
                : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10'
            }`}
          >
            Data
          </button>

          <button
            onClick={() => setSortBy('amount')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'amount'
                ? 'bg-[var(--app-accent)] text-white'
                : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10'
            }`}
          >
            Valor
          </button>

          <button
            onClick={() => setSortBy('description')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'description'
                ? 'bg-[var(--app-accent)] text-white'
                : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10'
            }`}
          >
            Nome
          </button>

          <div className="ml-auto">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-[#9CA3AF] transition-colors flex items-center gap-2"
            >
              {sortOrder === 'asc' ? '↑ Crescente' : '↓ Decrescente'}
            </button>
          </div>
        </div>
      </div>

      {/* Entradas Atrasadas */}
      {overdue.length > 0 && (
        <div className="bg-[#C27C75]/10 border border-[#C27C75]/50 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-[#C27C75]">Entradas Atrasadas</h3>
              <p className="text-sm text-[#C27C75] mt-1">
                Você tem {overdue.length} entrada(s) pendente(s) com data anterior a hoje.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {overdue.map(income => (
              <div key={income.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">{income.description}</p>
                  <p className="text-sm text-[#C27C75] mt-1">
                    Previsto para {formatDateToLocaleString(income.date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{income.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <button
                      onClick={() => handleTogglePaid(income.id, income.paid)}
                      className="mt-2 rounded bg-[var(--app-accent)] px-3 py-1 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      Marcar como Recebido
                    </button>
                  </div>
                  <button
                    onClick={() => handleOpenDeleteModal(income.id, income.description)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Deletar entrada"
                  >
                    <Trash2 className="w-5 h-5 text-red-400 hover:text-red-300" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A Receber */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-white/10 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">A Receber</h3>
            <span className="text-lg font-semibold text-[#8537FD]">
              {upcomingPendingTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <p className="text-sm text-[#9CA3AF] mt-1">{upcomingPending.length} entradas previstas</p>
        </div>

        <div className="divide-y divide-white/10">
          {upcomingPending.map(income => (
            <div key={income.id} className="px-6 py-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-[#8537FD]/10 border border-[#8537FD]/30 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-[#8537FD]" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-medium text-white">
                        {income.description}
                      </h4>
                      {income.recurring && (
                        <span className="inline-block rounded bg-[#AFFD37]/20 px-2 py-1 text-xs font-medium text-[#AFFD37]">
                          Recorrente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-[#9CA3AF]">
                      <span>Previsto para {formatDateToLocaleString(income.date)}</span>
                      <span>•</span>
                      <span>{income.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      {income.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>

                  <button
                    onClick={() => handleEditIncome(income)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5 text-[#9CA3AF]" />
                  </button>

                  <button
                    onClick={() => handleOpenDeleteModal(income.id, income.description)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="w-5 h-5 text-red-400 hover:text-red-300" />
                  </button>

                  <button
                    onClick={() => handleTogglePaid(income.id, income.paid)}
                    className="rounded-lg bg-[var(--app-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Marcar como Recebido
                  </button>
                </div>
              </div>
            </div>
          ))}

          {upcomingPending.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-[#9CA3AF]">Nenhuma entrada pendente</p>
            </div>
          )}
        </div>
      </div>

      {/* Recebidos */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-white/10 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Recebidos</h3>
            <span className="text-lg font-semibold text-[#AFFD37]">
              {totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <p className="text-sm text-[#9CA3AF] mt-1">{received.length} entradas recebidas</p>
        </div>

        <div className="divide-y divide-white/10">
          {received.map(income => (
            <div key={income.id} className="px-6 py-4 bg-[#AFFD37]/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-[#AFFD37]/10 border border-[#AFFD37]/30 rounded-lg flex items-center justify-center">
                    <Check className="w-6 h-6 text-[#AFFD37]" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-medium text-white">
                        {income.description}
                      </h4>
                      {income.recurring && (
                        <span className="inline-block rounded bg-[#AFFD37]/20 px-2 py-1 text-xs font-medium text-[#AFFD37]">
                          Recorrente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-[#9CA3AF]">
                      <span>Recebido em {formatDateToLocaleString(income.date)}</span>
                      <span>•</span>
                      <span>{income.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      {income.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <span className="inline-block mt-1 rounded bg-[#AFFD37]/20 px-2 py-1 text-xs font-medium text-[#AFFD37]">
                      Recebido
                    </span>
                  </div>

                  <button
                    onClick={() => handleEditIncome(income)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5 text-[#9CA3AF]" />
                  </button>

                  <button
                    onClick={() => handleOpenDeleteModal(income.id, income.description)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="w-5 h-5 text-red-400 hover:text-red-300" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Timeline de Entradas</h3>

        <div className="space-y-4">
          {incomes.map((income, index) => {
            const incomeDate = createDateFromString(income.date);
            const isPast = income.date < todayStr;
            const isToday = income.date === todayStr;

            return (
              <div key={income.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${income.paid
                      ? 'bg-[#AFFD37]'
                      : isPast
                        ? 'bg-[#C27C75]'
                        : isToday
                          ? 'bg-[#8537FD]'
                          : 'bg-gray-300'
                    }`}></div>
                  {index < incomes.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-200"></div>
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {incomeDate.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long'
                        })}
                      </p>
                      <p className="text-sm text-[#9CA3AF] mt-1">
                        {income.description} - {income.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      {income.paid && (
                        <span className="inline-block mt-1 text-xs text-[#AFFD37]">✓ Recebido</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditIncome(income)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4 text-[#9CA3AF] hover:text-white" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(income.id, income.description)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                      </button>
                      <button
                        onClick={() => handleTogglePaid(income.id, income.paid || false)}
                        className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors ${
                          income.paid ? 'text-[#AFFD37]' : 'text-[#9CA3AF]'
                        }`}
                        title={income.paid ? 'Marcar como não recebido' : 'Marcar como recebido'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Cadastro de Entrada */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-[#111214] border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Adicionar Entrada
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Cadastre entradas recorrentes ou outras receitas planejadas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Salário, Freelance, Bônus"
                value={incomeForm.description}
                onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Salário, Trabalho Autônomo, Investimentos"
                value={incomeForm.category}
                onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
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
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Data de Recebimento *
              </label>
              <input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
              />
            </div>

            {/* Recorrente */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={incomeForm.recurring}
                  onChange={(e) => setIncomeForm({ ...incomeForm, recurring: e.target.checked, generateNextMonths: e.target.checked ? incomeForm.generateNextMonths : false })}
                  className="w-5 h-5 rounded border-white/20 text-[var(--app-accent)] focus:ring-[var(--app-accent)]"
                />
                <label htmlFor="recurring" className="text-sm font-medium text-[#9CA3AF]">
                  Entrada recorrente (repete todo mês)
                </label>
              </div>

              {/* Checkbox para gerar próximos 2 meses */}
              {incomeForm.recurring && (
                <div className="flex items-center gap-3 ml-8">
                  <input
                    type="checkbox"
                    id="generateNextMonths"
                    checked={incomeForm.generateNextMonths}
                    onChange={(e) => setIncomeForm({ ...incomeForm, generateNextMonths: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 text-[#FDE837] focus:ring-[#FDE837]"
                  />
                  <label htmlFor="generateNextMonths" className="text-sm font-medium text-[#9CA3AF]">
                    Criar também para os próximos 2 meses (total de 3)
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-[#9CA3AF] rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveIncome}
              disabled={!incomeForm.description || !incomeForm.category || !incomeForm.amount || !incomeForm.date || saving}
              className="flex-1 px-4 py-3 bg-[var(--app-accent)] hover:opacity-90 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar Entrada'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Entrada */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#111214] border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Editar Entrada
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Atualize as informações da entrada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Salário, Freelance, Bônus"
                value={incomeForm.description}
                onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Salário, Trabalho Autônomo, Investimentos"
                value={incomeForm.category}
                onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
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
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Data de Recebimento *
              </label>
              <input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
              />
            </div>

            {/* Recorrente */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring-edit"
                checked={incomeForm.recurring}
                onChange={(e) => setIncomeForm({ ...incomeForm, recurring: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 text-[var(--app-accent)] focus:ring-[var(--app-accent)]"
              />
              <label htmlFor="recurring-edit" className="text-sm font-medium text-[#9CA3AF]">
                Entrada recorrente (repete todo mês)
              </label>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-[#9CA3AF] rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={!incomeForm.description || !incomeForm.category || !incomeForm.amount || !incomeForm.date || saving}
              className="flex-1 px-4 py-3 bg-[var(--app-accent)] hover:opacity-90 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Delete */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-[#111214] border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              Deletar Entrada
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF] mt-4">
              Tem certeza que deseja deletar esta entrada? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-sm text-[#9CA3AF] mb-1">Entrada:</p>
            <p className="text-white font-medium">{deletingDescription}</p>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-[#9CA3AF] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteIncome}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Deletando...' : 'Deletar Entrada'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
