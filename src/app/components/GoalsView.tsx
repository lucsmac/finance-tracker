import { useState } from 'react';
import { Target, Plus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

type GoalType = 'savings' | 'max_spending' | 'savings_rate' | 'category_reduction';
type GoalPeriod = 'month' | 'year';

interface Goal {
  id: string;
  title: string;
  type: GoalType;
  period: GoalPeriod;
  targetValue: number;
  currentValue: number;
  category?: string;
  createdAt: string;
}

export function GoalsView() {
  const [viewMode, setViewMode] = useState<GoalPeriod>('month');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Mock goals data
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Economizar R$ 2.000',
      type: 'savings',
      period: 'month',
      targetValue: 2000,
      currentValue: 1450,
      createdAt: '2026-01-01'
    },
    {
      id: '2',
      title: 'Gastar no máximo R$ 1.500',
      type: 'max_spending',
      period: 'month',
      targetValue: 1500,
      currentValue: 1200,
      createdAt: '2026-01-01'
    },
    {
      id: '3',
      title: 'Economizar 30% da renda',
      type: 'savings_rate',
      period: 'month',
      targetValue: 30,
      currentValue: 25,
      createdAt: '2026-01-01'
    },
    {
      id: '4',
      title: 'Reduzir gastos com Alimentação',
      type: 'category_reduction',
      period: 'month',
      targetValue: 20,
      currentValue: 15,
      category: 'Alimentação',
      createdAt: '2026-01-01'
    },
    {
      id: '5',
      title: 'Economizar R$ 20.000',
      type: 'savings',
      period: 'year',
      targetValue: 20000,
      currentValue: 2500,
      createdAt: '2026-01-01'
    }
  ]);

  const filteredGoals = goals.filter(goal => goal.period === viewMode);

  const getProgressPercentage = (goal: Goal): number => {
    if (goal.type === 'max_spending') {
      // For max spending, we want to show how much of the budget is used
      return (goal.currentValue / goal.targetValue) * 100;
    }
    return (goal.currentValue / goal.targetValue) * 100;
  };

  const getGoalStatus = (goal: Goal): 'success' | 'warning' | 'danger' => {
    const percentage = getProgressPercentage(goal);

    if (goal.type === 'max_spending') {
      if (percentage > 100) return 'danger';
      if (percentage > 80) return 'warning';
      return 'success';
    }

    if (percentage >= 100) return 'success';
    if (percentage >= 70) return 'warning';
    return 'danger';
  };

  const getStatusColor = (status: 'success' | 'warning' | 'danger'): string => {
    switch (status) {
      case 'success': return '#76C893';
      case 'warning': return '#E6C563';
      case 'danger': return '#D97B7B';
    }
  };

  const getGoalTypeLabel = (type: GoalType): string => {
    switch (type) {
      case 'savings': return 'Economizar';
      case 'max_spending': return 'Gastar no máximo';
      case 'savings_rate': return 'Taxa de economia';
      case 'category_reduction': return 'Reduzir categoria';
    }
  };

  const formatGoalValue = (goal: Goal): string => {
    if (goal.type === 'savings_rate' || goal.type === 'category_reduction') {
      return `${goal.currentValue.toFixed(0)}% / ${goal.targetValue}%`;
    }
    return `R$ ${goal.currentValue.toFixed(2)} / R$ ${goal.targetValue.toFixed(2)}`;
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(goals.filter(g => g.id !== goalId));
  };

  const achievedGoals = filteredGoals.filter(g => getGoalStatus(g) === 'success').length;
  const inProgressGoals = filteredGoals.filter(g => getGoalStatus(g) === 'warning').length;
  const totalGoals = filteredGoals.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-4xl font-bold text-white mb-2">Metas Financeiras</h1>
        <p className="text-[#9B97CE]">Acompanhe seu progresso</p>
      </div>

      {/* Period Toggle */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-1">
          <button
            onClick={() => setViewMode('month')}
            className={`px-6 py-2 rounded-lg transition-all font-medium ${
              viewMode === 'month'
                ? 'bg-[#76C893] text-white'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`px-6 py-2 rounded-lg transition-all font-medium ${
              viewMode === 'year'
                ? 'bg-[#76C893] text-white'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            Ano
          </button>
        </div>

        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#76C893] hover:bg-[#76C893]/80 text-white rounded-lg transition-all font-medium"
        >
          <Plus className="w-5 h-5" />
          Nova Meta
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6 text-[#9B97CE]" />
            <span className="text-[#9CA3AF] text-sm">Total de Metas</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalGoals}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-[#76C893]" />
            <span className="text-[#9CA3AF] text-sm">Metas Alcançadas</span>
          </div>
          <p className="text-3xl font-bold text-[#76C893]">{achievedGoals}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-6 h-6 text-[#E6C563]" />
            <span className="text-[#9CA3AF] text-sm">Em Progresso</span>
          </div>
          <p className="text-3xl font-bold text-[#E6C563]">{inProgressGoals}</p>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <Target className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4" />
            <p className="text-[#9CA3AF] text-lg mb-2">Nenhuma meta cadastrada</p>
            <p className="text-[#9CA3AF] text-sm">
              Clique em "Nova Meta" para começar a definir seus objetivos
            </p>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const status = getGoalStatus(goal);
            const statusColor = getStatusColor(status);
            const percentage = getProgressPercentage(goal);

            return (
              <div
                key={goal.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="w-5 h-5" style={{ color: statusColor }} />
                      <h3 className="text-xl font-semibold text-white">{goal.title}</h3>
                    </div>
                    <p className="text-[#9CA3AF] text-sm mb-1">
                      {getGoalTypeLabel(goal.type)}
                      {goal.category && ` - ${goal.category}`}
                    </p>
                    <p className="text-white font-medium">{formatGoalValue(goal)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingGoal(goal)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-[#9B97CE]" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-[#D97B7B]" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9CA3AF]">Progresso</span>
                    <span className="font-medium" style={{ color: statusColor }}>
                      {Math.min(percentage, 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: statusColor
                      }}
                    />
                  </div>
                  {percentage >= 100 && goal.type !== 'max_spending' && (
                    <p className="text-[#76C893] text-sm font-medium">Meta alcançada!</p>
                  )}
                  {percentage > 100 && goal.type === 'max_spending' && (
                    <p className="text-[#D97B7B] text-sm font-medium">
                      Orçamento ultrapassado em R$ {(goal.currentValue - goal.targetValue).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Goal Dialog */}
      <Dialog open={isAddDialogOpen || editingGoal !== null} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setEditingGoal(null);
        }
      }}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingGoal ? 'Editar Meta' : 'Nova Meta'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm text-[#9CA3AF] mb-2 block">Título da Meta</label>
              <input
                type="text"
                placeholder="Ex: Economizar R$ 2.000"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#76C893]"
              />
            </div>

            <div>
              <label className="text-sm text-[#9CA3AF] mb-2 block">Tipo de Meta</label>
              <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#76C893]">
                <option value="savings">Economizar valor</option>
                <option value="max_spending">Gastar no máximo</option>
                <option value="savings_rate">Taxa de economia (%)</option>
                <option value="category_reduction">Reduzir categoria (%)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-[#9CA3AF] mb-2 block">Período</label>
              <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#76C893]">
                <option value="month">Mensal</option>
                <option value="year">Anual</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-[#9CA3AF] mb-2 block">Valor Alvo</label>
              <input
                type="number"
                placeholder="Ex: 2000"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#76C893]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingGoal(null);
                }}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // TODO: Implement save logic
                  setIsAddDialogOpen(false);
                  setEditingGoal(null);
                }}
                className="flex-1 px-4 py-3 bg-[#76C893] hover:bg-[#76C893]/80 rounded-lg transition-colors font-medium"
              >
                {editingGoal ? 'Salvar' : 'Criar Meta'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
