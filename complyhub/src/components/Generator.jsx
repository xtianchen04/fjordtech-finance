import { useState } from 'react'
import { FileText, Download, AlertTriangle } from 'lucide-react'
import { GENERATORS } from '../lib/constants'
import { generateDocument } from '../lib/generators'
import { useLang } from '../lib/LanguageContext'
import { generatorContent } from '../lib/i18n'

// Générateur de documents : produit des documents imprimables remplis avec les données réelles.
export default function Generator({ org, workers = [], complianceByWorker = {}, score = 0 }) {
  const { t, lang } = useLang()
  const [workerId, setWorkerId] = useState(workers[0]?.id ?? '')

  function handleGenerate(g) {
    const worker = workers.find((w) => w.id === workerId) ?? null
    generateDocument(g.key, { org, worker, workers, complianceByWorker, score, lang })
  }

  return (
    <div>
      {workers.length > 0 && (
        <div className="card mb-4 flex items-center gap-3 flex-wrap">
          <label className="text-[13px] font-semibold text-[#5E7385]" htmlFor="gen-worker">
            {t('gn_worker_label')}
          </label>
          <select
            id="gen-worker"
            className="field-input max-w-xs"
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
          >
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {GENERATORS.map((g) => {
          const disabled = g.needsWorker && workers.length === 0
          const gc = generatorContent(lang, g.key)
          return (
            <div key={g.key} className="card">
              <div className="bg-ink rounded-xl p-2.5 inline-flex mb-3.5">
                <FileText size={20} className="text-gold" />
              </div>
              <div className="text-[15.5px] font-bold mb-1.5">{gc.t}</div>
              <p className="text-[12.5px] text-[#5E7385] mb-4 leading-relaxed">{gc.d}</p>
              <button
                onClick={() => handleGenerate(g)}
                disabled={disabled}
                className="flex items-center justify-center gap-2 bg-mist text-steel border-0 rounded-lg px-4 py-2.5 text-[13px] font-semibold cursor-pointer w-full hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title={disabled ? t('gn_add_worker_first') : undefined}
              >
                <Download size={15} /> {t('gn_generate')}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-4 bg-[#FBF1DE] rounded-2xl px-4 py-3.5 flex items-center gap-3 text-[12px] text-[#7A5B17] leading-snug">
        <AlertTriangle size={17} className="text-amber flex-shrink-0" />
        <span>
          <b>{t('gn_notice_b')}</b> {t('gn_notice')}
        </span>
      </div>
    </div>
  )
}
