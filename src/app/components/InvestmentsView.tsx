import { useState } from 'react';
import { TrendingUp, Plus, ArrowUpRight, ArrowDownRight, DollarSign, X } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useInvestments } from '@/lib/hooks/useInvestments';
import { useTransactions } from '@/lib/hooks/useTransactions';

export function InvestmentsView() {
  const { user } = useAuth();
  const { investments, loading: loadingInvestments } = useInvestments(user?.id);
  const { transactions, loading: loadingTransactions, createTransaction } = useTransactions(user?.id);
  const [saving, setSaving] = useState(false);

  const loading = loadingInvestments || loadingTransactions;
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);

  // Histórico de movimentações de investimento
  const investmentTransactions = transactions
    .filter(t => t.type === 'investment')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalApplied = investmentTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#B4B0EE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando investimentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Investimentos</h2>
          <p className="text-sm text-gray-500 mt-1">Acompanhe seu patrimônio investido</p>
        </div>
        
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#B4B0EE] hover:bg-[#B4B0EE] text-white rounded-lg transition-colors">
            <Plus className="w-5 h-5" />
            Aplicar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg transition-colors">
            <ArrowDownRight className="w-5 h-5" />
            Resgatar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#B4B0EE] to-[#B4B0EE] rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 opacity-90" />
            <span className="text-sm opacity-90">Patrimônio Total</span>
          </div>
          <p className="text-4xl font-bold">R$ {totalInvested.toFixed(2)}</p>
          <p className="text-sm opacity-75 mt-2">Valor atualizado</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUpRight className="w-5 h-5 text-[#CEF05D]" />
            <span className="text-sm text-gray-600">Total Aplicado</span>
          </div>
          <p className="text-4xl font-bold text-gray-900">R$ {totalApplied.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-2">Este mês</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-[#B4B0EE]" />
            <span className="text-sm text-gray-600">Rentabilidade</span>
          </div>
          <p className="text-4xl font-bold text-[#CEF05D]">+4.2%</p>
          <p className="text-sm text-gray-500 mt-2">Últimos 12 meses</p>
        </div>
      </div>

      {/* Carteira de Investimentos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Carteira de Investimentos</h3>
          <p className="text-sm text-gray-600 mt-1">Distribuição por categoria</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {investments.map((investment) => {
            const percentage = (investment.amount / totalInvested) * 100;
            
            return (
              <div key={investment.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-base font-medium text-gray-900">
                      {investment.category}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Atualizado em {new Date(investment.lastUpdate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      R$ {investment.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {percentage.toFixed(1)}% da carteira
                    </p>
                  </div>
                </div>
                
                {/* Barra de progresso */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#B4B0EE] h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico de Movimentações */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Histórico de Movimentações</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {investmentTransactions.map((transaction) => (
            <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#B4B0EE]/10 border border-[#B4B0EE]/30 rounded-lg flex items-center justify-center">
                    <ArrowUpRight className="w-6 h-6 text-[#B4B0EE]" />
                  </div>
                  
                  <div>
                    <h4 className="text-base font-medium text-gray-900">
                      {transaction.description}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(transaction.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })} • {transaction.category}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-xl font-bold text-[#B4B0EE]">
                    R$ {transaction.amount.toFixed(2)}
                  </p>
                  <span className="inline-block mt-1 px-2 py-1 bg-[#B4B0EE]/20 text-[#B4B0EE] rounded text-xs font-medium">
                    Aplicação
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {investmentTransactions.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">Nenhuma movimentação registrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Dicas */}
      <div className="bg-[#B4B0EE]/10 rounded-lg border border-[#B4B0EE]/30 p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Sobre Investimentos</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Aplicar:</strong> Sai do saldo disponível e entra no patrimônio investido</li>
          <li>• <strong>Resgatar:</strong> Volta para o saldo disponível</li>
          <li>• Investimentos não afetam o Valor Diário Padrão</li>
          <li>• Configure metas de investimento mensal na aba "Metas"</li>
        </ul>
      </div>
    </div>
  );
}
