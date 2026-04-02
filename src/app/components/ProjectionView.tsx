import { useState } from 'react';
import { TrendingDown, TrendingUp, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
import { 
  mockEstimates, 
  mockTransactions,
  calculateDailyStandard,
  calculateCurrentBalance,
  mockConfig
} from '../data/mockData';

export function ProjectionView() {
  const [simulatedExpense, setSimulatedExpense] = useState('');
  
  const dailyStandard = calculateDailyStandard(mockEstimates);
  const currentBalance = calculateCurrentBalance(mockConfig.initialBalance, mockTransactions);
  
  const today = new Date('2026-01-08');
  const nextIncomeDate = new Date('2026-02-05'); // Próximo salário
  const nextIncomeAmount = 5000;
  
  // Calcular dias até próxima renda
  const daysUntilIncome = Math.ceil((nextIncomeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Gerar projeção dia a dia
  const projectionDays = [];
  let runningBalance = currentBalance;
  
  if (simulatedExpense) {
    runningBalance -= parseFloat(simulatedExpense) || 0;
  }
  
  for (let i = 1; i <= daysUntilIncome; i++) {
    const projectionDate = new Date(today);
    projectionDate.setDate(today.getDate() + i);
    const dateStr = projectionDate.toISOString().split('T')[0];
    
    // Buscar compromissos do dia
    const dayCommitments = mockTransactions.filter(t => 
      !t.paid && 
      t.date === dateStr && 
      (t.type === 'expense_fixed' || t.type === 'installment')
    );
    
    const commitmentsTotal = dayCommitments.reduce((sum, c) => sum + c.amount, 0);
    
    // Calcular saldo projetado
    runningBalance = runningBalance - dailyStandard - commitmentsTotal;
    
    // Determinar status
    let status: 'comfortable' | 'tight' | 'insufficient';
    if (runningBalance > dailyStandard) {
      status = 'comfortable';
    } else if (runningBalance > 0) {
      status = 'tight';
    } else {
      status = 'insufficient';
    }
    
    projectionDays.push({
      date: projectionDate,
      dateStr,
      balance: runningBalance,
      dailyExpense: dailyStandard,
      commitments: dayCommitments,
      commitmentsTotal,
      status,
      dayNumber: i
    });
  }
  
  // Estatísticas
  const comfortableDays = projectionDays.filter(d => d.status === 'comfortable').length;
  const tightDays = projectionDays.filter(d => d.status === 'tight').length;
  const insufficientDays = projectionDays.filter(d => d.status === 'insufficient').length;
  
  const firstInsufficientDay = projectionDays.find(d => d.status === 'insufficient');
  const minBalance = Math.min(...projectionDays.map(d => d.balance));
  const deficit = minBalance < 0 ? Math.abs(minBalance) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Projeção de Saldo</h2>
        <p className="text-sm text-gray-500 mt-1">
          Previsão até a próxima entrada de renda
        </p>
      </div>

      {/* Alerta Principal */}
      {firstInsufficientDay && (
        <div className="rounded-xl border border-[#E837FD]/30 bg-[#E837FD]/10 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-[#E837FD]/12 p-3">
              <AlertTriangle className="w-6 h-6 text-[#E837FD]" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-semibold text-[#E837FD]">
                ⚠️ Saldo insuficiente detectado
              </h3>
              <p className="mb-3 text-sm text-[#E837FD]">
                A partir do dia {firstInsufficientDay.date.getDate()} de{' '}
                {firstInsufficientDay.date.toLocaleDateString('pt-BR', { month: 'long' })}, 
                você não terá saldo suficiente para cobrir os gastos projetados.
              </p>
              <div className="bg-white rounded-lg p-4 inline-block">
                <p className="text-xs text-gray-600 mb-1">Déficit total projetado:</p>
                <p className="text-2xl font-bold text-[#E837FD]">R$ {deficit.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <p className="text-sm text-gray-600">Dias até renda</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{daysUntilIncome}</p>
          <p className="text-xs text-gray-500 mt-1">
            Salário em {nextIncomeDate.toLocaleDateString('pt-BR')}
          </p>
        </div>
        
        <div className="rounded-xl border border-[#AFFD37]/30 bg-[#AFFD37]/10 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-[#AFFD37]" />
            <p className="text-sm text-[#AFFD37]">Dias confortáveis</p>
          </div>
          <p className="text-3xl font-bold text-[#AFFD37]">{comfortableDays}</p>
          <p className="mt-1 text-xs text-[#AFFD37]">Saldo acima do padrão</p>
        </div>
        
        <div className="rounded-xl border border-[#FDE837]/30 bg-[#FDE837]/10 p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-[#FDE837]" />
            <p className="text-sm text-[#FDE837]">Dias apertados</p>
          </div>
          <p className="text-3xl font-bold text-[#FDE837]">{tightDays}</p>
          <p className="mt-1 text-xs text-[#FDE837]">Saldo justo</p>
        </div>
        
        <div className="rounded-xl border border-[#E837FD]/30 bg-[#E837FD]/10 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-[#E837FD]" />
            <p className="text-sm text-[#E837FD]">Dias sem saldo</p>
          </div>
          <p className="text-3xl font-bold text-[#E837FD]">{insufficientDays}</p>
          <p className="mt-1 text-xs text-[#E837FD]">Saldo negativo</p>
        </div>
      </div>

      {/* Simulação "E se?" */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Simulação: "E se?"</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Simular gasto adicional hoje
            </label>
            <input
              type="number"
              value={simulatedExpense}
              onChange={(e) => setSimulatedExpense(e.target.value)}
              placeholder="Ex: 300.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8537FD]"
            />
          </div>
          <button
            onClick={() => setSimulatedExpense('')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Limpar
          </button>
        </div>
        {simulatedExpense && (
          <p className="mt-3 text-sm text-[#8537FD]">
            💡 Projeção atualizada com gasto de R$ {parseFloat(simulatedExpense).toFixed(2)}
          </p>
        )}
      </div>

      {/* Timeline de Projeção */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Projeção Dia a Dia</h3>
          <p className="text-sm text-gray-500 mt-1">
            De {today.toLocaleDateString('pt-BR')} até {nextIncomeDate.toLocaleDateString('pt-BR')}
          </p>
        </div>
        
        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {projectionDays.map((day, index) => {
            const statusConfig = {
              comfortable: { bg: 'bg-[#AFFD37]/10', border: 'border-[#AFFD37]/30', text: 'text-[#AFFD37]', indicator: 'bg-[#AFFD37]' },
              tight: { bg: 'bg-[#FDE837]/10', border: 'border-[#FDE837]/30', text: 'text-[#FDE837]', indicator: 'bg-[#FDE837]' },
              insufficient: { bg: 'bg-[#E837FD]/10', border: 'border-[#E837FD]/30', text: 'text-[#E837FD]', indicator: 'bg-[#E837FD]' },
            };
            
            const config = statusConfig[day.status];
            
            return (
              <div
                key={index}
                className={`px-6 py-4 ${config.bg} border-l-4 ${config.border}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Data */}
                    <div className="w-20">
                      <p className="text-sm font-medium text-gray-900">
                        {day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {day.date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </p>
                    </div>
                    
                    {/* Status indicator */}
                    <div className={`w-3 h-3 rounded-full ${config.indicator}`}></div>
                    
                    {/* Detalhes */}
                    <div className="flex-1">
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-gray-600">Padrão:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            R$ {day.dailyExpense.toFixed(2)}
                          </span>
                        </div>
                        
                        {day.commitmentsTotal > 0 && (
                          <div>
                            <span className="text-gray-600">Compromissos:</span>
                            <span className="ml-2 font-medium text-[#8537FD]">
                              R$ {day.commitmentsTotal.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {day.commitments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {day.commitments.map(c => (
                            <span
                              key={c.id}
                              className="inline-block px-2 py-1 bg-white rounded text-xs font-medium text-gray-700 border border-gray-200"
                            >
                              {c.description}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Saldo projetado */}
                  <div className="text-right">
                    <p className="text-xs text-gray-600 mb-1">Saldo projetado</p>
                    <p className={`text-xl font-bold ${config.text}`}>
                      R$ {day.balance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Próxima Renda */}
        <div className="border-t-4 border-[#8537FD] bg-[#8537FD]/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DollarSign className="w-8 h-8 text-[#8537FD]" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Entrada de Renda - {nextIncomeDate.toLocaleDateString('pt-BR')}
                </p>
                <p className="text-xs text-gray-600">Salário mensal</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-[#8537FD]">
              +R$ {nextIncomeAmount.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Dicas */}
      <div className="rounded-lg border border-[#8537FD]/30 bg-[#8537FD]/10 p-4">
        <h4 className="mb-2 text-sm font-semibold text-[#8537FD]">💡 Dicas para melhorar sua projeção</h4>
        <ul className="space-y-1 text-sm text-[#8537FD]">
          <li>• Reduza gastos variáveis nos dias marcados como "apertados"</li>
          <li>• Antecipe compromissos se possível para evitar acúmulo</li>
          <li>• Considere usar parte da reserva de emergência se necessário</li>
          <li>• Ajuste suas estimativas mensais para um planejamento mais realista</li>
        </ul>
      </div>
    </div>
  );
}
