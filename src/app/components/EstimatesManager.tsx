import { useState } from 'react';
import { Edit2, Check, X, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { calculateDailyStandard, Estimate } from '../data/mockData';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEstimates } from '@/lib/hooks/useEstimates';

export function EstimatesManager() {
  const { user } = useAuth();
  const { estimates, loading, error, updateEstimate } = useEstimates(user?.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const dailyStandard = calculateDailyStandard(estimates);
  const totalMonthly = estimates
    .filter(e => e.active)
    .reduce((sum, e) => sum + e.monthlyAmount, 0);

  const handleEdit = (estimate: Estimate) => {
    setEditingId(estimate.id);
    setEditValue(estimate.monthlyAmount.toString());
  };

  const handleSave = async (id: string) => {
    try {
      setSaving(true);
      await updateEstimate(id, { monthlyAmount: parseFloat(editValue) || 0 });
      setEditingId(null);
      setEditValue('');
    } catch (err) {
      console.error('Error saving estimate:', err);
      alert('Erro ao salvar estimativa. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleToggle = async (id: string) => {
    const estimate = estimates.find(e => e.id === id);
    if (!estimate) return;

    try {
      await updateEstimate(id, { active: !estimate.active });
    } catch (err) {
      console.error('Error toggling estimate:', err);
      alert('Erro ao atualizar estimativa. Tente novamente.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#B4B0EE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando estimativas...</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar estimativas</h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#B4B0EE] text-white rounded-lg hover:bg-[#9D8FCC] transition-colors"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Estimativas Mensais</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure quanto espera gastar por mês em cada categoria variável
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#B4B0EE] to-[#B4B0EE] rounded-xl p-6 text-white">
          <p className="text-sm opacity-90 mb-2">Valor Diário Padrão</p>
          <p className="text-4xl font-bold">R$ {dailyStandard.toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">Calculado automaticamente</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Total Mensal</p>
          <p className="text-4xl font-bold text-gray-900">R$ {totalMonthly.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-2">Soma das categorias ativas</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Categorias Ativas</p>
          <p className="text-4xl font-bold text-gray-900">
            {estimates.filter(e => e.active).length}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            de {estimates.length} categorias
          </p>
        </div>
      </div>

      {/* Alerta de recálculo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>Importante:</strong> Ao alterar qualquer estimativa, o Valor Diário Padrão será recalculado automaticamente e aplicado a partir de hoje.
        </p>
      </div>

      {/* Lista de Estimativas */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Categorias de Gastos Variáveis</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {estimates.map((estimate) => {
            const isEditing = editingId === estimate.id;
            
            return (
              <div
                key={estimate.id}
                className={`px-6 py-4 flex items-center justify-between transition-colors ${
                  !estimate.active ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Ícone */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: estimate.color + '20' }}
                  >
                    {estimate.icon}
                  </div>
                  
                  {/* Nome da categoria */}
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-gray-900">{estimate.category}</h4>
                    <p className="text-sm text-gray-500">
                      Diário: R$ {(estimate.monthlyAmount / 30).toFixed(2)}
                    </p>
                  </div>
                  
                  {/* Valor mensal */}
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">R$</span>
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSave(estimate.id)}
                          disabled={saving}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? (
                            <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Check className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">
                            R$ {estimate.monthlyAmount.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">por mês</p>
                        </div>
                        <button
                          onClick={() => handleEdit(estimate)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          disabled={!estimate.active}
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Toggle ativo/inativo */}
                  <button
                    onClick={() => handleToggle(estimate.id)}
                    className="ml-4"
                  >
                    {estimate.active ? (
                      <ToggleRight className="w-10 h-10 text-[#B4B0EE]" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Adicionar nova categoria */}
      <button className="w-full bg-white hover:bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 flex items-center justify-center gap-2 text-gray-600 transition-colors">
        <Plus className="w-5 h-5" />
        <span className="font-medium">Adicionar Nova Categoria</span>
      </button>

      {/* Cálculo detalhado */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Como é Calculado</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">1. Soma das categorias ativas:</span>
            <span className="font-semibold text-gray-900">R$ {totalMonthly.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">2. Dividir por 30 dias:</span>
            <span className="font-semibold text-gray-900">
              R$ {totalMonthly.toFixed(2)} ÷ 30
            </span>
          </div>
          
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-gray-900 font-medium">Valor Diário Padrão:</span>
              <span className="text-2xl font-bold text-[#B4B0EE]">
                R$ {dailyStandard.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            Este valor é fixo e não muda com seus gastos reais. Ele serve como referência diária para comparar se você está economizando ou gastando mais que o planejado.
          </p>
        </div>
      </div>
    </div>
  );
}
