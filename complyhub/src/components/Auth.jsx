import { useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { signIn, signUp, isSupabaseConfigured } from '../lib/supabase'

// Écran d'authentification (connexion / inscription).
export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password)
        setMessage(
          'Compte créé. Vérifiez votre boîte courriel pour confirmer votre adresse, puis connectez-vous.',
        )
        setMode('login')
      } else {
        await signIn(email, password)
        // La redirection est gérée par onAuthChange dans App.jsx.
      }
    } catch (err) {
      setError(err.message ?? 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ink to-steel p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8 text-white">
          <div className="bg-gold rounded-xl p-2.5">
            <ShieldCheck size={26} className="text-ink" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-serif font-extrabold text-2xl leading-none">ComplyHub</div>
            <div className="text-[10px] text-sky font-semibold uppercase tracking-widest mt-1">
              Conformité TET · PMI
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-7 border border-line shadow-xl">
          <h1 className="font-serif text-2xl font-extrabold mb-1">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h1>
          <p className="text-sm text-[#5E7385] mb-6">
            {mode === 'login'
              ? 'Accédez à votre tableau de bord de conformité.'
              : 'Commencez à sécuriser votre dossier de conformité.'}
          </p>

          {!isSupabaseConfigured && (
            <div className="mb-5 text-[12.5px] bg-[#FBF1DE] text-[#7A5B17] rounded-xl px-4 py-3 leading-snug">
              Supabase n'est pas configuré. Créez <code>.env.local</code> avec
              <code> VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code>, puis
              redémarrez le serveur.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="email">
                Courriel
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.ca"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <div className="text-[12.5px] text-danger font-medium">{error}</div>}
            {message && <div className="text-[12.5px] text-ok font-medium">{message}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'Se connecter' : "S'inscrire"}
            </button>
          </form>

          <div className="text-center mt-5 text-[13px] text-[#5E7385]">
            {mode === 'login' ? (
              <>
                Pas encore de compte ?{' '}
                <button
                  className="text-steel font-semibold hover:underline"
                  onClick={() => {
                    setMode('signup')
                    setError('')
                    setMessage('')
                  }}
                >
                  Créer un compte
                </button>
              </>
            ) : (
              <>
                Déjà inscrit ?{' '}
                <button
                  className="text-steel font-semibold hover:underline"
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setMessage('')
                  }}
                >
                  Se connecter
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
