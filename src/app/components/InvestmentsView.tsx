import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useInvestments } from '@/lib/hooks/useInvestments';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { getTodayLocal } from '@/lib/utils/dateHelpers';
import {
  CUSTOM_CATEGORY_VALUE,
  INVESTMENT_CATEGORY_PRESETS,
  buildCategoryOptions,
  isPresetCategory,
} from '@/lib/utils/categoryOptions';
import {
  isInvestmentContributionTransactionType,
  isInvestmentMovementTransactionType,
  isInvestmentRedemptionTransactionType,
  type Investment,
  type Transaction,
} from '../data/mockData';

interface InvestmentsViewProps {
  selectedMonth: Date;
  onSelectedMonthChange: (date: Date) => void;
}

type MovementModalMode = 'register' | 'apply' | 'redeem' | null;

const NEW_INVESTMENT_VALUE = '__new_investment__';

const sectionClass = 'rounded-[1.75rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)]';
const fieldClass =
  'w-full rounded-2xl border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent';
const secondaryButtonClass =
  'rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 text-sm font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50';
const primaryButtonClass =
  'rounded-2xl border border-[var(--app-accent)] bg-[var(--app-accent)] px-4 py-3 text-sm font-semibold text-[var(--app-accent-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

const normalizeText = (value: string | null | undefined) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

const formatMovementDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const sortInvestments = (items: Investment[]) =>
  [...items].sort((left, right) => right.amount - left.amount || left.category.localeCompare(right.category, 'pt-BR'));

const parseCurrencyInput = (value: string) => {
  const normalized = Number.parseFloat(value);
  return Number.isFinite(normalized) ? normalized : NaN;
};

export function InvestmentsView({ selectedMonth, onSelectedMonthChange }: InvestmentsViewProps) {
  const { user } = useAuth();
  const { investments, loading: loadingInvestments, createInvestment, updateInvestment } = useInvestments(user?.id);
  const { transactions, loading: loadingTransactions, createTransaction, deleteTransaction } = useTransactions(user?.id);
  const [saving, setSaving] = useState(false);
  const [modalMode, setModalMode] = useState<MovementModalMode>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [movementForm, setMovementForm] = useState({
    investmentId: '',
    category: '',
    amount: '',
    date: getTodayLocal(),
    description: '',
    countsAsReserve: false,
  });
  const [isDeleteTransactionModalOpen, setIsDeleteTransactionModalOpen] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState('');
  const [deletingTransactionDescription, setDeletingTransactionDescription] = useState('');

  const loading = loadingInvestments || loadingTransactions;
  const sortedInvestments = useMemo(() => sortInvestments(investments), [investments]);
  const activeInvestments = useMemo(
    () => sortedInvestments.filter((investment) => investment.amount > 0),
    [sortedInvestments],
  );
  const investmentCategoryOptions = useMemo(
    () => buildCategoryOptions(sortedInvestments.map((investment) => investment.category), INVESTMENT_CATEGORY_PRESETS),
    [sortedInvestments],
  );
  const investmentTransactions = useMemo(
    () =>
      [...transactions]
        .filter((transaction) => isInvestmentMovementTransactionType(transaction.type))
        .sort((left, right) => right.date.localeCompare(left.date)),
    [transactions],
  );

  const selectedMonthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthTransactions = investmentTransactions.filter((transaction) => transaction.date.startsWith(selectedMonthKey));
  const totalInvested = activeInvestments.reduce((sum, investment) => sum + investment.amount, 0);
  const reserveTotal = activeInvestments
    .filter((investment) => investment.countsAsReserve)
    .reduce((sum, investment) => sum + investment.amount, 0);
  const nonReserveTotal = Math.max(totalInvested - reserveTotal, 0);
  const totalAppliedInMonth = monthTransactions
    .filter((transaction) => isInvestmentContributionTransactionType(transaction.type))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalRedeemedInMonth = monthTransactions
    .filter((transaction) => isInvestmentRedemptionTransactionType(transaction.type))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const selectedInvestment = movementForm.investmentId
    ? sortedInvestments.find((investment) => investment.id === movementForm.investmentId) ?? null
    : null;
  const showNewInvestmentFields = modalMode !== 'redeem' && !movementForm.investmentId;
  const availableForRedemption = selectedInvestment?.amount || 0;
  const selectedCategoryValue = isCustomCategory
    ? CUSTOM_CATEGORY_VALUE
    : isPresetCategory(movementForm.category, investmentCategoryOptions)
      ? movementForm.category
      : '';

  const syncCustomCategoryMode = (category: string) => {
    setIsCustomCategory(Boolean(category) && !isPresetCategory(category, investmentCategoryOptions));
  };

  const resetMovementForm = (nextMode: Exclude<MovementModalMode, null>) => {
    setMovementForm({
      investmentId: '',
      category: '',
      amount: '',
      date: getTodayLocal(),
      description: '',
      countsAsReserve: false,
    });
    setIsCustomCategory(false);
    setModalMode(nextMode);
  };

  const handleSelectInvestment = (value: string) => {
    if (!value || value === NEW_INVESTMENT_VALUE) {
      setMovementForm((current) => ({
        ...current,
        investmentId: '',
        category: '',
        countsAsReserve: false,
      }));
      setIsCustomCategory(false);
      return;
    }

    const investment = sortedInvestments.find((item) => item.id === value);
    if (!investment) return;

    setMovementForm((current) => ({
      ...current,
      investmentId: investment.id,
      category: investment.category,
      countsAsReserve: Boolean(investment.countsAsReserve),
    }));
    setIsCustomCategory(false);
  };

  const handleCategorySelectChange = (value: string) => {
    if (value === CUSTOM_CATEGORY_VALUE) {
      setIsCustomCategory(true);
      setMovementForm((current) => ({ ...current, category: '' }));
      return;
    }

    setIsCustomCategory(false);
    setMovementForm((current) => ({ ...current, category: value }));
  };

  const getMovementCopy = () => {
    switch (modalMode) {
      case 'register':
        return {
          title: 'Registrar posição atual',
          description: 'Use esta opção para cadastrar ou ajustar o valor atual de um ativo sem mexer no saldo disponível.',
          submitLabel: 'Salvar posição',
        };
      case 'apply':
        return {
          title: 'Registrar aporte',
          description: 'O aporte reduz o saldo disponível e aumenta o valor investido na carteira escolhida.',
          submitLabel: 'Registrar aporte',
        };
      case 'redeem':
        return {
          title: 'Registrar resgate',
          description: 'O resgate devolve dinheiro para o saldo disponível e diminui o valor do ativo selecionado.',
          submitLabel: 'Registrar resgate',
        };
      default:
        return {
          title: '',
          description: '',
          submitLabel: '',
        };
    }
  };

  const handleRegisterPosition = async () => {
    const amount = parseCurrencyInput(movementForm.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Informe um valor válido para a posição atual.');
      return false;
    }

    if (selectedInvestment) {
      await updateInvestment(selectedInvestment.id, {
        amount,
        lastUpdate: movementForm.date,
        countsAsReserve: movementForm.countsAsReserve,
      });
    } else {
      const trimmedCategory = movementForm.category.trim();
      if (!trimmedCategory) {
        toast.error('Escolha ou digite o nome do ativo.');
        return false;
      }

      await createInvestment({
        category: trimmedCategory,
        amount,
        lastUpdate: movementForm.date,
        countsAsReserve: movementForm.countsAsReserve,
      });
    }

    toast.success('Posição registrada com sucesso.');
    return true;
  };

  const handleApplyContribution = async () => {
    const amount = parseCurrencyInput(movementForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Informe um valor de aporte maior que zero.');
      return false;
    }

    let targetInvestment = selectedInvestment;

    if (targetInvestment) {
      await updateInvestment(targetInvestment.id, {
        amount: targetInvestment.amount + amount,
        lastUpdate: movementForm.date,
        countsAsReserve: movementForm.countsAsReserve,
      });
      targetInvestment = {
        ...targetInvestment,
        amount: targetInvestment.amount + amount,
        lastUpdate: movementForm.date,
        countsAsReserve: movementForm.countsAsReserve,
      };
    } else {
      const trimmedCategory = movementForm.category.trim();
      if (!trimmedCategory) {
        toast.error('Escolha ou digite o nome do ativo.');
        return false;
      }

      targetInvestment = await createInvestment({
        category: trimmedCategory,
        amount,
        lastUpdate: movementForm.date,
        countsAsReserve: movementForm.countsAsReserve,
      });
    }

    await createTransaction({
      date: movementForm.date,
      type: 'investment',
      category: targetInvestment.category,
      description: movementForm.description.trim() || `Aporte em ${targetInvestment.category}`,
      amount,
      investmentId: targetInvestment.id,
      paid: true,
    });

    toast.success('Aporte registrado com sucesso.');
    return true;
  };

  const handleRedeemInvestment = async () => {
    const amount = parseCurrencyInput(movementForm.amount);

    if (!selectedInvestment) {
      toast.error('Selecione um ativo para resgatar.');
      return false;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Informe um valor de resgate maior que zero.');
      return false;
    }

    if (amount > selectedInvestment.amount) {
      toast.error('O valor do resgate não pode ser maior que o saldo do ativo.');
      return false;
    }

    await updateInvestment(selectedInvestment.id, {
      amount: Math.max(selectedInvestment.amount - amount, 0),
      lastUpdate: movementForm.date,
    });

    await createTransaction({
      date: movementForm.date,
      type: 'investment_redemption',
      category: selectedInvestment.category,
      description: movementForm.description.trim() || `Resgate de ${selectedInvestment.category}`,
      amount,
      investmentId: selectedInvestment.id,
      paid: true,
    });

    toast.success('Resgate registrado com sucesso.');
    return true;
  };

  const handleSubmitMovement = async () => {
    if (!modalMode) return;
    if (!movementForm.date) {
      toast.error('Informe a data da movimentação.');
      return;
    }

    try {
      setSaving(true);
      let saved = false;

      if (modalMode === 'register') {
        saved = await handleRegisterPosition();
      }

      if (modalMode === 'apply') {
        saved = await handleApplyContribution();
      }

      if (modalMode === 'redeem') {
        saved = await handleRedeemInvestment();
      }

      if (!saved) return;

      setModalMode(null);
      setMovementForm({
        investmentId: '',
        category: '',
        amount: '',
        date: getTodayLocal(),
        description: '',
        countsAsReserve: false,
      });
      setIsCustomCategory(false);
    } catch (error) {
      console.error('Error saving investment movement:', error);
      toast.error('Não foi possível salvar a movimentação. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReserve = async (investment: Investment) => {
    try {
      setSaving(true);
      await updateInvestment(investment.id, {
        countsAsReserve: !investment.countsAsReserve,
      });
      toast.success(
        investment.countsAsReserve
          ? 'O ativo deixou de contar como reserva.'
          : 'O ativo agora conta como reserva.',
      );
    } catch (error) {
      console.error('Error toggling reserve flag:', error);
      toast.error('Não foi possível atualizar a classificação do ativo.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteTransactionModal = (transactionId: string, description: string) => {
    setDeletingTransactionId(transactionId);
    setDeletingTransactionDescription(description);
    setIsDeleteTransactionModalOpen(true);
  };

  const findTransactionInvestment = (transaction: Transaction) => {
    if (transaction.investmentId) {
      const byId = sortedInvestments.find((investment) => investment.id === transaction.investmentId);
      if (byId) return byId;
    }

    return sortedInvestments.find(
      (investment) => normalizeText(investment.category) === normalizeText(transaction.category),
    );
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransactionId) return;

    const transaction = investmentTransactions.find((item) => item.id === deletingTransactionId);
    if (!transaction) {
      toast.error('Movimentação não encontrada.');
      return;
    }

    try {
      setSaving(true);

      const relatedInvestment = findTransactionInvestment(transaction);

      if (isInvestmentContributionTransactionType(transaction.type) && relatedInvestment) {
        await updateInvestment(relatedInvestment.id, {
          amount: Math.max(relatedInvestment.amount - transaction.amount, 0),
        });
      }

      if (isInvestmentRedemptionTransactionType(transaction.type)) {
        if (relatedInvestment) {
          await updateInvestment(relatedInvestment.id, {
            amount: relatedInvestment.amount + transaction.amount,
          });
        } else {
          await createInvestment({
            category: transaction.category,
            amount: transaction.amount,
            lastUpdate: transaction.date,
            countsAsReserve:
              normalizeText(transaction.category).includes('reserva') ||
              normalizeText(transaction.category).includes('emerg'),
          });
        }
      }

      await deleteTransaction(transaction.id);
      setIsDeleteTransactionModalOpen(false);
      setDeletingTransactionId('');
      setDeletingTransactionDescription('');
      toast.success('Movimentação removida com sucesso.');
    } catch (error) {
      console.error('Error deleting investment transaction:', error);
      toast.error('Não foi possível remover a movimentação.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--app-accent)] border-t-transparent" />
          <p className="text-[var(--app-text-muted)]">Carregando investimentos...</p>
        </div>
      </div>
    );
  }

  const movementCopy = getMovementCopy();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.26em] text-[var(--app-text-faint)]">
              Patrimônio investido
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--app-text)]">Investimentos</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--app-text-muted)]">
              O saldo disponível não considera o que já foi investido. Aportes saem do caixa, resgates voltam para o caixa
              e os ativos marcados como reserva alimentam a trilha de metas.
            </p>
          </div>

          <div className={`${sectionClass} flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="text-sm font-medium text-[var(--app-text)]">Mês em foco</p>
              <p className="text-sm text-[var(--app-text-muted)]">Acompanhe aportes e resgates no período atual.</p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => onSelectedMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
                className="rounded-full border border-[var(--app-border)] p-2 text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-hover)]"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-[10rem] rounded-full border border-[var(--app-border)] px-4 py-2 text-center text-sm font-medium capitalize text-[var(--app-text)]">
                {formatMonthLabel(selectedMonth)}
              </div>
              <button
                type="button"
                onClick={() => onSelectedMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
                className="rounded-full border border-[var(--app-border)] p-2 text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-hover)]"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => resetMovementForm('register')} className={secondaryButtonClass}>
            <Plus className="mr-2 inline h-4 w-4" />
            Registrar posição
          </button>
          <button type="button" onClick={() => resetMovementForm('apply')} className={primaryButtonClass}>
            <ArrowUpRight className="mr-2 inline h-4 w-4" />
            Aplicar
          </button>
          <button
            type="button"
            onClick={() => resetMovementForm('redeem')}
            disabled={activeInvestments.length === 0}
            className={secondaryButtonClass}
          >
            <ArrowDownLeft className="mr-2 inline h-4 w-4" />
            Resgatar
          </button>
        </div>
      </div>

      <div className={`${sectionClass} grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4`}>
        <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[rgba(24,24,24,0.92)] p-5 text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <div className="mb-3 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-[var(--app-accent)]" />
            <span className="text-sm text-white/72">Patrimônio total</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalInvested)}</p>
          <p className="mt-2 text-sm text-white/60">{activeInvestments.length} ativo(s) com saldo atual</p>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5">
          <div className="mb-3 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <span className="text-sm text-[var(--app-text-muted)]">Reserva mapeada</span>
          </div>
          <p className="text-3xl font-bold text-[var(--app-text)]">{formatCurrency(reserveTotal)}</p>
          <p className="mt-2 text-sm text-[var(--app-text-faint)]">
            {activeInvestments.filter((investment) => investment.countsAsReserve).length} ativo(s) contam como reserva
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5">
          <div className="mb-3 flex items-center gap-3">
            <ArrowUpRight className="h-5 w-5 text-[var(--app-accent)]" />
            <span className="text-sm text-[var(--app-text-muted)]">Aportes no mês</span>
          </div>
          <p className="text-3xl font-bold text-[var(--app-text)]">{formatCurrency(totalAppliedInMonth)}</p>
          <p className="mt-2 text-sm text-[var(--app-text-faint)]">Saída do caixa no período selecionado</p>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5">
          <div className="mb-3 flex items-center gap-3">
            <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
            <span className="text-sm text-[var(--app-text-muted)]">Resgates no mês</span>
          </div>
          <p className="text-3xl font-bold text-[var(--app-text)]">{formatCurrency(totalRedeemedInMonth)}</p>
          <p className="mt-2 text-sm text-[var(--app-text-faint)]">Entrada de volta no caixa no período selecionado</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className={`${sectionClass} overflow-hidden`}>
          <div className="border-b border-[var(--app-border)] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--app-text)]">Carteira atual</h3>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  Marque os ativos que contam como reserva para alimentar as metas guiadas.
                </p>
              </div>
              <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-1 text-xs font-medium text-[var(--app-text-muted)]">
                Fora da reserva: {formatCurrency(nonReserveTotal)}
              </span>
            </div>
          </div>

          <div className="divide-y divide-[var(--app-border)]">
            {activeInvestments.length === 0 && (
              <div className="px-5 py-12 text-center">
                <Landmark className="mx-auto mb-3 h-10 w-10 text-[var(--app-text-faint)]" />
                <p className="text-base font-medium text-[var(--app-text)]">Nenhum ativo com saldo atual</p>
                <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                  Comece registrando a posição atual da carteira ou lance o primeiro aporte.
                </p>
              </div>
            )}

            {activeInvestments.map((investment) => {
              const percentage = totalInvested > 0 ? (investment.amount / totalInvested) * 100 : 0;

              return (
                <div key={investment.id} className="px-5 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-[var(--app-text)]">{investment.category}</h4>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            investment.countsAsReserve
                              ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'border border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-text-muted)]'
                          }`}
                        >
                          {investment.countsAsReserve ? 'Conta como reserva' : 'Investimento'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--app-text-faint)]">
                        Atualizado em {formatMovementDate(investment.lastUpdate)}
                      </p>
                    </div>

                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <div className="text-left sm:text-right">
                        <p className="text-2xl font-bold text-[var(--app-text)]">{formatCurrency(investment.amount)}</p>
                        <p className="text-sm text-[var(--app-text-faint)]">{percentage.toFixed(1)}% da carteira</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleToggleReserve(investment)}
                        disabled={saving}
                        className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-1.5 text-xs font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {investment.countsAsReserve ? 'Remover da reserva' : 'Marcar como reserva'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-[var(--app-surface-strong)]">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        investment.countsAsReserve ? 'bg-emerald-500' : 'bg-[var(--app-accent)]'
                      }`}
                      style={{ width: `${Math.max(percentage, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`${sectionClass} overflow-hidden`}>
          <div className="border-b border-[var(--app-border)] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--app-text)]">Histórico de movimentações</h3>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  Aportes e resgates daqui passam a impactar automaticamente o saldo disponível.
                </p>
              </div>
              <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-1 text-xs font-medium text-[var(--app-text-muted)]">
                {investmentTransactions.length} movimentação(ões)
              </span>
            </div>
          </div>

          <div className="divide-y divide-[var(--app-border)]">
            {investmentTransactions.length === 0 && (
              <div className="px-5 py-12 text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-[var(--app-text-faint)]" />
                <p className="text-base font-medium text-[var(--app-text)]">Ainda não há movimentações</p>
                <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                  Registre um aporte, um resgate ou só a posição atual para começar a acompanhar a carteira.
                </p>
              </div>
            )}

            {investmentTransactions.map((transaction) => {
              const isContribution = isInvestmentContributionTransactionType(transaction.type);

              return (
                <div key={transaction.id} className="px-5 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                          isContribution
                            ? 'border-[rgba(133,55,253,0.28)] bg-[rgba(133,55,253,0.12)] text-[var(--app-accent)]'
                            : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isContribution ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-medium text-[var(--app-text)]">{transaction.description}</h4>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              isContribution
                                ? 'border border-[rgba(133,55,253,0.22)] bg-[rgba(133,55,253,0.12)] text-[var(--app-accent)]'
                                : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {isContribution ? 'Aporte' : 'Resgate'}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--app-text-faint)]">
                          <span className="inline-flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {formatMovementDate(transaction.date)}
                          </span>
                          <span>•</span>
                          <span>{transaction.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p
                          className={`text-xl font-bold ${
                            isContribution ? 'text-[var(--app-accent)]' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isContribution ? '-' : '+'}
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteTransactionModal(transaction.id, transaction.description)}
                        className="rounded-xl p-2 text-[var(--app-danger-text)] transition-colors hover:bg-[var(--app-danger-surface)]"
                        title="Excluir movimentação"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <Dialog open={Boolean(modalMode)} onOpenChange={(open) => !open && setModalMode(null)}>
        <DialogContent className="app-panel-strong max-w-2xl rounded-[2rem] p-0">
          <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold text-[var(--app-text)]">{movementCopy.title}</DialogTitle>
              <DialogDescription className="mt-2 text-[var(--app-text-muted)]">{movementCopy.description}</DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-5">
              {modalMode !== 'redeem' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--app-text)]">Ativo</label>
                  <select
                    value={movementForm.investmentId || NEW_INVESTMENT_VALUE}
                    onChange={(event) => handleSelectInvestment(event.target.value)}
                    className={fieldClass}
                  >
                    <option value={NEW_INVESTMENT_VALUE}>Novo ativo</option>
                    {sortedInvestments.map((investment) => (
                      <option key={investment.id} value={investment.id}>
                        {investment.category} {investment.amount > 0 ? `• ${formatCurrency(investment.amount)}` : '• zerado'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalMode === 'redeem' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--app-text)]">Ativo</label>
                  <select
                    value={movementForm.investmentId}
                    onChange={(event) => handleSelectInvestment(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Selecione um ativo</option>
                    {activeInvestments.map((investment) => (
                      <option key={investment.id} value={investment.id}>
                        {investment.category} • disponível {formatCurrency(investment.amount)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showNewInvestmentFields && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--app-text)]">Nome do ativo</label>
                  <select
                    value={selectedCategoryValue}
                    onChange={(event) => handleCategorySelectChange(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Selecione uma categoria</option>
                    {investmentCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                    <option value={CUSTOM_CATEGORY_VALUE}>Novo nome...</option>
                  </select>

                  {isCustomCategory && (
                    <input
                      type="text"
                      value={movementForm.category}
                      onChange={(event) => {
                        setMovementForm((current) => ({ ...current, category: event.target.value }));
                        syncCustomCategoryMode(event.target.value);
                      }}
                      placeholder="Ex.: CDB Banco X"
                      className={fieldClass}
                    />
                  )}
                </div>
              )}

              {modalMode !== 'redeem' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--app-text)]">Classificação</label>
                  <select
                    value={movementForm.countsAsReserve ? 'reserve' : 'investment'}
                    onChange={(event) => setMovementForm((current) => ({
                      ...current,
                      countsAsReserve: event.target.value === 'reserve',
                    }))}
                    className={fieldClass}
                  >
                    <option value="investment">Investimento</option>
                    <option value="reserve">Conta como reserva</option>
                  </select>
                </div>
              )}

              {modalMode === 'redeem' && selectedInvestment && (
                <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                  <p className="text-sm font-medium text-[var(--app-text)]">{selectedInvestment.category}</p>
                  <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                    Disponível para resgate: {formatCurrency(availableForRedemption)}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--app-text)]">
                    {modalMode === 'register' ? 'Valor atual' : 'Valor'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={movementForm.amount}
                    onChange={(event) => setMovementForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="0,00"
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--app-text)]">Data</label>
                  <input
                    type="date"
                    value={movementForm.date}
                    onChange={(event) => setMovementForm((current) => ({ ...current, date: event.target.value }))}
                    className={fieldClass}
                  />
                </div>
              </div>

              {modalMode !== 'register' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--app-text)]">Descrição</label>
                  <input
                    type="text"
                    value={movementForm.description}
                    onChange={(event) => setMovementForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder={modalMode === 'apply' ? 'Ex.: Aporte do mês' : 'Ex.: Resgate para caixa'}
                    className={fieldClass}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setModalMode(null)} className={secondaryButtonClass}>
                Cancelar
              </button>
              <button type="button" onClick={() => void handleSubmitMovement()} disabled={saving} className={primaryButtonClass}>
                {saving ? 'Salvando...' : movementCopy.submitLabel}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteTransactionModalOpen} onOpenChange={setIsDeleteTransactionModalOpen}>
        <DialogContent className="app-panel-strong max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-semibold text-[var(--app-text)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--app-danger-surface)] text-[var(--app-danger-text)]">
                <Trash2 className="h-5 w-5" />
              </div>
              Excluir movimentação
            </DialogTitle>
            <DialogDescription className="mt-2 text-[var(--app-text-muted)]">
              A carteira e o saldo disponível serão recalculados com base nessa exclusão.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <p className="text-sm text-[var(--app-text-faint)]">Movimentação</p>
            <p className="mt-1 font-medium text-[var(--app-text)]">{deletingTransactionDescription}</p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteTransactionModalOpen(false)}
              disabled={saving}
              className={`${secondaryButtonClass} flex-1`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteTransaction()}
              disabled={saving}
              className="flex-1 rounded-2xl border border-[var(--app-danger-text)] bg-[var(--app-danger-text)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
