import { useState, useRef, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { CommitmentsView } from './components/CommitmentsView';
import { CreditCardsView } from './components/CreditCardsView';
import { IncomesView } from './components/IncomesView';
import { InvestmentsView } from './components/InvestmentsView';
import { StatsView } from './components/StatsView';
import { GoalsView } from './components/GoalsView';
import { GuideLandingPage } from './components/GuideLandingPage';
import { Auth } from './components/Auth';
import { FirstAccessSetup } from './components/FirstAccessSetup';
import { getUserThemePreference, type ThemePreference, useAuth } from '@/lib/hooks/useAuth';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { useEstimates } from '@/lib/hooks/useEstimates';
import { useInvestments } from '@/lib/hooks/useInvestments';
import { useGoals } from '@/lib/hooks/useGoals';
import { useConfig } from '@/lib/hooks/useConfig';
import { useDailyExpenses } from '@/lib/hooks/useDailyExpenses';
import { useCreditCards } from '@/lib/hooks/useCreditCards';
import { Calendar, TrendingUp, Target, ClipboardList, DollarSign, LogOut, Settings, User, Trash2, ChevronDown, Moon, Sun, BookOpen, Wallet, CreditCard, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';
import { Switch } from './components/ui/switch';
import { createDateFromString, getTodayLocal } from '@/lib/utils/dateHelpers';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

type AppView = 'dashboard' | 'commitments' | 'cards' | 'incomes' | 'investments' | 'stats' | 'goals' | 'guide';

const VIEW_PATHS: Record<AppView, string> = {
  dashboard: '/',
  commitments: '/compromissos',
  cards: '/cartoes',
  incomes: '/entradas',
  investments: '/investimentos',
  stats: '/analise',
  goals: '/metas',
  guide: '/como-usar',
};

const VIEW_ALIASES: Record<AppView, string[]> = {
  dashboard: ['/', '/inicio', '/dashboard'],
  commitments: ['/compromissos', '/commitments'],
  cards: ['/cartoes', '/cards'],
  incomes: ['/entradas', '/incomes'],
  investments: ['/investimentos', '/investments'],
  stats: ['/analise', '/analysis', '/stats'],
  goals: ['/metas', '/goals'],
  guide: ['/como-usar', '/guia', '/ajuda', '/help'],
};

interface NavItem {
  view: AppView;
  label: string;
  description: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  {
    view: 'dashboard',
    label: 'Início',
    description: 'Calendário e caixa disponível',
    icon: Calendar,
  },
  {
    view: 'commitments',
    label: 'Compromissos',
    description: 'Contas, parcelas e vencimentos',
    icon: ClipboardList,
  },
  {
    view: 'incomes',
    label: 'Entradas',
    description: 'Salários e outros recebimentos',
    icon: DollarSign,
  },
  {
    view: 'cards',
    label: 'Cartões',
    description: 'Limites, faturas e pagamentos',
    icon: CreditCard,
  },
  {
    view: 'investments',
    label: 'Investimentos',
    description: 'Patrimônio, aportes e resgates',
    icon: Wallet,
  },
  {
    view: 'stats',
    label: 'Análise',
    description: 'Indicadores e tendências',
    icon: TrendingUp,
  },
  {
    view: 'goals',
    label: 'Metas',
    description: 'Plano guiado e missões',
    icon: Target,
  },
];

const MOBILE_PRIMARY_VIEWS: AppView[] = ['dashboard', 'commitments', 'cards', 'goals'];

const normalizePathname = (pathname: string) => {
  if (!pathname) return '/';
  const normalized = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  return normalized || '/';
};

const getViewFromPath = (pathname: string): AppView | null => {
  const normalizedPath = normalizePathname(pathname);

  const matchedEntry = Object.entries(VIEW_ALIASES).find(([, paths]) => paths.includes(normalizedPath));
  return (matchedEntry?.[0] as AppView | undefined) ?? null;
};

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    return getViewFromPath(window.location.pathname) ?? 'dashboard';
  });
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => createDateFromString(getTodayLocal()));
  const { user, loading, signOut, updateThemePreference } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isEditingSetupOpen, setIsEditingSetupOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [savingSetupEdit, setSavingSetupEdit] = useState(false);
  const [savingFirstAccess, setSavingFirstAccess] = useState(false);
  const [savingPreview, setSavingPreview] = useState(false);
  const [pendingThemePreference, setPendingThemePreference] = useState<ThemePreference | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const lastNonGuideViewRef = useRef<AppView>('dashboard');
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isFirstAccessPreview =
    pathname === '/preview/primeiro-acesso' ||
    pathname === '/preview/first-access' ||
    searchParams?.get('preview') === 'primeiro-acesso' ||
    searchParams?.get('preview') === 'first-access';

  // Hooks para deletar dados
  const { transactions, deleteTransaction: deleteTransactionFn } = useTransactions(user?.id);
  const { estimates, deleteEstimate: deleteEstimateFn } = useEstimates(user?.id);
  const { investments, deleteInvestment: deleteInvestmentFn } = useInvestments(user?.id);
  const {
    cards,
    statements: creditCardStatements,
    payments: creditCardPayments,
    deleteCard: deleteCardFn,
    deleteStatement: deleteCreditCardStatementFn,
    deletePayment: deleteCreditCardPaymentFn,
  } = useCreditCards(user?.id);
  const { goals, deleteGoal: deleteGoalFn } = useGoals(user?.id);
  const { config, loading: configLoading, createConfig, updateConfig } = useConfig(user?.id);
  const { dailyExpenses, deleteDailyExpense: deleteDailyExpenseFn } = useDailyExpenses(user?.id);
  const userName = user?.email?.split('@')[0] || 'Usuário';
  const userThemePreference = getUserThemePreference(user);
  const effectiveThemePreference = pendingThemePreference ?? userThemePreference ?? 'light';
  const isDarkTheme = effectiveThemePreference === 'dark';
  const activeNavItemClass = 'bg-[var(--app-nav-active-bg)] text-[var(--app-text)] shadow-[var(--app-nav-active-shadow)]';
  const inactiveNavItemClass = 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]';
  const mobileNavItemBaseClass = 'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all';
  const desktopNavItemBaseClass = 'flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-all';
  const mobilePrimaryNavItems = NAV_ITEMS.filter((item) => MOBILE_PRIMARY_VIEWS.includes(item.view));
  const mobileOverflowNavItems = NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_VIEWS.includes(item.view));
  const isOverflowViewActive = mobileOverflowNavItems.some((item) => item.view === currentView);

  const handleSelectedMonthChange = (date: Date) => {
    setSelectedMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const navigateToView = (view: AppView) => {
    setIsMobileNavOpen(false);

    if (view !== 'guide') {
      lastNonGuideViewRef.current = view;
    }

    setCurrentView(view);

    if (typeof window === 'undefined') return;

    const nextPath = VIEW_PATHS[view];
    const currentPath = normalizePathname(window.location.pathname);

    if (currentPath !== nextPath) {
      window.history.pushState({ view }, '', nextPath);
    }
  };

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const viewFromUrl = getViewFromPath(window.location.pathname) ?? 'dashboard';
      if (viewFromUrl !== 'guide') {
        lastNonGuideViewRef.current = viewFromUrl;
      }
      setCurrentView(viewFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loading || !user || !config || isFirstAccessPreview || isEditingSetupOpen) return;

    const currentPath = normalizePathname(window.location.pathname);
    const expectedPath = VIEW_PATHS[currentView];

    if (currentPath === expectedPath) return;
    window.history.replaceState({ view: currentView }, '', expectedPath);
  }, [config, currentView, isEditingSetupOpen, isFirstAccessPreview, loading, user]);

  useEffect(() => {
    if (currentView !== 'guide') {
      lastNonGuideViewRef.current = currentView;
    }
  }, [currentView]);

  useEffect(() => {
    if (loading) return;
    if (resolvedTheme === effectiveThemePreference) return;
    setTheme(effectiveThemePreference);
  }, [effectiveThemePreference, loading, resolvedTheme, setTheme]);

  const handleThemeChange = async (nextTheme: ThemePreference) => {
    const previousTheme = userThemePreference ?? 'light';

    setPendingThemePreference(nextTheme);
    setTheme(nextTheme);

    if (!user) {
      setPendingThemePreference(null);
      return;
    }

    try {
      await updateThemePreference(nextTheme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
      setTheme(previousTheme);
      toast.error('Nao foi possivel salvar sua preferencia de tema.');
    } finally {
      setPendingThemePreference(null);
    }
  };

  const handleGuideBack = () => {
    if (!user || !config) {
      navigateToView('dashboard');
      return;
    }

    navigateToView(lastNonGuideViewRef.current);
  };

  const handleFirstAccessSubmit = async (initialConfig: {
    initialBalance: number;
    monthStartDay: number;
    mainIncomeDay: number;
    mainIncomeAmount: number;
    dailyStandard: number;
    balanceStartDate: string;
  }) => {
    if (!user?.id) return;

    try {
      setSavingFirstAccess(true);
      await createConfig(initialConfig);
    } finally {
      setSavingFirstAccess(false);
    }
  };

  const handleEditSetupSubmit = async (updatedConfig: {
    initialBalance: number;
    monthStartDay: number;
    mainIncomeDay: number;
    mainIncomeAmount: number;
    dailyStandard: number;
    balanceStartDate: string;
  }) => {
    if (!user?.id) return;

    try {
      setSavingSetupEdit(true);
      await updateConfig({
        initialBalance: updatedConfig.initialBalance,
        dailyStandard: updatedConfig.dailyStandard,
        balanceStartDate: updatedConfig.balanceStartDate
      });
      setIsEditingSetupOpen(false);
      toast.success('Configurações salvas com sucesso.');
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSavingSetupEdit(false);
    }
  };

  const handlePreviewSubmit = async () => {
    try {
      setSavingPreview(true);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      toast.info('Preview apenas: essa rota serve para visualizar a tela de primeiro acesso sem salvar nada.')
    } finally {
      setSavingPreview(false);
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

      // Delete all credit card payments and statements before cards
      const deleteCreditCardPaymentPromises = creditCardPayments.map(payment => deleteCreditCardPaymentFn(payment.id));
      await Promise.all(deleteCreditCardPaymentPromises);

      const deleteCreditCardStatementPromises = creditCardStatements.map(statement => deleteCreditCardStatementFn(statement.id));
      await Promise.all(deleteCreditCardStatementPromises);

      const deleteCreditCardPromises = cards.map(card => deleteCardFn(card.id));
      await Promise.all(deleteCreditCardPromises);

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
      toast.success('Todos os dados foram resetados com sucesso.');
      window.location.reload();
    } catch (err) {
      console.error('Error resetting data:', err);
      toast.error('Erro ao resetar dados. Tente novamente.');
    } finally {
      setResetting(false);
    }
  };

  if (isFirstAccessPreview) {
    return (
      <FirstAccessSetup
        preview
        userEmail="preview@automoney.app"
        saving={savingPreview}
        onSubmit={handlePreviewSubmit}
        initialValues={{
          form: {
            initialBalance: '2450.00',
            balanceStartDate: getTodayLocal(),
            dailyStandard: '77.22',
          },
          calculator: {
            food: '180',
            transport: '120',
            leisure: '90',
            personalCare: '40',
            smallExtras: '70',
            monthlyExtras: '150',
          },
        }}
      />
    );
  }

  // Show loading state while checking auth
  if (loading || (user && configLoading)) {
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
  if (currentView === 'guide') {
    return (
      <GuideLandingPage
        isAuthenticated={Boolean(user)}
        hasConfig={Boolean(config)}
        userEmail={user?.email}
        onPrimaryAction={() => navigateToView('dashboard')}
        onSecondaryAction={handleGuideBack}
      />
    );
  }

  if (!user) {
    return <Auth onOpenGuide={() => navigateToView('guide')} />;
  }

  if (!config) {
    return (
      <FirstAccessSetup
        userEmail={user.email}
        saving={savingFirstAccess}
        onSubmit={handleFirstAccessSubmit}
        onSignOut={signOut}
        onHelp={() => navigateToView('guide')}
      />
    );
  }

  if (isEditingSetupOpen) {
    return (
      <FirstAccessSetup
        mode="edit"
        userEmail={user.email}
        saving={savingSetupEdit}
        onSubmit={handleEditSetupSubmit}
        onBack={() => setIsEditingSetupOpen(false)}
        onHelp={() => navigateToView('guide')}
        initialValues={{
          form: {
            initialBalance: config.initialBalance.toString(),
            balanceStartDate: config.balanceStartDate || getTodayLocal(),
            dailyStandard: config.dailyStandard.toString(),
          },
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Top Controls */}
      <div className="app-content fixed right-4 top-4 z-50 flex items-center gap-2 sm:right-6 sm:top-6 sm:gap-3" ref={profileMenuRef}>
        <button
          type="button"
          onClick={() => {
            setIsProfileMenuOpen(false);
            setIsEditingSetupOpen(true);
          }}
          className="app-pill flex h-12 w-12 items-center justify-center rounded-full text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]"
          aria-label="Editar configuracao financeira"
        >
          <Settings className="h-5 w-5" />
        </button>

        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="app-pill flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[var(--app-text)] transition-all hover:bg-[var(--app-surface-soft)]"
        >
          {/* User Avatar */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
            style={{
              borderColor: 'color-mix(in srgb, var(--app-accent) 35%, transparent)',
              boxShadow: '0 10px 25px color-mix(in srgb, var(--app-accent) 20%, transparent)',
            }}
          >
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
            <div className="border-b border-[var(--app-border)] px-5 py-4">
              <p className="app-kicker mb-2">Perfil</p>
              <p className="text-sm font-medium text-[var(--app-text)]">{userName}</p>
              <p className="mt-1 text-xs text-[var(--app-text-muted)]">{user?.email}</p>
            </div>

            {/* Menu Items */}
            <div className="px-2 py-2">
              <div className="rounded-2xl px-4 py-3">
                <div className="mb-3">
                  <p className="text-sm font-medium text-[var(--app-text)]">Aparencia</p>
                  <p className="mt-1 text-xs text-[var(--app-text-faint)]">Troque entre tema claro e escuro.</p>
                </div>

                <div className="app-pill flex items-center justify-between gap-2 rounded-full px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => void handleThemeChange('light')}
                    aria-label="Ativar tema claro"
                    className={`rounded-full p-2 transition-colors ${!isDarkTheme ? 'bg-[var(--app-nav-active-bg)] text-[var(--app-warning)]' : 'text-[var(--app-text-faint)] hover:text-[var(--app-warning)]'}`}
                  >
                    <Sun className="h-4 w-4" />
                  </button>
                  <Switch
                    checked={isDarkTheme}
                    onCheckedChange={(checked) => void handleThemeChange(checked ? 'dark' : 'light')}
                    aria-label="Alternar tema"
                  />
                  <button
                    type="button"
                    onClick={() => void handleThemeChange('dark')}
                    aria-label="Ativar tema escuro"
                    className={`rounded-full p-2 transition-colors ${isDarkTheme ? 'bg-[var(--app-nav-active-bg)] text-[var(--app-accent)]' : 'text-[var(--app-text-faint)] hover:text-[var(--app-accent)]'}`}
                  >
                    <Moon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="my-2 border-t border-[var(--app-border)]" />

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  navigateToView('guide');
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]"
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Como usar</span>
              </button>

              <div className="my-2 border-t border-[var(--app-border)]" />

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsResetModalOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[var(--app-danger-muted)] transition-colors hover:bg-[var(--app-danger-surface)] hover:text-[var(--app-danger-text)]"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Resetar Dados</span>
              </button>

              <div className="my-2 border-t border-[var(--app-border)]" />

              <button
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]"
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
        {currentView === 'dashboard' && (
          <Dashboard
            onNavigate={(view) => {
              if (
                view === 'dashboard' ||
                view === 'commitments' ||
                view === 'cards' ||
                view === 'incomes' ||
                view === 'investments' ||
                view === 'stats' ||
                view === 'goals'
              ) {
                navigateToView(view);
              }
            }}
            selectedMonth={selectedMonth}
            onSelectedMonthChange={handleSelectedMonthChange}
          />
        )}
        {currentView === 'commitments' && (
          <CommitmentsView
            selectedMonth={selectedMonth}
            onSelectedMonthChange={handleSelectedMonthChange}
          />
        )}
        {currentView === 'cards' && (
          <CreditCardsView
            selectedMonth={selectedMonth}
            onSelectedMonthChange={handleSelectedMonthChange}
          />
        )}
        {currentView === 'incomes' && (
          <IncomesView
            selectedMonth={selectedMonth}
            onSelectedMonthChange={handleSelectedMonthChange}
          />
        )}
        {currentView === 'investments' && (
          <InvestmentsView
            selectedMonth={selectedMonth}
            onSelectedMonthChange={handleSelectedMonthChange}
          />
        )}
        {currentView === 'stats' && (
          <StatsView
            selectedMonth={selectedMonth}
            onSelectedMonthChange={handleSelectedMonthChange}
          />
        )}
        {currentView === 'goals' && <GoalsView />}
      </div>

      {/* Bottom Navigation */}
      <nav className="app-panel app-content fixed bottom-5 left-1/2 z-40 hidden w-auto max-w-4xl -translate-x-1/2 rounded-[2rem] px-4 py-3 sm:block">
        <div className="flex items-center gap-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;

            return (
              <button
                key={item.view}
                onClick={() => navigateToView(item.view)}
                className={`${desktopNavItemBaseClass} ${isActive ? activeNavItemClass : inactiveNavItemClass}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <nav className="app-panel app-content fixed bottom-4 left-1/2 z-40 w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 rounded-[2rem] px-2 py-2 sm:hidden">
        <div className="flex items-stretch gap-1">
          {mobilePrimaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;

            return (
              <button
                key={item.view}
                onClick={() => navigateToView(item.view)}
                className={`${mobileNavItemBaseClass} ${isActive ? activeNavItemClass : inactiveNavItemClass}`}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setIsMobileNavOpen(true)}
            className={`${mobileNavItemBaseClass} ${isOverflowViewActive || isMobileNavOpen ? activeNavItemClass : inactiveNavItemClass}`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="truncate">Mais</span>
          </button>
        </div>
      </nav>

      <Dialog open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <DialogContent className="app-panel-strong top-auto bottom-4 left-1/2 w-[calc(100vw-1rem)] max-w-md translate-x-[-50%] translate-y-0 rounded-[2rem] border-[var(--app-field-border)] p-0 sm:hidden">
          <div className="p-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-[var(--app-text)]">Mais áreas</DialogTitle>
              <DialogDescription className="text-[var(--app-text-muted)]">
                Atalhos extras para o mobile, sem lotar a barra inferior.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-2">
              {mobileOverflowNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;

                return (
                  <button
                    key={item.view}
                    onClick={() => navigateToView(item.view)}
                    className={`flex w-full items-center gap-4 rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-[var(--app-accent)]/30 bg-[var(--app-nav-active-bg)] text-[var(--app-text)]'
                        : 'border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      isActive ? 'bg-[var(--app-accent)]/12 text-[var(--app-accent)]' : 'bg-[var(--app-surface-strong)] text-[var(--app-text-muted)]'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs text-[var(--app-text-faint)]">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-[var(--app-border)] pt-4">
              <button
                onClick={() => navigateToView('guide')}
                className="flex w-full items-center gap-3 rounded-[1.5rem] px-4 py-3 text-sm font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]"
              >
                <BookOpen className="h-5 w-5" />
                <span>Como usar o app</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Data Confirmation Modal */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="max-w-md rounded-[2rem] app-panel-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4 text-2xl font-semibold text-[var(--app-text)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-danger-surface)] text-[var(--app-danger-text)]">
                <Trash2 className="w-5 h-5" />
              </div>
              Resetar Todos os Dados
            </DialogTitle>
            <DialogDescription className="mt-4 text-[var(--app-danger-muted)]">
              Atenção: esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="app-note-danger rounded-[1.5rem] p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--app-danger-text)]">
                Os seguintes dados serão deletados permanentemente:
              </p>
              <ul className="space-y-1 text-sm text-[var(--app-danger-muted)]">
                <li>• {transactions.length} transações</li>
                <li>• {estimates.length} estimativas</li>
                <li>• {investments.length} investimentos</li>
                <li>• {cards.length} cartões</li>
                <li>• {creditCardStatements.length} faturas de cartão</li>
                <li>• {creditCardPayments.length} pagamentos de cartão</li>
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
