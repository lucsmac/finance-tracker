import { useState } from 'react';
import { Calendar as CalendarIcon, Check, X, Plus, ChevronLeft, ChevronRight, Edit, Trash2, Copy } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { getTodayLocal, formatDateToLocaleString, createDateFromString } from '@/lib/utils/dateHelpers';
import { toast } from 'sonner';

type CommitmentType = 'expense_fixed' | 'expense_variable' | 'installment';

const summaryCardClass = 'app-panel min-w-0 rounded-[1.5rem] p-4 sm:p-5';
const summaryValueClass =
  'max-w-full text-[clamp(1.45rem,7vw,1.875rem)] font-bold leading-tight text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]';
const inlineAmountClass =
  'max-w-full text-xl font-bold leading-tight text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]';
const neutralBadgeClass =
  'inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-2.5 py-1 text-xs font-medium text-[var(--app-text-muted)]';
const iconButtonClass =
  'rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]';
const modalContentClass = 'app-panel-strong max-h-[90vh] overflow-y-auto rounded-[2rem] p-4 text-[var(--app-text)] sm:p-6';
const modalFieldClass =
  'w-full rounded-xl border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]';
const modalActionRowClass = 'mt-6 flex flex-col gap-3 sm:flex-row';
const checkboxClass = 'h-5 w-5 rounded border-[var(--app-field-border)] bg-[var(--app-field-bg)] text-[var(--app-accent)] focus:ring-[var(--app-accent)]';
const sectionHeaderClass = 'border-b border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-4 sm:px-6';
const listRowClass = 'px-4 py-4 transition-colors hover:bg-[var(--app-surface-soft)] sm:px-6';
const secondaryButtonClass =
  'app-button-secondary flex-1 rounded-xl px-4 py-3 transition-colors';

const getToolbarButtonClass = (isActive: boolean) =>
  `rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'border-[var(--app-border-strong)] bg-[var(--app-surface-hover)] text-[var(--app-text)]'
      : 'border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
  }`;

interface CommitmentsViewProps {
  selectedMonth: Date;
  onSelectedMonthChange: (date: Date) => void;
}

export function CommitmentsView({ selectedMonth, onSelectedMonthChange }: CommitmentsViewProps) {
  const { user } = useAuth();
  const { transactions, loading, error, createTransaction, createInstallments, updateTransaction, deleteTransaction, refresh } = useTransactions(user?.id);
  const todayStr = getTodayLocal();
  const selectedDate = selectedMonth;
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
    type: 'expense_fixed' as CommitmentType,
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

  // Filtrar compromissos do mês selecionado (fixos, variáveis planejados e parcelas)
  const commitments = transactions
    .filter(t =>
      (t.type === 'expense_fixed' || t.type === 'expense_variable' || t.type === 'installment') &&
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

  const filteredCommitments = commitments.filter(c => {
    if (statusFilter === 'paid') return !!c.paid;
    if (statusFilter === 'pending') return !c.paid;
    return true;
  });

  const totalCommitted = commitments.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = paid.reduce((sum, c) => sum + c.amount, 0);
  const totalPending = pending.reduce((sum, c) => sum + c.amount, 0);

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

  const getCategoryBadgeClass = (category: string) => {
    const palette = [
      neutralBadgeClass,
      'inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-2.5 py-1 text-xs font-medium text-[var(--app-text)]',
      'inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-black-soft)] px-2.5 py-1 text-xs font-medium text-[var(--app-text-muted)]'
    ];

    const hash = category
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  const getCommitmentTypeLabel = (type: CommitmentType) => {
    if (type === 'expense_fixed') return 'Fixo';
    if (type === 'expense_variable') return 'Variável';
    return 'Parcela';
  };

  const getCommitmentTypeBadgeClass = (type: CommitmentType) => {
    if (type === 'expense_variable') {
      return 'inline-flex items-center rounded-full border border-[rgba(133,55,253,0.28)] bg-[rgba(133,55,253,0.14)] px-2.5 py-1 text-xs font-medium text-[var(--app-accent)]';
    }

    return neutralBadgeClass;
  };

  // Função para salvar compromisso
  const handleSaveCommitment = async () => {
    if (!commitmentForm.description || !commitmentForm.amount || !commitmentForm.date) {
      toast.error('Preencha todos os campos obrigatorios.');
      return;
    }

    // Validar campos de parcelamento
    if (commitmentForm.type === 'installment') {
      const currentInstallment = parseInt(commitmentForm.installmentNumber) || 1;
      const totalInstallments = parseInt(commitmentForm.totalInstallments);

      if (!commitmentForm.totalInstallments || totalInstallments < 1) {
        toast.error('Informe o numero total de parcelas.');
        return;
      }

      if (currentInstallment < 1) {
        toast.error('A parcela atual deve ser pelo menos 1.');
        return;
      }

      if (currentInstallment > totalInstallments) {
        toast.error('A parcela atual nao pode ser maior que o total de parcelas.');
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
      toast.error('Erro ao salvar compromisso. Tente novamente.');
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
      toast.error('Preencha todos os campos obrigatorios.');
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
        recurring: commitmentForm.type === 'expense_fixed' ? commitmentForm.recurring : false,
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
      toast.error('Erro ao editar compromisso. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Função para salvar duplicação (usa a mesma lógica do handleSaveCommitment)
  const handleSaveDuplicate = async () => {
    if (!commitmentForm.description || !commitmentForm.amount || !commitmentForm.date) {
      toast.error('Preencha todos os campos obrigatorios.');
      return;
    }

    // Validar campos de parcelamento
    if (commitmentForm.type === 'installment') {
      const currentInstallment = parseInt(commitmentForm.installmentNumber) || 1;
      const totalInstallments = parseInt(commitmentForm.totalInstallments);

      if (!commitmentForm.totalInstallments || totalInstallments < 1) {
        toast.error('Informe o numero total de parcelas.');
        return;
      }

      if (currentInstallment < 1) {
        toast.error('A parcela atual deve ser pelo menos 1.');
        return;
      }

      if (currentInstallment > totalInstallments) {
        toast.error('A parcela atual nao pode ser maior que o total de parcelas.');
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
      toast.error('Erro ao duplicar compromisso. Tente novamente.');
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
      toast.error('Erro ao atualizar status. Tente novamente.');
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
      toast.error('Erro ao deletar compromisso. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--app-text)]">Carregando compromissos...</p>
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
          <h3 className="mb-2 text-lg font-semibold text-[var(--app-text)]">Erro ao carregar compromissos</h3>
          <p className="mb-4 text-[var(--app-text-muted)]">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[var(--app-accent)] px-4 py-2 text-[var(--app-accent-foreground)] transition-opacity hover:opacity-90"
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="app-kicker mb-1">Agenda financeira</p>
            <h2 className="app-page-title text-2xl font-semibold sm:text-4xl">Compromissos</h2>
          </div>

          <button
            onClick={handleOpenModal}
            className="app-button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Adicionar Compromisso
          </button>
        </div>

        {/* Month/Year Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={navigateToPreviousMonth}
            className="app-pill rounded-2xl p-2 transition-colors hover:bg-[var(--app-surface-hover)]"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-5 w-5 text-[var(--app-text)]" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="app-pill flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 transition-colors hover:bg-[var(--app-surface-hover)] sm:px-4">
                <span className="max-w-[10.5rem] truncate text-sm font-medium text-[var(--app-text)] sm:max-w-none sm:text-lg">
                  {formatMonthYear(selectedDate)}
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
            onClick={navigateToNextMonth}
            className="app-pill rounded-2xl p-2 transition-colors hover:bg-[var(--app-surface-hover)]"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-5 w-5 text-[var(--app-text)]" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={summaryCardClass}>
          <p className="mb-2 text-sm text-[var(--app-text-muted)]">Total comprometido</p>
          <p className={summaryValueClass}>{totalCommitted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="mt-1 text-xs text-[var(--app-text-faint)]">{commitments.length} compromissos</p>
        </div>

        <div className={summaryCardClass}>
          <p className="mb-2 text-sm text-[var(--app-success)]">Pagos</p>
          <p className={summaryValueClass}>{totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="mt-1 text-xs text-[var(--app-success)]">{paid.length} itens</p>
        </div>

        <div className={summaryCardClass}>
          <p className="mb-2 text-sm text-[var(--app-text-muted)]">Pendentes</p>
          <p className={summaryValueClass}>{totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="mt-1 text-xs text-[var(--app-text-faint)]">{pending.length} itens</p>
        </div>

        <div className={summaryCardClass}>
          <p className="mb-2 text-sm text-[var(--app-overdue)]">Atrasados</p>
          <p className={summaryValueClass}>
            {overdue.length > 0 ? overdue.length : '0'}
          </p>
          <p className="mt-1 text-xs text-[var(--app-overdue)]">
            {overdue.length > 0 ? 'Necessita atenção' : 'Tudo em dia'}
          </p>
        </div>
      </div>

      {/* Controles de Ordenação e Filtro */}
      <div className="app-panel rounded-[1.5rem] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--app-text-muted)]">Ordenar por</h3>
            <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSortBy('date')}
              className={getToolbarButtonClass(sortBy === 'date')}
            >
              Data
            </button>
            <button
              onClick={() => setSortBy('amount')}
              className={getToolbarButtonClass(sortBy === 'amount')}
            >
              Valor
            </button>
            <button
              onClick={() => setSortBy('description')}
              className={getToolbarButtonClass(sortBy === 'description')}
            >
              Nome
            </button>
            <button
              onClick={() => setSortBy('type')}
              className={getToolbarButtonClass(sortBy === 'type')}
            >
              Tipo
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={getToolbarButtonClass(false)}
            >
              {sortOrder === 'asc' ? '↑ Crescente' : '↓ Decrescente'}
            </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--app-text-muted)]">Filtrar por</h3>
            <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={getToolbarButtonClass(statusFilter === 'all')}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={getToolbarButtonClass(statusFilter === 'paid')}
            >
              Pagos
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={getToolbarButtonClass(statusFilter === 'pending')}
            >
              Não pagos
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pendentes */}
      {(statusFilter === 'all' || statusFilter === 'pending') && (
      <div className="app-panel overflow-hidden rounded-[1.75rem]">
        <div className={sectionHeaderClass}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--app-text)]">Pendentes</h3>
              <p className="mt-1 text-sm text-[var(--app-text-faint)]">{pending.length} compromissos pendentes</p>
            </div>
            <span className="max-w-full text-lg font-semibold text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]">
              {totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        <div className="divide-y divide-[var(--app-border)]">
          {pending.map(commitment => {
            const isOverdue = commitment.date < todayStr;

            return (
            <div key={commitment.id} className={listRowClass}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                    isOverdue
                      ? 'border-[var(--app-overdue-border)] bg-[var(--app-overdue-surface)] text-[var(--app-overdue)]'
                      : 'border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-text-muted)]'
                  }`}>
                    <CalendarIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">
                        {commitment.description}
                      </h4>
                      {commitment.installmentNumber && (
                        <span className={neutralBadgeClass}>
                          {commitment.installmentNumber}/{commitment.totalInstallments}
                        </span>
                      )}
                      <span className={getCommitmentTypeBadgeClass(commitment.type as CommitmentType)}>
                        {getCommitmentTypeLabel(commitment.type as CommitmentType)}
                      </span>
                      <span className={getCategoryBadgeClass(commitment.category)}>
                        {commitment.category}
                      </span>
                      {commitment.recurring && (
                        <span className="inline-flex items-center rounded-full border border-[rgba(133,55,253,0.28)] bg-[rgba(133,55,253,0.14)] px-2.5 py-1 text-xs font-medium text-[var(--app-accent)]">
                          Recorrente
                        </span>
                      )}
                      {isOverdue && (
                        <span className="inline-flex items-center rounded-full border border-[var(--app-overdue-border)] bg-[var(--app-overdue-surface)] px-2.5 py-1 text-xs font-medium text-[var(--app-overdue)]">
                          Atrasado
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--app-text-muted)]">
                      <span>
                        {isOverdue ? 'Venceu em' : 'Vence em'} {formatDateToLocaleString(commitment.date)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <div className="text-left lg:text-right">
                    <p className={inlineAmountClass}>
                      {commitment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDuplicateCommitment(commitment)}
                        className={iconButtonClass}
                        title="Duplicar"
                      >
                        <Copy className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleEditCommitment(commitment)}
                        className={iconButtonClass}
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleOpenDeleteModal(commitment.id, commitment.description)}
                        className={`${iconButtonClass} text-red-400 hover:text-red-300`}
                        title="Deletar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleTogglePaid(commitment.id, commitment.paid || false)}
                      className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors sm:w-auto ${
                        isOverdue
                          ? 'bg-[var(--app-overdue)] hover:opacity-90'
                          : 'bg-[var(--app-accent)] hover:opacity-90'
                      }`}
                    >
                      {isOverdue ? 'Pagar agora' : 'Marcar como pago'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })}

          {pending.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-[var(--app-text-muted)]">Nenhum compromisso pendente</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Pagos */}
      {(statusFilter === 'all' || statusFilter === 'paid') && (
      <div className="app-panel overflow-hidden rounded-[1.75rem]">
        <div className={sectionHeaderClass}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--app-text)]">Pagos</h3>
              <p className="mt-1 text-sm text-[var(--app-text-faint)]">{paid.length} compromissos quitados</p>
            </div>
            <span className="max-w-full text-lg font-semibold text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]">
              {totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        <div className="divide-y divide-[var(--app-border)]">
          {paid.map(commitment => (
            <div key={commitment.id} className={listRowClass}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--app-success-border)] bg-[var(--app-success-surface)]">
                    <Check className="w-6 h-6 text-[var(--app-success)]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">
                        {commitment.description}
                      </h4>
                      {commitment.installmentNumber && (
                        <span className={neutralBadgeClass}>
                          {commitment.installmentNumber}/{commitment.totalInstallments}
                        </span>
                      )}
                      <span className={getCommitmentTypeBadgeClass(commitment.type as CommitmentType)}>
                        {getCommitmentTypeLabel(commitment.type as CommitmentType)}
                      </span>
                      <span className={getCategoryBadgeClass(commitment.category)}>
                        {commitment.category}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--app-text-muted)]">
                      <span>Pago em {formatDateToLocaleString(commitment.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <div className="text-left lg:text-right">
                    <p className={inlineAmountClass}>
                      {commitment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <span className="mt-2 inline-flex items-center rounded-full border border-[var(--app-success-border)] bg-[var(--app-success-surface)] px-2.5 py-1 text-xs font-medium text-[var(--app-success)]">
                      Pago
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDuplicateCommitment(commitment)}
                        className={iconButtonClass}
                        title="Duplicar"
                      >
                        <Copy className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleEditCommitment(commitment)}
                        className={iconButtonClass}
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleOpenDeleteModal(commitment.id, commitment.description)}
                        className={`${iconButtonClass} text-red-400 hover:text-red-300`}
                        title="Deletar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleTogglePaid(commitment.id, commitment.paid || false)}
                      className="app-button-secondary inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium sm:w-auto"
                    >
                      Marcar como não pago
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {paid.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-[var(--app-text-muted)]">Nenhum compromisso pago</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Timeline */}
      <div className="app-panel rounded-[1.75rem] p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--app-text)]">Timeline de Vencimentos</h3>

        <div className="space-y-4">
          {filteredCommitments.map((commitment, index) => {
            const commitmentDate = createDateFromString(commitment.date);
            const isPast = commitment.date < todayStr;
            const isToday = commitment.date === todayStr;

            return (
              <div key={commitment.id} className="flex items-start gap-3 rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${commitment.paid
                      ? 'bg-[var(--app-success)]'
                      : isPast
                        ? 'bg-[var(--app-overdue)]'
                        : isToday
                          ? 'bg-[var(--app-accent)]'
                          : 'bg-[var(--app-text-faint)]'
                    }`}></div>
                  {index < filteredCommitments.length - 1 && (
                    <div className="h-12 w-0.5 bg-[var(--app-border)]"></div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--app-text)]">
                        {commitmentDate.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long'
                        })}
                      </p>
                      <p className="mt-1 text-sm text-[var(--app-text-muted)] [overflow-wrap:anywhere]">
                        {commitment.description}
                      </p>
                      <p className="mt-2 max-w-full text-sm font-semibold text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]">
                        {commitment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <span className={`mt-2 ${getCategoryBadgeClass(commitment.category)}`}>
                        {commitment.category}
                      </span>
                      {commitment.paid && (
                        <span className="ml-2 inline-flex items-center text-xs text-[var(--app-success)]">✓ Pago</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleEditCommitment(commitment)}
                        className={iconButtonClass}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(commitment.id, commitment.description)}
                        className={`${iconButtonClass} text-red-400 hover:text-red-300`}
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePaid(commitment.id, commitment.paid || false)}
                        className={`${iconButtonClass} ${
                          commitment.paid ? 'text-[var(--app-success)]' : 'text-[var(--app-text-muted)]'
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
            <p className="text-sm text-[var(--app-text-muted)]">Nenhum compromisso para o filtro selecionado</p>
          )}
        </div>
      </div>

      {/* Modal de Cadastro de Compromisso */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className={`${modalContentClass} max-w-lg`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--app-text)] sm:text-2xl">
              Adicionar Compromisso
            </DialogTitle>
            <DialogDescription className="text-[var(--app-text-muted)]">
              Cadastre gastos fixos recorrentes ou parcelamentos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Tipo de Compromisso */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Tipo *
              </label>
              <select
                value={commitmentForm.type}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, type: e.target.value as CommitmentType })}
                className={modalFieldClass}
              >
                <option value="expense_fixed">Gasto Fixo</option>
                <option value="expense_variable">Gasto Variável</option>
                <option value="installment">Parcelamento</option>
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Aluguel, Internet, Notebook"
                value={commitmentForm.description}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, description: e.target.value })}
                className={modalFieldClass}
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Moradia, Contas, Eletrônicos"
                value={commitmentForm.category}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, category: e.target.value })}
                className={modalFieldClass}
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
                value={commitmentForm.amount}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, amount: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className={modalFieldClass}
              />
            </div>

            {/* Data de Vencimento */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={commitmentForm.date}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, date: e.target.value })}
                className={modalFieldClass}
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
                    className={checkboxClass}
                  />
                  <label htmlFor="recurring" className="text-sm font-medium text-[var(--app-text-muted)]">
                    Compromisso recorrente (repete todo mês)
                  </label>
                </div>

                {/* Checkbox para gerar próximos 2 meses */}
                {commitmentForm.recurring && (
                  <div className="ml-8 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="generateNextMonths"
                      checked={commitmentForm.generateNextMonths}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, generateNextMonths: e.target.checked })}
                      className={checkboxClass}
                    />
                    <label htmlFor="generateNextMonths" className="text-sm font-medium text-[var(--app-text-muted)]">
                      Criar também para os próximos 2 meses (total de 3)
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Campos de Parcelamento */}
            {commitmentForm.type === 'installment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                      Parcela Atual *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={commitmentForm.installmentNumber}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, installmentNumber: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={modalFieldClass}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                      Total de Parcelas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="12"
                      value={commitmentForm.totalInstallments}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, totalInstallments: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={modalFieldClass}
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
                  className={checkboxClass}
                />
                  <label htmlFor="generateAllInstallments" className="text-sm font-medium text-[var(--app-text-muted)]">
                    Criar todas as parcelas restantes automaticamente
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className={modalActionRowClass}>
            <button
              onClick={() => setIsAddModalOpen(false)}
              className={secondaryButtonClass}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveCommitment}
              disabled={!commitmentForm.description || !commitmentForm.category || !commitmentForm.amount || !commitmentForm.date}
              className="flex-1 px-4 py-3 bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-foreground)] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Compromisso
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Compromisso */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className={`${modalContentClass} max-w-lg`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--app-text)] sm:text-2xl">
              Editar Compromisso
            </DialogTitle>
            <DialogDescription className="text-[var(--app-text-muted)]">
              Atualize as informações do compromisso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Tipo de Compromisso */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Tipo *
              </label>
              <select
                value={commitmentForm.type}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, type: e.target.value as CommitmentType })}
                className={modalFieldClass}
              >
                <option value="expense_fixed">Gasto Fixo</option>
                <option value="expense_variable">Gasto Variável</option>
                <option value="installment">Parcelamento</option>
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Aluguel, Internet, Notebook"
                value={commitmentForm.description}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, description: e.target.value })}
                className={modalFieldClass}
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Moradia, Contas, Eletrônicos"
                value={commitmentForm.category}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, category: e.target.value })}
                className={modalFieldClass}
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
                value={commitmentForm.amount}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, amount: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className={modalFieldClass}
              />
            </div>

            {/* Data de Vencimento */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={commitmentForm.date}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, date: e.target.value })}
                className={modalFieldClass}
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
                    className={checkboxClass}
                  />
                  <label htmlFor="recurring-edit" className="text-sm font-medium text-[var(--app-text-muted)]">
                    Compromisso recorrente (repete todo mês)
                  </label>
                </div>

                {/* Checkbox para gerar próximos 2 meses */}
                {commitmentForm.recurring && (
                  <div className="ml-8 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="generateNextMonths-edit"
                      checked={commitmentForm.generateNextMonths}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, generateNextMonths: e.target.checked })}
                      className={checkboxClass}
                    />
                    <label htmlFor="generateNextMonths-edit" className="text-sm font-medium text-[var(--app-text-muted)]">
                      Criar também para os próximos 2 meses (total de 3)
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Campos de Parcelamento */}
            {commitmentForm.type === 'installment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                      Parcela Atual *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={commitmentForm.installmentNumber}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, installmentNumber: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={modalFieldClass}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                      Total de Parcelas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="12"
                      value={commitmentForm.totalInstallments}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, totalInstallments: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={modalFieldClass}
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
                  className={checkboxClass}
                />
                  <label htmlFor="generateAllInstallments" className="text-sm font-medium text-[var(--app-text-muted)]">
                    Criar todas as parcelas restantes automaticamente
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className={modalActionRowClass}>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className={secondaryButtonClass}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={!commitmentForm.description || !commitmentForm.category || !commitmentForm.amount || !commitmentForm.date}
              className="flex-1 px-4 py-3 bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-foreground)] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Alterações
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Duplicação */}
      <Dialog open={isDuplicateModalOpen} onOpenChange={setIsDuplicateModalOpen}>
        <DialogContent className={`${modalContentClass} max-w-lg overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-[var(--app-text)] sm:text-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)]">
                <Copy className="h-6 w-6 text-[var(--app-text)]" />
              </div>
              Duplicar Compromisso
            </DialogTitle>
            <DialogDescription className="mt-2 text-[var(--app-text-muted)]">
              Ajuste a data e/ou valor do compromisso duplicado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Usa o mesmo formulário do modal de adicionar */}
            {/* Tipo de Compromisso */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Tipo *
              </label>
              <select
                value={commitmentForm.type}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, type: e.target.value as CommitmentType })}
                className={modalFieldClass}
              >
                <option value="expense_fixed">Gasto Fixo</option>
                <option value="expense_variable">Gasto Variável</option>
                <option value="installment">Parcelamento</option>
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Aluguel, Internet, Notebook"
                value={commitmentForm.description}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, description: e.target.value })}
                className={modalFieldClass}
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Moradia, Lazer, Educação"
                value={commitmentForm.category}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, category: e.target.value })}
                className={modalFieldClass}
              />
            </div>

            {/* Valor */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Valor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={commitmentForm.amount}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, amount: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className={modalFieldClass}
              />
            </div>

            {/* Data */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                Data *
              </label>
              <input
                type="date"
                value={commitmentForm.date}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, date: e.target.value })}
                className={modalFieldClass}
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
                  className={checkboxClass}
                />
                <label htmlFor="recurring-duplicate" className="text-sm font-medium text-[var(--app-text-muted)]">
                  Compromisso recorrente (repete todo mês)
                </label>
              </div>
            )}

            {/* Campos de Parcelamento */}
            {commitmentForm.type === 'installment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                      Parcela Atual *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={commitmentForm.installmentNumber}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, installmentNumber: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={modalFieldClass}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">
                      Total de Parcelas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="12"
                      value={commitmentForm.totalInstallments}
                      onChange={(e) => setCommitmentForm({ ...commitmentForm, totalInstallments: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className={modalFieldClass}
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
                  className={checkboxClass}
                />
                  <label htmlFor="generateAllInstallments" className="text-sm font-medium text-[var(--app-text-muted)]">
                    Criar todas as parcelas restantes automaticamente
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className={modalActionRowClass}>
            <button
              onClick={() => setIsDuplicateModalOpen(false)}
              className={secondaryButtonClass}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveDuplicate}
              disabled={saving || !commitmentForm.description || !commitmentForm.category || !commitmentForm.amount || !commitmentForm.date}
              className="flex-1 rounded-xl bg-[var(--app-accent)] px-4 py-3 font-semibold text-[var(--app-accent-foreground)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Duplicando...' : 'Duplicar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Delete */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className={`${modalContentClass} max-w-md`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-[var(--app-text)] sm:text-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              Deletar Compromisso
            </DialogTitle>
            <DialogDescription className="mt-4 text-[var(--app-text-muted)]">
              Tem certeza que deseja deletar este compromisso? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Compromisso:</p>
            <p className="font-medium text-[var(--app-text)]">{deletingDescription}</p>
          </div>

          {/* Botões de ação */}
          <div className={modalActionRowClass}>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={saving}
              className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteCommitment}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-[var(--app-accent-foreground)] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Deletando...' : 'Deletar Compromisso'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
