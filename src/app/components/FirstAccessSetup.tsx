import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Calculator,
  CalendarDays,
  CircleDollarSign,
  LogOut,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { getTodayLocal } from '@/lib/utils/dateHelpers'
import {
  calculateDailyBudgetSuggestion,
  type DailyBudgetCalculatorValues,
} from '@/lib/utils/dailyBudgetSuggestion'

interface FirstAccessSetupData {
  initialBalance: number
  monthStartDay: number
  mainIncomeDay: number
  mainIncomeAmount: number
  dailyStandard: number
  balanceStartDate: string
}

interface FirstAccessSetupInitialValues {
  form?: {
    initialBalance?: string
    balanceStartDate?: string
    dailyStandard?: string
  }
  calculator?: Partial<Record<keyof DailyBudgetCalculatorValues, string>>
}

interface FirstAccessSetupProps {
  userEmail?: string
  saving: boolean
  onSubmit: (data: FirstAccessSetupData) => Promise<void>
  onSignOut?: () => Promise<void> | void
  preview?: boolean
  initialValues?: FirstAccessSetupInitialValues
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const calculatorFields: Array<{
  key: keyof DailyBudgetCalculatorValues
  label: string
  hint: string
}> = [
  {
    key: 'food',
    label: 'Quanto você costuma gastar por semana com alimentação fora?',
    hint: 'Almoço, jantar, lanche e cafeteria fora da compra grande do mês.',
  },
  {
    key: 'transport',
    label: 'Quanto você costuma gastar por semana com combustível e transporte?',
    hint: 'Combustível, Uber, taxi, ônibus e metrô.',
  },
  {
    key: 'leisure',
    label: 'Quanto você costuma gastar por semana com lazer?',
    hint: 'Cinema, bares, streaming eventual, passeios e saídas.',
  },
  {
    key: 'personalCare',
    label: 'Quanto você costuma gastar por semana com farmácia e cuidados pessoais?',
    hint: 'Remédios, higiene, salão e compras rápidas de cuidado pessoal.',
  },
  {
    key: 'smallExtras',
    label: 'Quanto você costuma gastar por semana com pequenos extras?',
    hint: 'Delivery, conveniência, presentes pequenos e impulsos do dia a dia.',
  },
  {
    key: 'monthlyExtras',
    label: 'Existe algum valor extra variável que costuma aparecer no mês?',
    hint: 'Use este campo para imprevistos e gastos variáveis que não cabem no semanal.',
  },
]

const parseNumber = (value: string) => {
  const normalized = value.replace(',', '.').trim()
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function FirstAccessSetup({
  userEmail,
  saving,
  onSubmit,
  onSignOut,
  preview = false,
  initialValues,
}: FirstAccessSetupProps) {
  const [form, setForm] = useState(() => ({
    initialBalance: initialValues?.form?.initialBalance ?? '',
    balanceStartDate: initialValues?.form?.balanceStartDate ?? getTodayLocal(),
    dailyStandard: initialValues?.form?.dailyStandard ?? '',
  }))
  const [calculatorValues, setCalculatorValues] = useState<Record<keyof DailyBudgetCalculatorValues, string>>(() => ({
    food: initialValues?.calculator?.food ?? '',
    transport: initialValues?.calculator?.transport ?? '',
    leisure: initialValues?.calculator?.leisure ?? '',
    personalCare: initialValues?.calculator?.personalCare ?? '',
    smallExtras: initialValues?.calculator?.smallExtras ?? '',
    monthlyExtras: initialValues?.calculator?.monthlyExtras ?? '',
  }))
  const [error, setError] = useState<string | null>(null)

  const parsedCalculatorValues = useMemo<DailyBudgetCalculatorValues>(
    () => ({
      food: parseNumber(calculatorValues.food),
      transport: parseNumber(calculatorValues.transport),
      leisure: parseNumber(calculatorValues.leisure),
      personalCare: parseNumber(calculatorValues.personalCare),
      smallExtras: parseNumber(calculatorValues.smallExtras),
      monthlyExtras: parseNumber(calculatorValues.monthlyExtras),
    }),
    [calculatorValues],
  )

  const suggestion = useMemo(
    () => calculateDailyBudgetSuggestion(parsedCalculatorValues),
    [parsedCalculatorValues],
  )

  const hasCalculatorInput = Object.values(parsedCalculatorValues).some((value) => value > 0)

  const handleApplySuggestion = () => {
    setForm((current) => ({
      ...current,
      dailyStandard: suggestion.dailySuggestion.toFixed(2),
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!form.balanceStartDate) {
      setError('Escolha a data em que esse controle vai começar.')
      return
    }

    const initialBalance = parseNumber(form.initialBalance)
    const dailyStandard = parseNumber(form.dailyStandard)

    if (dailyStandard <= 0) {
      setError('Defina um gasto diário maior que zero ou use a sugestão da calculadora.')
      return
    }

    try {
      await onSubmit({
        initialBalance,
        monthStartDay: 1,
        mainIncomeDay: 5,
        mainIncomeAmount: 0,
        dailyStandard,
        balanceStartDate: form.balanceStartDate,
      })
    } catch (submitError) {
      console.error('Error creating first access config:', submitError)
      setError('Não foi possível salvar sua configuração inicial. Tente novamente.')
    }
  }

  return (
    <div
      className="app-shell relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8"
      style={{ background: 'var(--app-bg)' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="absolute -left-8 top-10 h-56 w-56 rounded-full bg-[#8537FD]/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-[#E837FD]/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#AFFD37]/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="app-kicker mb-3">Primeiro acesso</p>
            <h1 className="app-page-title max-w-3xl text-4xl sm:text-5xl">
              Vamos montar seu ponto de partida financeiro
            </h1>
            <p className="mt-4 max-w-2xl text-base text-[var(--app-text-muted)] sm:text-lg">
              Antes de abrir o painel, precisamos do saldo inicial, da data em que o controle comeca
              e de um gasto diario sugerido para as despesas variaveis.
            </p>
            {preview && (
              <div className="mt-4 inline-flex rounded-full border border-[rgba(175,253,55,0.22)] bg-[rgba(175,253,55,0.08)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#d8ff92]">
                Modo preview: nada sera salvo
              </div>
            )}
          </div>

          {onSignOut && (
            <button
              type="button"
              onClick={() => {
                void onSignOut()
              }}
              className="app-button-secondary hidden rounded-2xl px-4 py-3 text-sm sm:inline-flex sm:items-center sm:gap-2"
            >
              <LogOut className="h-4 w-4" />
              {preview ? 'Voltar' : 'Sair'}
            </button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="app-panel rounded-[2rem] p-6 sm:p-8">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-[rgba(133,55,253,0.35)] bg-[var(--app-accent)]/20 text-[var(--app-accent)]">
                <Wallet className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[var(--app-text)]">Configuracao inicial</h2>
                <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                  {userEmail ? `Conta conectada: ${userEmail}` : 'Defina os valores iniciais do seu planejamento.'}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
                  <CircleDollarSign className="h-4 w-4 text-[var(--app-accent)]" />
                  Saldo inicial
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--app-text-muted)]">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={form.initialBalance}
                    onChange={(event) => setForm((current) => ({ ...current, initialBalance: event.target.value }))}
                    onWheel={(event) => event.currentTarget.blur()}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] focus:border-[rgba(133,55,253,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(133,55,253,0.16)]"
                    placeholder="0,00"
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--app-text-faint)]">
                  Use o valor que voce tem disponivel hoje para iniciar o acompanhamento.
                </p>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
                  <CalendarDays className="h-4 w-4 text-[var(--app-accent)]" />
                  Data de inicio
                </label>
                <input
                  type="date"
                  value={form.balanceStartDate}
                  onChange={(event) => setForm((current) => ({ ...current, balanceStartDate: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-[var(--app-text)] focus:border-[rgba(133,55,253,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(133,55,253,0.16)]"
                />
                <p className="mt-2 text-xs text-[var(--app-text-faint)]">
                  Ja deixei o dia de hoje como padrao para marcar quando esse controle passa a valer.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[rgba(133,55,253,0.18)] bg-[rgba(133,55,253,0.08)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--app-text)]">Gasto diario planejado</p>
                    <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                      Esse valor serve como referencia para os gastos variaveis do dia a dia.
                    </p>
                  </div>
                  {hasCalculatorInput && (
                    <button
                      type="button"
                      onClick={handleApplySuggestion}
                      className="inline-flex items-center gap-2 rounded-xl border border-[rgba(133,55,253,0.28)] bg-[var(--app-accent)]/15 px-3 py-2 text-xs font-medium text-[var(--app-accent)] transition-colors hover:bg-[var(--app-accent)]/25"
                    >
                      <Sparkles className="h-4 w-4" />
                      Usar sugestao
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--app-text-muted)]">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={form.dailyStandard}
                    onChange={(event) => setForm((current) => ({ ...current, dailyStandard: event.target.value }))}
                    onWheel={(event) => event.currentTarget.blur()}
                    className="w-full rounded-2xl border border-white/10 bg-[var(--app-field-bg-strong)] py-3.5 pl-12 pr-4 text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] focus:border-[rgba(133,55,253,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(133,55,253,0.16)]"
                    placeholder="0,00"
                  />
                </div>

                {hasCalculatorInput ? (
                  <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-faint)]">
                        Total semanal
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">
                        {currencyFormatter.format(suggestion.weeklyTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-faint)]">
                        Estimativa mensal
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">
                        {currencyFormatter.format(suggestion.monthlyEstimate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-faint)]">
                        Sugestao diaria
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[#AFFD37]">
                        {currencyFormatter.format(suggestion.dailySuggestion)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[var(--app-text-faint)]">
                    Preencha a calculadora abaixo se quiser que o app sugira esse valor automaticamente.
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-[rgba(194,124,117,0.24)] bg-[rgba(194,124,117,0.14)] p-4 text-sm text-[#f1d5d1]">
                {error}
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    void onSignOut()
                  }}
                  className="app-button-secondary rounded-2xl px-4 py-4 sm:hidden"
                >
                  {preview ? 'Voltar' : 'Sair'}
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Salvando configuracao...' : preview ? 'Testar fluxo' : 'Entrar no painel'}
                {!saving && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>

          <section className="app-panel rounded-[2rem] p-6 sm:p-8">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/[0.05] text-[#AFFD37]">
                <Calculator className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[var(--app-text)]">Calculadora do gasto diario</h2>
                <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                  A ideia aqui e estimar so os gastos variaveis do dia a dia. Compra mensal e contas fixas ficam fora.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {calculatorFields.map((field) => (
                <div key={field.key} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <label className="block text-sm font-medium text-[var(--app-text)]">
                    {field.label}
                  </label>
                  <p className="mt-1 text-xs text-[var(--app-text-faint)]">{field.hint}</p>
                  <div className="relative mt-3">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--app-text-muted)]">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={calculatorValues[field.key]}
                      onChange={(event) =>
                        setCalculatorValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      onWheel={(event) => event.currentTarget.blur()}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-12 pr-4 text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] focus:border-[rgba(133,55,253,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(133,55,253,0.16)]"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[rgba(255,255,255,0.08)] bg-black/20 p-5">
              <p className="text-sm font-medium text-[var(--app-text)]">Como a sugestao e calculada</p>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                Somamos seus gastos semanais, transformamos isso em uma estimativa mensal e dividimos por 30 dias.
                O resultado vira um ponto de partida que voce pode ajustar manualmente.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
