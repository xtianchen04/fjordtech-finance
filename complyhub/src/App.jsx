import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { onAuthChange, getCurrentUser } from './lib/supabase'
import { getMyOrganization } from './lib/api'
import Auth from './components/Auth'
import Onboarding from './components/Onboarding'
import ComplyHub from './components/ComplyHub'

// Flux applicatif :
//   non connecté → <Auth /> → (pas d'org) → <Onboarding /> → <ComplyHub />
export default function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [org, setOrg] = useState(null)

  // Charge l'organisation de l'utilisateur courant (si connecté).
  async function refreshOrg() {
    try {
      const o = await getMyOrganization()
      setOrg(o)
    } catch {
      setOrg(null)
    }
  }

  useEffect(() => {
    let active = true

    // État initial.
    ;(async () => {
      const u = await getCurrentUser()
      if (!active) return
      setUser(u)
      if (u) await refreshOrg()
      setLoading(false)
    })()

    // Réagit aux connexions / déconnexions.
    const unsubscribe = onAuthChange(async (u) => {
      setUser(u)
      if (u) {
        await refreshOrg()
      } else {
        setOrg(null)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#5E7385] gap-3">
        <Loader2 size={22} className="animate-spin" /> Chargement…
      </div>
    )
  }

  if (!user) return <Auth />
  if (!org) return <Onboarding onCreated={(o) => setOrg(o)} />
  return <ComplyHub org={org} user={user} />
}
