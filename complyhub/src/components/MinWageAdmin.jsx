import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, ExternalLink, TrendingUp, AlertCircle } from 'lucide-react'
import { getMinWageRates, getMinWageLog, refreshMinWageRates } from '../lib/api'
import { useLang } from '../lib/LanguageContext'
import { PROVINCES } from '../lib/constants'

// Veille automatique des taux de salaire minimum : affiche les taux en base
// (avec source + dernière vérification), permet de déclencher une mise à jour
// (fonction Edge refresh-min-wage → Claude + recherche web) et montre le
// journal des changements.
export default function MinWageAdmin() {
  const { lang } = useLang()
  const en = lang === 'en'
  const [rates, setRates] = useState([])
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const provName = (code) => PROVINCES.find((p) => p.code === code)?.name ?? code
  const fmt = (ts) => {
    if (!ts) return '—'
    try {
      return new Date(ts).toLocaleDateString(en ? 'en-CA' : 'fr-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return String(ts).slice(0, 10)
    }
  }

  async function load() {
    setLoading(true)
    try {
      const [r, l] = await Promise.all([getMinWageRates(), getMinWageLog(10)])
      setRates(r)
      setLog(l)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function runRefresh() {
    setRunning(true)
    setError('')
    setResult(null)
    try {
      const res = await refreshMinWageRates()
      setResult(res)
      await load()
    } catch (err) {
      setError(err.message || (en ? 'Update failed.' : 'La mise à jour a échoué.'))
    } finally {
      setRunning(false)
    }
  }

  const notMigrated = !loading && rates.length === 0

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <TrendingUp size={18} className="text-steel" />
          <div>
            <h2 className="text-[15px] font-bold">
              {en ? 'Minimum-wage auto-watch' : 'Veille automatique des taux'}
            </h2>
            <p className="text-[11.5px] text-[#7A8FA0]">
              {en
                ? 'Rates kept current by AI + web search (weekly), with source and change log.'
                : 'Taux tenus à jour par IA + recherche web (hebdomadaire), avec source et journal.'}
            </p>
          </div>
        </div>
        <button type="button" onClick={runRefresh} disabled={running} className="btn-primary !py-2">
          {running ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {en ? 'Check now' : 'Vérifier maintenant'}
        </button>
      </div>

      {notMigrated && (
        <div className="flex items-start gap-2 text-[12.5px] text-[#5E7385] bg-mist rounded-lg px-3 py-2.5">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-steel" />
          <span>
            {en
              ? 'The min_wage_rates table is not set up yet — the app falls back to the built-in rates. Run the migration 2026-11_min_wage_rates.sql and deploy the refresh-min-wage function.'
              : 'La table min_wage_rates n’est pas encore en place — l’app utilise les taux intégrés par défaut. Exécutez la migration 2026-11_min_wage_rates.sql et déployez la fonction refresh-min-wage.'}
          </span>
        </div>
      )}

      {result && (
        <div className="text-[12.5px] text-ok bg-[#E6F4EC] rounded-lg px-3 py-2 mb-3">
          {en
            ? `Checked ${result.checked} jurisdiction(s), ${result.changed} change(s).`
            : `${result.checked} juridiction(s) vérifiée(s), ${result.changed} changement(s).`}
          {result.rejected?.length ? ` (${result.rejected.length} ${en ? 'rejected' : 'rejetée(s)'})` : ''}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 text-[12.5px] text-danger bg-[#FBEAEE] rounded-lg px-3 py-2 mb-3">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[13px] text-[#7A8FA0] py-6 justify-center">
          <Loader2 size={15} className="animate-spin" /> {en ? 'Loading…' : 'Chargement…'}
        </div>
      ) : (
        !notMigrated && (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[#7A8FA0] border-b border-line">
                  <th className="py-2 pr-3 font-semibold">{en ? 'Province' : 'Province'}</th>
                  <th className="py-2 pr-3 font-semibold">{en ? 'Rate' : 'Taux'}</th>
                  <th className="py-2 pr-3 font-semibold">{en ? 'Effective' : 'En vigueur'}</th>
                  <th className="py-2 pr-3 font-semibold">{en ? 'Last check' : 'Vérifié le'}</th>
                  <th className="py-2 font-semibold">{en ? 'Source' : 'Source'}</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.province} className="border-b border-mist last:border-0">
                    <td className="py-2 pr-3 font-medium">{provName(r.province)}</td>
                    <td className="py-2 pr-3 font-semibold">{Number(r.rate).toFixed(2)} $/h</td>
                    <td className="py-2 pr-3 text-[#5E7385]">{r.as_of ?? '—'}</td>
                    <td className="py-2 pr-3 text-[#5E7385]">{fmt(r.checked_at)}</td>
                    <td className="py-2">
                      {r.source_url ? (
                        <a
                          href={r.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-steel hover:text-deep"
                        >
                          {en ? 'Link' : 'Lien'} <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-[#9FB0BF]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Journal des changements récents */}
      {log.length > 0 && (
        <div className="mt-4 pt-3 border-t border-mist">
          <div className="text-[12px] font-bold text-[#5E7385] mb-2">
            {en ? 'Recent changes' : 'Changements récents'}
          </div>
          <ul className="space-y-1.5">
            {log.map((c) => (
              <li key={c.id} className="text-[12px] text-[#5E7385] flex items-center gap-2">
                <span className="font-semibold text-ink">{c.province}</span>
                <span>
                  {c.old_rate != null ? `${Number(c.old_rate).toFixed(2)} → ` : ''}
                  {Number(c.new_rate).toFixed(2)} $/h
                </span>
                <span className="text-[#9FB0BF]">· {fmt(c.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
