import { Globe } from 'lucide-react'
import { LANGUAGES } from '../lib/i18n'
import { useLang } from '../lib/LanguageContext'

// Sélecteur de langue réutilisable (page d'accueil, connexion…).
// variant : 'light' (fond clair) ou 'dark' (fond foncé).
export default function LanguageSwitcher({ variant = 'light', className = '' }) {
  const { lang, setLang } = useLang()
  const dark = variant === 'dark'

  return (
    <div
      className={`flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1.5 border ${
        dark ? 'bg-deep border-transparent' : 'bg-white border-line'
      } ${className}`}
    >
      <Globe size={15} className={dark ? 'text-sky' : 'text-steel'} />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Language / Langue"
        className={`text-[13px] font-semibold outline-none cursor-pointer bg-transparent pr-1 ${
          dark ? 'text-white' : 'text-ink'
        }`}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="text-ink">
            {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}
