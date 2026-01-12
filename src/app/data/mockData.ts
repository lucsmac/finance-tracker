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
  type: 'income' | 'expense_variable' | 'expense_fixed' | 'investment' | 'installment';
  category: string;
  description: string;
  amount: number;
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

// Função para calcular saldo atual
export const calculateCurrentBalance = (
  initialBalance: number,
  transactions: Transaction[]
): number => {
  let balance = initialBalance;

  const sortedTransactions = [...transactions]
    .filter(t => t.paid && new Date(t.date) <= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedTransactions.forEach(t => {
    if (t.type === 'income') {
      balance += t.amount;
    } else {
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

