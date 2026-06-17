import { useState } from 'react'
import { FileCheck } from 'lucide-react'
import { SIM_QUESTIONS } from '../lib/constants'

// Simulateur d'inspection : l'employeur répond aux questions types d'un inspecteur.
export default function Simulator() {
  const [answers, setAnswers] = useState({})

  const colors = { oui: '#2E9E6B', partiel: '#E0A030', non: '#D1495B' }

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
                        color: colors[opt.key],
                        border:
                          answers[i] === opt.key
                            ? `2px solid ${colors[opt.key]}`
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
    </div>
  )
}
