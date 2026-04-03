import { useState } from 'react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Edit,
  Plus,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { getTodayLocal, formatDateToLocaleString, createDateFromString } from '@/lib/utils/dateHelpers';
import { toast } from 'sonner';

const summaryCardClass = 'app-panel min-w-0 rounded-[1.5rem] p-4 sm:p-5';
const summaryValueClass =
  'max-w-full text-[clamp(1.45rem,7vw,1.875rem)] font-bold leading-tight text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]';
const inlineAmountClass =
  'max-w-full text-xl font-bold leading-tight text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]';
const neutralBadgeClass =
  'inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-2.5 py-1 text-xs font-medium text-[var(--app-text-muted)]';
const recurringBadgeClass =
  'inline-flex items-center rounded-full border border-[rgba(133,55,253,0.28)] bg-[rgba(133,55,253,0.14)] px-2.5 py-1 text-xs font-medium text-[var(--app-accent)]';
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

interface IncomesViewProps {
  selectedMonth: Date;
  onSelectedMonthChange: (date: Date) => void;
}

export function IncomesView({ selectedMonth, onSelectedMonthChange }: IncomesViewProps) {
  const { user } = useAuth();
  const { transactions, loading, createTransaction, updateTransaction, deleteTransaction, refresh } = useTransactions(user?.id);
  const selectedDate = selectedMonth;
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string>('');
  const [deletingDescription, setDeletingDescription] = useState<string>('');
  const [incomeForm, setIncomeForm] = useState({
    description: '',
    category: '',
    amount: '',
    date: '',
    recurring: false,
    generateNextMonths: false
  });

  const incomes = transactions
    .filter(
      (transaction) =>
        transaction.type === 'income' &&
        createDateFromString(transaction.date).getMonth() === selectedDate.getMonth() &&
        createDateFromString(transaction.date).getFullYear() === selectedDate.getFullYear()
    )
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        comparison = createDateFromString(a.date).getTime() - createDateFromString(b.date).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      } else {
        comparison = a.description.localeCompare(b.description);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const received = incomes.filter((income) => income.paid);
  const pending = incomes.filter((income) => !income.paid);
  const todayStr = getTodayLocal();
  const overdue = pending.filter((income) => income.date < todayStr);
  const upcomingPending = pending.filter((income) => income.date >= todayStr);

  const totalExpected = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalReceived = received.reduce((sum, income) => sum + income.amount, 0);
  const totalPending = pending.reduce((sum, income) => sum + income.amount, 0);
  const upcomingPendingTotal = upcomingPending.reduce((sum, income) => sum + income.amount, 0);

  const resetIncomeForm = () => {
    setIncomeForm({
      description: '',
      category: '',
      amount: '',
      date: '',
      recurring: false,
      generateNextMonths: false
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--app-accent)] border-t-transparent" />
          <p className="text-[var(--app-text)]">Carregando entradas...</p>
        </div>
      </div>
    );
  }

  const navigateToPreviousMonth = () => {
    onSelectedMonthChange(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const navigateToNextMonth = () => {
    onSelectedMonthChange(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const formatMonthYear = (date: Date) => {
    const months = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro'
    ];

    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

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
        paid: false
      });

      if (incomeForm.recurring && incomeForm.generateNextMonths) {
        const originalDate = new Date(`${incomeForm.date}T00:00:00`);
        const dayOfMonth = originalDate.getDate();

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

      await refresh();
      setIsAddModalOpen(false);
      resetIncomeForm();
    } catch (error) {
      console.error('Erro ao salvar entrada:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenModal = () => {
    setIsAddModalOpen(true);
    setIncomeForm((current) => ({
      ...current,
      date: getTodayLocal()
    }));
  };

  const handleEditIncome = (income: any) => {
    setEditingId(income.id);
    setIncomeForm({
      description: income.description,
      category: income.category,
      amount: income.amount.toString(),
      date: income.date,
      recurring: income.recurring || false,
      generateNextMonths: false
    });
    setIsEditModalOpen(true);
  };

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
        recurring: incomeForm.recurring
      });

      await refresh();
      setIsEditModalOpen(false);
      setEditingId('');
      resetIncomeForm();
    } catch (error) {
      console.error('Erro ao editar entrada:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaid = async (incomeId: string, currentPaid: boolean) => {
    try {
      await updateTransaction(incomeId, { paid: !currentPaid });
      await refresh();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleOpenDeleteModal = (id: string, description: string) => {
    setDeletingId(id);
    setDeletingDescription(description);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteIncome = async () => {
    if (!deletingId) return;

    try {
      setSaving(true);
      await deleteTransaction(deletingId);
      await refresh();
      setIsDeleteModalOpen(false);
      setDeletingId('');
      setDeletingDescription('');
    } catch (err) {
      console.error('Error deleting income:', err);
      toast.error('Erro ao deletar entrada. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="app-kicker mb-1">Fluxo de caixa</p>
            <h2 className="app-page-title text-2xl font-semibold sm:text-4xl">Entradas</h2>
          </div>

          <button
            onClick={handleOpenModal}
            className="app-button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Adicionar Entrada
          </button>
        </div>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={summaryCardClass}>
          <p className="mb-2 text-sm text-[var(--app-text-muted)]">Total esperado</p>
          <p className={summaryValueClass}>{totalExpected.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="mt-1 text-xs text-[var(--app-text-faint)]">{incomes.length} entradas</p>
        </div>

        <div className={summaryCardClass}>
          <p className="mb-2 text-sm text-[var(--app-success)]">Recebidos</p>
          <p className={summaryValueClass}>{totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="mt-1 text-xs text-[var(--app-success)]">{received.length} itens</p>
        </div>

        <div className={summaryCardClass}>
          <p className="mb-2 text-sm text-[var(--app-text-muted)]">A receber</p>
          <p className={summaryValueClass}>{totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="mt-1 text-xs text-[var(--app-text-faint)]">{pending.length} itens</p>
        </div>

        <div className={summaryCardClass}>
          <p className="mb-2 text-sm text-[var(--app-overdue)]">Atrasados</p>
          <p className={summaryValueClass}>{overdue.length > 0 ? overdue.length : '0'}</p>
          <p className="mt-1 text-xs text-[var(--app-overdue)]">
            {overdue.length > 0 ? 'Necessita atenção' : 'Tudo em dia'}
          </p>
        </div>
      </div>

      <div className="app-panel rounded-[1.5rem] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-[var(--app-text-muted)]">Ordenar por</span>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSortBy('date')} className={getToolbarButtonClass(sortBy === 'date')}>
              Data
            </button>
            <button onClick={() => setSortBy('amount')} className={getToolbarButtonClass(sortBy === 'amount')}>
              Valor
            </button>
            <button
              onClick={() => setSortBy('description')}
              className={getToolbarButtonClass(sortBy === 'description')}
            >
              Nome
            </button>
            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className={getToolbarButtonClass(false)}>
              {sortOrder === 'asc' ? '↑ Crescente' : '↓ Decrescente'}
            </button>
          </div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="app-panel rounded-[1.75rem] border border-[var(--app-overdue-border)] p-4 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-[var(--app-overdue)]" />
            <div>
              <h3 className="text-lg font-semibold text-[var(--app-text)]">Entradas Atrasadas</h3>
              <p className="mt-1 text-sm text-[var(--app-overdue)]">
                Você tem {overdue.length} entrada(s) pendente(s) com data anterior a hoje.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {overdue.map((income) => (
              <div
                key={income.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">{income.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={neutralBadgeClass}>{income.category}</span>
                    {income.recurring && <span className={recurringBadgeClass}>Recorrente</span>}
                  </div>
                  <p className="mt-2 text-sm text-[var(--app-overdue)]">
                    Previsto para {formatDateToLocaleString(income.date)}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:items-end">
                  <div className="text-left sm:text-right">
                    <p className={inlineAmountClass}>{income.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <button
                      onClick={() => handleTogglePaid(income.id, income.paid)}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[var(--app-accent)] px-3 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-opacity hover:opacity-90 sm:w-auto"
                    >
                      Marcar como Recebido
                    </button>
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end">
                    <button onClick={() => handleEditIncome(income)} className={iconButtonClass} title="Editar entrada">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(income.id, income.description)}
                      className={`${iconButtonClass} text-red-400 hover:text-red-300`}
                      title="Deletar entrada"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="app-panel overflow-hidden rounded-[1.75rem]">
        <div className={sectionHeaderClass}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--app-text)]">A Receber</h3>
              <p className="mt-1 text-sm text-[var(--app-text-faint)]">{upcomingPending.length} entradas previstas</p>
            </div>
            <span className="max-w-full text-lg font-semibold text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]">
              {upcomingPendingTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        <div className="divide-y divide-[var(--app-border)]">
          {upcomingPending.map((income) => (
            <div key={income.id} className={listRowClass}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)]">
                    <DollarSign className="h-5 w-5 text-[var(--app-text-muted)]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">{income.description}</h4>
                      <span className={neutralBadgeClass}>{income.category}</span>
                      {income.recurring && <span className={recurringBadgeClass}>Recorrente</span>}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--app-text-muted)]">
                      <span>Previsto para {formatDateToLocaleString(income.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <div className="text-left lg:text-right">
                    <p className={inlineAmountClass}>{income.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditIncome(income)} className={iconButtonClass} title="Editar">
                        <Edit className="h-5 w-5" />
                      </button>

                      <button
                        onClick={() => handleOpenDeleteModal(income.id, income.description)}
                        className={`${iconButtonClass} text-red-400 hover:text-red-300`}
                        title="Deletar"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleTogglePaid(income.id, income.paid)}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--app-accent)] px-4 py-2.5 text-sm font-medium text-[var(--app-accent-foreground)] transition-opacity hover:opacity-90 sm:w-auto"
                    >
                      Marcar como Recebido
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {upcomingPending.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-[var(--app-text-muted)]">Nenhuma entrada pendente</p>
            </div>
          )}
        </div>
      </div>

      <div className="app-panel overflow-hidden rounded-[1.75rem]">
        <div className={sectionHeaderClass}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--app-text)]">Recebidos</h3>
              <p className="mt-1 text-sm text-[var(--app-text-faint)]">{received.length} entradas recebidas</p>
            </div>
            <span className="max-w-full text-lg font-semibold text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]">
              {totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        <div className="divide-y divide-[var(--app-border)]">
          {received.map((income) => (
            <div key={income.id} className={listRowClass}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--app-success-border)] bg-[var(--app-success-surface)]">
                    <Check className="h-6 w-6 text-[var(--app-success)]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-medium text-[var(--app-text)] [overflow-wrap:anywhere]">{income.description}</h4>
                      <span className={neutralBadgeClass}>{income.category}</span>
                      {income.recurring && <span className={recurringBadgeClass}>Recorrente</span>}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--app-text-muted)]">
                      <span>Recebido em {formatDateToLocaleString(income.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <div className="text-left lg:text-right">
                    <p className={inlineAmountClass}>{income.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <span className="mt-2 inline-flex items-center rounded-full border border-[var(--app-success-border)] bg-[var(--app-success-surface)] px-2.5 py-1 text-xs font-medium text-[var(--app-success)]">
                      Recebido
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end">
                    <button onClick={() => handleEditIncome(income)} className={iconButtonClass} title="Editar">
                      <Edit className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() => handleOpenDeleteModal(income.id, income.description)}
                      className={`${iconButtonClass} text-red-400 hover:text-red-300`}
                      title="Deletar"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {received.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-[var(--app-text-muted)]">Nenhuma entrada recebida</p>
            </div>
          )}
        </div>
      </div>

      <div className="app-panel rounded-[1.75rem] p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--app-text)]">Timeline de Entradas</h3>

        <div className="space-y-4">
          {incomes.map((income, index) => {
            const incomeDate = createDateFromString(income.date);
            const isPast = income.date < todayStr;
            const isToday = income.date === todayStr;

            return (
              <div key={income.id} className="flex items-start gap-3 rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      income.paid ? 'bg-[var(--app-success)]' : isPast ? 'bg-[var(--app-overdue)]' : isToday ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-text-faint)]'
                    }`}
                  />
                  {index < incomes.length - 1 && <div className="h-12 w-0.5 bg-[var(--app-border)]" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--app-text)]">
                        {incomeDate.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long'
                        })}
                      </p>
                      <p className="mt-1 text-sm text-[var(--app-text-muted)] [overflow-wrap:anywhere]">{income.description}</p>
                      <p className="mt-2 max-w-full text-sm font-semibold text-[var(--app-text)] tabular-nums [overflow-wrap:anywhere]">
                        {income.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={neutralBadgeClass}>{income.category}</span>
                        {income.recurring && <span className={recurringBadgeClass}>Recorrente</span>}
                      </div>
                      {income.paid && <span className="mt-2 inline-flex items-center text-xs text-[var(--app-success)]">✓ Recebido</span>}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button onClick={() => handleEditIncome(income)} className={iconButtonClass} title="Editar">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(income.id, income.description)}
                        className={`${iconButtonClass} text-red-400 hover:text-red-300`}
                        title="Deletar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePaid(income.id, income.paid || false)}
                        className={`${iconButtonClass} ${income.paid ? 'text-[var(--app-success)]' : 'text-[var(--app-text-muted)]'}`}
                        title={income.paid ? 'Marcar como não recebido' : 'Marcar como recebido'}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {incomes.length === 0 && (
            <p className="text-sm text-[var(--app-text-muted)]">Nenhuma entrada cadastrada neste mês.</p>
          )}
        </div>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className={`${modalContentClass} max-w-lg`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--app-text)] sm:text-2xl">Adicionar Entrada</DialogTitle>
            <DialogDescription className="text-[var(--app-text-muted)]">
              Cadastre entradas recorrentes ou outras receitas planejadas
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">Descrição *</label>
              <input
                type="text"
                placeholder="Ex: Salário, Freelance, Bônus"
                value={incomeForm.description}
                onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                className={modalFieldClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">Categoria *</label>
              <input
                type="text"
                placeholder="Ex: Salário, Trabalho Autônomo, Investimentos"
                value={incomeForm.category}
                onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                className={modalFieldClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">Valor *</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className={modalFieldClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">Data de Recebimento *</label>
              <input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                className={modalFieldClass}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={incomeForm.recurring}
                  onChange={(e) =>
                    setIncomeForm({
                      ...incomeForm,
                      recurring: e.target.checked,
                      generateNextMonths: e.target.checked ? incomeForm.generateNextMonths : false
                    })
                  }
                  className={checkboxClass}
                />
                <label htmlFor="recurring" className="text-sm font-medium text-[var(--app-text-muted)]">
                  Entrada recorrente (repete todo mês)
                </label>
              </div>

              {incomeForm.recurring && (
                <div className="ml-8 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="generateNextMonths"
                    checked={incomeForm.generateNextMonths}
                    onChange={(e) => setIncomeForm({ ...incomeForm, generateNextMonths: e.target.checked })}
                    className={checkboxClass}
                  />
                  <label htmlFor="generateNextMonths" className="text-sm font-medium text-[var(--app-text-muted)]">
                    Criar também para os próximos 2 meses (total de 3)
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className={modalActionRowClass}>
            <button
              onClick={() => setIsAddModalOpen(false)}
              className={secondaryButtonClass}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveIncome}
              disabled={!incomeForm.description || !incomeForm.category || !incomeForm.amount || !incomeForm.date || saving}
              className="flex-1 rounded-xl bg-[var(--app-accent)] px-4 py-3 font-semibold text-[var(--app-accent-foreground)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Entrada'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className={`${modalContentClass} max-w-lg`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--app-text)] sm:text-2xl">Editar Entrada</DialogTitle>
            <DialogDescription className="text-[var(--app-text-muted)]">
              Atualize as informações da entrada
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">Descrição *</label>
              <input
                type="text"
                placeholder="Ex: Salário, Freelance, Bônus"
                value={incomeForm.description}
                onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                className={modalFieldClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">Categoria *</label>
              <input
                type="text"
                placeholder="Ex: Salário, Trabalho Autônomo, Investimentos"
                value={incomeForm.category}
                onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                className={modalFieldClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">Valor *</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className={modalFieldClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-muted)]">Data de Recebimento *</label>
              <input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                className={modalFieldClass}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring-edit"
                checked={incomeForm.recurring}
                onChange={(e) => setIncomeForm({ ...incomeForm, recurring: e.target.checked })}
                className={checkboxClass}
              />
              <label htmlFor="recurring-edit" className="text-sm font-medium text-[var(--app-text-muted)]">
                Entrada recorrente (repete todo mês)
              </label>
            </div>
          </div>

          <div className={modalActionRowClass}>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className={secondaryButtonClass}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={!incomeForm.description || !incomeForm.category || !incomeForm.amount || !incomeForm.date || saving}
              className="flex-1 rounded-xl bg-[var(--app-accent)] px-4 py-3 font-semibold text-[var(--app-accent-foreground)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className={`${modalContentClass} max-w-md`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-[var(--app-text)] sm:text-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              Deletar Entrada
            </DialogTitle>
            <DialogDescription className="mt-4 text-[var(--app-text-muted)]">
              Tem certeza que deseja deletar esta entrada? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <p className="mb-1 text-sm text-[var(--app-text-muted)]">Entrada:</p>
            <p className="font-medium text-[var(--app-text)]">{deletingDescription}</p>
          </div>

          <div className={modalActionRowClass}>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={saving}
              className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteIncome}
              disabled={saving}
              className="flex-1 rounded-xl bg-red-500 px-4 py-3 font-semibold text-[var(--app-accent-foreground)] transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Deletando...' : 'Deletar Entrada'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
