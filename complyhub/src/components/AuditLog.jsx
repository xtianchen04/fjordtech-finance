import { useEffect, useMemo, useState } from 'react'
import { Loader2, Download, FileText, ScrollText, Filter } from 'lucide-react'
import { getAuditLogs } from '../lib/api'
import { buildAuditPdf } from '../lib/generators'
import { useLang } from '../lib/LanguageContext'
import { auditActionLabel } from '../lib/i18n'

// ============================================================
//  Journal d'audit (côté employeur) — lecture seule.
//  Affiche les actions sensibles horodatées (immuables), avec filtres
//  par travailleur et par type d'action, et export CSV pour l'inspection.
// ============================================================

const ROLE_STYLE = {
  employer: { labelKey: 'ad_role_employer', bg: '#E8F1F8', color: '#2E6CA4' },
  employee: { labelKey: 'ad_role_employee', bg: '#FBF1DE', color: '#C99A3B' },
  system: { labelKey: 'ad_role_system', bg: '#EEF3F7', color: '#5E7385' },
}

const stamp = (iso) =>
  iso ? new Date(iso).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }) : ''

// Détail lisible selon le type d'action.
function detailText(log) {
  const d = log.details ?? {}
  if (log.action === 'update.worker_compliance' && (d.old || d.new)) {
    const o = d.old?.status
    const n = d.new?.status
    if (o && n && o !== n) return `${o} → ${n}`
  }
  if (log.entity_type === 'documents' && d.new?.category) return `Catégorie : ${d.new.category}`
  return ''
}

export default function AuditLog({ orgId, workers = [] }) {
  const { t, lang } = useLang()
  const al = (a) => auditActionLabel(lang, a)
  const roleName = (r) => t(ROLE_STYLE[r]?.labelKey ?? 'ad_role_system')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workerFilter, setWorkerFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const workerName = useMemo(() => {
    const map = {}
    for (const w of workers) map[w.id] = w.full_name
    return map
  }, [workers])

  async function load() {
    setLoading(true)
    setError('')
    try {
      setLogs(await getAuditLogs(orgId, { workerId: workerFilter || undefined, limit: 300 }))
    } catch {
      setError(t('ad_error'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, workerFilter])

  const actionsPresent = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs],
  )
  const filtered = actionFilter ? logs.filter((l) => l.action === actionFilter) : logs

  function exportCsv() {
    const header = [t('ad_col_date'), t('ad_col_actor'), t('ad_col_action'), t('ad_col_worker'), 'Entité', t('ad_col_detail')]
    const rows = filtered.map((l) => [
      stamp(l.created_at),
      roleName(l.actor_role),
      al(l.action),
      workerName[l.worker_id] ?? '',
      l.entity_type,
      detailText(l),
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    const parts = []
    if (workerFilter) parts.push(`${t('ad_col_worker')} : ${workerName[workerFilter] ?? ''}`)
    if (actionFilter) parts.push(`${t('ad_col_action')} : ${al(actionFilter)}`)
    const rows = filtered.map((l) => ({
      date: stamp(l.created_at),
      actor: roleName(l.actor_role),
      action: al(l.action),
      worker: workerName[l.worker_id] ?? '',
      detail: detailText(l),
    }))
    const html = buildAuditPdf({ rows, filterLabel: parts.join(' · ') })
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ScrollText size={18} className="text-steel" />
          <div>
            <div className="text-[15px] font-bold">{t('d_nav_audit')}</div>
            <div className="text-[12px] text-[#7A8FA0]">{t('ad_subtitle')}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPdf} disabled={!filtered.length} className="btn-primary !py-2 !px-3.5 text-[12.5px]">
            <FileText size={14} /> {t('ad_export_pdf')}
          </button>
          <button onClick={exportCsv} disabled={!filtered.length} className="filter-btn">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="px-5 py-3 border-b border-line flex items-center gap-3 flex-wrap bg-paper">
        <Filter size={14} className="text-[#7A8FA0]" />
        <select
          className="field-input max-w-[220px] py-1.5"
          value={workerFilter}
          onChange={(e) => setWorkerFilter(e.target.value)}
        >
          <option value="">{t('ad_all_workers')}</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>{w.full_name}</option>
          ))}
        </select>
        <select
          className="field-input max-w-[220px] py-1.5"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">{t('ad_all_actions')}</option>
          {actionsPresent.map((a) => (
            <option key={a} value={a}>{al(a)}</option>
          ))}
        </select>
        <span className="text-[12px] text-[#7A8FA0] ml-auto">{filtered.length} {t('ad_entries')}</span>
      </div>

      {error && <div className="px-5 py-3 text-[12.5px] text-danger">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-[#5E7385] py-14 justify-center">
          <Loader2 size={18} className="animate-spin" /> {t('loading')}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[13px] text-[#7A8FA0] text-center py-14">{t('ad_empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[#5E7385] border-b border-line">
                <th className="px-5 py-2.5 font-semibold">{t('ad_col_date')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('ad_col_actor')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('ad_col_action')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('ad_col_worker')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('ad_col_detail')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const role = ROLE_STYLE[l.actor_role] ?? ROLE_STYLE.system
                return (
                  <tr key={l.id} className="border-b border-mist last:border-0">
                    <td className="px-5 py-2.5 whitespace-nowrap text-[#5E7385]">{stamp(l.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: role.bg, color: role.color }}
                      >
                        {roleName(l.actor_role)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold">{al(l.action)}</td>
                    <td className="px-3 py-2.5 text-[#5E7385]">{workerName[l.worker_id] ?? '—'}</td>
                    <td className="px-3 py-2.5 text-[#7A8FA0]">{detailText(l) || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
