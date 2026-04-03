import { useState } from 'react';
import { Target, Plus, Pencil, Trash2, TrendingUp, TrendingDown, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGoals } from '@/lib/hooks/useGoals';
import { toast } from 'sonner';

type GoalType = 'savings' | 'max_spending' | 'savings_rate' | 'category_reduction';
type GoalPeriod = 'month' | 'year';

interface Goal {
  id: string;
  name: string;
  type: GoalType;
  period: GoalPeriod;
  targetAmount: number;
  currentAmount: number;
  category?: string;
  deadline?: string;
}

export function GoalsView() {
  const { user } = useAuth();
  const { goals: dbGoals, loading, error, createGoal, updateGoal, deleteGoal } = useGoals(user?.id);
  const [viewMode, setViewMode] = useState<GoalPeriod>('month');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const [goalForm, setGoalForm] = useState({
    name: '',
    type: 'savings' as GoalType,
    period: 'month' as GoalPeriod,
    targetAmount: '',
    currentAmount: '',
    category: ''
  });

  // Transform DB goals to component format
  const goals: Goal[] = dbGoals.map(g => ({
    id: g.id,
    name: g.name,
    type: g.type as GoalType,
    period: (g.period || 'month') as GoalPeriod,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    category: g.category,
    deadline: g.deadline
  }));

  const filteredGoals = goals.filter(goal => goal.period === viewMode);

  const getProgressPercentage = (goal: Goal): number => {
    if (goal.type === 'max_spending') {
      // For max spending, we want to show how much of the budget is used
      return (goal.currentAmount / goal.targetAmount) * 100;
    }
    return (goal.currentAmount / goal.targetAmount) * 100;
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
      case 'success': return 'var(--app-success)';
      case 'warning': return 'var(--app-warning)';
      case 'danger': return 'var(--app-danger)';
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
      return `${goal.currentAmount.toFixed(0)}% / ${goal.targetAmount}%`;
    }
    return `R$ ${goal.currentAmount.toFixed(2)} / R$ ${goal.targetAmount.toFixed(2)}`;
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

    try {
      await deleteGoal(goalId);
    } catch (err) {
      console.error('Error deleting goal:', err);
      toast.error('Erro ao excluir meta. Tente novamente.');
    }
  };

  const handleOpenAddDialog = () => {
    setGoalForm({
      name: '',
      type: 'savings',
      period: 'month',
      targetAmount: '',
      currentAmount: '0',
      category: ''
    });
    setIsAddDialogOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setGoalForm({
      name: goal.name,
      type: goal.type,
      period: goal.period,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      category: goal.category || ''
    });
    setEditingGoal(goal);
  };

  const handleSaveGoal = async () => {
    if (!goalForm.name || !goalForm.targetAmount) {
      toast.error('Preencha os campos obrigatorios.');
      return;
    }

    try {
      setSaving(true);

      const goalData = {
        name: goalForm.name,
        type: goalForm.type,
        targetAmount: parseFloat(goalForm.targetAmount),
        currentAmount: parseFloat(goalForm.currentAmount) || 0,
        deadline: null,
        period: goalForm.period,
        category: goalForm.category || null
      };

      if (editingGoal) {
        await updateGoal(editingGoal.id, goalData);
      } else {
        await createGoal(goalData);
      }

      setIsAddDialogOpen(false);
      setEditingGoal(null);
      setGoalForm({
        name: '',
        type: 'savings',
        period: 'month',
        targetAmount: '',
        currentAmount: '0',
        category: ''
      });
    } catch (err) {
      console.error('Error saving goal:', err);
      toast.error('Erro ao salvar meta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const achievedGoals = filteredGoals.filter(g => getGoalStatus(g) === 'success').length;
  const inProgressGoals = filteredGoals.filter(g => getGoalStatus(g) === 'warning').length;
  const totalGoals = filteredGoals.length;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--app-text)]">Carregando metas...</p>
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
          <h3 className="mb-2 text-lg font-semibold text-[var(--app-text)]">Erro ao carregar metas</h3>
          <p className="mb-4 text-[var(--app-text-muted)]">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[var(--app-accent)] px-4 py-2 text-[var(--app-accent-foreground)] transition-opacity hover:opacity-90"
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
      <div className="space-y-3 pb-2 pt-4 text-center">
        <p className="app-kicker">Goals & discipline</p>
        <h1 className="app-page-title text-4xl font-semibold">Metas Financeiras</h1>
        <p className="text-[var(--app-text-muted)]">Acompanhe seu progresso com menos ruído visual e mais foco no avanço.</p>
      </div>

      {/* Period Toggle */}
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <div className="app-pill flex items-center gap-2 rounded-2xl p-1">
          <button
            onClick={() => setViewMode('month')}
            className={`rounded-xl px-6 py-2 transition-all font-medium ${
              viewMode === 'month'
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`rounded-xl px-6 py-2 transition-all font-medium ${
              viewMode === 'year'
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            Ano
          </button>
        </div>

        <button
          onClick={handleOpenAddDialog}
          className="app-button-primary flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-medium text-[var(--app-accent-foreground)] sm:w-auto sm:px-6"
        >
          <Plus className="w-5 h-5" />
          Nova Meta
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="app-panel rounded-[1.75rem] p-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6 text-[var(--app-accent)]" />
            <span className="text-sm text-[var(--app-text-faint)]">Total de Metas</span>
          </div>
          <p className="text-3xl font-bold text-[var(--app-text)]">{totalGoals}</p>
        </div>

        <div className="app-panel rounded-[1.75rem] p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-[var(--app-success)]" />
            <span className="text-sm text-[var(--app-text-faint)]">Metas Alcançadas</span>
          </div>
          <p className="text-3xl font-bold text-[var(--app-success)]">{achievedGoals}</p>
        </div>

        <div className="app-panel rounded-[1.75rem] p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-6 h-6 text-[var(--app-warning)]" />
            <span className="text-sm text-[var(--app-text-faint)]">Em Progresso</span>
          </div>
          <p className="text-3xl font-bold text-[var(--app-warning)]">{inProgressGoals}</p>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <div className="app-panel rounded-[1.75rem] p-12 text-center">
            <Target className="mx-auto mb-4 h-16 w-16 text-[var(--app-text-faint)]" />
            <p className="mb-2 text-lg text-[var(--app-text-muted)]">Nenhuma meta cadastrada</p>
            <p className="text-sm text-[var(--app-text-faint)]">
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
                className="app-panel rounded-[1.75rem] p-5 transition-all hover:border-[var(--app-border-strong)] sm:p-6"
              >
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="w-5 h-5" style={{ color: statusColor }} />
                      <h3 className="break-words text-xl font-semibold text-[var(--app-text)]">{goal.name}</h3>
                    </div>
                    <p className="mb-1 break-words text-sm text-[var(--app-text-faint)]">
                      {getGoalTypeLabel(goal.type)}
                      {goal.category && ` - ${goal.category}`}
                    </p>
                    <p className="break-words font-medium text-[var(--app-text)]">{formatGoalValue(goal)}</p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => handleEditGoal(goal)}
                      className="rounded-lg p-2 transition-colors hover:bg-[var(--app-surface-hover)]"
                    >
                      <Pencil className="w-4 h-4 text-[var(--app-accent)]" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="rounded-lg p-2 transition-colors hover:bg-[var(--app-surface-hover)]"
                    >
                      <Trash2 className="w-4 h-4 text-[var(--app-danger)]" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--app-text-faint)]">Progresso</span>
                    <span className="font-medium" style={{ color: statusColor }}>
                      {Math.min(percentage, 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--app-surface-hover)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: statusColor
                      }}
                    />
                  </div>
                  {percentage >= 100 && goal.type !== 'max_spending' && (
                    <p className="text-[var(--app-success)] text-sm font-medium">Meta alcançada!</p>
                  )}
                  {percentage > 100 && goal.type === 'max_spending' && (
                    <p className="text-[var(--app-danger)] text-sm font-medium">
                      Orçamento ultrapassado em R$ {(goal.currentAmount - goal.targetAmount).toFixed(2)}
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
        <DialogContent className="app-panel-strong max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[var(--app-text)]">
              {editingGoal ? 'Editar Meta' : 'Nova Meta'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Título da Meta</label>
              <input
                type="text"
                value={goalForm.name}
                onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                placeholder="Ex: Economizar R$ 2.000"
                className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:outline-none focus:border-[var(--app-accent)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Tipo de Meta</label>
              <select
                value={goalForm.type}
                onChange={(e) => setGoalForm({ ...goalForm, type: e.target.value as GoalType })}
                className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
              >
                <option value="savings">Economizar valor</option>
                <option value="max_spending">Gastar no máximo</option>
                <option value="savings_rate">Taxa de economia (%)</option>
                <option value="category_reduction">Reduzir categoria (%)</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Período</label>
              <select
                value={goalForm.period}
                onChange={(e) => setGoalForm({ ...goalForm, period: e.target.value as GoalPeriod })}
                className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
              >
                <option value="month">Mensal</option>
                <option value="year">Anual</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Valor Alvo</label>
              <input
                type="number"
                value={goalForm.targetAmount}
                onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                placeholder="Ex: 2000"
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:outline-none focus:border-[var(--app-accent)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Valor Atual</label>
              <input
                type="number"
                value={goalForm.currentAmount}
                onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })}
                placeholder="Ex: 500"
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:outline-none focus:border-[var(--app-accent)]"
              />
            </div>

            {(goalForm.type === 'category_reduction') && (
              <div>
                <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Categoria</label>
                <input
                  type="text"
                  value={goalForm.category}
                  onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                  placeholder="Ex: Alimentação"
                  className="w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:outline-none focus:border-[var(--app-accent)]"
                />
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
              <button
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingGoal(null);
                }}
                className="app-button-secondary flex-1 rounded-2xl px-4 py-3"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGoal}
                disabled={saving || !goalForm.name || !goalForm.targetAmount}
                className="app-button-primary flex-1 rounded-2xl px-4 py-3 font-medium text-[var(--app-accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Salvando...' : editingGoal ? 'Salvar' : 'Criar Meta'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
