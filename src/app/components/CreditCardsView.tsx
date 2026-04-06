import { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LockOpen,
  Plus,
  Receipt,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCreditCards } from '@/lib/hooks/useCreditCards';
import { useDailyExpenses } from '@/lib/hooks/useDailyExpenses';
import { useTransactions } from '@/lib/hooks/useTransactions';
import type { CreditCard as CreditCardItem, CreditCardPayment, CreditCardStatement } from '@/lib/api/creditCards';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { getTodayLocal } from '@/lib/utils/dateHelpers';
import { canTransactionUseCreditCard } from '@/lib/utils/transactionPayments';

interface CreditCardsViewProps {
  selectedMonth: Date;
  onSelectedMonthChange: (date: Date) => void;
}

type StatementStatus = 'paid' | 'open' | 'overdue';

interface StatementSummary {
  statement: CreditCardStatement
  card: CreditCardItem | null
  payments: CreditCardPayment[]
  paidAmount: number
  remainingAmount: number
  status: StatementStatus
}

interface CreditExpenseSummary {
  card: CreditCardItem
  amount: number
  count: number
}

interface CreditActivityEntry {
  cardId: string
  amount: number
  statementReferenceMonth?: string
}

const sectionClass = 'rounded-[1.75rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)]';
const fieldClass =
  'w-full rounded-2xl border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent';
const secondaryButtonClass =
  'rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 text-sm font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50';
const primaryButtonClass =
  'rounded-2xl border border-[var(--app-accent)] bg-[var(--app-accent)] px-4 py-3 text-sm font-semibold text-[var(--app-accent-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
const subtleBadgeClass =
  'inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-2.5 py-1 text-xs font-medium text-[var(--app-text-muted)]';

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

const formatReferenceMonth = (referenceMonth: string) =>
  new Date(`${referenceMonth}T12:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

const formatDateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const toMonthInputValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthInputToReferenceMonth = (value: string) => `${value}-01`;

const parseNumberInput = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const clampCurrency = (value: number) => Math.round(Math.max(value, 0) * 100) / 100;

const buildStatementDescription = (cardName: string, referenceMonth: string) =>
  `Fatura ${cardName} • ${formatReferenceMonth(referenceMonth)}`;

const buildPaymentDescription = (cardName: string, referenceMonth: string) =>
  `Pagamento ${cardName} • ${formatReferenceMonth(referenceMonth)}`;

export function CreditCardsView({ selectedMonth, onSelectedMonthChange }: CreditCardsViewProps) {
  const { user } = useAuth();
  const {
    cards,
    statements,
    payments,
    loading: loadingCards,
    createCard,
    updateCard,
    deleteCard,
    createStatement,
    updateStatement,
    deleteStatement,
    createPayment,
    deletePayment,
  } = useCreditCards(user?.id);
  const {
    transactions,
    loading: loadingTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions(user?.id);
  const { dailyExpenses, loading: loadingDailyExpenses } = useDailyExpenses(user?.id);

  const [saving, setSaving] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string>('');
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStatementId, setPaymentStatementId] = useState<string>('');
  const [cardForm, setCardForm] = useState({
    name: '',
    issuer: '',
    brand: '',
    totalLimit: '',
    unlockedLimit: '',
    usedLimit: '',
    closingDay: '',
    dueDay: '',
    notes: '',
  });
  const [statementForm, setStatementForm] = useState({
    cardId: '',
    referenceMonth: toMonthInputValue(selectedMonth),
    closingDate: getTodayLocal(),
    dueDate: getTodayLocal(),
    totalAmount: '',
    notes: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paidAt: getTodayLocal(),
    notes: '',
  });

  const today = getTodayLocal();
  const selectedMonthKey = toMonthInputValue(selectedMonth);
  const loading = loadingCards || loadingTransactions || loadingDailyExpenses;

  const paymentsByStatement = useMemo(() => {
    const map = new Map<string, CreditCardPayment[]>();

    payments.forEach((payment) => {
      const current = map.get(payment.statementId) || [];
      current.push(payment);
      map.set(payment.statementId, current);
    });

    map.forEach((statementPayments) => {
      statementPayments.sort((left, right) => right.paidAt.localeCompare(left.paidAt));
    });

    return map;
  }, [payments]);

  const statementSummaries = useMemo<StatementSummary[]>(() => (
    statements.map((statement) => {
      const card = cards.find((item) => item.id === statement.cardId) || null;
      const statementPayments = paymentsByStatement.get(statement.id) || [];
      const paidAmount = statementPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const remainingAmount = clampCurrency(statement.totalAmount - paidAmount);
      const status: StatementStatus =
        remainingAmount <= 0
          ? 'paid'
          : statement.dueDate < today
            ? 'overdue'
            : 'open';

      return {
        statement,
        card,
        payments: statementPayments,
        paidAmount,
        remainingAmount,
        status,
      };
    })
  ), [cards, paymentsByStatement, statements, today]);

  const selectedMonthStatements = statementSummaries.filter(
    (summary) => summary.statement.referenceMonth.slice(0, 7) === selectedMonthKey,
  );

  const selectedPaymentStatement = statementSummaries.find((summary) => summary.statement.id === paymentStatementId) || null;
  const creditDailyExpenses = useMemo(
    () => dailyExpenses.filter((expense) => expense.paymentMethod === 'credit_card' && expense.creditCardId),
    [dailyExpenses],
  );
  const creditCommitmentTransactions = useMemo(
    () => transactions.filter((transaction) => (
      transaction.paid &&
      canTransactionUseCreditCard(transaction.type) &&
      transaction.paymentMethod === 'credit_card' &&
      transaction.creditCardId
    )),
    [transactions],
  );
  const statementKeys = useMemo(
    () => new Set(statements.map((statement) => `${statement.cardId}:${statement.referenceMonth}`)),
    [statements],
  );
  const effectiveUsedLimitByCard = useMemo(() => {
    const remainingStatementsByCard = new Map<string, number>();

    statementSummaries.forEach((summary) => {
      remainingStatementsByCard.set(
        summary.statement.cardId,
        (remainingStatementsByCard.get(summary.statement.cardId) || 0) + summary.remainingAmount,
      );
    });

    const unbilledActivityEntries: CreditActivityEntry[] = [
      ...creditDailyExpenses.map((expense) => ({
        cardId: expense.creditCardId!,
        amount: expense.amount,
        statementReferenceMonth: expense.statementReferenceMonth,
      })),
      ...creditCommitmentTransactions.map((transaction) => ({
        cardId: transaction.creditCardId!,
        amount: transaction.amount,
        statementReferenceMonth: transaction.statementReferenceMonth,
      })),
    ].filter((entry) => !entry.statementReferenceMonth || !statementKeys.has(`${entry.cardId}:${entry.statementReferenceMonth}`));

    const unbilledByCard = new Map<string, number>();
    unbilledActivityEntries.forEach((entry) => {
      unbilledByCard.set(entry.cardId, (unbilledByCard.get(entry.cardId) || 0) + entry.amount);
    });

    const nextMap = new Map<string, number>();
    cards.forEach((card) => {
      const remainingStatementAmount = remainingStatementsByCard.get(card.id) || 0;
      const unbilledAmount = unbilledByCard.get(card.id) || 0;
      const trackedUsed = clampCurrency(remainingStatementAmount + unbilledAmount);
      const hasTrackedUsage =
        trackedUsed > 0 ||
        statements.some((statement) => statement.cardId === card.id) ||
        creditDailyExpenses.some((expense) => expense.creditCardId === card.id) ||
        creditCommitmentTransactions.some((transaction) => transaction.creditCardId === card.id);

      nextMap.set(
        card.id,
        hasTrackedUsage
          ? clampCurrency(Math.max(card.usedLimit, remainingStatementAmount) + unbilledAmount)
          : card.usedLimit,
      );
    });

    return nextMap;
  }, [cards, creditCommitmentTransactions, creditDailyExpenses, statementKeys, statementSummaries, statements]);

  const totalLimit = cards.reduce((sum, card) => sum + card.totalLimit, 0);
  const totalBlockedLimit = cards.reduce((sum, card) => sum + card.blockedLimit, 0);
  const totalUsedLimit = cards.reduce((sum, card) => sum + (effectiveUsedLimitByCard.get(card.id) || 0), 0);
  const totalUnlockedLimit = Math.max(totalLimit - totalBlockedLimit, 0);
  const totalFreeLimit = Math.max(totalUnlockedLimit - totalUsedLimit, 0);
  const selectedMonthCreditExpenses = useMemo(
    () => [
      ...creditDailyExpenses.filter((expense) => expense.statementReferenceMonth?.slice(0, 7) === selectedMonthKey)
        .map((expense) => ({
          cardId: expense.creditCardId!,
          amount: expense.amount,
          source: 'daily_expense' as const,
        })),
      ...creditCommitmentTransactions.filter((transaction) => transaction.statementReferenceMonth?.slice(0, 7) === selectedMonthKey)
        .map((transaction) => ({
          cardId: transaction.creditCardId!,
          amount: transaction.amount,
          source: 'commitment' as const,
        })),
    ],
    [creditCommitmentTransactions, creditDailyExpenses, selectedMonthKey],
  );
  const selectedMonthCreditExpensesTotal = useMemo(
    () => selectedMonthCreditExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [selectedMonthCreditExpenses],
  );
  const selectedMonthCreditExpenseSummaries = useMemo<CreditExpenseSummary[]>(() => {
    const grouped = new Map<string, CreditExpenseSummary>();

    selectedMonthCreditExpenses.forEach((expense) => {
      const card = cards.find((item) => item.id === expense.cardId);

      if (!card) return;

      const current = grouped.get(card.id);
      if (current) {
        current.amount += expense.amount;
        current.count += 1;
        return;
      }

      grouped.set(card.id, {
        card,
        amount: expense.amount,
        count: 1,
      });
    });

    return [...grouped.values()].sort((left, right) => right.amount - left.amount || left.card.name.localeCompare(right.card.name));
  }, [cards, selectedMonthCreditExpenses]);

  const getSuggestedStatementAmount = (cardId: string, referenceMonthInput: string) => {
    if (!cardId || !referenceMonthInput) return 0;

    const dailyExpensesAmount = creditDailyExpenses
      .filter(
        (expense) =>
          expense.creditCardId === cardId &&
          expense.statementReferenceMonth?.slice(0, 7) === referenceMonthInput,
      )
      .reduce((sum, expense) => sum + expense.amount, 0);

    const commitmentAmount = creditCommitmentTransactions
      .filter(
        (transaction) =>
          transaction.creditCardId === cardId &&
          transaction.statementReferenceMonth?.slice(0, 7) === referenceMonthInput,
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return dailyExpensesAmount + commitmentAmount;
  };

  const suggestedStatementAmount = useMemo(
    () => getSuggestedStatementAmount(statementForm.cardId, statementForm.referenceMonth),
    [creditDailyExpenses, statementForm.cardId, statementForm.referenceMonth],
  );

  const resetCardForm = () => {
    setCardForm({
      name: '',
      issuer: '',
      brand: '',
      totalLimit: '',
      unlockedLimit: '',
      usedLimit: '',
      closingDay: '',
      dueDay: '',
      notes: '',
    });
    setEditingCardId('');
  };

  const resetStatementForm = () => {
    setStatementForm({
      cardId: cards[0]?.id || '',
      referenceMonth: toMonthInputValue(selectedMonth),
      closingDate: getTodayLocal(),
      dueDate: getTodayLocal(),
      totalAmount: '',
      notes: '',
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      paidAt: getTodayLocal(),
      notes: '',
    });
  };

  const openCreateCardModal = () => {
    resetCardForm();
    setIsCardModalOpen(true);
  };

  const openEditCardModal = (card: CreditCardItem) => {
    setEditingCardId(card.id);
    setCardForm({
      name: card.name,
      issuer: card.issuer || '',
      brand: card.brand || '',
      totalLimit: card.totalLimit.toString(),
      unlockedLimit: Math.max(card.totalLimit - card.blockedLimit, 0).toString(),
      usedLimit: card.usedLimit.toString(),
      closingDay: card.closingDay.toString(),
      dueDay: card.dueDay.toString(),
      notes: card.notes || '',
    });
    setIsCardModalOpen(true);
  };

  const openStatementModal = (cardId?: string) => {
    resetStatementForm();
    if (cardId) {
      const suggestedAmount = getSuggestedStatementAmount(cardId, selectedMonthKey);
      setStatementForm((current) => ({
        ...current,
        cardId,
        totalAmount: suggestedAmount > 0 ? suggestedAmount.toFixed(2) : current.totalAmount,
      }));
    }
    setIsStatementModalOpen(true);
  };

  const openPaymentModal = (statementId: string) => {
    resetPaymentForm();
    setPaymentStatementId(statementId);
    setIsPaymentModalOpen(true);
  };

  const syncStatementCommitment = async (
    statement: CreditCardStatement,
    cardName: string,
    remainingAmount: number,
  ) => {
    const description = buildStatementDescription(cardName, statement.referenceMonth);

    if (remainingAmount <= 0) {
      if (statement.commitmentTransactionId) {
        await deleteTransaction(statement.commitmentTransactionId);
        return updateStatement(statement.id, { commitmentTransactionId: null });
      }

      return statement;
    }

    if (statement.commitmentTransactionId) {
      await updateTransaction(statement.commitmentTransactionId, {
        type: 'expense_fixed',
        category: 'Cartão',
        description,
        amount: remainingAmount,
        date: statement.dueDate,
        paid: false,
        recurring: false,
      });

      return statement;
    }

    const commitmentTransaction = await createTransaction({
      type: 'expense_fixed',
      category: 'Cartão',
      description,
      amount: remainingAmount,
      date: statement.dueDate,
      paid: false,
      recurring: false,
    });

    return updateStatement(statement.id, { commitmentTransactionId: commitmentTransaction.id });
  };

  const handleSaveCard = async () => {
    const totalLimit = parseNumberInput(cardForm.totalLimit);
    const unlockedLimit = parseNumberInput(cardForm.unlockedLimit || '0');
    const usedLimit = parseNumberInput(cardForm.usedLimit || '0');
    const closingDay = Number.parseInt(cardForm.closingDay, 10);
    const dueDay = Number.parseInt(cardForm.dueDay, 10);

    if (!cardForm.name.trim()) {
      toast.error('Informe o nome do cartão.');
      return;
    }

    if (!Number.isFinite(totalLimit) || totalLimit < 0) {
      toast.error('Informe um limite total válido.');
      return;
    }

    if (!Number.isFinite(unlockedLimit) || unlockedLimit < 0) {
      toast.error('Informe um limite desbloqueado válido.');
      return;
    }

    if (unlockedLimit > totalLimit) {
      toast.error('O limite desbloqueado não pode ser maior que o limite total.');
      return;
    }

    if (!Number.isFinite(usedLimit) || usedLimit < 0) {
      toast.error('Informe um limite usado válido.');
      return;
    }

    if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) {
      toast.error('O dia de fechamento precisa ficar entre 1 e 31.');
      return;
    }

    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      toast.error('O dia de vencimento precisa ficar entre 1 e 31.');
      return;
    }

    const blockedLimit = clampCurrency(totalLimit - unlockedLimit);

    try {
      setSaving(true);

      const payload = {
        name: cardForm.name.trim(),
        issuer: cardForm.issuer.trim() || undefined,
        brand: cardForm.brand.trim() || undefined,
        totalLimit,
        blockedLimit,
        usedLimit,
        closingDay,
        dueDay,
        notes: cardForm.notes.trim() || undefined,
      };

      if (editingCardId) {
        await updateCard(editingCardId, payload);
        toast.success('Cartão atualizado com sucesso.');
      } else {
        await createCard(payload);
        toast.success('Cartão cadastrado com sucesso.');
      }

      setIsCardModalOpen(false);
      resetCardForm();
    } catch (error) {
      console.error('Error saving credit card:', error);
      toast.error('Não foi possível salvar o cartão.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStatement = async () => {
    const totalAmount = parseNumberInput(statementForm.totalAmount);
    const referenceMonth = monthInputToReferenceMonth(statementForm.referenceMonth);
    const selectedCard = cards.find((card) => card.id === statementForm.cardId) || null;

    if (!selectedCard) {
      toast.error('Selecione um cartão.');
      return;
    }

    if (!statementForm.referenceMonth) {
      toast.error('Informe o mês de referência da fatura.');
      return;
    }

    if (!statementForm.closingDate || !statementForm.dueDate) {
      toast.error('Informe as datas de fechamento e vencimento.');
      return;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error('Informe o valor total da fatura.');
      return;
    }

    const existingStatement = statements.find(
      (statement) => statement.cardId === selectedCard.id && statement.referenceMonth === referenceMonth,
    );

    if (existingStatement) {
      toast.error('Já existe uma fatura desse cartão para o mês informado.');
      return;
    }

    try {
      setSaving(true);

      const createdStatement = await createStatement({
        cardId: selectedCard.id,
        referenceMonth,
        closingDate: statementForm.closingDate,
        dueDate: statementForm.dueDate,
        totalAmount,
        notes: statementForm.notes.trim() || undefined,
        commitmentTransactionId: null,
      });

      await syncStatementCommitment(createdStatement, selectedCard.name, totalAmount);

      setIsStatementModalOpen(false);
      resetStatementForm();
      toast.success('Fatura cadastrada com sucesso.');
    } catch (error) {
      console.error('Error saving statement:', error);
      toast.error('Não foi possível cadastrar a fatura.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async () => {
    const amount = parseNumberInput(paymentForm.amount);

    if (!selectedPaymentStatement) {
      toast.error('Selecione uma fatura para registrar o pagamento.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Informe um valor de pagamento maior que zero.');
      return;
    }

    if (amount > selectedPaymentStatement.remainingAmount) {
      toast.error('O pagamento não pode ser maior que o saldo restante da fatura.');
      return;
    }

    if (!paymentForm.paidAt) {
      toast.error('Informe a data do pagamento.');
      return;
    }

    try {
      setSaving(true);

      const paymentTransaction = await createTransaction({
        type: 'expense_fixed',
        category: 'Cartão',
        description: buildPaymentDescription(
          selectedPaymentStatement.card?.name || 'Cartão',
          selectedPaymentStatement.statement.referenceMonth,
        ),
        amount,
        date: paymentForm.paidAt,
        paid: true,
        recurring: false,
      });

      await createPayment({
        statementId: selectedPaymentStatement.statement.id,
        amount,
        paidAt: paymentForm.paidAt,
        notes: paymentForm.notes.trim() || undefined,
        paymentTransactionId: paymentTransaction.id,
      });

      await syncStatementCommitment(
        selectedPaymentStatement.statement,
        selectedPaymentStatement.card?.name || 'Cartão',
        clampCurrency(selectedPaymentStatement.remainingAmount - amount),
      );

      setIsPaymentModalOpen(false);
      setPaymentStatementId('');
      resetPaymentForm();
      toast.success('Pagamento registrado com sucesso.');
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Não foi possível registrar o pagamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (card: CreditCardItem) => {
    if (statements.some((statement) => statement.cardId === card.id)) {
      toast.error('Remova as faturas do cartão antes de excluí-lo.');
      return;
    }

    if (dailyExpenses.some((expense) => expense.creditCardId === card.id)) {
      toast.error('Esse cartão ainda está vinculado a compras lançadas no dia a dia. Remova esses lançamentos primeiro.');
      return;
    }

    if (transactions.some((transaction) => transaction.creditCardId === card.id)) {
      toast.error('Esse cartão ainda está vinculado a compromissos ou lançamentos pagos no crédito. Remova esses vínculos primeiro.');
      return;
    }

    if (!window.confirm(`Excluir o cartão ${card.name}?`)) return;

    try {
      setSaving(true);
      await deleteCard(card.id);
      toast.success('Cartão removido com sucesso.');
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Não foi possível excluir o cartão.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStatement = async (summary: StatementSummary) => {
    if (!window.confirm(`Excluir a fatura ${summary.card?.name || 'Cartão'} • ${formatReferenceMonth(summary.statement.referenceMonth)}?`)) {
      return;
    }

    try {
      setSaving(true);

      for (const payment of summary.payments) {
        if (payment.paymentTransactionId) {
          await deleteTransaction(payment.paymentTransactionId);
        }
        await deletePayment(payment.id);
      }

      if (summary.statement.commitmentTransactionId) {
        await deleteTransaction(summary.statement.commitmentTransactionId);
      }

      await deleteStatement(summary.statement.id);
      toast.success('Fatura removida com sucesso.');
    } catch (error) {
      console.error('Error deleting statement:', error);
      toast.error('Não foi possível excluir a fatura.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (summary: StatementSummary, payment: CreditCardPayment) => {
    if (!window.confirm('Excluir este pagamento?')) return;

    try {
      setSaving(true);

      if (payment.paymentTransactionId) {
        await deleteTransaction(payment.paymentTransactionId);
      }

      await deletePayment(payment.id);

      await syncStatementCommitment(
        summary.statement,
        summary.card?.name || 'Cartão',
        clampCurrency(summary.remainingAmount + payment.amount),
      );

      toast.success('Pagamento removido com sucesso.');
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Não foi possível excluir o pagamento.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--app-accent)] border-t-transparent" />
          <p className="text-[var(--app-text-muted)]">Carregando cartões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.26em] text-[var(--app-text-faint)]">
              Crédito com limite
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--app-text)]">Cartões</h2>
            <p className="mt-2 max-w-3xl text-sm text-[var(--app-text-muted)]">
              Limite não é saldo. Aqui você controla o que está aberto no crédito, quanto do limite quer manter
              desbloqueado para uso e o impacto real das faturas no seu caixa para ir migrando com mais segurança para o débito.
            </p>
          </div>

          <div className={`${sectionClass} flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="text-sm font-medium text-[var(--app-text)]">Mês em foco</p>
              <p className="text-sm text-[var(--app-text-muted)]">As faturas abaixo acompanham o mês selecionado.</p>
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
          <button type="button" onClick={openCreateCardModal} className={secondaryButtonClass}>
            <Plus className="mr-2 inline h-4 w-4" />
            Novo cartão
          </button>
          <button
            type="button"
            onClick={() => openStatementModal()}
            disabled={cards.length === 0}
            className={primaryButtonClass}
          >
            <Receipt className="mr-2 inline h-4 w-4" />
            Nova fatura
          </button>
        </div>
      </div>

      <div className={`${sectionClass} grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5`}>
        <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[rgba(24,24,24,0.92)] p-5 text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)] md:col-span-2 xl:col-span-2">
          <div className="mb-3 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-[var(--app-accent)]" />
            <span className="text-sm text-white/72">Crédito disponível</span>
          </div>
          <p className="break-words text-[clamp(1.45rem,5vw,2.3rem)] font-bold leading-[1.06] tracking-[-0.02em]">
            {formatCurrency(totalFreeLimit)}
          </p>
          <p className="mt-2 text-sm text-white/60">
            O que ainda pode ser usado hoje sem mexer no limite que você decidiu segurar.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5">
          <div className="mb-3 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-[var(--app-accent)]" />
            <span className="text-sm text-[var(--app-text-muted)]">Potencial disponível</span>
          </div>
          <p className="break-words text-[clamp(1.05rem,3.9vw,1.6rem)] font-bold leading-[1.08] tracking-[-0.02em] text-[var(--app-text)]">
            {formatCurrency(totalLimit)}
          </p>
          <p className="mt-2 text-sm text-[var(--app-text-faint)]">
            Considera todo o potencial dos cartões, inclusive a faixa hoje bloqueada.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5">
          <div className="mb-3 flex items-center gap-3">
            <LockOpen className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-[var(--app-text-muted)]">Limite desbloqueado</span>
          </div>
          <p className="break-words text-[clamp(1.05rem,3.9vw,1.6rem)] font-bold leading-[1.08] tracking-[-0.02em] text-[var(--app-text)]">
            {formatCurrency(totalUnlockedLimit)}
          </p>
          <p className="mt-2 text-sm text-[var(--app-text-faint)]">Faixa do limite que continua liberada para uso</p>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5">
          <div className="mb-3 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-[var(--app-danger-text)]" />
            <span className="text-sm text-[var(--app-text-muted)]">Limite usado</span>
          </div>
          <p className="break-words text-[clamp(1.05rem,3.9vw,1.6rem)] font-bold leading-[1.08] tracking-[-0.02em] text-[var(--app-text)]">
            {formatCurrency(totalUsedLimit)}
          </p>
          <p className="mt-2 text-sm text-[var(--app-text-faint)]">Parte do limite desbloqueado que já está ocupada no momento</p>
        </div>
      </div>

      <section className={`${sectionClass} overflow-hidden`}>
        <div className="border-b border-[var(--app-border)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--app-text)]">Compras lançadas no crédito</h3>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                Gastos diários e compromissos quitados no cartão, vinculados à fatura de {formatMonthLabel(selectedMonth)}.
              </p>
            </div>
            <span className={subtleBadgeClass}>{formatCurrency(selectedMonthCreditExpensesTotal)} no mês em foco</span>
          </div>
        </div>

        <div className="px-5 py-4">
          {selectedMonthCreditExpenseSummaries.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-6 text-center">
              <p className="text-sm font-medium text-[var(--app-text)]">Nenhum lançamento no cartão nesse mês</p>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                Ao marcar um gasto diário ou compromisso como cartão de crédito, ele aparece aqui separado do débito.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {selectedMonthCreditExpenseSummaries.map((summary) => (
                <div
                  key={summary.card.id}
                  className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--app-text)]">{summary.card.name}</p>
                      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                        {summary.count} lançamento(s) no app
                      </p>
                    </div>
                    <span className={subtleBadgeClass}>Fecha dia {summary.card.closingDay}</span>
                  </div>

                  <p className="mt-4 text-2xl font-bold leading-tight text-[var(--app-text)]">
                    {formatCurrency(summary.amount)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--app-text-faint)]">
                    Isso ajuda a enxergar quanto do seu dia a dia já foi empurrado para o crédito.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className={`${sectionClass} overflow-hidden`}>
          <div className="border-b border-[var(--app-border)] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--app-text)]">Seus cartões</h3>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  Limite liberado para uso hoje: {formatCurrency(totalFreeLimit)} de {formatCurrency(totalUnlockedLimit)}
                </p>
              </div>
              <span className={subtleBadgeClass}>Usado hoje: {formatCurrency(totalUsedLimit)}</span>
            </div>
          </div>

          <div className="divide-y divide-[var(--app-border)]">
            {cards.length === 0 && (
              <div className="px-5 py-12 text-center">
                <CreditCard className="mx-auto mb-3 h-10 w-10 text-[var(--app-text-faint)]" />
                <p className="text-base font-medium text-[var(--app-text)]">Nenhum cartão cadastrado</p>
                <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                  Comece cadastrando os cartões para enxergar o crédito separado do caixa.
                </p>
              </div>
            )}

            {cards.map((card) => {
              const unlockedLimit = Math.max(card.totalLimit - card.blockedLimit, 0);
              const effectiveUsedLimit = effectiveUsedLimitByCard.get(card.id) || 0;
              const availableLimit = unlockedLimit - effectiveUsedLimit;
              const utilization = unlockedLimit > 0 ? Math.min((effectiveUsedLimit / unlockedLimit) * 100, 100) : 0;

              return (
                <div key={card.id} className="px-5 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-[var(--app-text)]">{card.name}</h4>
                        {card.brand && <span className={subtleBadgeClass}>{card.brand}</span>}
                        {card.issuer && <span className={subtleBadgeClass}>{card.issuer}</span>}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-3">
                          <p className="text-xs text-[var(--app-text-faint)]">Limite total</p>
                          <p className="mt-1 font-semibold text-[var(--app-text)]">{formatCurrency(card.totalLimit)}</p>
                        </div>
                        <div className="rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-3">
                          <p className="text-xs text-[var(--app-text-faint)]">Limite desbloqueado</p>
                          <p className="mt-1 font-semibold text-[var(--app-text)]">{formatCurrency(unlockedLimit)}</p>
                        </div>
                        <div className="rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-3">
                          <p className="text-xs text-[var(--app-text-faint)]">Usado agora</p>
                          <p className="mt-1 font-semibold text-[var(--app-text)]">{formatCurrency(effectiveUsedLimit)}</p>
                        </div>
                        <div className="rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-3">
                          <p className="text-xs text-[var(--app-text-faint)]">Ainda liberado</p>
                          <p className={`mt-1 font-semibold ${availableLimit >= 0 ? 'text-[var(--app-text)]' : 'text-[var(--app-danger-text)]'}`}>
                            {formatCurrency(availableLimit)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-xs text-[var(--app-text-faint)]">
                          <span>Uso do limite desbloqueado</span>
                          <span>{utilization.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--app-surface-strong)]">
                          <div
                            className={`h-2 rounded-full ${availableLimit >= 0 ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-danger-text)]'}`}
                            style={{ width: `${Math.max(utilization, 4)}%` }}
                          />
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-[var(--app-text-faint)]">
                        Fecha no dia {card.closingDay} e vence no dia {card.dueDay}.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => openStatementModal(card.id)} className={secondaryButtonClass}>
                        Nova fatura
                      </button>
                      <button type="button" onClick={() => openEditCardModal(card)} className={secondaryButtonClass}>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteCard(card)}
                        className="rounded-2xl border border-[var(--app-danger-text)]/20 bg-[var(--app-danger-surface)] px-4 py-3 text-sm font-medium text-[var(--app-danger-text)] transition-colors hover:opacity-90"
                      >
                        Excluir
                      </button>
                    </div>
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
                <h3 className="text-lg font-semibold text-[var(--app-text)]">Faturas de {formatMonthLabel(selectedMonth)}</h3>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  Cada fatura aberta vira compromisso futuro até ser paga.
                </p>
              </div>
              <span className={subtleBadgeClass}>{selectedMonthStatements.length} fatura(s)</span>
            </div>
          </div>

          <div className="divide-y divide-[var(--app-border)]">
            {selectedMonthStatements.length === 0 && (
              <div className="px-5 py-12 text-center">
                <Receipt className="mx-auto mb-3 h-10 w-10 text-[var(--app-text-faint)]" />
                <p className="text-base font-medium text-[var(--app-text)]">Nenhuma fatura nesse mês</p>
                <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                  Cadastre as faturas para enxergar o impacto do crédito no caixa futuro.
                </p>
              </div>
            )}

            {selectedMonthStatements.map((summary) => (
              <div key={summary.statement.id} className="px-5 py-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-[var(--app-text)]">{summary.card?.name || 'Cartão removido'}</h4>
                        <span className={subtleBadgeClass}>{formatReferenceMonth(summary.statement.referenceMonth)}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            summary.status === 'paid'
                              ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : summary.status === 'overdue'
                                ? 'border border-[var(--app-danger-text)]/20 bg-[var(--app-danger-surface)] text-[var(--app-danger-text)]'
                                : 'border border-[rgba(133,55,253,0.22)] bg-[rgba(133,55,253,0.12)] text-[var(--app-accent)]'
                          }`}
                        >
                          {summary.status === 'paid' ? 'Quitada' : summary.status === 'overdue' ? 'Em atraso' : 'Aberta'}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-3">
                          <p className="text-xs text-[var(--app-text-faint)]">Valor total</p>
                          <p className="mt-1 font-semibold text-[var(--app-text)]">{formatCurrency(summary.statement.totalAmount)}</p>
                        </div>
                        <div className="rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-3">
                          <p className="text-xs text-[var(--app-text-faint)]">Pago</p>
                          <p className="mt-1 font-semibold text-[var(--app-text)]">{formatCurrency(summary.paidAmount)}</p>
                        </div>
                        <div className="rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-3">
                          <p className="text-xs text-[var(--app-text-faint)]">Restante</p>
                          <p className={`mt-1 font-semibold ${summary.remainingAmount > 0 ? 'text-[var(--app-text)]' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            {formatCurrency(summary.remainingAmount)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--app-text-faint)]">
                        <span className="inline-flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          Fecha em {formatDateLabel(summary.statement.closingDate)}
                        </span>
                        <span>•</span>
                        <span>Vence em {formatDateLabel(summary.statement.dueDate)}</span>
                        {summary.statement.commitmentTransactionId && (
                          <>
                            <span>•</span>
                            <span>Já entrou no calendário como compromisso</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {summary.remainingAmount > 0 && (
                        <button type="button" onClick={() => openPaymentModal(summary.statement.id)} className={primaryButtonClass}>
                          Registrar pagamento
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDeleteStatement(summary)}
                        className="rounded-2xl border border-[var(--app-danger-text)]/20 bg-[var(--app-danger-surface)] px-4 py-3 text-sm font-medium text-[var(--app-danger-text)] transition-colors hover:opacity-90"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  {summary.payments.length > 0 && (
                    <div className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
                      <p className="mb-3 text-sm font-medium text-[var(--app-text)]">Pagamentos registrados</p>
                      <div className="space-y-2">
                        {summary.payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex flex-col gap-2 rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-medium text-[var(--app-text)]">{formatCurrency(payment.amount)}</p>
                              <p className="text-sm text-[var(--app-text-faint)]">Pago em {formatDateLabel(payment.paidAt)}</p>
                              {payment.notes && (
                                <p className="mt-1 text-sm text-[var(--app-text-muted)]">{payment.notes}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleDeletePayment(summary, payment)}
                              className="self-start rounded-xl p-2 text-[var(--app-danger-text)] transition-colors hover:bg-[var(--app-danger-surface)] sm:self-center"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
        <DialogContent className="app-panel-strong max-w-2xl rounded-[2rem] p-0">
          <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold text-[var(--app-text)]">
                {editingCardId ? 'Editar cartão' : 'Novo cartão'}
              </DialogTitle>
              <DialogDescription className="mt-2 text-[var(--app-text-muted)]">
                O limite usado aqui é um snapshot manual. Você define quanto do total quer deixar desbloqueado para uso,
                enquanto as faturas e pagamentos cuidam da parte de caixa.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Nome do cartão</label>
                <input
                  type="text"
                  value={cardForm.name}
                  onChange={(event) => setCardForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ex.: Nubank Ultravioleta"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Emissor</label>
                <input
                  type="text"
                  value={cardForm.issuer}
                  onChange={(event) => setCardForm((current) => ({ ...current, issuer: event.target.value }))}
                  placeholder="Ex.: Nubank"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Bandeira</label>
                <input
                  type="text"
                  value={cardForm.brand}
                  onChange={(event) => setCardForm((current) => ({ ...current, brand: event.target.value }))}
                  placeholder="Ex.: Mastercard"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Limite total</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cardForm.totalLimit}
                  onChange={(event) => setCardForm((current) => ({ ...current, totalLimit: event.target.value }))}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Limite desbloqueado</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cardForm.unlockedLimit}
                  onChange={(event) => setCardForm((current) => ({ ...current, unlockedLimit: event.target.value }))}
                  className={fieldClass}
                />
                <p className="mt-2 text-xs text-[var(--app-text-faint)]">
                  Quanto desse cartão você quer manter liberado para uso no crédito.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Limite usado base</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cardForm.usedLimit}
                  onChange={(event) => setCardForm((current) => ({ ...current, usedLimit: event.target.value }))}
                  className={fieldClass}
                />
                <p className="mt-2 text-xs text-[var(--app-text-faint)]">
                  Use esse campo para o que ja estava usado no cartao fora dos lancamentos rastreados pelo app.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Dia de fechamento</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={cardForm.closingDay}
                  onChange={(event) => setCardForm((current) => ({ ...current, closingDay: event.target.value }))}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Dia de vencimento</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={cardForm.dueDay}
                  onChange={(event) => setCardForm((current) => ({ ...current, dueDay: event.target.value }))}
                  className={fieldClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Notas</label>
                <textarea
                  value={cardForm.notes}
                  onChange={(event) => setCardForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                  placeholder="Ex.: cartão que quero cortar primeiro"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setIsCardModalOpen(false)} className={secondaryButtonClass}>
                Cancelar
              </button>
              <button type="button" onClick={() => void handleSaveCard()} disabled={saving} className={primaryButtonClass}>
                {saving ? 'Salvando...' : editingCardId ? 'Salvar cartão' : 'Cadastrar cartão'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatementModalOpen} onOpenChange={setIsStatementModalOpen}>
        <DialogContent className="app-panel-strong max-w-2xl rounded-[2rem] p-0">
          <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold text-[var(--app-text)]">Nova fatura</DialogTitle>
              <DialogDescription className="mt-2 text-[var(--app-text-muted)]">
                Ao criar a fatura, o valor restante entra automaticamente no calendário como compromisso futuro.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Cartão</label>
                <select
                  value={statementForm.cardId}
                  onChange={(event) => setStatementForm((current) => ({ ...current, cardId: event.target.value }))}
                  className={fieldClass}
                >
                  <option value="">Selecione um cartão</option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Mês de referência</label>
                <input
                  type="month"
                  value={statementForm.referenceMonth}
                  onChange={(event) => setStatementForm((current) => ({ ...current, referenceMonth: event.target.value }))}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Valor total</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={statementForm.totalAmount}
                  onChange={(event) => setStatementForm((current) => ({ ...current, totalAmount: event.target.value }))}
                  className={fieldClass}
                />
                {suggestedStatementAmount > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--app-text-faint)]">
                    <span>
                      Compras lançadas no app para essa fatura: {formatCurrency(suggestedStatementAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStatementForm((current) => ({ ...current, totalAmount: suggestedStatementAmount.toFixed(2) }))}
                      className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-2.5 py-1 font-medium text-[var(--app-text)] transition-colors hover:border-[var(--app-border-strong)]"
                    >
                      Usar esse valor
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Data de fechamento</label>
                <input
                  type="date"
                  value={statementForm.closingDate}
                  onChange={(event) => setStatementForm((current) => ({ ...current, closingDate: event.target.value }))}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Data de vencimento</label>
                <input
                  type="date"
                  value={statementForm.dueDate}
                  onChange={(event) => setStatementForm((current) => ({ ...current, dueDate: event.target.value }))}
                  className={fieldClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Notas</label>
                <textarea
                  value={statementForm.notes}
                  onChange={(event) => setStatementForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                  placeholder="Ex.: mês em que já comecei a bloquear mais o uso"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setIsStatementModalOpen(false)} className={secondaryButtonClass}>
                Cancelar
              </button>
              <button type="button" onClick={() => void handleSaveStatement()} disabled={saving} className={primaryButtonClass}>
                {saving ? 'Salvando...' : 'Cadastrar fatura'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="app-panel-strong max-w-xl rounded-[2rem] p-0">
          <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold text-[var(--app-text)]">Registrar pagamento</DialogTitle>
              <DialogDescription className="mt-2 text-[var(--app-text-muted)]">
                Esse pagamento vira saída real de caixa hoje e reduz a fatura em aberto.
              </DialogDescription>
            </DialogHeader>

            {selectedPaymentStatement && (
              <div className="mt-5 rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                <p className="font-medium text-[var(--app-text)]">
                  {selectedPaymentStatement.card?.name || 'Cartão'} • {formatReferenceMonth(selectedPaymentStatement.statement.referenceMonth)}
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  Restante para pagar: {formatCurrency(selectedPaymentStatement.remainingAmount)}
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Valor</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Data do pagamento</label>
                <input
                  type="date"
                  value={paymentForm.paidAt}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, paidAt: event.target.value }))}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text)]">Notas</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                  placeholder="Ex.: pagamento parcial para aliviar a virada do mês"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className={secondaryButtonClass}>
                Cancelar
              </button>
              <button type="button" onClick={() => void handleSavePayment()} disabled={saving} className={primaryButtonClass}>
                {saving ? 'Salvando...' : 'Registrar pagamento'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
