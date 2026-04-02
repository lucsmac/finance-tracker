import { useState } from 'react';
import { TrendingUp, Plus, ArrowUpRight, ArrowDownRight, DollarSign, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useInvestments } from '@/lib/hooks/useInvestments';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

export function InvestmentsView() {
  const { user } = useAuth();
  const { investments, loading: loadingInvestments, deleteInvestment, refresh: refreshInvestments } = useInvestments(user?.id);
  const { transactions, loading: loadingTransactions, createTransaction, deleteTransaction, refresh: refreshTransactions } = useTransactions(user?.id);
  const [saving, setSaving] = useState(false);

  // Estados do modal de confirmação de delete para investimentos
  const [isDeleteInvestmentModalOpen, setIsDeleteInvestmentModalOpen] = useState(false);
  const [deletingInvestmentId, setDeletingInvestmentId] = useState<string>('');
  const [deletingInvestmentCategory, setDeletingInvestmentCategory] = useState<string>('');

  // Estados do modal de confirmação de delete para transações
  const [isDeleteTransactionModalOpen, setIsDeleteTransactionModalOpen] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string>('');
  const [deletingTransactionDescription, setDeletingTransactionDescription] = useState<string>('');

  const loading = loadingInvestments || loadingTransactions;
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);

  // Histórico de movimentações de investimento
  const investmentTransactions = transactions
    .filter(t => t.type === 'investment')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalApplied = investmentTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Funções para deletar investimento
  const handleOpenDeleteInvestmentModal = (id: string, category: string) => {
    setDeletingInvestmentId(id);
    setDeletingInvestmentCategory(category);
    setIsDeleteInvestmentModalOpen(true);
  };

  const handleDeleteInvestment = async () => {
    if (!deletingInvestmentId) return;

    try {
      setSaving(true);
      await deleteInvestment(deletingInvestmentId);
      await refreshInvestments();
      setIsDeleteInvestmentModalOpen(false);
      setDeletingInvestmentId('');
      setDeletingInvestmentCategory('');
    } catch (err) {
      console.error('Error deleting investment:', err);
      alert('Erro ao deletar investimento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Funções para deletar transação
  const handleOpenDeleteTransactionModal = (id: string, description: string) => {
    setDeletingTransactionId(id);
    setDeletingTransactionDescription(description);
    setIsDeleteTransactionModalOpen(true);
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransactionId) return;

    try {
      setSaving(true);
      await deleteTransaction(deletingTransactionId);
      await refreshTransactions();
      await refreshInvestments(); // Refresh investments também pois a transação pode afetar o total
      setIsDeleteTransactionModalOpen(false);
      setDeletingTransactionId('');
      setDeletingTransactionDescription('');
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Erro ao deletar transação. Tente novamente.');
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
          <button className="flex items-center gap-2 rounded-lg border border-[rgba(133,55,253,0.28)] bg-[var(--app-accent)] px-4 py-2 text-white transition-opacity hover:opacity-90">
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
        <div className="rounded-xl border border-[rgba(133,55,253,0.18)] bg-[rgba(24,24,24,0.92)] p-6 text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-[var(--app-accent)]" />
            <span className="text-sm text-white/78">Patrimônio Total</span>
          </div>
          <p className="text-4xl font-bold">R$ {totalInvested.toFixed(2)}</p>
          <p className="mt-2 text-sm text-white/60">Valor atualizado</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUpRight className="w-5 h-5 text-[var(--app-success)]" />
            <span className="text-sm text-gray-600">Total Aplicado</span>
          </div>
          <p className="text-4xl font-bold text-gray-900">R$ {totalApplied.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-2">Este mês</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-[var(--app-info)]" />
            <span className="text-sm text-gray-600">Rentabilidade</span>
          </div>
          <p className="text-4xl font-bold text-[var(--app-success)]">+4.2%</p>
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
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-gray-900">
                      {investment.category}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Atualizado em {new Date(investment.lastUpdate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        R$ {investment.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {percentage.toFixed(1)}% da carteira
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenDeleteInvestmentModal(investment.id, investment.category)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Deletar investimento"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Barra de progresso */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-[var(--app-accent)] transition-all"
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
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[rgba(133,55,253,0.28)] bg-[rgba(133,55,253,0.12)]">
                    <ArrowUpRight className="h-6 w-6 text-[var(--app-accent)]" />
                  </div>

                  <div className="flex-1">
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

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-[var(--app-accent)]">
                      R$ {transaction.amount.toFixed(2)}
                    </p>
                    <span className="mt-1 inline-block rounded border border-[rgba(133,55,253,0.2)] bg-[rgba(133,55,253,0.12)] px-2 py-1 text-xs font-medium text-[var(--app-accent)]">
                      Aplicação
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenDeleteTransactionModal(transaction.id, transaction.description)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Deletar transação"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
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
      <div className="rounded-lg border border-[rgba(133,55,253,0.18)] bg-[rgba(133,55,253,0.08)] p-4">
        <h4 className="mb-2 text-sm font-semibold text-slate-900">💡 Sobre Investimentos</h4>
        <ul className="space-y-1 text-sm text-slate-700">
          <li>• <strong>Aplicar:</strong> Sai do saldo disponível e entra no patrimônio investido</li>
          <li>• <strong>Resgatar:</strong> Volta para o saldo disponível</li>
          <li>• Investimentos não afetam o Valor Diário Padrão</li>
          <li>• Configure metas de investimento mensal na aba "Metas"</li>
        </ul>
      </div>

      {/* Modal de Confirmação de Delete de Investimento */}
      <Dialog open={isDeleteInvestmentModalOpen} onOpenChange={setIsDeleteInvestmentModalOpen}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              Deletar Investimento
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-4">
              Tem certeza que deseja deletar este investimento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Categoria:</p>
            <p className="text-gray-900 font-medium">{deletingInvestmentCategory}</p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsDeleteInvestmentModalOpen(false)}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteInvestment}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Deletando...' : 'Deletar Investimento'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Delete de Transação */}
      <Dialog open={isDeleteTransactionModalOpen} onOpenChange={setIsDeleteTransactionModalOpen}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              Deletar Transação
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-4">
              Tem certeza que deseja deletar esta transação? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Transação:</p>
            <p className="text-gray-900 font-medium">{deletingTransactionDescription}</p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsDeleteTransactionModalOpen(false)}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteTransaction}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Deletando...' : 'Deletar Transação'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
