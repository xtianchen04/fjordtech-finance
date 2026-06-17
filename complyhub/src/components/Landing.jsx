import {
  ShieldCheck,
  FileCheck,
  Lock,
  FileText,
  Bell,
  BarChart3,
  ArrowRight,
  Check,
} from 'lucide-react'
import { PLANS } from '../lib/constants'

const FEATURES = [
  { Icon: BarChart3, t: 'Tableau de bord', d: 'Visualisez votre score de préparation à l\'inspection en un coup d\'œil.' },
  { Icon: FileCheck, t: 'Simulateur d\'inspection', d: 'Répondez aux questions types d\'IRCC/ESDC et identifiez vos points faibles.' },
  { Icon: Lock, t: 'Coffre-fort documentaire', d: 'Centralisez vos documents, conservés 6 ans (R209.4).' },
  { Icon: FileText, t: 'Générateur de documents', d: 'Ententes d\'emploi, registres et lettres conformes au RIPR.' },
  { Icon: Bell, t: 'Alertes automatiques', d: 'Soyez prévenu avant l\'expiration d\'un permis ou en cas de condition manquante.' },
  { Icon: ShieldCheck, t: 'Conforme au RIPR', d: 'Conditions de conformité PMI et PTET, à jour et référencées.' },
]

// Page d'accueil publique (visiteurs non connectés).
export default function Landing({ onStart }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Barre de navigation */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="bg-gold rounded-xl p-2">
            <ShieldCheck size={20} className="text-ink" strokeWidth={2.5} />
          </div>
          <div className="font-serif font-extrabold text-lg">ComplyHub</div>
        </div>
        <button onClick={onStart} className="btn-primary">
          Se connecter
        </button>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-20">
        <div className="inline-flex items-center gap-2 bg-mist text-steel text-[12px] font-semibold px-3 py-1.5 rounded-full mb-6">
          <ShieldCheck size={14} /> Conformité TET · PMI · PTET
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
          Restez conforme. Soyez prêt pour l'inspection.
        </h1>
        <p className="text-[15px] sm:text-base text-[#5E7385] mt-5 leading-relaxed max-w-2xl mx-auto">
          ComplyHub aide les employeurs canadiens de travailleurs étrangers temporaires à suivre
          leurs obligations réglementaires, organiser leurs documents et se préparer aux
          inspections d'IRCC et d'ESDC — en toute sérénité.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <button onClick={onStart} className="btn-gold">
            Commencer gratuitement <ArrowRight size={16} />
          </button>
        </div>
        <p className="text-[12px] text-[#9FB0BF] mt-4">
          Outil de gestion documentaire — ne constitue pas un conseil juridique (CICC).
        </p>
      </section>

      {/* Fonctionnalités */}
      <section className="bg-white border-y border-line py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-serif text-2xl font-extrabold text-center mb-10">
            Tout ce qu'il faut pour rester conforme
          </h2>
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {FEATURES.map((f) => (
              <div key={f.t} className="card">
                <div className="bg-mist rounded-xl p-2.5 inline-flex mb-3">
                  <f.Icon size={20} className="text-steel" />
                </div>
                <div className="text-[15px] font-bold mb-1.5">{f.t}</div>
                <p className="text-[13px] text-[#5E7385] leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section className="py-16 max-w-5xl mx-auto px-6">
        <h2 className="font-serif text-2xl font-extrabold text-center mb-10">Tarification simple</h2>
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-6 border ${
                plan.featured ? 'border-gold shadow-lg' : 'border-line'
              } flex flex-col`}
            >
              <div className="text-[15px] font-bold">{plan.name}</div>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-extrabold font-serif">{plan.price}</span>
                <span className="text-[13px] text-[#7A8FA0]"> {plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-[13px] text-[#5E7385]">
                    <Check size={16} className="text-ok flex-shrink-0 mt-0.5" /> {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={onStart}
                className={`${plan.featured ? 'btn-gold' : 'btn-primary'} w-full`}
              >
                {plan.id === 'free' ? 'Commencer' : plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-[12.5px] text-[#9FB0BF]">
        © {new Date().getFullYear()} ComplyHub · Conformité TET/PMI · Tous droits réservés.
      </footer>
    </div>
  )
}
