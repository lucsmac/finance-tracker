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
import { Calendar, TrendingUp, Target, ClipboardList, DollarSign, LogOut, Settings, User, Trash2, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';

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
    dailyStandard: ''
  });

  // Hooks para deletar dados
  const { transactions, deleteTransaction: deleteTransactionFn } = useTransactions(user?.id);
  const { estimates, deleteEstimate: deleteEstimateFn } = useEstimates(user?.id);
  const { investments, deleteInvestment: deleteInvestmentFn } = useInvestments(user?.id);
  const { goals, deleteGoal: deleteGoalFn } = useGoals(user?.id);
  const { config, updateConfig } = useConfig(user?.id);

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
        dailyStandard: config.dailyStandard.toString()
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
        dailyStandard: parseFloat(configForm.dailyStandard) || 0
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
      <div className="min-h-screen flex items-center justify-center bg-[#161618]">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-[#161618]">
      {/* User Profile Menu */}
      <div className="fixed top-6 right-6 z-50" ref={profileMenuRef}>
        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-all"
        >
          {/* User Avatar */}
          <div className="w-8 h-8 bg-gradient-to-br from-[#76C893] to-[#9B97CE] rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>

          {/* User Name */}
          <span className="text-sm font-medium">{user?.email?.split('@')[0] || 'Usuário'}</span>

          {/* Dropdown Icon */}
          <ChevronDown className={`w-4 h-4 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isProfileMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-[#1e1e20] backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-sm font-medium text-white">{user?.email?.split('@')[0] || 'Usuário'}</p>
              <p className="text-xs text-white/50 mt-0.5">{user?.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsSettingsModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Configurações</span>
              </button>

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsResetModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Resetar Dados</span>
              </button>

              <div className="my-2 border-t border-white/10"></div>

              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sair</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'commitments' && <CommitmentsView />}
        {currentView === 'incomes' && <IncomesView />}
        {currentView === 'stats' && <StatsView />}
        {currentView === 'goals' && <GoalsView />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-10 py-4 shadow-2xl">
        <div className="flex items-center gap-8">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'dashboard'
              ? 'text-[#76C893] scale-110'
              : 'text-[#9CA3AF] hover:text-white/80'
              }`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-xs font-medium">Início</span>
          </button>

          <button
            onClick={() => setCurrentView('commitments')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'commitments'
              ? 'text-[#76C893] scale-110'
              : 'text-[#9CA3AF] hover:text-white/80'
              }`}
          >
            <ClipboardList className="w-6 h-6" />
            <span className="text-xs font-medium">Compromissos</span>
          </button>

          <button
            onClick={() => setCurrentView('incomes')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'incomes'
              ? 'text-[#76C893] scale-110'
              : 'text-[#9CA3AF] hover:text-white/80'
              }`}
          >
            <DollarSign className="w-6 h-6" />
            <span className="text-xs font-medium">Entradas</span>
          </button>

          <button
            onClick={() => setCurrentView('stats')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'stats'
              ? 'text-[#76C893] scale-110'
              : 'text-[#9CA3AF] hover:text-white/80'
              }`}
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs font-medium">Análise</span>
          </button>

          <button
            onClick={() => setCurrentView('goals')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'goals'
              ? 'text-[#76C893] scale-110'
              : 'text-[#9CA3AF] hover:text-white/80'
              }`}
          >
            <Target className="w-6 h-6" />
            <span className="text-xs font-medium">Metas</span>
          </button>
        </div>
      </nav>

      {/* Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="bg-[#1e1e20] border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-12 h-12 bg-[#76C893]/10 border border-[#76C893]/30 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-[#76C893]" />
              </div>
              Configurações
            </DialogTitle>
            <DialogDescription className="text-white/60 mt-4">
              Gerencie suas preferências e dados do aplicativo
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            {/* User Info Section */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <h3 className="text-sm font-semibold text-white mb-3">Informações da conta</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">Email:</span>
                  <span className="text-sm text-white">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">Usuário:</span>
                  <span className="text-sm text-white">{user?.email?.split('@')[0]}</span>
                </div>
              </div>
            </div>

            {/* Financial Configuration Section */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <h3 className="text-sm font-semibold text-white mb-3">Configurações financeiras</h3>
              <div className="space-y-4">
                {/* Saldo Inicial */}
                <div>
                  <label className="block text-sm text-white/60 mb-2">Saldo inicial</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={configForm.initialBalance}
                      onChange={(e) => setConfigForm({ ...configForm, initialBalance: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1">O saldo inicial da sua conta</p>
                </div>

                {/* Valor Diário Padrão */}
                <div>
                  <label className="block text-sm text-white/60 mb-2">Valor diário padrão</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={configForm.dailyStandard}
                      onChange={(e) => setConfigForm({ ...configForm, dailyStandard: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1">Quanto você planeja gastar por dia (gastos variáveis)</p>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="w-full px-4 py-2 bg-[#76C893] hover:bg-[#68b583] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingConfig ? 'Salvando...' : 'Salvar configurações'}
                </button>
              </div>
            </div>

            {/* Data Management Section */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <h3 className="text-sm font-semibold text-white mb-2">Gerenciamento de dados</h3>
              <div className="space-y-2 text-sm text-white/60">
                <p>• {transactions.length} transações registradas</p>
                <p>• {estimates.length} categorias de estimativas</p>
                <p>• {investments.length} investimentos</p>
                <p>• {goals.length} metas</p>
                <p>• Saldo inicial: R$ {config?.initialBalance.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <h3 className="text-sm font-semibold text-red-400 mb-2">Zona de perigo</h3>
              <p className="text-xs text-red-300/80 mb-3">
                Esta ação deletará permanentemente todos os seus dados.
              </p>
              <button
                onClick={() => {
                  setIsSettingsModalOpen(false);
                  setIsResetModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Resetar todos os dados
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-xl transition-colors"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Data Confirmation Modal */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="bg-[#1e1e20] border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              Resetar Todos os Dados
            </DialogTitle>
            <DialogDescription className="text-red-300/80 mt-4">
              ⚠️ ATENÇÃO: Esta ação é irreversível!
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-300 font-semibold mb-2">
                Os seguintes dados serão deletados permanentemente:
              </p>
              <ul className="text-sm text-red-200/80 space-y-1">
                <li>• {transactions.length} transações</li>
                <li>• {estimates.length} estimativas</li>
                <li>• {investments.length} investimentos</li>
                <li>• {goals.length} metas</li>
                <li>• Saldo inicial será zerado (atual: R$ {config?.initialBalance.toFixed(2) || '0.00'})</li>
              </ul>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-sm text-white/80">
                Esta ação não pode ser desfeita. Todos os seus dados financeiros serão perdidos.
                Tem certeza absoluta de que deseja continuar?
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsResetModalOpen(false)}
              disabled={resetting}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleResetAllData}
              disabled={resetting}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetting ? 'Resetando...' : 'Sim, Deletar Tudo'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}