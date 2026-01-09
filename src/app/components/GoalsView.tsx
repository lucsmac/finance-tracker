import { Target, Plus, TrendingUp, Calendar } from 'lucide-react';
import { mockGoals } from '../data/mockData';

export function GoalsView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Metas</h2>
          <p className="text-sm text-gray-500 mt-1">Acompanhe seus objetivos financeiros</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-[#B4B0EE] hover:bg-[#B4B0EE] text-white rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          Nova Meta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Metas Ativas</p>
          <p className="text-3xl font-bold text-gray-900">{mockGoals.length}</p>
          <p className="text-xs text-gray-500 mt-1">Em andamento</p>
        </div>
        
        <div className="bg-[#CEF05D]/10 rounded-xl border border-[#CEF05D]/30 p-6">
          <p className="text-sm text-[#CEF05D] mb-2">Meta Mais Próxima</p>
          <p className="text-3xl font-bold text-[#CEF05D]">64%</p>
          <p className="text-xs text-[#CEF05D] mt-1">Investir 20% da Renda</p>
        </div>
        
        <div className="bg-[#B4B0EE]/10 rounded-xl border border-[#B4B0EE]/30 p-6">
          <p className="text-sm text-[#B4B0EE] mb-2">Total em Metas</p>
          <p className="text-3xl font-bold text-[#B4B0EE]">
            R$ {mockGoals.reduce((sum, g) => sum + g.currentAmount, 0).toFixed(2)}
          </p>
          <p className="text-xs text-[#B4B0EE] mt-1">Acumulado até agora</p>
        </div>
      </div>

      {/* Lista de Metas */}
      <div className="space-y-4">
        {mockGoals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          const remaining = goal.targetAmount - goal.currentAmount;
          const deadline = new Date(goal.deadline);
          const daysRemaining = Math.ceil((deadline.getTime() - new Date('2026-01-08').getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <div key={goal.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    goal.type === 'save' 
                      ? 'bg-[#CEF05D]/10 border border-[#CEF05D]/30' 
                      : 'bg-[#B4B0EE]/10 border border-[#B4B0EE]/30'
                  }`}>
                    <Target className={`w-6 h-6 ${
                      goal.type === 'save' ? 'text-[#CEF05D]' : 'text-[#B4B0EE]'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        goal.type === 'save'
                          ? 'bg-[#CEF05D]/20 text-[#CEF05D]'
                          : 'bg-[#B4B0EE]/20 text-[#B4B0EE]'
                      }`}>
                        {goal.type === 'save' ? 'Economia' : 'Investimento'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {deadline.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <span>•</span>
                      <span>{daysRemaining} dias restantes</span>
                    </div>
                  </div>
                </div>
                
                <button className="text-sm text-[#B4B0EE] hover:text-[#B4B0EE] font-medium">
                  Editar
                </button>
              </div>
              
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progresso</span>
                  <span className="font-semibold text-gray-900">{progress.toFixed(1)}%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      goal.type === 'save' ? 'bg-[#CEF05D]' : 'bg-[#B4B0EE]'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Atual</p>
                    <p className="text-lg font-bold text-gray-900">
                      R$ {goal.currentAmount.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Falta</p>
                    <p className="text-lg font-bold text-[#9D4EDD]">
                      R$ {remaining.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Meta</p>
                    <p className="text-lg font-bold text-gray-900">
                      R$ {goal.targetAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Ações */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <button className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  goal.type === 'save'
                    ? 'bg-[#CEF05D] hover:bg-[#CEF05D] text-white'
                    : 'bg-[#B4B0EE] hover:bg-[#B4B0EE] text-white'
                }`}>
                  <Plus className="w-4 h-4 inline mr-2" />
                  Adicionar Valor
                </button>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                  Ver Histórico
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dicas */}
      <div className="bg-[#B4B0EE]/10 rounded-lg border border-[#B4B0EE]/30 p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Dicas sobre Metas</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Defina metas SMART: Específicas, Mensuráveis, Atingíveis, Relevantes e com Prazo</li>
          <li>• Metas de investimento são deduzidas automaticamente do saldo quando você aplica</li>
          <li>• Configure alertas para lembrar de contribuir mensalmente</li>
          <li>• Revise suas metas regularmente e ajuste conforme necessário</li>
        </ul>
      </div>

      {/* Meta Mensal Sugerida */}
      <div className="bg-gradient-to-br from-[#9D4EDD] to-[#9D4EDD] rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Meta Mensal Sugerida</h3>
            <p className="text-sm opacity-90 mb-4">
              Baseado na sua renda e gastos, sugerimos economizar:
            </p>
            
            <div className="bg-white/20 rounded-lg p-4 inline-block">
              <p className="text-3xl font-bold">R$ 1.000,00</p>
              <p className="text-sm opacity-75 mt-1">20% da renda mensal</p>
            </div>
            
            <button className="mt-4 px-4 py-2 bg-white text-[#9D4EDD] rounded-lg text-sm font-medium hover:bg-[#9D4EDD]/10 transition-colors">
              Criar Meta com Este Valor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
