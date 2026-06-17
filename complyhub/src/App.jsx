import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { onAuthChange, getCurrentUser } from './lib/supabase'
import { getMyOrganization } from './lib/api'
import { enableDemo, DEMO_ORG, DEMO_USER } from './lib/demo'
import Landing from './components/Landing'
import Auth from './components/Auth'
import Onboarding from './components/Onboarding'
import ComplyHub from './components/ComplyHub'

// Flux applicatif :
//   non connecté → <Auth /> → (pas d'org) → <Onboarding /> → <ComplyHub />
export default function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [org, setOrg] = useState(null)
  const [showAuth, setShowAuth] = useState(false) // bascule Landing → Auth
  const [demo, setDemo] = useState(false) // mode démo (sans Supabase)

  function startDemo() {
    enableDemo()
    setDemo(true)
  }

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

  // Mode démo : on entre directement dans le tableau de bord avec des données d'exemple.
  if (demo) return <ComplyHub org={DEMO_ORG} user={DEMO_USER} demo />

  if (!user) {
    return showAuth ? (
      <Auth onDemo={startDemo} />
    ) : (
      <Landing onStart={() => setShowAuth(true)} onDemo={startDemo} />
    )
  }
  if (!org) return <Onboarding onCreated={(o) => setOrg(o)} />
  return <ComplyHub org={org} user={user} />
}
