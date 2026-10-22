import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { signIn, signUp, isSupabaseConfigured } from '../lib/supabase'
import { useLang } from '../lib/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'

// Écran d'authentification (connexion / inscription).
// Props optionnelles : initialEmail / defaultMode / banner (utilisées par la
// page d'invitation d'un employé).
export default function Auth({ onDemo, initialEmail = '', defaultMode = 'login', banner = null }) {
  const { t } = useLang()
  const [mode, setMode] = useState(defaultMode) // 'login' | 'signup'
  const [email, setEmail] = useState(initialEmail)
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
        setMessage(t('au_signup_ok'))
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
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-ink to-steel p-6">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher variant="dark" />
      </div>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8 text-white">
          <img src="/complyhub-shield.png" alt="ComplyHub" className="h-12 w-auto logo-penumbra-dark" />
          <div>
            <div className="font-serif font-extrabold text-2xl leading-none">ComplyHub</div>
            <div className="text-[10px] text-sky font-semibold uppercase tracking-widest mt-1">
              Conformité TET · PMI
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-7 border border-line shadow-xl">
          <h1 className="font-serif text-2xl font-extrabold mb-1">
            {mode === 'login' ? t('au_login_title') : t('au_signup_title')}
          </h1>
          <p className="text-sm text-[#5E7385] mb-6">
            {mode === 'login' ? t('au_login_sub') : t('au_signup_sub')}
          </p>

          {banner}

          {!isSupabaseConfigured && (
            <div className="mb-5 text-[12.5px] bg-[#FBF1DE] text-[#7A5B17] rounded-xl px-4 py-3 leading-snug">
              Supabase n'est pas configuré. Créez <code>.env.local</code> avec
              <code> VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code>, puis
              redémarrez le serveur.
              {onDemo && (
                <>
                  {' '}Ou{' '}
                  <button onClick={onDemo} className="font-bold underline">
                    explorez la démo
                  </button>{' '}
                  sans configuration.
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="email">
                {t('au_email')}
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
                {t('au_password')}
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
              {mode === 'login' ? t('au_login_btn') : t('au_signup_btn')}
            </button>
          </form>

          <div className="text-center mt-5 text-[13px] text-[#5E7385]">
            {mode === 'login' ? (
              <>
                {t('au_no_account')}{' '}
                <button
                  className="text-steel font-semibold hover:underline"
                  onClick={() => {
                    setMode('signup')
                    setError('')
                    setMessage('')
                  }}
                >
                  {t('au_create_account')}
                </button>
              </>
            ) : (
              <>
                {t('au_have_account')}{' '}
                <button
                  className="text-steel font-semibold hover:underline"
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setMessage('')
                  }}
                >
                  {t('au_login_btn')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
