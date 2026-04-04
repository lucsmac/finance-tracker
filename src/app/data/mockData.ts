export interface Estimate {
  id: string;
  category: string;
  monthlyAmount: number;
  active: boolean;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense_variable' | 'expense_fixed' | 'investment' | 'investment_redemption' | 'installment';
  category: string;
  description: string;
  amount: number;
  investmentId?: string;
  installmentGroup?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  recurring?: boolean;
  paid?: boolean;
}

export interface Investment {
  id: string;
  category: string;
  amount: number;
  lastUpdate: string;
  countsAsReserve?: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  type: 'save' | 'invest' | 'savings' | 'max_spending' | 'savings_rate' | 'category_reduction';
  period?: 'month' | 'year';
  category?: string;
}

// Função auxiliar para calcular valor diário padrão
export const calculateDailyStandard = (estimates: Estimate[]): number => {
  const total = estimates
    .filter(e => e.active)
    .reduce((sum, e) => sum + e.monthlyAmount, 0);
  return total / 30;
};

export const isCashInflowTransactionType = (type: Transaction['type']) =>
  type === 'income' || type === 'investment_redemption';

export const isCashOutflowTransactionType = (type: Transaction['type']) =>
  type === 'expense_variable' || type === 'expense_fixed' || type === 'installment' || type === 'investment';

export const isExpenseAnalysisTransactionType = (type: Transaction['type']) =>
  type === 'expense_variable' || type === 'expense_fixed' || type === 'installment';

export const isInvestmentContributionTransactionType = (type: Transaction['type']) =>
  type === 'investment';

export const isInvestmentRedemptionTransactionType = (type: Transaction['type']) =>
  type === 'investment_redemption';

export const isInvestmentMovementTransactionType = (type: Transaction['type']) =>
  type === 'investment' || type === 'investment_redemption';

// Função para calcular saldo atual
export const calculateCurrentBalance = (
  initialBalance: number,
  transactions: Transaction[],
  balanceStartDate?: string,
  today?: string
): number => {
  let balance = initialBalance;

  const todayStr = today || new Date().toISOString().split('T')[0];

  const sortedTransactions = [...transactions]
    .filter(t => {
      if (!t.paid) return false;
      if (t.date > todayStr) return false;
      if (balanceStartDate && t.date < balanceStartDate) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  sortedTransactions.forEach(t => {
    if (isCashInflowTransactionType(t.type)) {
      balance += t.amount;
    } else if (isCashOutflowTransactionType(t.type)) {
      balance -= t.amount;
    }
  });

  return balance;
};

// Função para obter gastos variáveis de um dia específico
export const getVariableExpensesForDate = (
  date: string,
  transactions: Transaction[]
): number => {
  return transactions
    .filter(t =>
      t.type === 'expense_variable' &&
      t.date === date &&
      t.paid
    )
    .reduce((sum, t) => sum + t.amount, 0);
};

// Função para calcular variação acumulada do mês
export const calculateAccumulatedVariation = (
  dailyStandard: number,
  transactions: Transaction[],
  currentDate: string
): number => {
  let accumulated = 0;
  const sortedTransactions = transactions
    .filter(t => t.type === 'expense_variable' && t.paid && t.date <= currentDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Agrupar por dia
  const dayTotals = new Map<string, number>();
  sortedTransactions.forEach(t => {
    const current = dayTotals.get(t.date) || 0;
    dayTotals.set(t.date, current + t.amount);
  });

  // Calcular variação de cada dia
  dayTotals.forEach(dayTotal => {
    accumulated += (dailyStandard - dayTotal);
  });

  return accumulated;
};

// Função para calcular dias até próxima renda
export const calculateDaysUntilNextIncome = (
  currentDate: string,
  transactions: Transaction[]
): { days: number; date: string } => {
  // Encontrar próxima transação de income recorrente
  const nextIncome = transactions.find(t =>
    t.type === 'income' &&
    t.recurring &&
    t.date > currentDate
  );

  if (!nextIncome) return { days: 0, date: '' };

  const current = new Date(currentDate);
  const next = new Date(nextIncome.date);
  const diffTime = Math.abs(next.getTime() - current.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return { days: diffDays, date: nextIncome.date };
};

// Função para calcular valor comprometido (fixos + parcelas futuras)
export const calculateCommittedAmount = (
  transactions: Transaction[],
  currentDate: string
): number => {
  return transactions
    .filter(t =>
      !t.paid &&
      t.date >= currentDate &&
      (t.type === 'expense_fixed' || t.type === 'installment')
    )
    .reduce((sum, t) => sum + t.amount, 0);
};

// Função para verificar status da projeção
export const checkProjectionStatus = (
  currentBalance: number,
  committedAmount: number,
  dailyStandard: number,
  daysUntilIncome: number
): 'positive' | 'negative' => {
  const projectedBalance = currentBalance - committedAmount - (dailyStandard * daysUntilIncome);
  return projectedBalance >= 0 ? 'positive' : 'negative';
};

// TEMPORARY MOCK DATA - for components not yet migrated to Supabase
// TODO: Remove these when ProjectionView, StatsView, and MonthCalendar are migrated

export const mockConfig = {
  initialBalance: 2000,
  monthStartDay: 1,
  mainIncomeDay: 5,
  mainIncomeAmount: 5000
};

export const mockEstimates: Estimate[] = [
  { id: '1', category: 'Mercado', monthlyAmount: 800, active: true, icon: '🛒', color: '#AFFD37' },
  { id: '2', category: 'Transporte', monthlyAmount: 300, active: true, icon: '🚗', color: '#8537FD' },
  { id: '3', category: 'Farmácia', monthlyAmount: 150, active: true, icon: '💊', color: '#E837FD' },
  { id: '4', category: 'Alimentação/Saídas', monthlyAmount: 450, active: true, icon: '🍔', color: '#FDE837' }
];

export const mockTransactions: Transaction[] = [
  // Income
  { id: 't1', date: '2026-01-05', type: 'income', category: 'Salário', description: 'Salário Janeiro', amount: 5000, recurring: true, paid: true },

  // Variable expenses
  { id: 't2', date: '2026-01-06', type: 'expense_variable', category: 'Mercado', description: 'Compras da semana', amount: 180, paid: true },
  { id: 't3', date: '2026-01-07', type: 'expense_variable', category: 'Transporte', description: 'Uber', amount: 35, paid: true },
  { id: 't4', date: '2026-01-08', type: 'expense_variable', category: 'Alimentação/Saídas', description: 'Almoço', amount: 45, paid: true },

  // Fixed expenses
  { id: 't5', date: '2026-01-10', type: 'expense_fixed', category: 'Aluguel', description: 'Aluguel Janeiro', amount: 1500, recurring: true, paid: false },
  { id: 't6', date: '2026-01-15', type: 'expense_fixed', category: 'Internet', description: 'Internet Janeiro', amount: 100, recurring: true, paid: false },

  // Installments
  { id: 't7', date: '2026-01-20', type: 'installment', category: 'Notebook', description: 'Notebook Dell', amount: 400, installmentGroup: 'notebook-2025', installmentNumber: 3, totalInstallments: 12, paid: false },

  // Future income
  { id: 't8', date: '2026-02-05', type: 'income', category: 'Salário', description: 'Salário Fevereiro', amount: 5000, recurring: true, paid: false }
];
