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
  type: 'save' | 'invest';
}

// Estimativas mensais
export const mockEstimates: Estimate[] = [
  { id: '1', category: 'Mercado', monthlyAmount: 800, active: true, icon: '🛒', color: '#CEF05D' },
  { id: '2', category: 'Transporte', monthlyAmount: 300, active: true, icon: '🚗', color: '#B4B0EE' },
  { id: '3', category: 'Farmácia', monthlyAmount: 150, active: true, icon: '💊', color: '#9D4EDD' },
  { id: '4', category: 'Lanches/Saídas', monthlyAmount: 450, active: true, icon: '🍕', color: '#CEF05D' },
  { id: '5', category: 'Vestuário', monthlyAmount: 200, active: true, icon: '👕', color: '#B4B0EE' },
  { id: '6', category: 'Lazer', monthlyAmount: 300, active: true, icon: '🎬', color: '#9D4EDD' },
];

// Transações do mês atual
export const mockTransactions: Transaction[] = [
  // Entrada (salário)
  {
    id: 't1',
    date: '2026-01-05',
    type: 'income',
    category: 'Salário',
    description: 'Salário Janeiro',
    amount: 2700,
    recurring: true,
    paid: true
  },

  // Gastos fixos
  {
    id: 't2',
    date: '2026-01-10',
    type: 'expense_fixed',
    category: 'Moradia',
    description: 'Aluguel',
    amount: 900,
    recurring: true,
    paid: true
  },
  {
    id: 't3',
    date: '2026-01-15',
    type: 'expense_fixed',
    category: 'Contas',
    description: 'Internet',
    amount: 100,
    recurring: true,
    paid: true
  },
  {
    id: 't4',
    date: '2026-01-20',
    type: 'expense_fixed',
    category: 'Contas',
    description: 'Energia',
    amount: 150,
    recurring: true,
    paid: false
  },

  // Parcelas
  {
    id: 't5',
    date: '2026-01-25',
    type: 'installment',
    category: 'Eletrônicos',
    description: 'Notebook',
    amount: 200,
    installmentGroup: 'notebook-2025',
    installmentNumber: 3,
    totalInstallments: 12,
    paid: false
  },

  // Gastos variáveis (dia a dia)
  { id: 't6', date: '2026-01-01', type: 'expense_variable', category: 'Mercado', description: 'Supermercado', amount: 85, paid: true },
  { id: 't7', date: '2026-01-01', type: 'expense_variable', category: 'Transporte', description: 'Uber', amount: 25, paid: true },
  { id: 't8', date: '2026-01-02', type: 'expense_variable', category: 'Lanches/Saídas', description: 'Almoço fora', amount: 45, paid: true },
  { id: 't9', date: '2026-01-03', type: 'expense_variable', category: 'Mercado', description: 'Padaria', amount: 30, paid: true },
  { id: 't10', date: '2026-01-04', type: 'expense_variable', category: 'Transporte', description: 'Combustível', amount: 120, paid: true },
  { id: 't11', date: '2026-01-04', type: 'expense_variable', category: 'Lanches/Saídas', description: 'Café', amount: 15, paid: true },
  { id: 't12', date: '2026-01-05', type: 'expense_variable', category: 'Mercado', description: 'Feira', amount: 60, paid: true },
  { id: 't13', date: '2026-01-06', type: 'expense_variable', category: 'Farmácia', description: 'Remédios', amount: 80, paid: true },
  { id: 't14', date: '2026-01-07', type: 'expense_variable', category: 'Lanches/Saídas', description: 'Restaurante', amount: 95, paid: true },
  { id: 't15', date: '2026-01-08', type: 'expense_variable', category: 'Transporte', description: 'Metrô', amount: 12, paid: true },

  // Investimento
  {
    id: 't16',
    date: '2026-01-06',
    type: 'investment',
    category: 'Tesouro Direto',
    description: 'Aplicação Tesouro Selic',
    amount: 500,
    paid: true
  },
];

// Investimentos
export const mockInvestments: Investment[] = [
  { id: 'i1', category: 'Tesouro Direto', amount: 5200, lastUpdate: '2026-01-06' },
  { id: 'i2', category: 'CDB', amount: 3500, lastUpdate: '2025-12-15' },
  { id: 'i3', category: 'Ações', amount: 2800, lastUpdate: '2026-01-05' },
  { id: 'i4', category: 'Fundos Imobiliários', amount: 1500, lastUpdate: '2025-12-20' },
];

// Metas
export const mockGoals: Goal[] = [
  {
    id: 'g1',
    name: 'Reserva de Emergência',
    targetAmount: 18000,
    currentAmount: 11500,
    deadline: '2026-12-31',
    type: 'save'
  },
  {
    id: 'g2',
    name: 'Viagem Férias',
    targetAmount: 5000,
    currentAmount: 2800,
    deadline: '2026-06-30',
    type: 'save'
  },
  {
    id: 'g3',
    name: 'Investir 20% da Renda',
    targetAmount: 1000,
    currentAmount: 500,
    deadline: '2026-01-31',
    type: 'invest'
  },
];

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

// Configurações iniciais
export const mockConfig = {
  initialBalance: 200, // Saldo inicial do mês
  monthStartDay: 1,
  mainIncomeDay: 5, // Dia que recebe salário
  mainIncomeAmount: 5000,
};
