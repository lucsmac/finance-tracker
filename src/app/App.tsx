import { useState, useRef, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { CommitmentsView } from './components/CommitmentsView';
import { IncomesView } from './components/IncomesView';
import { StatsView } from './components/StatsView';
import { GoalsView } from './components/GoalsView';
import { Auth } from './components/Auth';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { useEstimates } from '@/lib/hooks/useEstimates';
import { useInvestments } from '@/lib/hooks/useInvestments';
import { useGoals } from '@/lib/hooks/useGoals';
import { useConfig } from '@/lib/hooks/useConfig';
import { useDailyExpenses } from '@/lib/hooks/useDailyExpenses';
import { Calendar, TrendingUp, Target, ClipboardList, DollarSign, LogOut, Settings, User, Trash2, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';
import { getTodayLocal } from '@/lib/utils/dateHelpers';

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'commitments' | 'incomes' | 'stats' | 'goals'>('dashboard');
  const { user, loading, signOut } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Config form state
  const [configForm, setConfigForm] = useState({
    initialBalance: '',
    monthStartDay: '',
    mainIncomeDay: '',
    mainIncomeAmount: '',
    dailyStandard: '',
    balanceStartDate: ''
  });

  // Hooks para deletar dados
  const { transactions, deleteTransaction: deleteTransactionFn } = useTransactions(user?.id);
  const { estimates, deleteEstimate: deleteEstimateFn } = useEstimates(user?.id);
  const { investments, deleteInvestment: deleteInvestmentFn } = useInvestments(user?.id);
  const { goals, deleteGoal: deleteGoalFn } = useGoals(user?.id);
  const { config, updateConfig } = useConfig(user?.id);
  const { dailyExpenses, deleteDailyExpense: deleteDailyExpenseFn } = useDailyExpenses(user?.id);
  const userName = user?.email?.split('@')[0] || 'Usuário';
  const currentViewLabel = {
    dashboard: 'Visão geral',
    commitments: 'Compromissos',
    incomes: 'Entradas',
    stats: 'Análise',
    goals: 'Metas'
  }[currentView];
  const activeNavItemClass = 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]';
  const inactiveNavItemClass = 'text-[var(--app-text-muted)] hover:bg-white/5 hover:text-[var(--app-text)]';

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load config into form when it changes
  useEffect(() => {
    if (config) {
      setConfigForm({
        initialBalance: config.initialBalance.toString(),
        monthStartDay: config.monthStartDay.toString(),
        mainIncomeDay: config.mainIncomeDay.toString(),
        mainIncomeAmount: config.mainIncomeAmount.toString(),
        dailyStandard: config.dailyStandard.toString(),
        balanceStartDate: config.balanceStartDate || getTodayLocal()
      });
    }
  }, [config]);

  // Function to save config changes
  const handleSaveConfig = async () => {
    if (!user?.id) return;

    try {
      setSavingConfig(true);
      await updateConfig({
        initialBalance: parseFloat(configForm.initialBalance) || 0,
        monthStartDay: parseInt(configForm.monthStartDay) || 1,
        mainIncomeDay: parseInt(configForm.mainIncomeDay) || 5,
        mainIncomeAmount: parseFloat(configForm.mainIncomeAmount) || 0,
        dailyStandard: parseFloat(configForm.dailyStandard) || 0,
        balanceStartDate: configForm.balanceStartDate
      });
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Function to reset all data
  const handleResetAllData = async () => {
    if (!user?.id) return;

    try {
      setResetting(true);

      // Delete all transactions
      const deleteTransactionPromises = transactions.map(t => deleteTransactionFn(t.id));
      await Promise.all(deleteTransactionPromises);

      // Delete all estimates
      const deleteEstimatePromises = estimates.map(e => deleteEstimateFn(e.id));
      await Promise.all(deleteEstimatePromises);

      // Delete all investments
      const deleteInvestmentPromises = investments.map(i => deleteInvestmentFn(i.id));
      await Promise.all(deleteInvestmentPromises);

      // Delete all goals
      const deleteGoalPromises = goals.map(g => deleteGoalFn(g.id));
      await Promise.all(deleteGoalPromises);

      // Delete all daily expenses
      const deleteDailyExpensePromises = dailyExpenses.map(expense => deleteDailyExpenseFn(expense.id));
      await Promise.all(deleteDailyExpensePromises);

      // Reset user config to defaults
      if (config) {
        await updateConfig({
          initialBalance: 0,
          monthStartDay: 1,
          mainIncomeDay: 5,
          mainIncomeAmount: 0
        });
      }

      setIsResetModalOpen(false);
      alert('Todos os dados foram resetados com sucesso!');
      window.location.reload();
    } catch (err) {
      console.error('Error resetting data:', err);
      alert('Erro ao resetar dados. Tente novamente.');
    } finally {
      setResetting(false);
    }
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center px-4">
        <div className="app-panel rounded-[2rem] px-8 py-6 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-[var(--app-accent)]/30 border-t-[var(--app-accent)]" />
          <div className="text-lg text-[var(--app-text)]">Carregando...</div>
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="app-shell">
      {/* User Profile Menu */}
      <div className="app-content fixed right-4 top-4 z-50 sm:right-6 sm:top-6" ref={profileMenuRef}>
        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="app-pill flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[var(--app-text)] transition-all hover:bg-white/10"
        >
          {/* User Avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(133,55,253,0.35)] bg-[var(--app-accent)] text-white shadow-[0_10px_25px_rgba(133,55,253,0.2)]">
            <User className="h-5 w-5" />
          </div>

          {/* User Name */}
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium text-[var(--app-text)]">{userName}</p>
            <p className="text-xs text-[var(--app-text-faint)]">Conta ativa</p>
          </div>

          {/* Dropdown Icon */}
          <ChevronDown className={`w-4 h-4 text-[var(--app-text-muted)] transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isProfileMenuOpen && (
          <div className="app-panel-strong absolute top-full right-0 mt-3 w-72 overflow-hidden rounded-[1.5rem]">
            {/* User Info */}
            <div className="border-b border-white/10 px-5 py-4">
              <p className="app-kicker mb-2">Perfil</p>
              <p className="text-sm font-medium text-[var(--app-text)]">{userName}</p>
              <p className="mt-1 text-xs text-[var(--app-text-muted)]">{user?.email}</p>
            </div>

            {/* Menu Items */}
            <div className="px-2 py-2">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsSettingsModalOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[var(--app-text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--app-text)]"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Configurações</span>
              </button>

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsResetModalOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[#e3b0aa] transition-colors hover:bg-red-500/10 hover:text-[#f2d7d3]"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Resetar Dados</span>
              </button>

              <div className="my-2 border-t border-white/10" />

              <button
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[var(--app-text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--app-text)]"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sair</span>
              </button>
            </div>
          </div>
      )}
      </div>

      {/* Main Content */}
      <div className="app-content mx-auto max-w-7xl px-4 pb-40 pt-24 sm:px-6">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'commitments' && <CommitmentsView />}
        {currentView === 'incomes' && <IncomesView />}
        {currentView === 'stats' && <StatsView />}
        {currentView === 'goals' && <GoalsView />}
      </div>

      {/* Bottom Navigation */}
      <nav className="app-panel app-content fixed bottom-5 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 rounded-[2rem] px-3 py-3 sm:w-auto sm:px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-all ${currentView === 'dashboard'
              ? activeNavItemClass
              : inactiveNavItemClass
              }`}
          >
            <Calendar className="w-6 h-6" />
            <span className="hidden text-sm font-medium sm:inline">Início</span>
          </button>

          <button
            onClick={() => setCurrentView('commitments')}
            className={`flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-all ${currentView === 'commitments'
              ? activeNavItemClass
              : inactiveNavItemClass
              }`}
          >
            <ClipboardList className="w-6 h-6" />
            <span className="hidden text-sm font-medium sm:inline">Compromissos</span>
          </button>

          <button
            onClick={() => setCurrentView('incomes')}
            className={`flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-all ${currentView === 'incomes'
              ? activeNavItemClass
              : inactiveNavItemClass
              }`}
          >
            <DollarSign className="w-6 h-6" />
            <span className="hidden text-sm font-medium sm:inline">Entradas</span>
          </button>

          <button
            onClick={() => setCurrentView('stats')}
            className={`flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-all ${currentView === 'stats'
              ? activeNavItemClass
              : inactiveNavItemClass
              }`}
          >
            <TrendingUp className="w-6 h-6" />
            <span className="hidden text-sm font-medium sm:inline">Análise</span>
          </button>

          <button
            onClick={() => setCurrentView('goals')}
            className={`flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-all ${currentView === 'goals'
              ? activeNavItemClass
              : inactiveNavItemClass
              }`}
          >
            <Target className="w-6 h-6" />
            <span className="hidden text-sm font-medium sm:inline">Metas</span>
          </button>
        </div>
      </nav>

      {/* Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[2rem] app-panel-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4 text-2xl font-semibold text-[var(--app-text)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <Settings className="w-5 h-5" />
              </div>
              Configurações
            </DialogTitle>
            <DialogDescription className="mt-4 text-[var(--app-text-muted)]">
              Gerencie suas preferências e dados do aplicativo
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            {/* User Info Section */}
            <div className="app-panel rounded-[1.5rem] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Informações da conta</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--app-text-muted)]">Email:</span>
                  <span className="text-sm text-[var(--app-text)]">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--app-text-muted)]">Usuário:</span>
                  <span className="text-sm text-[var(--app-text)]">{userName}</span>
                </div>
              </div>
            </div>

            {/* Financial Configuration Section */}
            <div className="app-panel rounded-[1.5rem] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--app-text)]">Configurações financeiras</h3>
              <div className="space-y-4">
                {/* Saldo Inicial */}
                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Saldo inicial</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={configForm.initialBalance}
                      onChange={(e) => setConfigForm({ ...configForm, initialBalance: e.target.value })}
                      className="w-full rounded-2xl py-3 pl-10 pr-4"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="mt-1 text-xs text-[var(--app-text-faint)]">O saldo inicial da sua conta</p>
                </div>

                {/* Valor Diário Padrão */}
                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Valor diário padrão</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={configForm.dailyStandard}
                      onChange={(e) => setConfigForm({ ...configForm, dailyStandard: e.target.value })}
                      className="w-full rounded-2xl py-3 pl-10 pr-4"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="mt-1 text-xs text-[var(--app-text-faint)]">Quanto você planeja gastar por dia (gastos variáveis)</p>
                </div>

                {/* Data de Início do Saldo */}
                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]">Data de início do saldo</label>
                  <input
                    type="date"
                    value={configForm.balanceStartDate}
                    onChange={(e) => setConfigForm({ ...configForm, balanceStartDate: e.target.value })}
                    className="w-full rounded-2xl px-4 py-3"
                  />
                  <p className="mt-1 text-xs text-[var(--app-text-faint)]">A partir desta data, o sistema começará a descontar os gastos diários do seu saldo</p>
                </div>

                {/* Info Box */}
                <div className="app-note-accent rounded-2xl p-3">
                  <p className="text-xs">
                    <strong className="text-[var(--app-accent)]">Importante:</strong> Alterar a data de início do saldo
                    recalculará todos os valores do calendário a partir dessa nova data.
                  </p>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="app-button-primary w-full rounded-2xl px-4 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingConfig ? 'Salvando...' : 'Salvar configurações'}
                </button>
              </div>
            </div>

            {/* Data Management Section */}
            <div className="app-panel rounded-[1.5rem] p-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--app-text)]">Gerenciamento de dados</h3>
              <div className="space-y-2 text-sm text-[var(--app-text-muted)]">
                <p>• {transactions.length} transações registradas</p>
                <p>• {estimates.length} categorias de estimativas</p>
                <p>• {investments.length} investimentos</p>
                <p>• {goals.length} metas</p>
                <p>• Saldo inicial: R$ {config?.initialBalance.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="app-note-danger rounded-[1.5rem] p-4">
              <h3 className="mb-2 text-sm font-semibold text-[#f2d7d3]">Zona de perigo</h3>
              <p className="mb-3 text-xs text-[#e9c4bf]">
                Esta ação deletará permanentemente todos os seus dados.
              </p>
              <button
                onClick={() => {
                  setIsSettingsModalOpen(false);
                  setIsResetModalOpen(true);
                }}
                className="app-button-danger flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Resetar todos os dados
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="app-button-secondary flex-1 rounded-2xl px-4 py-3"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Data Confirmation Modal */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="max-w-md rounded-[2rem] app-panel-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4 text-2xl font-semibold text-[var(--app-text)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-[#f2d7d3]">
                <Trash2 className="w-5 h-5" />
              </div>
              Resetar Todos os Dados
            </DialogTitle>
            <DialogDescription className="mt-4 text-[#e9c4bf]">
              Atenção: esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="app-note-danger rounded-[1.5rem] p-4">
              <p className="mb-2 text-sm font-semibold text-[#f2d7d3]">
                Os seguintes dados serão deletados permanentemente:
              </p>
              <ul className="space-y-1 text-sm text-[#e9c4bf]">
                <li>• {transactions.length} transações</li>
                <li>• {estimates.length} estimativas</li>
                <li>• {investments.length} investimentos</li>
                <li>• {goals.length} metas</li>
                <li>• Saldo inicial será zerado (atual: R$ {config?.initialBalance.toFixed(2) || '0.00'})</li>
              </ul>
            </div>

            <div className="app-panel rounded-[1.5rem] p-4">
              <p className="text-sm text-[var(--app-text-muted)]">
                Esta ação não pode ser desfeita. Todos os seus dados financeiros serão perdidos.
                Tem certeza absoluta de que deseja continuar?
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsResetModalOpen(false)}
              disabled={resetting}
              className="app-button-secondary flex-1 rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleResetAllData}
              disabled={resetting}
              className="app-button-danger flex-1 rounded-2xl px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resetting ? 'Resetando...' : 'Sim, Deletar Tudo'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
