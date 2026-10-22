import { useState } from 'react'
import {
  Building2,
  Users,
  Gauge as GaugeIcon,
  AlertTriangle,
  ChevronRight,
  Bot,
  Send,
  Sparkles,
  Bell,
  ShieldCheck,
  X,
  ArrowRight,
} from 'lucide-react'
import LanguageSwitcher from '../LanguageSwitcher'

// ============================================================
//  MAQUETTE — Console Cabinet (consultants CICC / cabinets).
//  Aperçu visuel non connecté : données d'exemple, aucune sauvegarde.
//  Accessible via #/cabinet. Démontre le multi-clients + l'assistant IA
//  (versions Pro / Cabinet) avant de bâtir les fondations.
// ============================================================

const CLIENTS = [
  { name: 'Acadie Xpress Negocio', prov: 'NB', workers: 3, score: 86, alerts: 1 },
  { name: 'Ferme Bélanger & Fils', prov: 'QC', workers: 12, score: 72, alerts: 3 },
  { name: 'Northern Catering Ltd.', prov: 'ON', workers: 7, score: 64, alerts: 5 },
  { name: 'Prairie Harvest Co.', prov: 'SK', workers: 20, score: 91, alerts: 0 },
  { name: 'Coastal Seafood Inc.', prov: 'NS', workers: 9, score: 78, alerts: 2 },
]

const WATCH = [
  'Salaire minimum ON → 17,60 $/h : 2 travailleurs de Northern Catering sous le seuil.',
  '3 permis de travail expirent dans moins de 30 jours (Ferme Bélanger & Fils).',
  "Rappel : information sur les droits non confirmée pour 4 travailleurs.",
]

const AI_QA = [
  {
    q: 'Mon client au NB paie 15 $/h, est-ce conforme ?',
    a: "Le salaire minimum général au Nouveau-Brunswick est de 15,30 $/h (2025). 15 $/h est donc sous le minimum — non conforme. Le salaire doit aussi rester substantiellement le même que l'offre (R209.2(1)(a)(iii)). Recommandation : ajuster à au moins 15,30 $/h et documenter le changement.",
  },
  {
    q: 'Quels documents conserver et combien de temps ?',
    a: "Conservez pendant 6 ans (R209.4) : ententes d'emploi signées, registres de paie, preuves de versement, permis de travail valides, et l'information sur les droits remise au travailleur.",
  },
  {
    q: 'Un client veut changer le poste d\'un travailleur — que faire ?',
    a: "Un changement important aux conditions peut devoir être déclaré avant qu'il prenne effet. Utilisez la « Lettre de déclaration de changement », vérifiez que la profession et le salaire restent conformes à l'offre, et conservez la trace au dossier.",
  },
]

const scoreColor = (s) => (s >= 85 ? '#2E9E6B' : s >= 70 ? '#E0A030' : '#D1495B')

export default function CabinetConsole() {
  const [client, setClient] = useState(null) // client ouvert (aperçu)
  const totalWorkers = CLIENTS.reduce((s, c) => s + c.workers, 0)
  const totalAlerts = CLIENTS.reduce((s, c) => s + c.alerts, 0)
  const avgScore = Math.round(CLIENTS.reduce((s, c) => s + c.score, 0) / CLIENTS.length)

  const stats = [
    { Icon: Building2, val: CLIENTS.length, label: 'Clients gérés', accent: '#2E6CA4' },
    { Icon: Users, val: totalWorkers, label: 'Travailleurs suivis', accent: '#13314F' },
    { Icon: GaugeIcon, val: `${avgScore}%`, label: 'Score moyen', accent: scoreColor(avgScore) },
    { Icon: AlertTriangle, val: totalAlerts, label: 'Alertes actives', accent: '#D1495B' },
  ]

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* En-tête */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-4 bg-ink text-white">
        <a href="#/" className="flex items-center gap-3 hover:opacity-90 transition" title="Accueil">
          <img src="/complyhub-shield.png" alt="ComplyHub" className="h-10 w-auto logo-penumbra-dark" />
          <div>
            <div className="font-serif font-extrabold text-[17px] leading-none">ComplyHub</div>
            <div className="text-[10px] text-gold font-semibold uppercase tracking-widest mt-1">
              Console Cabinet
            </div>
          </div>
        </a>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-ink bg-gold px-2.5 py-1 rounded-full">
            <Sparkles size={12} /> CABINET
          </span>
          <LanguageSwitcher variant="dark" />
        </div>
      </header>

      <div className="bg-mist text-deep text-[12px] text-center py-1.5 px-4">
        Aperçu de démonstration — données d'exemple, aucune donnée réelle n'est enregistrée.
      </div>

      <div className="flex-1 max-w-[1050px] w-full mx-auto p-4 sm:p-6">
        <h1 className="font-serif text-2xl font-extrabold tracking-tight mb-1">Portefeuille clients</h1>
        <p className="text-sm text-[#5E7385] mb-6">
          Vue consolidée de tous vos employeurs-clients — préparation, travailleurs et alertes.
        </p>

        {/* KPIs */}
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

        <div className="flex gap-5 flex-wrap items-start">
          {/* Liste clients */}
          <div className="card p-0 overflow-hidden flex-1 min-w-[320px]">
            <div className="px-5 py-4 border-b border-line text-[15px] font-bold">Clients</div>
            <div>
              {CLIENTS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setClient(c)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-mist last:border-0 text-left hover:bg-paper transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-mist text-steel flex items-center justify-center flex-shrink-0">
                    <Building2 size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold truncate">{c.name}</div>
                    <div className="text-[11.5px] text-[#7A8FA0]">
                      {c.prov} · {c.workers} travailleur(s)
                    </div>
                  </div>
                  {c.alerts > 0 && (
                    <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {c.alerts}
                    </span>
                  )}
                  <span className="font-bold text-sm w-11 text-right" style={{ color: scoreColor(c.score) }}>
                    {c.score}%
                  </span>
                  <ChevronRight size={15} className="text-[#9FB0BF]" />
                </button>
              ))}
            </div>
          </div>

          {/* Veille proactive */}
          <div className="card flex-1 min-w-[300px]">
            <div className="flex items-center gap-2 mb-3 text-[15px] font-bold">
              <Bell size={17} className="text-gold" /> Veille proactive
            </div>
            <div className="space-y-2.5">
              {WATCH.map((w, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-[#FBF1DE] rounded-xl px-3.5 py-2.5">
                  <AlertTriangle size={15} className="text-amber flex-shrink-0 mt-0.5" />
                  <span className="text-[12.5px] text-[#7A5B17] leading-snug">{w}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#9FB0BF] mt-3 leading-relaxed">
              Détecte automatiquement les changements de seuils (salaire minimum, expiration de permis,
              nouvelles obligations) sur l'ensemble de vos clients.
            </p>
          </div>
        </div>

        {/* Assistant IA */}
        <AiAssistant />

        <p className="mt-5 text-[11.5px] text-[#9FB0BF] flex items-start gap-1.5 leading-relaxed">
          <ShieldCheck size={13} className="text-steel flex-shrink-0 mt-0.5" />
          Maquette — l'assistant IA et la veille seront alimentés par l'API Claude et des sources
          officielles. ComplyHub ne fournit pas de conseil juridique (CICC).
        </p>
      </div>

      {client && <ClientPreview client={client} onClose={() => setClient(null)} />}
    </div>
  )
}

// Aperçu d'un client dans la maquette (non connecté) : montre le dossier puis
// invite à démarrer pour de vrai.
function ClientPreview({ client, onClose }) {
  const kpis = [
    { label: 'Travailleurs', val: client.workers },
    { label: 'Préparation', val: `${client.score}%`, color: scoreColor(client.score) },
    { label: 'Alertes', val: client.alerts, color: client.alerts > 0 ? '#D1495B' : '#2E9E6B' },
  ]
  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg my-6 border border-line shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-mist text-steel flex items-center justify-center font-bold text-[12px]">
              {initials(client.name)}
            </div>
            <div>
              <div className="font-serif text-lg font-extrabold leading-none">{client.name}</div>
              <div className="text-[11.5px] text-[#7A8FA0] mt-1">{client.prov}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#7A8FA0] hover:text-ink" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="flex gap-3 mb-5">
            {kpis.map((k) => (
              <div key={k.label} className="flex-1 bg-paper border border-line rounded-xl px-4 py-3 text-center">
                <div className="text-xl font-extrabold font-serif" style={{ color: k.color ?? '#0B1F33' }}>{k.val}</div>
                <div className="text-[11.5px] text-[#5E7385] mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-mist rounded-xl px-4 py-3.5 text-[13px] text-deep leading-relaxed">
            Ceci est un <b>aperçu de démonstration</b>. Dans la vraie console Cabinet, ouvrir un
            client donne accès à son <b>tableau de bord complet</b> : travailleurs, conformité,
            documents, messagerie et journal d'audit.
          </div>
          <a href="#/" className="btn-gold w-full mt-5">
            Commencer pour de vrai <ArrowRight size={16} />
          </a>
          <p className="text-[11.5px] text-[#9FB0BF] text-center mt-3">
            Inscrivez-vous et cochez « Je suis un cabinet » pour gérer de vrais dossiers.
          </p>
        </div>
      </div>
    </div>
  )
}

const initials = (t = '') => t.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')

function AiAssistant() {
  const [thread, setThread] = useState([
    { role: 'ai', text: "Bonjour 👋 Je suis l'assistant de conformité ComplyHub. Posez-moi une question sur un dossier, un salaire, une obligation — avec références au RIPR." },
  ])

  function ask(qa) {
    setThread((t) => [...t, { role: 'user', text: qa.q }, { role: 'ai', text: qa.a }])
  }

  const asked = new Set(thread.filter((m) => m.role === 'user').map((m) => m.text))

  return (
    <div className="card mt-6 p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center gap-2.5">
        <div className="bg-ink rounded-xl p-2 flex">
          <Bot size={17} className="text-gold" />
        </div>
        <div>
          <div className="text-[15px] font-bold">Assistant IA de conformité</div>
          <div className="text-[11.5px] text-[#7A8FA0]">Versions Pro & Cabinet</div>
        </div>
      </div>

      <div className="p-5 space-y-3 max-h-[320px] overflow-y-auto">
        {thread.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-snug ${
                m.role === 'user' ? 'bg-steel text-white' : 'bg-mist text-ink'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Questions suggérées */}
      <div className="px-5 pb-3 flex flex-wrap gap-2">
        {AI_QA.filter((qa) => !asked.has(qa.q)).map((qa) => (
          <button key={qa.q} onClick={() => ask(qa)} className="filter-btn">
            {qa.q}
          </button>
        ))}
      </div>

      <div className="border-t border-line p-3 flex gap-2">
        <input
          className="field-input flex-1"
          placeholder="Poser une question… (démo : utilisez les suggestions)"
          disabled
        />
        <button className="btn-gold !px-4" disabled>
          <Send size={15} /> Envoyer
        </button>
      </div>
    </div>
  )
}
