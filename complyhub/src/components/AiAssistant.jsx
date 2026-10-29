import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Loader2, AlertCircle } from 'lucide-react'
import { askAssistant } from '../lib/api'
import { useLang } from '../lib/LanguageContext'

// ============================================================
//  Assistant IA de conformité (réel) — appelle la fonction Edge
//  ask-assistant → API Claude. Spécialisé RIPR / PMI / PTET.
//  Prop facultative `context` : { orgName, province, program, score, alerts }
//  pour ancrer la réponse sur le dossier en cours.
// ============================================================

const SUGGESTIONS = {
  fr: [
    'Quels documents dois-je garder pour une inspection ?',
    'Combien de temps conserver les dossiers des travailleurs ?',
    'Quelles sont les obligations de salaire pour un permis fermé ?',
    'Que faire si un permis de travail expire bientôt ?',
  ],
  en: [
    'Which documents must I keep for an inspection?',
    'How long must I keep worker records?',
    'What are the wage obligations for a closed work permit?',
    'What should I do if a work permit expires soon?',
  ],
}

const UI = {
  fr: {
    title: 'Assistant IA de conformité',
    sub: 'Versions Pro & Cabinet · RIPR / PMI / PTET',
    greeting:
      "Bonjour 👋 Je suis l'assistant de conformité ComplyHub. Posez-moi une question sur un dossier, un salaire ou une obligation — avec références au RIPR.",
    placeholder: 'Poser une question sur la conformité…',
    send: 'Envoyer',
    disclaimer:
      'ComplyHub ne fournit pas de conseil juridique en immigration (réservé aux avocats et consultants CICC).',
    error: "L'assistant est indisponible. Réessayez dans un instant.",
  },
  en: {
    title: 'AI compliance assistant',
    sub: 'Pro & Firm plans · RIPR / IMP / TFWP',
    greeting:
      "Hi 👋 I'm the ComplyHub compliance assistant. Ask me about a file, a wage, or an obligation — with references to the IRPR.",
    placeholder: 'Ask a compliance question…',
    send: 'Send',
    disclaimer:
      'ComplyHub does not provide legal immigration advice (reserved for lawyers and CICC consultants).',
    error: 'The assistant is unavailable. Please try again shortly.',
  },
}

export default function AiAssistant({ context = null, className = '' }) {
  const { lang } = useLang()
  const L = lang === 'en' ? UI.en : UI.fr
  const suggestions = lang === 'en' ? SUGGESTIONS.en : SUGGESTIONS.fr

  const [thread, setThread] = useState([{ role: 'ai', text: L.greeting }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  // Réinitialise le message d'accueil si la langue change et que rien n'a encore été demandé.
  useEffect(() => {
    setThread((t) => (t.length === 1 && t[0].role === 'ai' ? [{ role: 'ai', text: L.greeting }] : t))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [thread, loading])

  async function send(question) {
    const q = (question ?? input).trim()
    if (!q || loading) return
    setInput('')
    setError('')
    // Historique au format API (hors message d'accueil).
    const history = thread
      .filter((m, i) => !(i === 0 && m.role === 'ai'))
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
    setThread((t) => [...t, { role: 'user', text: q }])
    setLoading(true)
    try {
      const answer = await askAssistant(q, history, context)
      setThread((t) => [...t, { role: 'ai', text: answer }])
    } catch (err) {
      setError(err.message || L.error)
    } finally {
      setLoading(false)
    }
  }

  const askedAny = thread.some((m) => m.role === 'user')

  return (
    <div className={`card p-0 overflow-hidden flex flex-col ${className}`}>
      <div className="px-5 py-4 border-b border-line flex items-center gap-2.5">
        <div className="bg-ink rounded-xl p-2 flex">
          <Bot size={17} className="text-gold" />
        </div>
        <div>
          <div className="text-[15px] font-bold">{L.title}</div>
          <div className="text-[11.5px] text-[#7A8FA0]">{L.sub}</div>
        </div>
      </div>

      <div ref={scrollRef} className="p-5 space-y-3 max-h-[360px] overflow-y-auto">
        {thread.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-steel text-white' : 'bg-mist text-ink'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-mist text-[#5E7385] rounded-2xl px-4 py-2.5 text-[13px] flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> …
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-5 mb-2 flex items-start gap-2 text-[12.5px] text-danger bg-[#FBEAEE] rounded-lg px-3 py-2">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Questions suggérées (tant qu'aucune question n'a été posée) */}
      {!askedAny && !loading && (
        <div className="px-5 pb-1 flex flex-wrap gap-2">
          {suggestions.map((q) => (
            <button key={q} onClick={() => send(q)} className="filter-btn">
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="border-t border-line p-3 flex gap-2"
      >
        <input
          className="field-input flex-1"
          placeholder={L.placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn-gold !px-4" disabled={loading || !input.trim()}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {L.send}
        </button>
      </form>

      <p className="px-5 py-2.5 text-[10.5px] text-[#9FB0BF] border-t border-mist leading-snug">
        {L.disclaimer}
      </p>
    </div>
  )
}
