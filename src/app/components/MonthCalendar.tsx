import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  mockEstimates, 
  mockTransactions, 
  mockConfig,
  calculateDailyStandard,
  getVariableExpensesForDate
} from '../data/mockData';

export function MonthCalendar() {
  const dailyStandard = calculateDailyStandard(mockEstimates);
  const today = new Date('2026-01-08');
  
  // Gerar dias do mês
  const year = 2026;
  const month = 0; // Janeiro (0-indexed)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dateStr = date.toISOString().split('T')[0];
    const isPast = date < today;
    const isToday = date.toDateString() === today.toDateString();
    const isFuture = date > today;
    
    let dayData: any = {
      day: i,
      date: dateStr,
      isPast,
      isToday,
      isFuture,
    };
    
    if (isPast || isToday) {
      // Dias passados e hoje: mostrar gasto real
      const expenses = getVariableExpensesForDate(dateStr, mockTransactions);
      const variation = dailyStandard - expenses;
      
      dayData.expenses = expenses;
      dayData.variation = variation;
      dayData.status = variation >= 0 ? 'positive' : 'negative';
    } else {
      // Dias futuros: calcular projeção
      // Simular projeção (na versão real, seria calculado com base no saldo projetado)
      const mockProjectedBalance = 1500 - ((i - 8) * dailyStandard); // Simplificado
      
      if (mockProjectedBalance > dailyStandard) {
        dayData.status = 'comfortable'; // Verde
      } else if (mockProjectedBalance > 0) {
        dayData.status = 'tight'; // Amarelo
      } else {
        dayData.status = 'insufficient'; // Vermelho
      }
      
      dayData.projectedBalance = mockProjectedBalance;
      
      // Adicionar compromissos futuros
      const commitments = mockTransactions.filter(t => 
        !t.paid && 
        t.date === dateStr && 
        (t.type === 'expense_fixed' || t.type === 'installment')
      );
      
      if (commitments.length > 0) {
        dayData.hasCommitments = true;
        dayData.commitmentsTotal = commitments.reduce((sum, c) => sum + c.amount, 0);
      }
    }
    
    days.push(dayData);
  }
  
  // Preencher início da semana (dias vazios)
  const startDayOfWeek = firstDay.getDay(); // 0 = Domingo
  const emptyDays = Array(startDayOfWeek).fill(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Calendário do Mês</h2>
          <p className="text-sm text-gray-500 mt-1">Janeiro 2026</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 px-3">Janeiro 2026</span>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Legenda</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#CEF05D]/20 border border-[#CEF05D]/50 rounded"></div>
            <span className="text-gray-600">Economizou (passado)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-gray-600">Gastou mais (passado)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#CEF05D]/100 rounded"></div>
            <span className="text-gray-600">Confortável (futuro)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#B4B0EE] rounded"></div>
            <span className="text-gray-600">Apertado (futuro)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-600">Sem saldo (futuro)</span>
          </div>
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>
        
        {/* Dias do mês */}
        <div className="grid grid-cols-7">
          {/* Dias vazios */}
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square border-r border-b border-gray-100"></div>
          ))}
          
          {/* Dias reais */}
          {days.map((dayData) => {
            let bgColor = 'bg-white';
            let borderColor = 'border-gray-100';
            
            if (dayData.isToday) {
              borderColor = 'border-[#B4B0EE] ring-2 ring-[#B4B0EE]/30';
            }
            
            if (dayData.isPast || dayData.isToday) {
              if (dayData.status === 'positive') {
                bgColor = 'bg-[#CEF05D]/10';
              } else if (dayData.status === 'negative') {
                bgColor = 'bg-red-50';
              }
            }
            
            return (
              <div
                key={dayData.day}
                className={`aspect-square border-r border-b ${borderColor} ${bgColor} p-2 relative hover:bg-gray-50 transition-colors cursor-pointer`}
              >
                <div className="flex flex-col h-full">
                  {/* Número do dia */}
                  <div className={`text-sm font-medium mb-1 ${
                    dayData.isToday ? 'text-[#B4B0EE]' : 'text-gray-900'
                  }`}>
                    {dayData.day}
                  </div>
                  
                  {/* Conteúdo do dia */}
                  <div className="flex-1 flex flex-col justify-between text-xs">
                    {(dayData.isPast || dayData.isToday) && (
                      <>
                        <div>
                          <p className="text-gray-600">Gasto</p>
                          <p className="font-semibold text-gray-900">
                            R$ {dayData.expenses.toFixed(2)}
                          </p>
                        </div>
                        <div className={`${
                          dayData.variation >= 0 ? 'text-[#CEF05D]' : 'text-red-600'
                        }`}>
                          {dayData.variation >= 0 ? '+' : ''}R$ {dayData.variation.toFixed(2)}
                        </div>
                      </>
                    )}
                    
                    {dayData.isFuture && (
                      <>
                        {/* Indicador visual de status */}
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            dayData.status === 'comfortable' ? 'bg-[#CEF05D]/100' :
                            dayData.status === 'tight' ? 'bg-[#B4B0EE]' :
                            'bg-red-500'
                          }`}></div>
                          <span className="text-gray-600">
                            {dayData.status === 'comfortable' ? 'OK' :
                             dayData.status === 'tight' ? 'Justo' :
                             'Alerta'}
                          </span>
                        </div>
                        
                        {dayData.hasCommitments && (
                          <div className="mt-1">
                            <p className="text-[#9D4EDD] font-medium">
                              Compromisso
                            </p>
                            <p className="text-gray-700 font-semibold">
                              R$ {dayData.commitmentsTotal.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Valor Diário Padrão</p>
          <p className="text-2xl font-bold text-[#B4B0EE]">R$ {dailyStandard.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Base fixa do mês</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Dias com economia</p>
          <p className="text-2xl font-bold text-[#CEF05D]">5 dias</p>
          <p className="text-xs text-gray-500 mt-1">Gastou menos que o padrão</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Dias gastou mais</p>
          <p className="text-2xl font-bold text-red-600">3 dias</p>
          <p className="text-xs text-gray-500 mt-1">Acima do padrão</p>
        </div>
      </div>
    </div>
  );
}
