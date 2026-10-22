import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { onAuthChange, getCurrentUser } from './lib/supabase'
import { getMyOrganizations, getMyWorker, acceptPendingInvitations } from './lib/api'
import { enableDemo, DEMO_ORG, DEMO_USER } from './lib/demo'
import Landing from './components/Landing'
import Auth from './components/Auth'
import Onboarding from './components/Onboarding'
import ComplyHub from './components/ComplyHub'
import EmployeePortal from './components/employee/EmployeePortal'
import EmployeeApp from './components/employee/EmployeeApp'
import InviteLanding from './components/employee/InviteLanding'
import CabinetConsole from './components/cabinet/CabinetConsole'
import CabinetDashboard from './components/cabinet/CabinetDashboard'

// Découpe l'ancre « #/chemin?clé=valeur » en { path, params }.
function parseHash(h) {
  const [path, query] = (h || '').replace(/^#/, '').split('?')
  return { path, params: new URLSearchParams(query || '') }
}

// Flux applicatif :
//   non connecté → <Auth /> → employeur : (pas d'org) → <Onboarding /> → <ComplyHub />
//                                employé  : <EmployeeApp />
export default function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [orgs, setOrgs] = useState([]) // organisations gérées (1 = employeur, ≥2 = cabinet)
  const [worker, setWorker] = useState(null) // fiche liée si l'utilisateur est un employé
  const [showAuth, setShowAuth] = useState(false) // bascule Landing → Auth
  const [demo, setDemo] = useState(false) // mode démo (sans Supabase)
  const [hash, setHash] = useState(() => window.location.hash) // routage simple par ancre

  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function startDemo() {
    enableDemo()
    setDemo(true)
  }

  // Détermine le rôle de l'utilisateur connecté : employeur (organisation)
  // ou employé (fiche travailleur liée via une invitation acceptée).
  async function resolveRole() {
    try {
      const os = await getMyOrganizations()
      if (os.length > 0) {
        setOrgs(os)
        setWorker(null)
        return
      }
      // Pas d'organisation : peut-être un employé invité. On rattache d'abord
      // toute invitation en attente visant son courriel, puis on cherche sa fiche.
      try {
        await acceptPendingInvitations()
      } catch {
        /* ignoré : table non migrée ou aucune invitation */
      }
      const w = await getMyWorker().catch(() => null)
      setOrgs([])
      setWorker(w)
    } catch {
      setOrgs([])
      setWorker(null)
    }
  }

  useEffect(() => {
    let active = true

    ;(async () => {
      const u = await getCurrentUser()
      if (!active) return
      setUser(u)
      if (u) await resolveRole()
      setLoading(false)
    })()

    const unsubscribe = onAuthChange(async (u) => {
      setUser(u)
      if (u) {
        await resolveRole()
      } else {
        setOrgs([])
        setWorker(null)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const { path, params } = parseHash(hash)

  // Aperçu public du portail employé (maquette), indépendant de l'authentification.
  if (path === '/employe') return <EmployeePortal />
  // Aperçu public de la console Cabinet (maquette).
  if (path === '/cabinet') return <CabinetConsole />

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#5E7385] gap-3">
        <Loader2 size={22} className="animate-spin" /> Chargement…
      </div>
    )
  }

  // Mode démo : tableau de bord employeur avec des données d'exemple.
  if (demo) return <ComplyHub org={DEMO_ORG} user={DEMO_USER} demo />

  // Page d'invitation (lien partagé par l'employeur) : si non connecté, on
  // propose l'inscription ; une fois connecté, le rattachement est automatique.
  if (path === '/invite' && !user) {
    return <InviteLanding token={params.get('token')} onDemo={startDemo} />
  }

  if (!user) {
    return showAuth ? (
      <Auth onDemo={startDemo} />
    ) : (
      <Landing onStart={() => setShowAuth(true)} onDemo={startDemo} />
    )
  }

  // Employé : portail dédié.
  if (worker) return <EmployeeApp worker={worker} user={user} onReload={resolveRole} />

  // Aucune organisation : création (onboarding).
  if (orgs.length === 0) return <Onboarding onCreated={() => resolveRole()} />

  // Cabinet : plusieurs clients, ou mode cabinet activé à l'onboarding.
  let cabinetFlag = false
  try {
    cabinetFlag = localStorage.getItem('complyhub_cabinet') === '1'
  } catch {
    /* stockage indisponible */
  }
  if (orgs.length >= 2 || cabinetFlag) {
    return <CabinetDashboard orgs={orgs} user={user} onReload={resolveRole} />
  }

  // Employeur unique : tableau de bord direct.
  return <ComplyHub org={orgs[0]} user={user} />
}
