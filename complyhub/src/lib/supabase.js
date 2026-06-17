import { createClient } from '@supabase/supabase-js'

// Les variables doivent commencer par VITE_ pour être exposées au client par Vite.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Avertissement clair en développement plutôt qu'une erreur cryptique plus loin.
  console.error(
    '[ComplyHub] Variables Supabase manquantes. Créez un fichier .env.local avec ' +
      'VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (voir .env.local.example), puis ' +
      'redémarrez le serveur Vite.',
  )
}

// True tant que les variables d'environnement ne sont pas configurées.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// createClient lève une erreur si l'URL est vide : on fournit un emplacement
// factice quand Supabase n'est pas configuré, afin que l'app affiche l'écran
// d'authentification (avec l'avertissement) au lieu d'un écran blanc.
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'public-anon-key-placeholder',
)

// ---------- Authentification ----------

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

/**
 * S'abonne aux changements d'état d'authentification.
 * @param {(user: object|null) => void} callback
 * @returns {() => void} fonction de désabonnement
 */
export function onAuthChange(callback) {
  if (!isSupabaseConfigured) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
  return () => data.subscription.unsubscribe()
}
