import { useEffect, useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { getInvitationInfo } from '../../lib/api'
import Auth from '../Auth'

// Page ouverte via le lien d'invitation partagé par l'employeur :
//   .../#/invite?token=XXXX
// Affiche le contexte (entreprise, nom) puis l'inscription. Le rattachement
// du compte au travailleur se fait automatiquement à la connexion
// (accept_pending_invitations, par correspondance du courriel vérifié).
export default function InviteLanding({ token, onDemo }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        if (token) {
          const data = await getInvitationInfo(token)
          if (active) setInfo(data)
        }
      } catch {
        /* lien invalide : on affiche quand même l'inscription générique */
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#5E7385] gap-3">
        <Loader2 size={22} className="animate-spin" /> Chargement…
      </div>
    )
  }

  const valid = info && info.status !== 'revoked'

  const banner = (
    <div className="mb-5 text-[12.5px] bg-mist text-deep rounded-xl px-4 py-3 leading-snug">
      {valid ? (
        <>
          <span className="font-bold">{info.org_name}</span> vous invite à accéder à
          votre portail employé{info.worker_name ? ` (${info.worker_name})` : ''}.
          Créez votre mot de passe avec le courriel <strong>{info.email}</strong> pour
          activer votre compte.
        </>
      ) : (
        <>
          <ShieldCheck size={13} className="inline mr-1 text-steel" />
          Créez votre compte avec le courriel auquel vous avez reçu l'invitation de votre
          employeur. Votre accès s'activera automatiquement à la connexion.
        </>
      )}
    </div>
  )

  return (
    <Auth
      onDemo={onDemo}
      initialEmail={valid ? info.email : ''}
      defaultMode="signup"
      banner={banner}
    />
  )
}
