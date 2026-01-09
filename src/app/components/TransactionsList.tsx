import { useState } from 'react';
import { Plus, Filter, Search, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { mockTransactions, Transaction } from '../data/mockData';

export function TransactionsList() {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'investment'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredTransactions = mockTransactions
    .filter(t => {
      if (filter === 'all') return true;
      if (filter === 'income') return t.type === 'income';
      if (filter === 'expense') return t.type === 'expense_variable' || t.type === 'expense_fixed' || t.type === 'installment';
      if (filter === 'investment') return t.type === 'investment';
      return true;
    })
    .filter(t => 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'income': return <TrendingUp className="w-5 h-5 text-[#CEF05D]" />;
      case 'investment': return <DollarSign className="w-5 h-5 text-[#B4B0EE]" />;
      default: return <TrendingDown className="w-5 h-5 text-red-600" />;
    }
  };

  const getTransactionColor = (type: Transaction['type']) => {
    switch (type) {
      case 'income': return 'bg-[#CEF05D]/10 border-[#CEF05D]/30';
      case 'investment': return 'bg-[#B4B0EE]/10 border-[#B4B0EE]/30';
      default: return 'bg-red-50 border-red-200';
    }
  };

  const getTypeLabel = (type: Transaction['type']) => {
    const labels = {
      income: 'Entrada',
      expense_variable: 'Gasto Variável',
      expense_fixed: 'Gasto Fixo',
      installment: 'Parcela',
      investment: 'Investimento'
    };
    return labels[type];
  };

  // Estatísticas rápidas
  const totalIncome = mockTransactions
    .filter(t => t.type === 'income' && t.paid)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = mockTransactions
    .filter(t => t.type !== 'income' && t.paid)
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Transações</h2>
          <p className="text-sm text-gray-500 mt-1">Histórico completo de movimentações</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-[#B4B0EE] hover:bg-[#B4B0EE] text-white rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          Nova Transação
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#CEF05D]/10 rounded-xl border border-[#CEF05D]/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-[#CEF05D]" />
            <span className="text-sm text-green-700">Total de Entradas</span>
          </div>
          <p className="text-3xl font-bold text-[#CEF05D]">R$ {totalIncome.toFixed(2)}</p>
        </div>
        
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-700">Total de Saídas</span>
          </div>
          <p className="text-3xl font-bold text-red-600">R$ {totalExpenses.toFixed(2)}</p>
        </div>
        
        <div className="bg-[#B4B0EE]/10 rounded-xl border border-[#B4B0EE]/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-[#B4B0EE]" />
            <span className="text-sm text-[#B4B0EE]">Saldo Líquido</span>
          </div>
          <p className={`text-3xl font-bold ${
            totalIncome - totalExpenses >= 0 ? 'text-[#CEF05D]' : 'text-red-600'
          }`}>
            R$ {(totalIncome - totalExpenses).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar transações..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B4B0EE]/100"
            />
          </div>
          
          {/* Filtros */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#B4B0EE] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('income')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'income'
                  ? 'bg-[#CEF05D] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFilter('expense')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'expense'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Saídas
            </button>
            <button
              onClick={() => setFilter('investment')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'investment'
                  ? 'bg-[#B4B0EE] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Investimentos
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Ícone */}
                  <div className={`w-12 h-12 rounded-lg border flex items-center justify-center ${
                    getTransactionColor(transaction.type)
                  }`}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  
                  {/* Detalhes */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-medium text-gray-900">
                        {transaction.description}
                      </h4>
                      <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                        {getTypeLabel(transaction.type)}
                      </span>
                      {transaction.installmentNumber && (
                        <span className="inline-block px-2 py-1 bg-[#9D4EDD]/20 rounded text-xs font-medium text-[#9D4EDD]">
                          {transaction.installmentNumber}/{transaction.totalInstallments}
                        </span>
                      )}
                      {!transaction.paid && (
                        <span className="inline-block px-2 py-1 bg-[#9D4EDD]/20 rounded text-xs font-medium text-[#9D4EDD]">
                          Pendente
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(transaction.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                      <span>•</span>
                      <span>{transaction.category}</span>
                    </div>
                  </div>
                </div>
                
                {/* Valor */}
                <div className="text-right">
                  <p className={`text-xl font-bold ${
                    transaction.type === 'income'
                      ? 'text-[#CEF05D]'
                      : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}R$ {transaction.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {filteredTransactions.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">Nenhuma transação encontrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Paginação */}
      {filteredTransactions.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Anterior
          </button>
          <button className="px-4 py-2 bg-[#B4B0EE] text-white rounded-lg text-sm font-medium">
            1
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            2
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            3
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Próximo
          </button>
        </div>
      )}
    </div>
  );
}
