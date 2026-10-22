import { useEffect, useState } from 'react'
import { X, Loader2, UserPlus, Check, Copy, Mail } from 'lucide-react'
import {
  getWorkerCompliance,
  updateWorkerCompliance,
  computeReadinessScore,
  getInvitations,
  inviteWorker,
  revokeInvitation,
} from '../lib/api'
import { STATUS } from '../lib/constants'

const STATUS_OPTIONS = [
  { value: 'ok', label: 'Conforme' },
  { value: 'warn', label: 'À vérifier' },
  { value: 'missing', label: 'Manquant' },
  { value: 'na', label: 'N/A' },
  { value: 'pending', label: 'En attente' },
]

// Modal de détail d'un travailleur : permet d'éditer le statut de chaque condition.
export default function WorkerDetail({ worker, onClose, onChange }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      setRows(await getWorkerCompliance(worker.id))
    } catch (err) {
      setError(err.message ?? 'Erreur de chargement.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker.id])

  async function changeStatus(row, status) {
    setSavingId(row.id)
    setError('')
    // Mise à jour optimiste.
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)))
    try {
      await updateWorkerCompliance(row.id, { status })
      onChange?.()
    } catch (err) {
      setError(err.message ?? 'Échec de la mise à jour.')
      load()
    } finally {
      setSavingId(null)
    }
  }

  const score = computeReadinessScore(rows)
  const scoreColor = score >= 85 ? '#2E9E6B' : score >= 70 ? '#E0A030' : '#D1495B'

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl my-6 border border-line shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <h2 className="font-serif text-lg font-extrabold">{worker.full_name}</h2>
            <p className="text-[12.5px] text-[#7A8FA0]">
              {worker.occupation ?? 'Travailleur'} · {worker.program}
              {worker.permit_expiry ? ` · permis exp. ${worker.permit_expiry}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-extrabold font-serif" style={{ color: scoreColor }}>
                {score}%
              </div>
              <div className="text-[10px] text-[#7A8FA0] uppercase tracking-wide">Prêt</div>
            </div>
            <button onClick={onClose} className="text-[#7A8FA0] hover:text-ink" aria-label="Fermer">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <InviteSection worker={worker} />

          {error && <div className="text-[12.5px] text-danger font-medium mb-3">{error}</div>}
          {loading ? (
            <div className="flex items-center gap-2 text-[#5E7385] py-10 justify-center">
              <Loader2 size={18} className="animate-spin" /> Chargement…
            </div>
          ) : (
            <div>
              {rows.map((row) => {
                const cond = row.condition ?? {}
                const s = STATUS[row.status] ?? STATUS.pending
                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 py-3 border-b border-mist last:border-0"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: s.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold">{cond.label}</div>
                      <div className="text-[11px] text-[#9FB0BF]">
                        {cond.category} · {cond.regime}
                        {cond.reference ? ` · ${cond.reference}` : ''}
                      </div>
                    </div>
                    <select
                      className="field-input max-w-[150px] py-1.5"
                      value={row.status}
                      disabled={savingId === row.id}
                      onChange={(e) => changeStatus(row, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Accès au portail employé (invitation) ----------
function InviteSection({ worker }) {
  const [email, setEmail] = useState(worker.email ?? '')
  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const active = Boolean(worker.user_id) // compte déjà rattaché

  async function load() {
    try {
      const all = await getInvitations(worker.org_id)
      setInvitation(all.find((i) => i.worker_id === worker.id && i.status !== 'revoked') ?? null)
    } catch {
      /* table non migrée : on masque la section */
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker.id])

  async function invite() {
    if (!email) return
    setBusy(true)
    setError('')
    try {
      const inv = await inviteWorker(worker.org_id, worker.id, email)
      setInvitation(inv)
    } catch (err) {
      setError(err.message ?? 'Échec de l’invitation.')
    } finally {
      setBusy(false)
    }
  }

  async function revoke() {
    if (!invitation) return
    setBusy(true)
    try {
      await revokeInvitation(invitation.id)
      setInvitation(null)
    } finally {
      setBusy(false)
    }
  }

  const inviteLink = invitation
    ? `${window.location.origin}/#/invite?token=${invitation.token}`
    : ''

  function copy() {
    navigator.clipboard?.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  if (loading) return null

  return (
    <div className="bg-paper border border-line rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-[13.5px] font-bold flex items-center gap-2">
          <UserPlus size={15} className="text-steel" /> Accès au portail employé
        </div>
        {active ? (
          <span className="text-[11px] font-bold text-ok bg-[#E6F4EC] px-2.5 py-1 rounded-full flex items-center gap-1">
            <Check size={12} /> Compte actif
          </span>
        ) : invitation ? (
          <span className="text-[11px] font-bold text-amber bg-[#FBF1DE] px-2.5 py-1 rounded-full">
            Invité · en attente
          </span>
        ) : (
          <span className="text-[11px] font-bold text-[#7A8FA0] bg-mist px-2.5 py-1 rounded-full">
            Pas encore invité
          </span>
        )}
      </div>

      {active ? (
        <p className="text-[12px] text-[#5E7385]">
          Ce travailleur a activé son compte et peut se connecter à son portail (profil, documents,
          messages).
        </p>
      ) : (
        <>
          <p className="text-[12px] text-[#5E7385] mb-3">
            Invitez le travailleur à son portail. Son accès s’activera lorsqu’il créera son compte
            avec ce courriel.
          </p>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9FB0BF]" />
              <input
                type="email"
                className="field-input pl-9"
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button onClick={invite} disabled={busy || !email} className="btn-primary">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              {invitation ? 'Renvoyer' : 'Inviter'}
            </button>
          </div>

          {invitation && (
            <div className="mt-3">
              <div className="text-[11.5px] text-[#7A8FA0] mb-1">
                Lien d’invitation à partager (courriel, SMS, WhatsApp…) :
              </div>
              <div className="flex gap-2">
                <input className="field-input text-[12px] flex-1" value={inviteLink} readOnly />
                <button onClick={copy} className="filter-btn" title="Copier le lien">
                  {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                </button>
              </div>
              <button onClick={revoke} className="text-[11.5px] text-danger font-semibold mt-2 hover:underline">
                Révoquer l’invitation
              </button>
            </div>
          )}
        </>
      )}

      {error && <div className="text-[12px] text-danger font-medium mt-2">{error}</div>}
    </div>
  )
}
