import { useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck,
  LayoutDashboard,
  FileCheck,
  Lock,
  FileText,
  Bell,
  CreditCard,
  Newspaper,
  MessageSquare,
  ScrollText,
  Settings as SettingsIcon,
  Users,
  Check,
  AlertTriangle,
  XCircle,
  Clock,
  Plus,
  Loader2,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { signOut, getCurrentUser } from '../lib/supabase'
import {
  getWorkers,
  getConditions,
  getWorkerCompliance,
  getDocuments,
  computeReadinessScore,
  computeAlerts,
} from '../lib/api'
import { STATUS } from '../lib/constants'
import { useLang } from '../lib/LanguageContext'
import { statusLabel } from '../lib/i18n'
import Gauge from './Gauge'
import Simulator from './Simulator'
import Vault from './Vault'
import Generator from './Generator'
import Alerts from './Alerts'
import Billing from './Billing'
import RegulatoryUpdates from './RegulatoryUpdates'
import Settings from './Settings'
import Messaging from './Messaging'
import AuditLog from './AuditLog'
import WorkerForm from './WorkerForm'
import WorkerDetail from './WorkerDetail'

const NAV = [
  { id: 'dashboard', key: 'd_nav_dashboard', Icon: LayoutDashboard },
  { id: 'alerts', key: 'd_nav_alerts', Icon: Bell },
  { id: 'messaging', key: 'd_nav_messaging', Icon: MessageSquare },
  { id: 'updates', key: 'd_nav_updates', Icon: Newspaper },
  { id: 'simulator', key: 'd_nav_simulator', Icon: FileCheck },
  { id: 'vault', key: 'd_nav_vault', Icon: Lock },
  { id: 'generator', key: 'd_nav_generator', Icon: FileText },
  { id: 'audit', key: 'd_nav_audit', Icon: ScrollText },
  { id: 'billing', key: 'd_nav_billing', Icon: CreditCard },
  { id: 'settings', key: 'd_nav_settings', Icon: SettingsIcon },
]

const STATUS_ICON = { ok: Check, warn: AlertTriangle, pending: AlertTriangle, missing: XCircle, na: Clock }
const STATUS_RANK = { missing: 0, warn: 1, pending: 1, ok: 2, na: 3 }

function initials(text = '') {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export default function ComplyHub({ org: orgProp, user, demo = false }) {
  // Copie locale de l'organisation : mise à jour immédiate après l'écran Paramètres
  // (en-tête, veille réglementaire, fenêtre d'alerte…).
  const { t } = useLang()
  const [org, setOrg] = useState(orgProp)
  const [tab, setTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workers, setWorkers] = useState([])
  const [conditions, setConditions] = useState([])
  const [complianceByWorker, setComplianceByWorker] = useState({})
  const [documents, setDocuments] = useState([])
  const [filter, setFilter] = useState('Tous')
  const [showWorkerForm, setShowWorkerForm] = useState(false)
  const [detailWorker, setDetailWorker] = useState(null)
  const [me, setMe] = useState(user ?? null)

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [ws, conds, docs] = await Promise.all([
        getWorkers(org.id),
        getConditions(),
        getDocuments(org.id).catch(() => []),
      ])
      setWorkers(ws)
      setConditions(conds)
      setDocuments(docs)

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

  // Recharge uniquement la conformité (après édition d'un statut), sans plein écran de chargement.
  async function reloadCompliance() {
    const entries = await Promise.all(
      workers.map(async (w) => [w.id, await getWorkerCompliance(w.id)]),
    )
    setComplianceByWorker(Object.fromEntries(entries))
  }

  async function reloadDocuments() {
    setDocuments(await getDocuments(org.id).catch(() => []))
  }

  useEffect(() => {
    loadData()
    if (!me) getCurrentUser().then(setMe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.id])

  const allCompliance = useMemo(
    () => Object.values(complianceByWorker).flat(),
    [complianceByWorker],
  )

  const score = useMemo(() => computeReadinessScore(allCompliance), [allCompliance])

  const workerScores = useMemo(() => {
    const map = {}
    for (const w of workers) map[w.id] = computeReadinessScore(complianceByWorker[w.id] ?? [])
    return map
  }, [workers, complianceByWorker])

  const alerts = useMemo(
    () => computeAlerts(workers, complianceByWorker, org.alert_window_days ?? 90),
    [workers, complianceByWorker, org.alert_window_days],
  )

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
    { Icon: Users, val: counts.workers, label: t('d_stat_workers'), accent: '#2E6CA4' },
    { Icon: Check, val: counts.ok, label: t('d_stat_ok'), accent: '#2E9E6B' },
    { Icon: AlertTriangle, val: counts.warn, label: t('d_stat_warn'), accent: '#E0A030' },
    { Icon: XCircle, val: counts.missing, label: t('d_stat_missing'), accent: '#D1495B' },
  ]

  const pageTitle = t(NAV.find((n) => n.id === tab)?.key ?? '')

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR */}
      <aside className="w-[248px] bg-ink text-white px-4 py-6 flex flex-col sticky top-0 h-screen flex-shrink-0">
        <button
          onClick={() => setTab('dashboard')}
          className="flex items-center gap-3 px-2 pb-6 text-left hover:opacity-90 transition"
          title={t('d_nav_dashboard')}
        >
          <img src="/complyhub-shield.png" alt="ComplyHub" className="h-11 w-auto logo-penumbra-dark" />
          <div>
            <div className="font-serif font-extrabold text-[19px] tracking-tight leading-none">
              ComplyHub
            </div>
            <div className="text-[10px] text-sky font-semibold uppercase tracking-widest mt-1">
              {t('d_tagline')}
            </div>
          </div>
        </button>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ id, key, Icon }) => (
            <button
              key={id}
              className={`nav-btn ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={18} /> <span className="flex-1">{t(key)}</span>
              {id === 'alerts' && alerts.length > 0 && (
                <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setTab('alerts')}
          className="mt-auto bg-deep rounded-2xl p-4 text-left hover:brightness-110 transition"
        >
          <div className="flex items-center gap-2 mb-2 text-xs font-bold">
            <Bell size={15} className="text-gold" />
            <span>{alerts.length} {t('d_alerts_active')}</span>
          </div>
          <div className="text-[11.5px] text-[#9FB8CE] leading-relaxed">
            {alerts[0]?.detail ?? t('d_alerts_none')}
          </div>
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 px-6 sm:px-10 py-8 max-w-[1100px]">
        {demo && (
          <div className="mb-5 text-[12.5px] bg-mist text-deep rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="font-bold">{t('d_demo_mode')}</span> {t('d_demo_banner')}
          </div>
        )}
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
                {me?.email ?? t('d_account')}
              </span>
            </div>
            <button
              onClick={() => (demo ? window.location.reload() : signOut())}
              className="text-[#7A8FA0] hover:text-ink"
              title={demo ? t('d_demo_quit') : t('d_logout')}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 text-[12.5px] bg-[#FAE5E8] text-danger rounded-xl px-4 py-3">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-[#5E7385] py-20 justify-center">
            <Loader2 size={20} className="animate-spin" /> {t('loading')}
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
                onOpenWorker={setDetailWorker}
              />
            )}
            {tab === 'alerts' && <Alerts alerts={alerts} />}
            {tab === 'messaging' && <Messaging orgId={org.id} workers={workers} />}
            {tab === 'updates' && <RegulatoryUpdates org={org} />}
            {tab === 'simulator' && <Simulator orgId={org.id} />}
            {tab === 'vault' && (
              <Vault orgId={org.id} documents={documents} workers={workers} onChange={reloadDocuments} />
            )}
            {tab === 'generator' && (
              <Generator
                org={org}
                workers={workers}
                complianceByWorker={complianceByWorker}
                score={score}
              />
            )}
            {tab === 'audit' && <AuditLog orgId={org.id} workers={workers} />}
            {tab === 'billing' && <Billing org={org} />}
            {tab === 'settings' && <Settings org={org} onSaved={setOrg} />}
          </>
        )}
      </main>

      {showWorkerForm && (
        <WorkerForm orgId={org.id} onClose={() => setShowWorkerForm(false)} onCreated={loadData} />
      )}
      {detailWorker && (
        <WorkerDetail
          worker={detailWorker}
          onClose={() => setDetailWorker(null)}
          onChange={reloadCompliance}
        />
      )}
    </div>
  )
}

// ---------- Onglet Tableau de bord ----------
function DashboardTab({
  stats,
  score,
  workers,
  workerScores,
  conditions,
  filter,
  setFilter,
  onAddWorker,
  onOpenWorker,
}) {
  const { t, lang } = useLang()
  const sLabel = statusLabel(lang)
  if (workers.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center text-center py-16">
        <div className="bg-mist rounded-2xl p-4 mb-4">
          <Users size={28} className="text-steel" />
        </div>
        <h2 className="font-serif text-xl font-extrabold mb-1.5">{t('d_empty_title')}</h2>
        <p className="text-sm text-[#5E7385] max-w-sm mb-6">{t('d_empty_desc')}</p>
        <button onClick={onAddWorker} className="btn-gold">
          <Plus size={16} /> {t('d_add_worker')}
        </button>
      </div>
    )
  }

  return (
    <>
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

      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="card flex items-center gap-6 flex-1 min-w-[300px]">
          <Gauge score={score} />
          <div>
            <div className="text-base font-bold mb-1.5">{t('d_readiness')}</div>
            <p className="text-[13px] text-[#5E7385] leading-relaxed max-w-[280px]">
              {score >= 85
                ? t('d_readiness_high')
                : score >= 70
                  ? t('d_readiness_mid')
                  : t('d_readiness_low')}
            </p>
          </div>
        </div>

        <div className="card flex-1 min-w-[300px]">
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-[15px] font-bold">{t('d_workers')}</div>
            <button onClick={onAddWorker} className="text-steel hover:text-deep" title={t('d_add')}>
              <Plus size={18} />
            </button>
          </div>
          <div>
            {workers.map((w) => {
              const sc = workerScores[w.id] ?? 0
              return (
                <button
                  key={w.id}
                  onClick={() => onOpenWorker(w)}
                  className="w-full flex items-center justify-between py-2.5 border-b border-mist last:border-0 text-left hover:bg-paper -mx-2 px-2 rounded-lg transition"
                >
                  <div>
                    <div className="text-[13.5px] font-semibold">{w.full_name}</div>
                    <div className="text-[11.5px] text-[#7A8FA0]">
                      {w.occupation ?? t('d_worker')} · {w.program}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-bold text-sm"
                      style={{ color: sc >= 85 ? '#2E9E6B' : sc >= 70 ? '#E0A030' : '#D1495B' }}
                    >
                      {sc}%
                    </span>
                    <ChevronRight size={15} className="text-[#9FB0BF]" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-line flex-wrap gap-3">
          <div className="text-[15px] font-bold">{t('d_conditions_title')}</div>
          <div className="flex gap-1.5">
            {['Tous', 'PMI', 'PTET'].map((f) => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'Tous' ? t('d_filter_all') : f}
              </button>
            ))}
          </div>
        </div>
        <div>
          {conditions.map((cond) => {
            const s = STATUS[cond.status] ?? STATUS.pending
            const Icon = STATUS_ICON[cond.status] ?? AlertTriangle
            return (
              <div key={cond.id} className="flex items-center gap-3.5 px-5 py-3 border-b border-mist last:border-0">
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
                <span className="text-xs font-bold min-w-[78px] text-right" style={{ color: s.color }}>
                  {sLabel[cond.status] ?? s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
