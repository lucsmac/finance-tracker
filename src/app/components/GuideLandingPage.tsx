import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  LineChart,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react'

interface GuideLandingPageProps {
  hasConfig: boolean
  isAuthenticated: boolean
  onPrimaryAction: () => void
  onSecondaryAction: () => void
  userEmail?: string
}

const gettingStartedSteps = [
  {
    title: '1. Defina o ponto de partida',
    description: 'Informe saldo inicial, data de início e um gasto diário planejado para despesas variáveis.',
    icon: Wallet,
  },
  {
    title: '2. Cadastre seus compromissos',
    description: 'Registre contas fixas, parcelamentos e recorrências para o calendário já nascer realista.',
    icon: ClipboardList,
  },
  {
    title: '3. Lance entradas e ajustes do dia',
    description: 'Adicione salários, freelas e gastos diários reais para a previsão parar de ser só estimativa.',
    icon: DollarSign,
  },
  {
    title: '4. Use análise e metas para corrigir rota',
    description: 'Veja onde o dinheiro está indo, compartilhe relatórios e acompanhe metas de economia ou investimento.',
    icon: LineChart,
  },
] as const

const screenGuide = [
  {
    title: 'Painel inicial',
    description: 'Mostra o saldo projetado por dia. Se você não lançar gasto real, o app usa o gasto diário planejado como fallback.',
    accent: 'text-[var(--app-accent)]',
  },
  {
    title: 'Compromissos',
    description: 'Aqui entram aluguel, contas fixas, recorrências e parcelas. Isso alimenta a previsão do calendário.',
    accent: 'text-[var(--app-warning)]',
  },
  {
    title: 'Entradas',
    description: 'Cadastre salário, recebimentos extras e qualquer dinheiro que entra. Isso melhora a curva de saldo.',
    accent: 'text-[var(--app-success)]',
  },
  {
    title: 'Análise',
    description: 'Transforma seus lançamentos em leitura do período: entradas, saídas, categorias, taxa de poupança e relatório compartilhável.',
    accent: 'text-[var(--app-accent)]',
  },
  {
    title: 'Metas',
    description: 'Use para acompanhar objetivos de economia, limite de gasto ou foco em investimento.',
    accent: 'text-[var(--app-warning)]',
  },
  {
    title: 'Configuração',
    description: 'Se sua rotina mudar, volte e ajuste saldo inicial, data de início e gasto diário base sem refazer tudo do zero.',
    accent: 'text-[var(--app-success)]',
  },
] as const

const usagePrinciples = [
  'O saldo inicial é o ponto de partida do cálculo.',
  'A data de início define a partir de quando o app começa a descontar gastos.',
  'Gastos fixos, parcelas e investimentos saem do saldo nas datas cadastradas.',
  'Gastos diários reais substituem o planejado daquele dia; se não houver lançamento, entra o valor diário padrão.',
] as const

const commonQuestions = [
  {
    question: 'Preciso lançar tudo todos os dias?',
    answer: 'Não. O app já usa o gasto diário planejado como base. Você só registra o que quiser tornar mais preciso.',
  },
  {
    question: 'Posso mudar o valor diário depois?',
    answer: 'Sim. A tela de configuração continua acessível depois do primeiro acesso para recalibrar a previsão.',
  },
  {
    question: 'O que vale mais: gasto real ou planejado?',
    answer: 'O gasto real do dia. O planejado entra apenas quando você não registrou nenhuma despesa variável naquele dia.',
  },
  {
    question: 'Qual é o melhor fluxo para começar?',
    answer: 'Configurar base, cadastrar compromissos, lançar entradas e então acompanhar o calendário por alguns dias.',
  },
] as const

export function GuideLandingPage({
  hasConfig,
  isAuthenticated,
  onPrimaryAction,
  onSecondaryAction,
  userEmail,
}: GuideLandingPageProps) {
  const primaryLabel = !isAuthenticated
    ? 'Ir para login'
    : hasConfig
      ? 'Abrir meu painel'
      : 'Fazer configuração inicial'

  const secondaryLabel = isAuthenticated ? 'Voltar ao app' : 'Voltar'

  return (
    <div className="app-shell relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-14 h-72 w-72 rounded-full bg-[#8537FD]/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-[#E837FD]/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#AFFD37]/8 blur-3xl" />
      </div>

      <div className="app-content mx-auto max-w-6xl pb-16 pt-4">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onSecondaryAction}
            className="app-button-secondary inline-flex items-center gap-2 self-start rounded-2xl px-4 py-3 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {secondaryLabel}
          </button>

          <div className="app-tag inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.18em] sm:self-auto">
            <BookOpen className="h-3.5 w-3.5" />
            Guia de uso
          </div>
        </div>

        <section className="app-panel rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="app-kicker mb-3">Como usar o AutoMoney</p>
              <h1 className="app-page-title max-w-3xl text-4xl sm:text-5xl">
                Um passo a passo para quem está começando agora
              </h1>
              <p className="mt-4 max-w-2xl text-base text-[var(--app-text-muted)] sm:text-lg">
                O AutoMoney funciona melhor quando você entende uma lógica simples: definir sua base, cadastrar o que já está comprometido e deixar o calendário mostrar a margem real dos próximos dias.
              </p>

              {userEmail && (
                <p className="mt-4 text-sm text-[var(--app-text-faint)]">
                  Sessão atual: {userEmail}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onPrimaryAction}
                  className="app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-semibold"
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onSecondaryAction}
                  className="app-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-medium"
                >
                  Continuar lendo depois
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-5 sm:p-6">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-[rgba(133,55,253,0.28)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--app-text)]">Resumo em 30 segundos</h2>
              <div className="mt-5 space-y-3">
                {usagePrinciples.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--app-success)]" />
                    <p className="text-sm text-[var(--app-text-muted)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 app-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-6">
            <p className="app-kicker mb-2">Primeiro fluxo</p>
            <h2 className="text-2xl font-semibold text-[var(--app-text)]">Comece nessa ordem</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {gettingStartedSteps.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-surface-strong)] text-[var(--app-accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--app-text)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">{step.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="app-panel rounded-[2rem] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="app-kicker mb-1">Leitura do saldo</p>
                <h2 className="text-2xl font-semibold text-[var(--app-text)]">Como o cálculo funciona</h2>
              </div>
            </div>

            <div className="space-y-4">
              {usagePrinciples.map((item, index) => (
                <div key={item} className="app-note rounded-[1.5rem] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-text-faint)]">Passo {index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="app-panel rounded-[2rem] p-6 sm:p-8">
            <div className="mb-6">
              <p className="app-kicker mb-2">Tela por tela</p>
              <h2 className="text-2xl font-semibold text-[var(--app-text)]">O que cada área resolve</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {screenGuide.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
                  <h3 className={`text-base font-semibold ${item.accent}`}>{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 app-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-warning-surface)] text-[var(--app-warning)]">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="app-kicker mb-1">Dúvidas rápidas</p>
              <h2 className="text-2xl font-semibold text-[var(--app-text)]">Perguntas comuns de quem nunca usou</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {commonQuestions.map((item) => (
              <div key={item.question} className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-5">
                <h3 className="text-base font-semibold text-[var(--app-text)]">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 app-panel rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="app-kicker mb-2">Próximo passo</p>
              <h2 className="text-2xl font-semibold text-[var(--app-text)]">
                Leia uma vez e use o app por alguns dias
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
                O ganho real aparece quando você cadastra compromissos e passa a comparar o planejado com o que realmente gastou no dia a dia.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onSecondaryAction}
                className="app-button-secondary rounded-2xl px-5 py-4 font-medium"
              >
                Fechar guia
              </button>
              <button
                type="button"
                onClick={onPrimaryAction}
                className="app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-semibold"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
