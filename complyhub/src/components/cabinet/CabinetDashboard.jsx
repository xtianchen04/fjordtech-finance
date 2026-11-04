import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Users,
  Gauge as GaugeIcon,
  AlertTriangle,
  ChevronRight,
  Plus,
  Pencil,
  LogOut,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react'
import { signOut } from '../../lib/supabase'
import {
  getWorkers,
  getWorkerCompliance,
  computeReadinessScore,
  computeAlerts,
  createOrganization,
  updateOrganization,
} from '../../lib/api'
import { PROVINCES } from '../../lib/constants'
import LanguageSwitcher from '../LanguageSwitcher'
import ComplyHub from '../ComplyHub'
import AiAssistant from '../AiAssistant'

// ============================================================
//  Console Cabinet — version réelle (CRM multi-clients).
//  Le cabinet gère un portefeuille d'organisations-clients qu'il possède.
//  Ouvrir un client rend le tableau de bord ComplyHub complet pour cette org.
// ============================================================

const CRM_STATUS = {
  prospect: { label: 'Prospect', color: '#2E6CA4', bg: '#E8F1F8' },
  active: { label: 'Actif', color: '#2E9E6B', bg: '#E6F4EC' },
  review: { label: 'En revue', color: '#E0A030', bg: '#FBF1DE' },
  inactive: { label: 'Inactif', color: '#8AA0B2', bg: '#EEF3F7' },
}
const scoreColor = (s) => (s >= 85 ? '#2E9E6B' : s >= 70 ? '#E0A030' : '#D1495B')
const initials = (t = '') => t.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')

export default function CabinetDashboard({ orgs: orgsProp, user, onReload }) {
  const [selected, setSelected] = useState(null) // org ouverte → ComplyHub
  const [stats, setStats] = useState({}) // orgId -> { workers, score, alerts, loading }
  const [modal, setModal] = useState(null) // { mode:'add'|'edit', org? }

  const orgs = orgsProp ?? []

  // Charge les agrégats (travailleurs, score, alertes) par client.
  useEffect(() => {
    let active = true
    ;(async () => {
      for (const org of orgs) {
        try {
          const workers = await getWorkers(org.id)
          const comp = await Promise.all(workers.map((w) => getWorkerCompliance(w.id)))
          const byWorker = Object.fromEntries(workers.map((w, i) => [w.id, comp[i]]))
          const score = computeReadinessScore(comp.flat())
          const alerts = computeAlerts(workers, byWorker, org.alert_window_days ?? 90)
          if (!active) return
          setStats((s) => ({ ...s, [org.id]: { workers: workers.length, score, alerts: alerts.length } }))
        } catch {
          if (active) setStats((s) => ({ ...s, [org.id]: { workers: 0, score: 0, alerts: 0 } }))
        }
      }
    })()
    return () => {
      active = false
    }
  }, [orgs])

  const kpis = useMemo(() => {
    const vals = orgs.map((o) => stats[o.id]).filter(Boolean)
    const workers = vals.reduce((s, v) => s + v.workers, 0)
    const alerts = vals.reduce((s, v) => s + v.alerts, 0)
    const avg = vals.length ? Math.round(vals.reduce((s, v) => s + v.score, 0) / vals.length) : 0
    return { clients: orgs.length, workers, alerts, avg }
  }, [orgs, stats])

  // Un client ouvert → tableau de bord ComplyHub complet, avec retour.
  if (selected) {
    return <ComplyHub org={selected} user={user} onBack={() => setSelected(null)} />
  }

  const STAT_DATA = [
    { Icon: Building2, val: kpis.clients, label: 'Clients gérés', accent: '#2E6CA4' },
    { Icon: Users, val: kpis.workers, label: 'Travailleurs suivis', accent: '#13314F' },
    { Icon: GaugeIcon, val: `${kpis.avg}%`, label: 'Score moyen', accent: scoreColor(kpis.avg) },
    { Icon: AlertTriangle, val: kpis.alerts, label: 'Alertes actives', accent: '#D1495B' },
  ]

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="flex items-center justify-between px-5 sm:px-8 py-4 bg-ink text-white">
        <a href="#/" className="flex items-center gap-3 hover:opacity-90 transition" title="Accueil">
          <img src="/complyhub-shield.png" alt="ComplyHub" className="h-10 w-auto logo-penumbra-dark" />
          <div>
            <div className="font-serif font-extrabold text-[17px] leading-none">ComplyHub</div>
            <div className="text-[10px] text-gold font-semibold uppercase tracking-widest mt-1">
              Console Cabinet
            </div>
          </div>
        </a>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-ink bg-gold px-2.5 py-1 rounded-full">
            <Sparkles size={12} /> CABINET
          </span>
          <LanguageSwitcher variant="dark" />
          <span className="text-[13px] text-[#9FB8CE] hidden sm:inline">{user?.email}</span>
          <button onClick={() => signOut()} className="text-[#9FB8CE] hover:text-white" title="Se déconnecter">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-[1050px] w-full mx-auto p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="font-serif text-2xl font-extrabold tracking-tight mb-1">Portefeuille clients</h1>
            <p className="text-sm text-[#5E7385]">Tous vos employeurs-clients — préparation, travailleurs et alertes.</p>
          </div>
          <button onClick={() => setModal({ mode: 'add' })} className="btn-gold">
            <Plus size={16} /> Ajouter un client
          </button>
        </div>

        {/* KPIs */}
        <div className="flex gap-4 mb-6 flex-wrap">
          {STAT_DATA.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl px-5 py-4 border border-line flex-1 min-w-[150px]">
              <div className="rounded-lg p-2 inline-flex mb-2.5" style={{ background: `${s.accent}18` }}>
                <s.Icon size={18} style={{ color: s.accent }} />
              </div>
              <div className="text-[28px] font-extrabold font-serif leading-none">{s.val}</div>
              <div className="text-[12.5px] text-[#5E7385] mt-1.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Liste clients */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-line text-[15px] font-bold">Clients</div>
          <div>
            {orgs.map((org) => {
              const st = stats[org.id]
              const crm = CRM_STATUS[org.client_status] ?? CRM_STATUS.active
              return (
                <div key={org.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-mist last:border-0 hover:bg-paper transition">
                  <button onClick={() => setSelected(org)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="w-9 h-9 rounded-xl bg-mist text-steel flex items-center justify-center flex-shrink-0 font-bold text-[12px]">
                      {initials(org.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold truncate">{org.name}</div>
                      <div className="text-[11.5px] text-[#7A8FA0]">
                        {org.province ?? '—'}
                        {st ? ` · ${st.workers} travailleur(s)` : ' · …'}
                      </div>
                    </div>
                  </button>
                  <span
                    className="text-[10.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{ background: crm.bg, color: crm.color }}
                  >
                    {crm.label}
                  </span>
                  {st && st.alerts > 0 && (
                    <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{st.alerts}</span>
                  )}
                  <span className="font-bold text-sm w-11 text-right" style={{ color: scoreColor(st?.score ?? 0) }}>
                    {st ? `${st.score}%` : <Loader2 size={13} className="animate-spin inline" />}
                  </span>
                  <button onClick={() => setModal({ mode: 'edit', org })} className="text-[#9FB0BF] hover:text-steel p-1" title="Modifier la fiche client">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setSelected(org)} className="text-[#9FB0BF] hover:text-steel p-1" title="Ouvrir le dossier">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )
            })}
            {orgs.length === 0 && (
              <p className="text-[13px] text-[#7A8FA0] text-center py-10">
                Aucun client. Cliquez « Ajouter un client » pour créer votre premier dossier.
              </p>
            )}
          </div>
        </div>

        <p className="mt-5 text-[11.5px] text-[#9FB0BF]">
          Chaque client est un dossier ComplyHub complet. Ouvrez-le pour gérer ses travailleurs,
          sa conformité, ses documents et sa messagerie.
        </p>

        {/* Assistant IA de conformité (portefeuille) */}
        <AiAssistant
          className="mt-6"
          context={{ score: kpis.avg, alerts: kpis.alerts }}
        />
      </div>

      {modal && (
        <ClientModal
          mode={modal.mode}
          org={modal.org}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            onReload?.()
          }}
        />
      )}
    </div>
  )
}

// ---------- Modal : ajout / édition de la fiche client (CRM) ----------
function ClientModal({ mode, org, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: org?.name ?? '',
    province: org?.province ?? '',
    client_status: org?.client_status ?? 'prospect',
    contact_name: org?.contact_name ?? '',
    contact_email: org?.contact_email ?? '',
    contact_phone: org?.contact_phone ?? '',
    client_notes: org?.client_notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function save(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'add') {
        await createOrganization({
          name: form.name,
          province: form.province || null,
          client_status: form.client_status,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
        })
      } else {
        await updateOrganization(org.id, form)
      }
      onSaved?.()
    } catch (err) {
      setError(err.message ?? 'Échec de l’enregistrement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg my-6 border border-line shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="font-serif text-lg font-extrabold">
            {mode === 'add' ? 'Ajouter un client' : 'Fiche client'}
          </h2>
          <button onClick={onClose} className="text-[#7A8FA0] hover:text-ink" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="field-label">Nom du client (entreprise) *</label>
              <input required className="field-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Province</label>
              <select className="field-input" value={form.province} onChange={(e) => set('province', e.target.value)}>
                <option value="">Sélectionner…</option>
                {PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Statut</label>
              <select className="field-input" value={form.client_status} onChange={(e) => set('client_status', e.target.value)}>
                {Object.entries(CRM_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Personne-ressource</label>
              <input className="field-input" value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Courriel</label>
              <input type="email" className="field-input" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Téléphone</label>
              <input className="field-input" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Notes</label>
              <textarea rows={3} className="field-input" value={form.client_notes} onChange={(e) => set('client_notes', e.target.value)} />
            </div>
          </div>
          {error && <div className="text-[12.5px] text-danger font-medium">{error}</div>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="text-[13px] font-semibold text-[#5E7385] px-4 py-2.5 hover:text-ink">
              Annuler
            </button>
            <button type="submit" disabled={loading || !form.name} className="btn-primary">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'add' ? 'Créer le client' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
