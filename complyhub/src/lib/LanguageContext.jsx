import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { makeT } from './i18n'

// ============================================================
//  Contexte de langue global (persisté dans localStorage).
//  Fournit { lang, setLang, t } à toute l'application : page d'accueil,
//  connexion et portail employé partagent le même choix de langue.
// ============================================================

const STORAGE_KEY = 'complyhub_lang'
const LanguageContext = createContext(null)

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'fr'
  } catch {
    return 'fr'
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStored)

  const setLang = (code) => {
    setLangState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      /* stockage indisponible (navigation privée) : on garde juste l'état mémoire */
    }
  }

  // Met à jour l'attribut lang du document (accessibilité / SEO).
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t: makeT(lang) }), [lang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

/** Hook d'accès à la langue courante. Repli autonome hors provider. */
export function useLang() {
  const ctx = useContext(LanguageContext)
  if (ctx) return ctx
  // Repli (ex. composant rendu isolément) : lecture seule du stockage.
  const lang = readStored()
  return { lang, setLang: () => {}, t: makeT(lang) }
}
