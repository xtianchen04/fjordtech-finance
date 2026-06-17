import { useEffect, useState } from 'react'
import { FileCheck, Save, Loader2, History } from 'lucide-react'
import { SIM_QUESTIONS } from '../lib/constants'
import { saveSimulation, getSimulations } from '../lib/api'

const VALUE = { oui: 1, partiel: 0.5, non: 0 }
const COLORS = { oui: '#2E9E6B', partiel: '#E0A030', non: '#D1495B' }

function scoreColor(s) {
  return s >= 85 ? '#2E9E6B' : s >= 70 ? '#E0A030' : '#D1495B'
}

// Simulateur d'inspection : l'employeur répond aux questions types d'un inspecteur,
// puis le résultat est calculé et sauvegardé.
export default function Simulator({ orgId }) {
  const [answers, setAnswers] = useState({})
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadHistory() {
    try {
      setHistory(await getSimulations(orgId))
    } catch {
      /* silencieux : table peut-être pas encore migrée */
    }
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const answered = Object.keys(answers).length
  const allAnswered = answered === SIM_QUESTIONS.length

  function computeScore() {
    if (answered === 0) return 0
    const total = SIM_QUESTIONS.reduce((sum, _q, i) => sum + (VALUE[answers[i]] ?? 0), 0)
    return Math.round((total / SIM_QUESTIONS.length) * 100)
  }

  const currentScore = computeScore()

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await saveSimulation(orgId, { score: currentScore, answers })
      await loadHistory()
    } catch (err) {
      setError(err.message ?? 'Échec de l\'enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-2xl p-7 text-white mb-6 bg-gradient-to-br from-deep to-steel">
        <FileCheck size={30} className="text-gold mb-3" />
        <h2 className="font-serif text-xl font-extrabold mb-1.5">
          Êtes-vous prêt pour une inspection ?
        </h2>
        <p className="text-[13.5px] text-[#CFE0EF] leading-relaxed">
          Répondez honnêtement à ces questions reproduisant celles d'un inspecteur d'IRCC ou
          d'ESDC. ComplyHub identifiera vos points faibles avant une vraie inspection.
        </p>
      </div>

      <div className="space-y-3">
        {SIM_QUESTIONS.map((item, i) => (
          <div key={i} className="card">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-mist text-steel font-bold text-[13px] flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-semibold">{item.q}</span>
                  {item.crit && (
                    <span className="text-[9.5px] font-bold text-danger bg-[#FAE5E8] px-1.5 py-0.5 rounded-lg uppercase">
                      Critique
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-[#9FB0BF] mb-3">{item.ref}</div>
                <div className="flex gap-2">
                  {[
                    { key: 'oui', label: 'Oui', bg: '#E6F4EC' },
                    { key: 'partiel', label: 'Partiellement', bg: '#FBF1DE' },
                    { key: 'non', label: 'Non', bg: '#FAE5E8' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: opt.key }))}
                      className="px-4 py-1.5 rounded-lg text-[12.5px] font-semibold cursor-pointer"
                      style={{
                        background: opt.bg,
                        color: COLORS[opt.key],
                        border:
                          answers[i] === opt.key
                            ? `2px solid ${COLORS[opt.key]}`
                            : '2px solid transparent',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Résultat + enregistrement */}
      <div className="card mt-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-extrabold font-serif" style={{ color: scoreColor(currentScore) }}>
            {currentScore}%
          </div>
          <div className="text-[13px] text-[#5E7385]">
            {answered}/{SIM_QUESTIONS.length} question(s) répondue(s)
            {!allAnswered && <div className="text-[11.5px] text-amber">Répondez à tout pour un résultat fiable.</div>}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || answered === 0} className="btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Enregistrer le résultat
        </button>
      </div>

      {error && <div className="text-[12.5px] text-danger font-medium mt-3">{error}</div>}

      {history.length > 0 && (
        <div className="card mt-4">
          <div className="flex items-center gap-2 mb-3 text-[15px] font-bold">
            <History size={17} className="text-steel" /> Historique des simulations
          </div>
          {history.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between py-2.5 border-b border-mist last:border-0"
            >
              <span className="text-[13px] text-[#5E7385]">
                {new Date(h.created_at).toLocaleString('fr-CA')}
              </span>
              <span className="font-bold text-sm" style={{ color: scoreColor(h.score) }}>
                {h.score}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
