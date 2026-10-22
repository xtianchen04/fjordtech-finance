import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ShieldCheck,
  User,
  FileText,
  Download,
  MessageSquare,
  Upload,
  Check,
  Clock,
  LogOut,
  Send,
  Globe,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { LANGUAGES, makeT } from '../../lib/i18n'
import { maskNAS } from '../../lib/nas'
import { signOut } from '../../lib/supabase'
import {
  updateMyWorkerProfile,
  getMyDocuments,
  uploadDocument,
  getDocumentUrl,
  getMessages,
  sendMessage,
  markMessagesRead,
} from '../../lib/api'
import { buildRightsSheet } from '../../lib/generators'

// ============================================================
//  Portail employé — version authentifiée (données réelles Supabase).
//  Rendu lorsqu'un utilisateur connecté est lié à une fiche workers.
//  L'employé n'accède qu'à SA fiche, SES documents et SON fil de messages
//  (isolation garantie par les politiques RLS).
// ============================================================

const stamp = (iso) =>
  iso ? new Date(iso).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }) : ''

const DOC_SLOTS = [
  { category: 'permit', key: 'doc_permit' },
  { category: 'passport', key: 'doc_passport' },
  { category: 'license', key: 'doc_license' },
]

export default function EmployeeApp({ worker: initialWorker, user }) {
  const [worker, setWorker] = useState(initialWorker)
  const [lang, setLang] = useState(
    LANGUAGES.some((l) => l.code === initialWorker.primary_language)
      ? initialWorker.primary_language
      : 'fr',
  )
  const [tab, setTab] = useState('profile')
  const t = useMemo(() => makeT(lang), [lang])

  const firstName = (worker.full_name ?? '').split(/\s+/)[0] || ''

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* En-tête */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-4 bg-ink text-white">
        <div className="flex items-center gap-3">
          <div className="bg-gold rounded-xl p-2">
            <ShieldCheck size={20} className="text-ink" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-serif font-extrabold text-[17px] leading-none">ComplyHub</div>
            <div className="text-[10px] text-sky font-semibold uppercase tracking-widest mt-1">
              {t('portal_name')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-deep rounded-full pl-3 pr-1.5 py-1.5">
            <Globe size={15} className="text-sky" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-deep text-white text-[13px] font-semibold outline-none cursor-pointer pr-1"
              aria-label="Language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="text-ink">
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => signOut()} className="text-[#9FB8CE] hover:text-white" title={t('logout')}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col sm:flex-row max-w-[1000px] w-full mx-auto p-4 sm:p-6 gap-5">
        {/* Navigation */}
        <nav className="sm:w-[210px] flex sm:flex-col gap-1.5 flex-shrink-0 overflow-x-auto">
          {[
            { id: 'profile', Icon: User, key: 'nav_profile' },
            { id: 'documents', Icon: FileText, key: 'nav_documents' },
            { id: 'form', Icon: Download, key: 'nav_form' },
            { id: 'messages', Icon: MessageSquare, key: 'nav_messages' },
          ].map(({ id, Icon, key }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold whitespace-nowrap transition ${
                tab === id ? 'bg-steel text-white' : 'bg-white border border-line text-[#5E7385] hover:text-ink'
              }`}
            >
              <Icon size={17} /> {t(key)}
            </button>
          ))}
        </nav>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-xl font-extrabold mb-4">
            {t('welcome')}, {firstName} 👋
          </h1>

          {tab === 'profile' && (
            <ProfileTab t={t} worker={worker} email={user?.email} onSaved={setWorker} />
          )}
          {tab === 'documents' && <DocumentsTab t={t} worker={worker} />}
          {tab === 'form' && <FormTab t={t} worker={worker} lang={lang} />}
          {tab === 'messages' && <MessagesTab t={t} worker={worker} />}

          <p className="mt-5 text-[11.5px] text-[#7A8FA0] flex items-start gap-1.5 leading-relaxed">
            <Clock size={13} className="text-steel flex-shrink-0 mt-0.5" />
            {t('proof_note')}
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------- Profil ----------
function ProfileTab({ t, worker, email, onSaved }) {
  const [form, setForm] = useState({
    work_permit_number: worker.work_permit_number ?? '',
    permit_expiry: worker.permit_expiry ?? '',
    primary_language: worker.primary_language ?? 'fr',
    secondary_language: worker.secondary_language ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    setMsg('')
    setError('')
    try {
      const updated = await updateMyWorkerProfile(form)
      if (updated) onSaved?.(updated)
      setMsg(t('saved'))
    } catch {
      setError(t('error_generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-[15px] font-bold">{t('profile_title')}</h2>
        <p className="text-[12.5px] text-[#5E7385] mt-0.5">{t('profile_desc')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Champs en lecture seule (gérés par l'employeur) */}
        <div className="sm:col-span-2">
          <label className="field-label">{t('login_email')}</label>
          <input className="field-input bg-mist" value={email ?? ''} readOnly />
        </div>
        <div>
          <label className="field-label">{t('field_nas')}</label>
          <input className="field-input bg-mist" value={maskNAS(worker.social_insurance_number) || '—'} readOnly />
        </div>
        <div>
          <label className="field-label">{t('field_permit')}</label>
          <input
            className="field-input"
            value={form.work_permit_number}
            onChange={(e) => set('work_permit_number', e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">{t('field_lang_primary')}</label>
          <select
            className="field-input"
            value={form.primary_language}
            onChange={(e) => set('primary_language', e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">{t('field_lang_secondary')}</label>
          <select
            className="field-input"
            value={form.secondary_language}
            onChange={(e) => set('secondary_language', e.target.value)}
          >
            <option value="">—</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] text-[#7A8FA0] flex items-center gap-1.5">
        <ShieldCheck size={12} className="text-steel" /> {t('profile_locked')}
      </p>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving && <Loader2 size={15} className="animate-spin" />} {t('save')}
        </button>
        {msg && <span className="text-[12.5px] text-ok font-medium">{msg}</span>}
        {error && <span className="text-[12.5px] text-danger font-medium">{error}</span>}
      </div>
    </div>
  )
}

// ---------- Documents ----------
function DocumentsTab({ t, worker }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null) // catégorie en cours de téléversement
  const [error, setError] = useState('')
  const inputs = useRef({})

  async function load() {
    setLoading(true)
    try {
      setDocs(await getMyDocuments(worker.id))
    } catch {
      setError(t('error_generic'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker.id])

  async function upload(category, file) {
    if (!file) return
    setBusy(category)
    setError('')
    try {
      await uploadDocument(worker.org_id, { file, category, workerId: worker.id })
      await load()
    } catch {
      setError(t('error_generic'))
    } finally {
      setBusy(null)
    }
  }

  async function open(doc) {
    try {
      const url = await getDocumentUrl(doc.storage_path)
      window.open(url, '_blank', 'noopener')
    } catch {
      setError(t('error_generic'))
    }
  }

  const byCategory = (cat) => docs.find((d) => d.category === cat)

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-[15px] font-bold">{t('documents_title')}</h2>
        <p className="text-[12.5px] text-[#5E7385] mt-0.5">{t('documents_desc')}</p>
      </div>
      {error && <div className="px-5 py-2 text-[12.5px] text-danger">{error}</div>}
      {loading ? (
        <div className="flex items-center gap-2 text-[#5E7385] py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> {t('loading')}
        </div>
      ) : (
        <div>
          {DOC_SLOTS.map(({ category, key }) => {
            const existing = byCategory(category)
            const done = Boolean(existing)
            return (
              <div key={category} className="flex items-center gap-3 px-5 py-3.5 border-b border-mist last:border-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: done ? '#E6F4EC' : '#FBF1DE' }}
                >
                  {done ? <Check size={16} className="text-ok" /> : <Upload size={16} className="text-amber" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold">{t(key)}</div>
                  <div className="text-[11.5px] text-[#7A8FA0]">
                    {done ? `${t('status_done')} · ${t('uploaded_on')} ${stamp(existing.uploaded_at)}` : t('status_todo')}
                  </div>
                </div>
                {done && (
                  <button onClick={() => open(existing)} className="filter-btn" title={existing.file_name}>
                    <ExternalLink size={13} />
                  </button>
                )}
                <input
                  ref={(el) => (inputs.current[category] = el)}
                  type="file"
                  className="hidden"
                  onChange={(e) => upload(category, e.target.files?.[0])}
                />
                <button
                  onClick={() => inputs.current[category]?.click()}
                  disabled={busy === category}
                  className={done ? 'filter-btn' : 'btn-gold !py-2 !px-3.5 text-[12.5px]'}
                >
                  {busy === category ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}{' '}
                  {busy === category ? t('uploading') : t('upload_btn')}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Formulaire d'intégration (fiche d'information sur les droits) ----------
function FormTab({ t, worker, lang }) {
  function openSheet(sheetLang) {
    const html = buildRightsSheet({ worker, lang: sheetLang })
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }
  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-[15px] font-bold">{t('form_title')}</h2>
        <p className="text-[12.5px] text-[#5E7385] mt-0.5">{t('form_desc')}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => openSheet('fr')} className="btn-primary">
          <Download size={15} /> {t('download_btn')} — Français
        </button>
        <button onClick={() => openSheet('en')} className="btn-primary">
          <Download size={15} /> {t('download_btn')} — English
        </button>
        {lang !== 'fr' && lang !== 'en' && (
          <button onClick={() => openSheet(lang)} className="btn-gold">
            <Download size={15} /> {t('download_btn')} — {LANGUAGES.find((l) => l.code === lang)?.label}
          </button>
        )}
      </div>
      <p className="text-[11.5px] text-[#7A8FA0]">{t('form_lang_note')}</p>
    </div>
  )
}

// ---------- Messages ----------
function MessagesTab({ t, worker }) {
  const [thread, setThread] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  async function load(markRead = true) {
    try {
      const msgs = await getMessages(worker.id)
      setThread(msgs)
      if (markRead) await markMessagesRead(worker.id, 'employee').catch(() => {})
    } catch {
      setError(t('error_generic'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(() => load(false), 20000) // rafraîchissement léger
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
    setError('')
    try {
      await sendMessage({ orgId: worker.org_id, workerId: worker.id, body: text, role: 'employee' })
      setBody('')
      await load(false)
    } catch {
      setError(t('error_generic'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card p-0 overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-[15px] font-bold">{t('messages_title')}</h2>
        <p className="text-[12.5px] text-[#5E7385] mt-0.5">{t('messages_desc')}</p>
      </div>

      <div className="p-5 space-y-3 max-h-[380px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 text-[#5E7385] py-6 justify-center">
            <Loader2 size={18} className="animate-spin" /> {t('loading')}
          </div>
        ) : thread.length === 0 ? (
          <p className="text-[13px] text-[#7A8FA0] text-center py-6">{t('no_messages')}</p>
        ) : (
          thread.map((m) => {
            const mine = m.sender_role === 'employee'
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
                    {mine && m.read_at && <span>· {t('read_receipt')} ✓</span>}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {error && <div className="px-5 pb-2 text-[12.5px] text-danger">{error}</div>}
      <form onSubmit={submit} className="border-t border-line p-3 flex gap-2">
        <input
          className="field-input flex-1"
          placeholder={t('reply_placeholder')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" disabled={sending || !body.trim()} className="btn-gold !px-4">
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {t('send_btn')}
        </button>
      </form>
    </div>
  )
}
