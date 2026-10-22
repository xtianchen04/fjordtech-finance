import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Send, Clock, MessageSquare, ChevronLeft } from 'lucide-react'
import { getOrgMessages, getMessages, sendMessage, markMessagesRead } from '../lib/api'
import { useLang } from '../lib/LanguageContext'

// ============================================================
//  Messagerie employeur ↔ employé (Phase 2).
//  Deux volets : liste des travailleurs (avec aperçu + pastille non lus),
//  et le fil du travailleur sélectionné. Chaque message est horodaté et
//  son accusé de lecture matérialise la preuve de communication.
// ============================================================

const stamp = (iso) =>
  iso ? new Date(iso).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' }) : ''

function initials(text = '') {
  return text.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}

export default function Messaging({ orgId, workers }) {
  const { t } = useLang()
  const [orgMessages, setOrgMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // worker

  async function loadOrg() {
    try {
      setOrgMessages(await getOrgMessages(orgId))
    } catch {
      /* table non migrée */
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    loadOrg()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  // Agrège par travailleur : dernier message + nombre de non lus (venant de l'employé).
  const byWorker = useMemo(() => {
    const map = {}
    for (const w of workers) map[w.id] = { last: null, unread: 0 }
    for (const m of orgMessages) {
      const slot = map[m.worker_id]
      if (!slot) continue
      slot.last = m
      if (m.sender_role === 'employee' && !m.read_at) slot.unread += 1
    }
    return map
  }, [orgMessages, workers])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5E7385] py-16 justify-center">
        <Loader2 size={18} className="animate-spin" /> {t('loading')}
      </div>
    )
  }

  return (
    <div className="card p-0 overflow-hidden flex min-h-[460px]">
      {/* Liste des travailleurs */}
      <div className={`${selected ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-[290px] border-r border-line`}>
        <div className="px-4 py-3 border-b border-line text-[13.5px] font-bold">{t('mg_conversations')}</div>
        <div className="flex-1 overflow-y-auto">
          {workers.length === 0 ? (
            <p className="text-[12.5px] text-[#7A8FA0] p-4">{t('mg_add_worker_first')}</p>
          ) : (
            workers.map((w) => {
              const info = byWorker[w.id] ?? { last: null, unread: 0 }
              return (
                <button
                  key={w.id}
                  onClick={() => setSelected(w)}
                  className={`w-full text-left px-4 py-3 border-b border-mist flex items-center gap-3 hover:bg-paper transition ${
                    selected?.id === w.id ? 'bg-mist' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-steel text-white flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                    {initials(w.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate">{w.full_name}</div>
                    <div className="text-[11.5px] text-[#7A8FA0] truncate">
                      {info.last ? info.last.body : t('mg_no_message')}
                    </div>
                  </div>
                  {info.unread > 0 && (
                    <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {info.unread}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Fil de discussion */}
      <div className={`${selected ? 'flex' : 'hidden sm:flex'} flex-col flex-1 min-w-0`}>
        {selected ? (
          <Thread
            key={selected.id}
            orgId={orgId}
            worker={selected}
            onBack={() => setSelected(null)}
            onChanged={loadOrg}
            t={t}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#9FB0BF] gap-2">
            <MessageSquare size={30} />
            <p className="text-[13px]">{t('mg_select')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Thread({ orgId, worker, onBack, onChanged, t }) {
  const [thread, setThread] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  async function load(markRead = true) {
    try {
      const msgs = await getMessages(worker.id)
      setThread(msgs)
      if (markRead) {
        await markMessagesRead(worker.id, 'employer').catch(() => {})
        onChanged?.()
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(() => load(false), 20000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length])

  async function submit(e) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSending(true)
    try {
      await sendMessage({ orgId, workerId: worker.id, body: text, role: 'employer' })
      setBody('')
      await load(false)
      onChanged?.()
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-line flex items-center gap-2">
        <button onClick={onBack} className="sm:hidden text-[#7A8FA0]" aria-label="Retour">
          <ChevronLeft size={18} />
        </button>
        <div className="text-[13.5px] font-bold">{worker.full_name}</div>
        <div className="text-[11.5px] text-[#7A8FA0]">· {worker.occupation ?? t('d_worker')}</div>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[360px]">
        {loading ? (
          <div className="flex items-center gap-2 text-[#5E7385] py-6 justify-center">
            <Loader2 size={18} className="animate-spin" /> {t('loading')}
          </div>
        ) : thread.length === 0 ? (
          <p className="text-[13px] text-[#7A8FA0] text-center py-6">{t('mg_empty_thread')}</p>
        ) : (
          thread.map((m) => {
            const mine = m.sender_role === 'employer'
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                    mine ? 'bg-steel text-white' : 'bg-mist text-ink'
                  }`}
                >
                  <div className="text-[13.5px] leading-snug whitespace-pre-wrap">{m.body}</div>
                  <div className={`text-[10.5px] mt-1 flex items-center gap-1 ${mine ? 'text-white/70' : 'text-[#7A8FA0]'}`}>
                    <Clock size={10} /> {stamp(m.created_at)}
                    {mine && m.read_at && <span>· {t('mg_read')} ✓</span>}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t border-line p-3 flex gap-2">
        <input
          className="field-input flex-1"
          placeholder={t('mg_write')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" disabled={sending || !body.trim()} className="btn-gold !px-4">
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {t('mg_send')}
        </button>
      </form>
    </>
  )
}
