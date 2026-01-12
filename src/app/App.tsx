import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { CommitmentsView } from './components/CommitmentsView';
import { IncomesView } from './components/IncomesView';
import { StatsView } from './components/StatsView';
import { GoalsView } from './components/GoalsView';
import { Auth } from './components/Auth';
import { useAuth } from '@/lib/hooks/useAuth';
import { Calendar, TrendingUp, Target, ClipboardList, DollarSign, LogOut } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'commitments' | 'incomes' | 'stats' | 'goals'>('dashboard');
  const { user, loading, signOut } = useAuth();

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
      {/* Logout Button */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sair</span>
        </button>
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
            className={`flex flex-col items-center gap-1.5 transition-all ${
              currentView === 'dashboard'
                ? 'text-[#76C893] scale-110'
                : 'text-[#9CA3AF] hover:text-white/80'
            }`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-xs font-medium">Início</span>
          </button>

          <button
            onClick={() => setCurrentView('commitments')}
            className={`flex flex-col items-center gap-1.5 transition-all ${
              currentView === 'commitments'
                ? 'text-[#76C893] scale-110'
                : 'text-[#9CA3AF] hover:text-white/80'
            }`}
          >
            <ClipboardList className="w-6 h-6" />
            <span className="text-xs font-medium">Compromissos</span>
          </button>

          <button
            onClick={() => setCurrentView('incomes')}
            className={`flex flex-col items-center gap-1.5 transition-all ${
              currentView === 'incomes'
                ? 'text-[#76C893] scale-110'
                : 'text-[#9CA3AF] hover:text-white/80'
            }`}
          >
            <DollarSign className="w-6 h-6" />
            <span className="text-xs font-medium">Entradas</span>
          </button>

          <button
            onClick={() => setCurrentView('stats')}
            className={`flex flex-col items-center gap-1.5 transition-all ${
              currentView === 'stats'
                ? 'text-[#76C893] scale-110'
                : 'text-[#9CA3AF] hover:text-white/80'
            }`}
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs font-medium">Análise</span>
          </button>

          <button
            onClick={() => setCurrentView('goals')}
            className={`flex flex-col items-center gap-1.5 transition-all ${
              currentView === 'goals'
                ? 'text-[#76C893] scale-110'
                : 'text-[#9CA3AF] hover:text-white/80'
            }`}
          >
            <Target className="w-6 h-6" />
            <span className="text-xs font-medium">Metas</span>
          </button>
        </div>
      </nav>
    </div>
  );
}