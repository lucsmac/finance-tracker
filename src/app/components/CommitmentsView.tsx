import { useState } from 'react';
import { Calendar as CalendarIcon, Check, X, AlertCircle, Plus, ChevronLeft, ChevronRight, Edit, Trash2, Copy } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { getTodayLocal, formatDateToLocaleString, createDateFromString } from '@/lib/utils/dateHelpers';

export function CommitmentsView() {
  const { user } = useAuth();
  const { transactions, loading, error, createTransaction, createInstallments, updateTransaction, deleteTransaction, refresh } = useTransactions(user?.id);
  const todayStr = getTodayLocal();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Mês atual
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description' | 'type'>('amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  // Estados do modal de cadastro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>('');

  // Estados do modal de confirmação de delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string>('');
  const [deletingDescription, setDeletingDescription] = useState<string>('');
  const [commitmentForm, setCommitmentForm] = useState({
    type: 'expense_fixed' as 'expense_fixed' | 'installment',
    description: '',
    category: '',
    amount: '',
    date: '',
    recurring: false,
    generateNextMonths: false,
    generateAllInstallments: true, // Por padrão, criar todas as parcelas
    totalInstallments: '',
    installmentNumber: '1'
  });

  // Filtrar compromissos do mês selecionado (fixos e parcelas)
  const commitments = transactions
    .filter(t =>
      (t.type === 'expense_fixed' || t.type === 'installment') &&
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
      } else if (sortBy === 'type') {
        comparison = a.type.localeCompare(b.type);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const paid = commitments.filter(c => c.paid);
  const pending = commitments.filter(c => !c.paid);
  const overdue = pending.filter(c => c.date < todayStr);
  const upcomingPending = pending.filter(c => c.date >= todayStr);

  const filteredCommitments = commitments.filter(c => {
    if (statusFilter === 'paid') return !!c.paid;
    if (statusFilter === 'pending') return !c.paid;
    return true;
  });
  const upcomingPendingTotal = upcomingPending.reduce((sum, c) => sum + c.amount, 0);

  const totalCommitted = commitments.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = paid.reduce((sum, c) => sum + c.amount, 0);
  const totalPending = pending.reduce((sum, c) => sum + c.amount, 0);

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

  const getCategoryBadgeClass = (category: string) => {
    const palette = [
      'bg-[#5DADE2]/20 text-[#5DADE2] border border-[#5DADE2]/40',
      'bg-[#F5B041]/20 text-[#F5B041] border border-[#F5B041]/40',
      'bg-[#58D68D]/20 text-[#58D68D] border border-[#58D68D]/40',
      'bg-[#AF7AC5]/20 text-[#AF7AC5] border border-[#AF7AC5]/40',
      'bg-[#EC7063]/20 text-[#EC7063] border border-[#EC7063]/40',
      'bg-[#48C9B0]/20 text-[#48C9B0] border border-[#48C9B0]/40',
      'bg-[#F4D03F]/20 text-[#F4D03F] border border-[#F4D03F]/40',
      'bg-[#7FB3D5]/20 text-[#7FB3D5] border border-[#7FB3D5]/40'
    ];

    const hash = category
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  // Função para salvar compromisso
  const handleSaveCommitment = async () => {
    if (!commitmentForm.description || !commitmentForm.amount || !commitmentForm.date) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar campos de parcelamento
    if (commitmentForm.type === 'installment') {
      const currentInstallment = parseInt(commitmentForm.installmentNumber) || 1;
      const totalInstallments = parseInt(commitmentForm.totalInstallments);

      if (!commitmentForm.totalInstallments || totalInstallments < 1) {
        alert('Informe o número total de parcelas');
        return;
      }

      if (currentInstallment < 1) {
        alert('A parcela atual deve ser pelo menos 1');
        return;
      }

      if (currentInstallment > totalInstallments) {
        alert('A parcela atual não pode ser maior que o total de parcelas');
        return;
      }
    }

    try {
      setSaving(true);

      // Se for parcelamento
      if (commitmentForm.type === 'installment') {
        if (commitmentForm.generateAllInstallments) {
          // Criar todas as parcelas restantes
          await createInstallments({
            type: 'installment',
            category: commitmentForm.category || 'Geral',
            description: commitmentForm.description,
            amount: parseFloat(commitmentForm.amount),
            date: commitmentForm.date,
            recurring: false,
            paid: false,
            installmentGroup: `${commitmentForm.description}-${Date.now()}`,
            installmentNumber: parseInt(commitmentForm.installmentNumber) || 1,
            totalInstallments: parseInt(commitmentForm.totalInstallments)
          });
        } else {
          // Criar apenas a parcela atual
          await createTransaction({
            type: 'installment',
            category: commitmentForm.category || 'Geral',
            description: commitmentForm.description,
            amount: parseFloat(commitmentForm.amount),
            date: commitmentForm.date,
            recurring: false,
            paid: false,
            installmentGroup: `${commitmentForm.description}-${Date.now()}`,
            installmentNumber: parseInt(commitmentForm.installmentNumber) || 1,
            totalInstallments: parseInt(commitmentForm.totalInstallments)
          });
        }
      } else {
        const isRecurring = commitmentForm.type === 'expense_fixed' ? commitmentForm.recurring : false;

        await createTransaction({
          type: commitmentForm.type,
          category: commitmentForm.category || 'Geral',
          description: commitmentForm.description,
          amount: parseFloat(commitmentForm.amount),
          date: commitmentForm.date,
          recurring: isRecurring,
          paid: false
        });

        // Se marcou para gerar próximos meses e é recorrente, criar mais 2 réplicas
        if (isRecurring && commitmentForm.generateNextMonths) {
          const originalDate = new Date(commitmentForm.date + 'T00:00:00');
          const dayOfMonth = originalDate.getDate();

          // Criar réplica para o próximo mês
          const nextMonth1 = new Date(originalDate.getFullYear(), originalDate.getMonth() + 1, dayOfMonth);
          await createTransaction({
            type: commitmentForm.type,
            category: commitmentForm.category || 'Geral',
            description: commitmentForm.description,
            amount: parseFloat(commitmentForm.amount),
            date: nextMonth1.toISOString().split('T')[0],
            recurring: true,
            paid: false
          });

          // Criar réplica para o segundo mês seguinte
          const nextMonth2 = new Date(originalDate.getFullYear(), originalDate.getMonth() + 2, dayOfMonth);
          await createTransaction({
            type: commitmentForm.type,
            category: commitmentForm.category || 'Geral',
            description: commitmentForm.description,
            amount: parseFloat(commitmentForm.amount),
            date: nextMonth2.toISOString().split('T')[0],
            recurring: true,
            paid: false
          });
        }
      }

      // Force refresh to update the list immediately
      await refresh();
      setIsAddModalOpen(false);
      setCommitmentForm({
        type: 'expense_fixed',
        description: '',
        category: '',
        amount: '',
        date: '',
        recurring: false,
        generateNextMonths: false,
        generateAllInstallments: true,
        totalInstallments: '',
        installmentNumber: '1'
      });
    } catch (err) {
      console.error('Error saving commitment:', err);
      alert('Erro ao salvar compromisso. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Função para abrir modal de cadastro
  const handleOpenModal = () => {
    setIsAddModalOpen(true);
    // Definir data padrão como hoje
    const todayStr = getTodayLocal();
    setCommitmentForm({ ...commitmentForm, date: todayStr });
  };

  // Função para abrir modal de edição
  const handleEditCommitment = (commitment: any) => {
    setEditingId(commitment.id);
    setCommitmentForm({
      type: commitment.type,
      description: commitment.description,
      category: commitment.category,
      amount: commitment.amount.toString(),
      date: commitment.date,
      recurring: commitment.recurring || false,
      totalInstallments: commitment.totalInstallments?.toString() || '',
      installmentNumber: commitment.installmentNumber?.toString() || ''
    });
    setIsEditModalOpen(true);
  };

  // Função para abrir modal de duplicação
  const handleDuplicateCommitment = (commitment: any) => {
    setCommitmentForm({
      type: commitment.type,
      description: commitment.description,
      category: commitment.category,
      amount: commitment.amount.toString(),
      date: commitment.date,
      recurring: commitment.recurring || false,
      totalInstallments: commitment.totalInstallments?.toString() || '',
      installmentNumber: commitment.installmentNumber?.toString() || '1'
    });
    setIsDuplicateModalOpen(true);
  };

  // Função para salvar edição
  const handleSaveEdit = async () => {
    if (!editingId || !commitmentForm.description || !commitmentForm.amount || !commitmentForm.date) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSaving(true);
      await updateTransaction(editingId, {
        type: commitmentForm.type,
        category: commitmentForm.category || 'Geral',
        description: commitmentForm.description,
        amount: parseFloat(commitmentForm.amount),
        date: commitmentForm.date,
        recurring: commitmentForm.recurring,
        installmentNumber: commitmentForm.type === 'installment' ? parseInt(commitmentForm.installmentNumber) : undefined,
        totalInstallments: commitmentForm.type === 'installment' ? parseInt(commitmentForm.totalInstallments) : undefined
      });

      // Force refresh to update the list immediately
      await refresh();
      setIsEditModalOpen(false);
      setEditingId('');
      setCommitmentForm({
        type: 'expense_fixed',
        description: '',
        category: '',
        amount: '',
        date: '',
        recurring: false,
        generateNextMonths: false,
        generateAllInstallments: true,
        totalInstallments: '',
        installmentNumber: '1'
      });
    } catch (err) {
      console.error('Error editing commitment:', err);
      alert('Erro ao editar compromisso. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Função para salvar duplicação (usa a mesma lógica do handleSaveCommitment)
  const handleSaveDuplicate = async () => {
    if (!commitmentForm.description || !commitmentForm.amount || !commitmentForm.date) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar campos de parcelamento
    if (commitmentForm.type === 'installment') {
      const currentInstallment = parseInt(commitmentForm.installmentNumber) || 1;
      const totalInstallments = parseInt(commitmentForm.totalInstallments);

      if (!commitmentForm.totalInstallments || totalInstallments < 1) {
        alert('Informe o número total de parcelas');
        return;
      }

      if (currentInstallment < 1) {
        alert('A parcela atual deve ser pelo menos 1');
        return;
      }

      if (currentInstallment > totalInstallments) {
        alert('A parcela atual não pode ser maior que o total de parcelas');
        return;
      }
    }

    try {
      setSaving(true);

      // Se for parcelamento, usar createInstallments para criar todas as parcelas
      if (commitmentForm.type === 'installment') {
        await createInstallments({
          type: 'installment',
          category: commitmentForm.category || 'Geral',
          description: commitmentForm.description,
          amount: parseFloat(commitmentForm.amount),
          date: commitmentForm.date,
          recurring: false,
          paid: false,
          installmentGroup: `${commitmentForm.description}-${Date.now()}`,
          installmentNumber: parseInt(commitmentForm.installmentNumber) || 1,
          totalInstallments: parseInt(commitmentForm.totalInstallments)
        });
      } else {
        await createTransaction({
          type: commitmentForm.type,
          category: commitmentForm.category || 'Geral',
          description: commitmentForm.description,
          amount: parseFloat(commitmentForm.amount),
          date: commitmentForm.date,
          // Apenas gastos fixos podem ser recorrentes
          recurring: commitmentForm.type === 'expense_fixed' ? commitmentForm.recurring : false,
          paid: false
        });
      }

      // Force refresh to update the list immediately
      await refresh();
      setIsDuplicateModalOpen(false);
      setCommitmentForm({
        type: 'expense_fixed',
        description: '',
        category: '',
        amount: '',
        date: '',
        recurring: false,
        generateNextMonths: false,
        generateAllInstallments: true,
        totalInstallments: '',
        installmentNumber: '1'
      });
    } catch (err) {
      console.error('Error duplicating commitment:', err);
      alert('Erro ao duplicar compromisso. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Função para marcar como pago/não pago
  const handleTogglePaid = async (id: string, currentPaid: boolean) => {
    try {
      await updateTransaction(id, { paid: !currentPaid });
      // Force refresh to update the list immediately
      await refresh();
    } catch (err) {
      console.error('Error toggling paid status:', err);
      alert('Erro ao atualizar status. Tente novamente.');
    }
  };

  // Função para abrir modal de confirmação de delete
  const handleOpenDeleteModal = (id: string, description: string) => {
    setDeletingId(id);
    setDeletingDescription(description);
    setIsDeleteModalOpen(true);
  };

  // Função para deletar compromisso
  const handleDeleteCommitment = async () => {
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
      console.error('Error deleting commitment:', err);
      alert('Erro ao deletar compromisso. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#76C893] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Carregando compromissos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar compromissos</h3>
          <p className="text-gray-400 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#76C893] text-[#161618] rounded-lg hover:bg-[#9B97CE] transition-colors"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Compromissos</h2>

          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Adicionar Compromisso
          </button>
        </div>

        {/* Month/Year Navigation */}
        <div className="flex items-center gap-3">
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <p className="text-sm text-[#9CA3AF] mb-2">Total Comprometido</p>
          <p className="text-3xl font-bold text-white">{totalCommitted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="text-xs text-[#9CA3AF] mt-1">{commitments.length} compromissos</p>
        </div>

        <div className="bg-[#76C893]/10 rounded-xl border border-[#76C893]/30 p-6">
          <p className="text-sm text-[#76C893] mb-2">Pagos</p>
          <p className="text-3xl font-bold text-[#76C893]">{totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="text-xs text-[#76C893] mt-1">{paid.length} itens</p>
        </div>

        <div className="bg-[#8B7AB8]/10 rounded-xl border border-[#8B7AB8]/30 p-6">
          <p className="text-sm text-[#8B7AB8] mb-2">Pendentes</p>
          <p className="text-3xl font-bold text-[#8B7AB8]">{totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="text-xs text-[#8B7AB8] mt-1">{pending.length} itens</p>
        </div>

        <div className="bg-[#D97B7B]/100/10 rounded-xl border border-[#D97B7B]/50 p-6">
          <p className="text-sm text-[#D97B7B] mb-2">Atrasados</p>
          <p className="text-3xl font-bold text-[#D97B7B]">
            {overdue.length > 0 ? overdue.length : '0'}
          </p>
          <p className="text-xs text-[#D97B7B] mt-1">
            {overdue.length > 0 ? 'Necessita atenção' : 'Tudo em dia'}
          </p>
        </div>
      </div>

      {/* Controles de Ordenação e Filtro */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-[#9CA3AF]">Ordenar por:</h3>
            <button
              onClick={() => setSortBy('date')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'date'
                  ? 'bg-[#76C893] text-[#161618]'
                  : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10'
              }`}
            >
              Data
            </button>
            <button
              onClick={() => setSortBy('amount')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'amount'
                  ? 'bg-[#76C893] text-[#161618]'
                  : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10'
              }`}
            >
              Valor
            </button>
            <button
              onClick={() => setSortBy('description')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'description'
                  ? 'bg-[#76C893] text-[#161618]'
                  : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10'
              }`}
            >
              Nome
            </button>
            <button
              onClick={() => setSortBy('type')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'type'
                  ? 'bg-[#76C893] text-[#161618]'
                  : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10'
              }`}
            >
              Tipo
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-[#9CA3AF] hover:bg-white/10 transition-colors"
            >
              {sortOrder === 'asc' ? '↑ Crescente' : '↓ Decrescente'}
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-[#9CA3AF]">Filtrar por:</h3>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-[#76C893] text-[#161618]'
                  : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'paid'
                  ? 'bg-[#76C893] text-[#161618]'
                  : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10'
              }`}
            >
              Pagos
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-[#76C893] text-[#161618]'
                  : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10'
              }`}
            >
              Não pagos
            </button>
          </div>
        </div>
      </div>

      {/* Compromissos Atrasados */}
      {(statusFilter === 'all' || statusFilter === 'pending') && overdue.length > 0 && (
        <div className="bg-[#D97B7B]/10 border border-[#D97B7B]/50 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-[#D97B7B] mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-[#D97B7B]">Compromissos Atrasados</h3>
              <p className="text-sm text-[#D97B7B] mt-1">
                Você tem {overdue.length} compromisso(s) pendente(s) com vencimento anterior a hoje.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {overdue.map(commitment => (
              <div key={commitment.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">{commitment.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-[#D97B7B]">
                      Venceu em {formatDateToLocaleString(commitment.date)}
                    </p>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadgeClass(commitment.category)}`}>
                      {commitment.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{commitment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <button
                      onClick={() => handleTogglePaid(commitment.id, commitment.paid || false)}
                      className="mt-2 px-3 py-1 bg-[#D97B7B] hover:bg-[#C97A7A] text-white text-sm rounded transition-colors"
                    >
                      Pagar Agora
                    </button>
                  </div>
                  <button
                    onClick={() => handleOpenDeleteModal(commitment.id, commitment.description)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Deletar compromisso"
                  >
                    <Trash2 className="w-5 h-5 text-red-400 hover:text-red-300" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pendentes */}
      {(statusFilter === 'all' || statusFilter === 'pending') && (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-white/10 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Pendentes</h3>
            <span className="text-lg font-semibold text-[#8B7AB8]">
              {upcomingPendingTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <p className="text-sm text-[#9CA3AF] mt-1">{upcomingPending.length} compromissos a vencer</p>
        </div>

        <div className="divide-y divide-white/10">
          {upcomingPending.map(commitment => (
            <div key={commitment.id} className="px-6 py-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-[#8B7AB8]/10 border border-[#8B7AB8]/30 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6 text-[#8B7AB8]" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-medium text-white">
                        {commitment.description}
                      </h4>
                      {commitment.installmentNumber && (
                        <>
                          <span className="text-sm text-[#9CA3AF]">•</span>
                          <span className="text-sm font-semibold text-white">
                            {commitment.installmentNumber}/{commitment.totalInstallments}
                          </span>
                        </>
                      )}
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        commitment.type === 'expense_fixed' ? 'bg-[#8B7AB8]/20 text-[#8B7AB8]' :
                        'bg-[#8B7AB8]/20 text-[#8B7AB8]'
                        }`}>
                        {commitment.type === 'expense_fixed' ? 'Fixo' :
                         'Parcela'}
                      </span>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCategoryBadgeClass(commitment.category)}`}>
                        {commitment.category}
                      </span>
                      {commitment.recurring && (
                        <span className="inline-block px-2 py-1 bg-[#9B97CE]/20 text-[#9B97CE] rounded text-xs font-medium">
                          Recorrente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-[#9CA3AF]">
                      <span>Vence em {formatDateToLocaleString(commitment.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      {commitment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDuplicateCommitment(commitment)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Duplicar"
                  >
                    <Copy className="w-5 h-5 text-[#80bc96]" />
                  </button>

                  <button
                    onClick={() => handleEditCommitment(commitment)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5 text-[#9CA3AF]" />
                  </button>

                  <button
                    onClick={() => handleOpenDeleteModal(commitment.id, commitment.description)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="w-5 h-5 text-red-400 hover:text-red-300" />
                  </button>

                  <button
                    onClick={() => handleTogglePaid(commitment.id, commitment.paid || false)}
                    className="px-4 py-2 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-lg text-sm font-medium transition-colors"
                  >
                    Marcar como Pago
                  </button>
                </div>
              </div>
            </div>
          ))}

          {upcomingPending.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-[#9CA3AF]">Nenhum compromisso pendente</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Pagos */}
      {(statusFilter === 'all' || statusFilter === 'paid') && (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-white/10 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Pagos</h3>
            <span className="text-lg font-semibold text-[#76C893]">
              {totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <p className="text-sm text-[#9CA3AF] mt-1">{paid.length} compromissos quitados</p>
        </div>

        <div className="divide-y divide-white/10">
          {paid.map(commitment => (
            <div key={commitment.id} className="px-6 py-4 bg-[#76C893]/10/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-[#76C893]/10 border border-[#76C893]/30 rounded-lg flex items-center justify-center">
                    <Check className="w-6 h-6 text-[#76C893]" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-medium text-white">
                        {commitment.description}
                      </h4>
                      {commitment.installmentNumber && (
                        <>
                          <span className="text-sm text-[#9CA3AF]">•</span>
                          <span className="text-sm font-semibold text-white">
                            {commitment.installmentNumber}/{commitment.totalInstallments}
                          </span>
                        </>
                      )}
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        commitment.type === 'expense_fixed' ? 'bg-[#8B7AB8]/20 text-[#8B7AB8]' :
                        'bg-[#8B7AB8]/20 text-[#8B7AB8]'
                        }`}>
                        {commitment.type === 'expense_fixed' ? 'Fixo' :
                         'Parcela'}
                      </span>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCategoryBadgeClass(commitment.category)}`}>
                        {commitment.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-[#9CA3AF]">
                      <span>Pago em {formatDateToLocaleString(commitment.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      {commitment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <span className="inline-block mt-1 px-2 py-1 bg-[#76C893]/20 text-[#76C893] rounded text-xs font-medium">
                      Pago
                    </span>
                  </div>

                  <button
                    onClick={() => handleDuplicateCommitment(commitment)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Duplicar"
                  >
                    <Copy className="w-5 h-5 text-[#80bc96]" />
                  </button>

                  <button
                    onClick={() => handleEditCommitment(commitment)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5 text-[#9CA3AF]" />
                  </button>

                  <button
                    onClick={() => handleOpenDeleteModal(commitment.id, commitment.description)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="w-5 h-5 text-red-400 hover:text-red-300" />
                  </button>

                  <button
                    onClick={() => handleTogglePaid(commitment.id, commitment.paid || false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Marcar como Não Pago
                  </button>
                </div>
              </div>
            </div>
          ))}

          {paid.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-[#9CA3AF]">Nenhum compromisso pago</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Timeline */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Timeline de Vencimentos</h3>

        <div className="space-y-4">
          {filteredCommitments.map((commitment, index) => {
            const commitmentDate = createDateFromString(commitment.date);
            const isPast = commitment.date < todayStr;
            const isToday = commitment.date === todayStr;

            return (
              <div key={commitment.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${commitment.paid
                      ? 'bg-[#76C893]/100'
                      : isPast
                        ? 'bg-[#D97B7B]/100'
                        : isToday
                          ? 'bg-[#9B97CE]'
                          : 'bg-gray-300'
                    }`}></div>
                  {index < filteredCommitments.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-200"></div>
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {commitmentDate.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long'
                        })}
                      </p>
                      <p className="text-sm text-[#9CA3AF] mt-1">
                        {commitment.description} - {commitment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadgeClass(commitment.category)}`}>
                        {commitment.category}
                      </span>
                      {commitment.paid && (
                        <span className="inline-block mt-1 text-xs text-[#76C893]">✓ Pago</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditCommitment(commitment)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4 text-[#9CA3AF] hover:text-white" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(commitment.id, commitment.description)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                      </button>
                      <button
                        onClick={() => handleTogglePaid(commitment.id, commitment.paid || false)}
                        className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors ${
                          commitment.paid ? 'text-[#76C893]' : 'text-[#9CA3AF]'
                        }`}
                        title={commitment.paid ? 'Marcar como não pago' : 'Marcar como pago'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCommitments.length === 0 && (
            <p className="text-[#9CA3AF] text-sm">Nenhum compromisso para o filtro selecionado</p>
          )}
        </div>
      </div>

      {/* Modal de Cadastro de Compromisso */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Adicionar Compromisso
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Cadastre gastos fixos recorrentes ou parcelamentos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Tipo de Compromisso */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Tipo *
              </label>
              <select
                value={commitmentForm.type}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, type: e.target.value as 'expense_fixed' | 'installment' })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              >
                <option value="expense_fixed" className="bg-[#161618]">Gasto Fixo</option>
                <option value="installment" className="bg-[#161618]">Parcelamento</option>
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Aluguel, Internet, Notebook"
                value={commitmentForm.description}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Moradia, Contas, Eletrônicos"
                value={commitmentForm.category}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, category: e.target.value })}
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
                value={commitmentForm.amount}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, amount: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Data de Vencimento */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={commitmentForm.date}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, date: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Recorrente (apenas para gasto fixo) */}
            {commitmentForm.type === 'expense_fixed' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={commitmentForm.recurring}
                    onChange={(e) => setCommitmentForm({ ...commitmentForm, recurring: e.target.checked, generateNextMonths: e.target.checked ? commitmentForm.generateNextMonths : false })}
                    className="w-5 h-5 rounded border-white/20 text-[#76C893] focus:ring-[#76C893]"
                  />
                  <label htmlFor="recurring" className="text-sm font-medium text-[#9CA3AF]">
                    Compromisso recorrente (repete todo mês)
                  </label>
                </div>

                {/* Checkbox para gerar próximos 2 meses */}
                {commitmentForm.recurring && (
                  <div className="flex items-center gap-3 ml-8">
                    <input
                      type="checkbox"
                      id="generateNextMonths"
                      checked={commitmentForm.generateNextMonths}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, generateNextMonths: e.target.checked })}
                      className="w-5 h-5 rounded border-white/20 text-[#80bc96] focus:ring-[#80bc96]"
                    />
                    <label htmlFor="generateNextMonths" className="text-sm font-medium text-[#9CA3AF]">
                      Criar também para os próximos 2 meses (total de 3)
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Campos de Parcelamento */}
            {commitmentForm.type === 'installment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                      Parcela Atual *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={commitmentForm.installmentNumber}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, installmentNumber: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                      Total de Parcelas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="12"
                      value={commitmentForm.totalInstallments}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, totalInstallments: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Checkbox para gerar todas as parcelas */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="generateAllInstallments"
                    checked={commitmentForm.generateAllInstallments}
                    onChange={(e) => setCommitmentForm({ ...commitmentForm, generateAllInstallments: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 text-[#80bc96] focus:ring-[#80bc96]"
                  />
                  <label htmlFor="generateAllInstallments" className="text-sm font-medium text-[#9CA3AF]">
                    Criar todas as parcelas restantes automaticamente
                  </label>
                </div>
              </div>
            )}
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
              onClick={handleSaveCommitment}
              disabled={!commitmentForm.description || !commitmentForm.category || !commitmentForm.amount || !commitmentForm.date}
              className="flex-1 px-4 py-3 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Compromisso
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Compromisso */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Editar Compromisso
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Atualize as informações do compromisso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Tipo de Compromisso */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Tipo *
              </label>
              <select
                value={commitmentForm.type}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, type: e.target.value as 'expense_fixed' | 'installment' })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              >
                <option value="expense_fixed" className="bg-[#161618]">Gasto Fixo</option>
                <option value="installment" className="bg-[#161618]">Parcelamento</option>
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Aluguel, Internet, Notebook"
                value={commitmentForm.description}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Moradia, Contas, Eletrônicos"
                value={commitmentForm.category}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, category: e.target.value })}
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
                value={commitmentForm.amount}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, amount: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Data de Vencimento */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={commitmentForm.date}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, date: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Recorrente (apenas para gasto fixo) */}
            {commitmentForm.type === 'expense_fixed' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="recurring-edit"
                    checked={commitmentForm.recurring}
                    onChange={(e) => setCommitmentForm({ ...commitmentForm, recurring: e.target.checked, generateNextMonths: e.target.checked ? commitmentForm.generateNextMonths : false })}
                    className="w-5 h-5 rounded border-white/20 text-[#76C893] focus:ring-[#76C893]"
                  />
                  <label htmlFor="recurring-edit" className="text-sm font-medium text-[#9CA3AF]">
                    Compromisso recorrente (repete todo mês)
                  </label>
                </div>

                {/* Checkbox para gerar próximos 2 meses */}
                {commitmentForm.recurring && (
                  <div className="flex items-center gap-3 ml-8">
                    <input
                      type="checkbox"
                      id="generateNextMonths-edit"
                      checked={commitmentForm.generateNextMonths}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, generateNextMonths: e.target.checked })}
                      className="w-5 h-5 rounded border-white/20 text-[#80bc96] focus:ring-[#80bc96]"
                    />
                    <label htmlFor="generateNextMonths-edit" className="text-sm font-medium text-[#9CA3AF]">
                      Criar também para os próximos 2 meses (total de 3)
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Campos de Parcelamento */}
            {commitmentForm.type === 'installment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                      Parcela Atual *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={commitmentForm.installmentNumber}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, installmentNumber: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                      Total de Parcelas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="12"
                      value={commitmentForm.totalInstallments}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, totalInstallments: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Checkbox para gerar todas as parcelas */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="generateAllInstallments"
                    checked={commitmentForm.generateAllInstallments}
                    onChange={(e) => setCommitmentForm({ ...commitmentForm, generateAllInstallments: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 text-[#80bc96] focus:ring-[#80bc96]"
                  />
                  <label htmlFor="generateAllInstallments" className="text-sm font-medium text-[#9CA3AF]">
                    Criar todas as parcelas restantes automaticamente
                  </label>
                </div>
              </div>
            )}
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
              disabled={!commitmentForm.description || !commitmentForm.category || !commitmentForm.amount || !commitmentForm.date}
              className="flex-1 px-4 py-3 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Alterações
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Duplicação */}
      <Dialog open={isDuplicateModalOpen} onOpenChange={setIsDuplicateModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-12 h-12 bg-[#80bc96]/10 border border-[#80bc96]/30 rounded-xl flex items-center justify-center">
                <Copy className="w-6 h-6 text-[#80bc96]" />
              </div>
              Duplicar Transação
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF] mt-2">
              Ajuste a data e/ou valor da transação duplicada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Usa o mesmo formulário do modal de adicionar */}
            {/* Tipo de Compromisso */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Tipo *
              </label>
              <select
                value={commitmentForm.type}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, type: e.target.value as 'expense_fixed' | 'installment' })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              >
                <option value="expense_fixed" className="bg-[#161618]">Gasto Fixo</option>
                <option value="installment" className="bg-[#161618]">Parcelamento</option>
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Aluguel, Internet, Notebook"
                value={commitmentForm.description}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Moradia, Lazer, Educação"
                value={commitmentForm.category}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, category: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Valor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={commitmentForm.amount}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, amount: e.target.value })}
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
                value={commitmentForm.date}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, date: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Recorrente (apenas para gasto fixo) */}
            {commitmentForm.type === 'expense_fixed' && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="recurring-duplicate"
                  checked={commitmentForm.recurring}
                  onChange={(e) => setCommitmentForm({ ...commitmentForm, recurring: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 text-[#76C893] focus:ring-[#76C893]"
                />
                <label htmlFor="recurring-duplicate" className="text-sm font-medium text-[#9CA3AF]">
                  Compromisso recorrente (repete todo mês)
                </label>
              </div>
            )}

            {/* Campos de Parcelamento */}
            {commitmentForm.type === 'installment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                      Parcela Atual *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={commitmentForm.installmentNumber}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, installmentNumber: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                      Total de Parcelas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="12"
                      value={commitmentForm.totalInstallments}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, totalInstallments: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Checkbox para gerar todas as parcelas */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="generateAllInstallments"
                    checked={commitmentForm.generateAllInstallments}
                    onChange={(e) => setCommitmentForm({ ...commitmentForm, generateAllInstallments: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 text-[#80bc96] focus:ring-[#80bc96]"
                  />
                  <label htmlFor="generateAllInstallments" className="text-sm font-medium text-[#9CA3AF]">
                    Criar todas as parcelas restantes automaticamente
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsDuplicateModalOpen(false)}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-[#9CA3AF] rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveDuplicate}
              disabled={saving || !commitmentForm.description || !commitmentForm.category || !commitmentForm.amount || !commitmentForm.date}
              className="flex-1 px-4 py-3 bg-[#80bc96] hover:bg-[#76C893] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Duplicando...' : 'Duplicar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Delete */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              Deletar Compromisso
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF] mt-4">
              Tem certeza que deseja deletar este compromisso? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-sm text-[#9CA3AF] mb-1">Compromisso:</p>
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
              onClick={handleDeleteCommitment}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Deletando...' : 'Deletar Compromisso'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
