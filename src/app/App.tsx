import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { CommitmentsView } from './components/CommitmentsView';
import { IncomesView } from './components/IncomesView';
import { StatsView } from './components/StatsView';
import { Calendar, TrendingUp, Wallet, ClipboardList, DollarSign } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'commitments' | 'incomes' | 'stats' | 'settings'>('dashboard');

  return (
    <div className="min-h-screen bg-[#161618]">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'commitments' && <CommitmentsView />}
        {currentView === 'incomes' && <IncomesView />}
        {currentView === 'stats' && <StatsView />}
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
            onClick={() => setCurrentView('settings')}
            className={`flex flex-col items-center gap-1.5 transition-all ${
              currentView === 'settings'
                ? 'text-[#76C893] scale-110'
                : 'text-[#9CA3AF] hover:text-white/80'
            }`}
          >
            <Wallet className="w-6 h-6" />
            <span className="text-xs font-medium">Carteira</span>
          </button>
        </div>
      </nav>
    </div>
  );
}