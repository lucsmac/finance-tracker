import { BookOpen, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'

interface AuthProps {
  onOpenGuide?: () => void
}

export function Auth({ onOpenGuide }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
        setError('Conta criada! Verifique seu email para confirmar.')
      } else {
        await signIn(email, password)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="app-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      style={{
        background: 'var(--app-bg)'
      }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-[#8537FD]/10 blur-3xl" />
        <div className="absolute bottom-16 right-10 h-96 w-96 rounded-full bg-[#E837FD]/8 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Title */}
        <div className="mb-12 text-center">
          <p className="app-kicker mb-4">Private finance cockpit</p>
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-[rgba(133,55,253,0.35)] bg-[var(--app-accent)] shadow-[0_16px_40px_rgba(133,55,253,0.22)]">
            <svg className="h-10 w-10 text-[var(--app-accent-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="app-page-title mb-3 text-5xl font-semibold sm:text-6xl">
            AutoMoney
          </h1>
          <p className="mx-auto max-w-sm text-lg text-[var(--app-text-muted)]">
            Planejamento financeiro com uma interface mais calma, clara e elegante.
          </p>
        </div>

        {/* Auth Form */}
        <div className="app-panel rounded-[2rem] p-8 sm:p-10">
          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-semibold text-[var(--app-text)]">
              {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-sm text-[var(--app-text-muted)]">
              {isSignUp ? 'Preencha os dados para começar' : 'Entre com suas credenciais'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[var(--app-text-muted)]">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-[var(--app-text-faint)] transition-colors group-focus-within:text-[var(--app-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] focus:border-[rgba(133,55,253,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(133,55,253,0.16)]"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-[var(--app-text-muted)]">
                Senha
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-[var(--app-text-faint)] transition-colors group-focus-within:text-[var(--app-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] focus:border-[rgba(133,55,253,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(133,55,253,0.16)]"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            {error && (
              <div className={`rounded-2xl p-4 text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
                error.includes('criada')
                  ? 'border border-[rgba(212,176,138,0.24)] bg-[rgba(212,176,138,0.14)] text-[var(--app-text)]'
                  : 'border border-[rgba(194,124,117,0.24)] bg-[rgba(194,124,117,0.14)] text-[var(--app-danger-text)]'
              }`}>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="app-button-primary mt-8 w-full rounded-2xl px-4 py-4 font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Carregando...
                </span>
              ) : (
                isSignUp ? 'Criar Conta' : 'Entrar'
              )}
            </button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="group inline-flex items-center gap-1 text-sm text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-accent)]"
            >
              {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma'}
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {onOpenGuide && (
            <div className="mt-4 border-t border-[var(--app-border)] pt-4 text-center">
              <button
                type="button"
                onClick={onOpenGuide}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-accent)]"
              >
                <BookOpen className="h-4 w-4" />
                Como usar o AutoMoney
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--app-text-faint)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Seus dados são protegidos e criptografados
          </div>
        </div>
      </div>
    </div>
  )
}
