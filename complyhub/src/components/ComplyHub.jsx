import { useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck,
  LayoutDashboard,
  FileCheck,
  Lock,
  FileText,
  Users,
  Check,
  AlertTriangle,
  XCircle,
  Clock,
  Bell,
  Plus,
  Loader2,
  LogOut,
} from 'lucide-react'
import { signOut, getCurrentUser } from '../lib/supabase'
import {
  getWorkers,
  getConditions,
  getWorkerCompliance,
  computeReadinessScore,
} from '../lib/api'
import { STATUS } from '../lib/constants'
import Gauge from './Gauge'
import Simulator from './Simulator'
import Vault from './Vault'
import Generator from './Generator'
import WorkerForm from './WorkerForm'

const NAV = [
  { id: 'dashboard', label: 'Tableau de bord', Icon: LayoutDashboard },
  { id: 'simulator', label: "Simulateur d'inspection", Icon: FileCheck },
  { id: 'vault', label: 'Coffre-fort documentaire', Icon: Lock },
  { id: 'generator', label: 'Générateur de documents', Icon: FileText },
]

const STATUS_ICON = { ok: Check, warn: AlertTriangle, pending: AlertTriangle, missing: XCircle, na: Clock }

// Statut « le pire d'abord » pour agréger plusieurs travailleurs sur une même condition.
const STATUS_RANK = { missing: 0, warn: 1, pending: 1, ok: 2, na: 3 }

function initials(text = '') {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export default function ComplyHub({ org, user }) {
  const [tab, setTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workers, setWorkers] = useState([])
  const [conditions, setConditions] = useState([])
  // Map workerId -> lignes de conformité (avec condition jointe).
  const [complianceByWorker, setComplianceByWorker] = useState({})
  const [filter, setFilter] = useState('Tous')
  const [showWorkerForm, setShowWorkerForm] = useState(false)
  const [me, setMe] = useState(user ?? null)

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [ws, conds] = await Promise.all([getWorkers(org.id), getConditions()])
      setWorkers(ws)
      setConditions(conds)

      const entries = await Promise.all(
        ws.map(async (w) => [w.id, await getWorkerCompliance(w.id)]),
      )
      setComplianceByWorker(Object.fromEntries(entries))
    } catch (err) {
      setError(err.message ?? 'Erreur de chargement des données.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    if (!me) getCurrentUser().then(setMe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.id])

  // Toutes les lignes de conformité, tous travailleurs confondus.
  const allCompliance = useMemo(
    () => Object.values(complianceByWorker).flat(),
    [complianceByWorker],
  )

  const score = useMemo(() => computeReadinessScore(allCompliance), [allCompliance])

  // Score par travailleur.
  const workerScores = useMemo(() => {
    const map = {}
    for (const w of workers) {
      map[w.id] = computeReadinessScore(complianceByWorker[w.id] ?? [])
    }
    return map
  }, [workers, complianceByWorker])

  // Agrégation par condition (statut « le pire d'abord ») pour le tableau du tableau de bord.
  const aggregatedConditions = useMemo(() => {
    return conditions.map((cond) => {
      const rows = allCompliance.filter((r) => r.condition_id === cond.id)
      let status = rows.length === 0 ? 'pending' : 'na'
      for (const r of rows) {
        if (STATUS_RANK[r.status] < STATUS_RANK[status]) status = r.status
      }
      return { ...cond, status }
    })
  }, [conditions, allCompliance])

  const counts = useMemo(() => {
    const applicable = allCompliance.filter((r) => r.status !== 'na')
    return {
      workers: workers.length,
      ok: applicable.filter((r) => r.status === 'ok').length,
      warn: applicable.filter((r) => r.status === 'warn' || r.status === 'pending').length,
      missing: applicable.filter((r) => r.status === 'missing').length,
    }
  }, [allCompliance, workers])

  const filteredConditions =
    filter === 'Tous'
      ? aggregatedConditions
      : aggregatedConditions.filter((c) => c.regime === filter || c.regime === 'Commun')

  const STAT_DATA = [
    { Icon: Users, val: counts.workers, label: 'Travailleurs actifs', accent: '#2E6CA4' },
    { Icon: Check, val: counts.ok, label: 'Conditions conformes', accent: '#2E9E6B' },
    { Icon: AlertTriangle, val: counts.warn, label: 'À vérifier', accent: '#E0A030' },
    { Icon: XCircle, val: counts.missing, label: 'Éléments manquants', accent: '#D1495B' },
  ]

  const pageTitle = NAV.find((n) => n.id === tab)?.label ?? ''

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR */}
      <aside className="w-[248px] bg-ink text-white px-4 py-6 flex flex-col sticky top-0 h-screen flex-shrink-0">
        <div className="flex items-center gap-3 px-2 pb-6">
          <div className="bg-gold rounded-xl p-2 flex items-center justify-center">
            <ShieldCheck size={22} className="text-ink" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-serif font-extrabold text-[19px] tracking-tight leading-none">
              ComplyHub
            </div>
            <div className="text-[10px] text-sky font-semibold uppercase tracking-widest mt-1">
              Conformité TET · PMI
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-btn ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto bg-deep rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold">
            <Bell size={15} className="text-gold" />
            <span>Alertes</span>
          </div>
          <div className="text-[11.5px] text-[#9FB8CE] leading-relaxed">
            {counts.missing > 0
              ? `${counts.missing} élément(s) manquant(s) à corriger avant une inspection.`
              : 'Aucune alerte critique. Continuez le suivi de vos conditions.'}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 px-6 sm:px-10 py-8 max-w-[1100px]">
        <div className="flex justify-between items-start mb-7 gap-4">
          <div>
            <h1 className="font-serif text-[27px] font-extrabold tracking-tight">{pageTitle}</h1>
            <p className="text-sm text-[#5E7385] mt-1.5">
              {org.name}
              {org.legal_name ? ` · ${org.legal_name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-full border border-line">
              <div className="w-8 h-8 rounded-full bg-steel text-white flex items-center justify-center font-bold text-[13px]">
                {initials(me?.email ?? org.name)}
              </div>
              <span className="text-[13.5px] font-semibold hidden sm:inline">
                {me?.email ?? 'Mon compte'}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="text-[#7A8FA0] hover:text-ink"
              title="Se déconnecter"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 text-[12.5px] bg-[#FAE5E8] text-danger rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-[#5E7385] py-20 justify-center">
            <Loader2 size={20} className="animate-spin" /> Chargement…
          </div>
        ) : (
          <>
            {tab === 'dashboard' && (
              <DashboardTab
                stats={STAT_DATA}
                score={score}
                workers={workers}
                workerScores={workerScores}
                conditions={filteredConditions}
                filter={filter}
                setFilter={setFilter}
                onAddWorker={() => setShowWorkerForm(true)}
              />
            )}
            {tab === 'simulator' && <Simulator />}
            {tab === 'vault' && <Vault />}
            {tab === 'generator' && <Generator />}
          </>
        )}
      </main>

      {showWorkerForm && (
        <WorkerForm
          orgId={org.id}
          onClose={() => setShowWorkerForm(false)}
          onCreated={loadData}
        />
      )}
    </div>
  )
}

// ---------- Onglet Tableau de bord ----------
function DashboardTab({ stats, score, workers, workerScores, conditions, filter, setFilter, onAddWorker }) {
  // État vide : aucun travailleur.
  if (workers.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center text-center py-16">
        <div className="bg-mist rounded-2xl p-4 mb-4">
          <Users size={28} className="text-steel" />
        </div>
        <h2 className="font-serif text-xl font-extrabold mb-1.5">Aucun travailleur pour l'instant</h2>
        <p className="text-sm text-[#5E7385] max-w-sm mb-6">
          Ajoutez votre premier travailleur étranger. ComplyHub générera automatiquement ses
          conditions de conformité et calculera votre score de préparation.
        </p>
        <button onClick={onAddWorker} className="btn-gold">
          <Plus size={16} /> Ajouter un travailleur
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Statistiques */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl px-5 py-4 border border-line flex-1 min-w-[150px]">
            <div className="rounded-lg p-2 inline-flex mb-2.5" style={{ background: `${s.accent}18` }}>
              <s.Icon size={18} style={{ color: s.accent }} />
            </div>
            <div className="text-[28px] font-extrabold font-serif leading-none">{s.val}</div>
            <div className="text-[12.5px] text-[#5E7385] mt-1.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Jauge + travailleurs */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="card flex items-center gap-6 flex-1 min-w-[300px]">
          <Gauge score={score} />
          <div>
            <div className="text-base font-bold mb-1.5">Préparation à l'inspection</div>
            <p className="text-[13px] text-[#5E7385] leading-relaxed max-w-[280px]">
              {score >= 85
                ? 'Votre dossier est solide. Maintenez vos conditions à jour.'
                : score >= 70
                  ? 'Votre dossier est presque prêt. Corrigez les éléments à vérifier pour atteindre 100 %.'
                  : 'Plusieurs éléments requièrent votre attention avant une inspection.'}
            </p>
          </div>
        </div>

        <div className="card flex-1 min-w-[300px]">
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-[15px] font-bold">Travailleurs étrangers</div>
            <button onClick={onAddWorker} className="text-steel hover:text-deep" title="Ajouter">
              <Plus size={18} />
            </button>
          </div>
          <div>
            {workers.map((w) => {
              const sc = workerScores[w.id] ?? 0
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between py-2.5 border-b border-mist last:border-0"
                >
                  <div>
                    <div className="text-[13.5px] font-semibold">{w.full_name}</div>
                    <div className="text-[11.5px] text-[#7A8FA0]">
                      {w.occupation ?? 'Travailleur'} · {w.program}
                    </div>
                  </div>
                  <div
                    className="font-bold text-sm"
                    style={{ color: sc >= 85 ? '#2E9E6B' : sc >= 70 ? '#E0A030' : '#D1495B' }}
                  >
                    {sc}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tableau des conditions */}
      <div className="card p-0 overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-line flex-wrap gap-3">
          <div className="text-[15px] font-bold">Conditions de conformité réglementaire</div>
          <div className="flex gap-1.5">
            {['Tous', 'PMI', 'PTET'].map((f) => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          {conditions.map((cond) => {
            const s = STATUS[cond.status] ?? STATUS.pending
            const Icon = STATUS_ICON[cond.status] ?? AlertTriangle
            return (
              <div
                key={cond.id}
                className="flex items-center gap-3.5 px-5 py-3 border-b border-mist last:border-0"
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: s.bg }}
                >
                  <Icon size={15} style={{ color: s.color }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold">{cond.label}</div>
                  <div className="text-[11px] text-[#9FB0BF] mt-px">{cond.category}</div>
                </div>
                <span className="badge">{cond.regime}</span>
                <span
                  className="text-xs font-bold min-w-[78px] text-right"
                  style={{ color: s.color }}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
