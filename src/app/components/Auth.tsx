import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'

export function Auth() {
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
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{
           background: 'linear-gradient(135deg, #37053b 0%, #4a1a4f 50%, #2d0831 100%)'
         }}>
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">AutoMoney</h1>
          <p className="text-gray-300">Gestão financeira inteligente</p>
        </div>

        {/* Auth Form */}
        <div className="backdrop-blur-lg bg-white/10 rounded-3xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#37ab98] transition-all"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#37ab98] transition-all"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {error && (
              <div className={`p-4 rounded-xl text-sm ${
                error.includes('criada')
                  ? 'bg-[#37ab98]/20 border border-[#37ab98]/30 text-[#80bc96]'
                  : 'bg-red-500/20 border border-red-500/30 text-red-200'
              }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#37ab98] to-[#80bc96] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#37ab98]/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Carregando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
            </button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="text-sm text-gray-300 hover:text-[#37ab98] transition-colors"
            >
              {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Seus dados são protegidos e criptografados
        </div>
      </div>
    </div>
  )
}
