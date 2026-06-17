import { Lock, Clock, Check, AlertTriangle, XCircle } from 'lucide-react'
import { VAULT_FOLDERS, STATUS } from '../lib/constants'

const STATUS_ICON = {
  ok: Check,
  warn: AlertTriangle,
  missing: XCircle,
  na: Clock,
}

// Coffre-fort documentaire : dossiers par catégorie (Supabase Storage à brancher ensuite).
export default function Vault({ documents = [] }) {
  // Compte les documents par catégorie si la liste est fournie.
  const counts = documents.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {VAULT_FOLDERS.map((f) => {
          const s = STATUS[f.status]
          const Icon = STATUS_ICON[f.status] ?? Clock
          const count = counts[f.category] ?? 0
          return (
            <div
              key={f.category}
              className="bg-white rounded-2xl p-5 border border-line cursor-pointer transition-transform hover:-translate-y-0.5"
            >
              <div className="flex justify-between items-start mb-3.5">
                <div className="bg-mist rounded-xl p-2.5 flex">
                  <Lock size={19} className="text-steel" />
                </div>
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: s.bg }}
                >
                  <Icon size={13} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-sm font-bold mb-0.5">{f.name}</div>
              <div className="text-[12px] text-[#7A8FA0] mb-2">
                {count} document{count > 1 ? 's' : ''}
              </div>
              <div className="text-[11px] font-semibold" style={{ color: s.color }}>
                {s.label}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 bg-mist rounded-2xl px-4 py-3.5 flex items-center gap-3 text-[12.5px] text-deep">
        <Clock size={17} className="text-steel flex-shrink-0" />
        <span>
          <b>Conservation automatique :</b> tous les documents sont conservés pendant 6 ans,
          conformément à l'article R209.4 du RIPR.
        </span>
      </div>
    </div>
  )
}
