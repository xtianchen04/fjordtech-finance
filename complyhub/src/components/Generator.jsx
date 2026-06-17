import { FileText, Download, AlertTriangle } from 'lucide-react'
import { GENERATORS } from '../lib/constants'

// Générateur de documents : modèles conformes (export à brancher ensuite).
export default function Generator() {
  return (
    <div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {GENERATORS.map((g) => (
          <div key={g.t} className="card">
            <div className="bg-ink rounded-xl p-2.5 inline-flex mb-3.5">
              <FileText size={20} className="text-gold" />
            </div>
            <div className="text-[15.5px] font-bold mb-1.5">{g.t}</div>
            <p className="text-[12.5px] text-[#5E7385] mb-4 leading-relaxed">{g.d}</p>
            <button className="flex items-center justify-center gap-2 bg-mist text-steel border-0 rounded-lg px-4 py-2.5 text-[13px] font-semibold cursor-pointer w-full hover:brightness-95">
              <Download size={15} /> Générer le document
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-[#FBF1DE] rounded-2xl px-4 py-3.5 flex items-center gap-3 text-[12px] text-[#7A5B17] leading-snug">
        <AlertTriangle size={17} className="text-amber flex-shrink-0" />
        <span>
          <b>Avis :</b> ComplyHub est un outil de gestion et d'organisation documentaire. Il ne
          fournit pas de conseil juridique en immigration, lequel est réservé aux avocats et aux
          consultants réglementés (CICC).
        </span>
      </div>
    </div>
  )
}
