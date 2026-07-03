import { useMemo, useState } from 'react'
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
} from 'lucide-react'
import { LANGUAGES, makeT } from '../../lib/i18n'
import { maskNAS } from '../../lib/nas'

// ============================================================
//  MAQUETTE — Portail employé (multilingue).
//  Aperçu visuel non connecté : données d'exemple, aucune sauvegarde.
//  Accessible via #/employe (voir App.jsx). Sert à valider la direction
//  avant de bâtir les fondations (rôles, invitations, RLS).
// ============================================================

const NOW = new Date()
const stamp = (d) =>
  d.toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })

export default function EmployeePortal() {
  const [lang, setLang] = useState('fr')
  const [authed, setAuthed] = useState(false)
  const t = useMemo(() => makeT(lang), [lang])

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Header t={t} lang={lang} setLang={setLang} authed={authed} onLogout={() => setAuthed(false)} />
      <div className="bg-mist text-deep text-[12px] text-center py-1.5 px-4">{t('preview_banner')}</div>
      {authed ? <Dashboard t={t} lang={lang} /> : <Login t={t} onLogin={() => setAuthed(true)} />}
    </div>
  )
}

function Header({ t, lang, setLang, authed, onLogout }) {
  return (
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
        {authed && (
          <button onClick={onLogout} className="text-[#9FB8CE] hover:text-white" title={t('logout')}>
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  )
}

function Login({ t, onLogin }) {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl font-extrabold mb-1">{t('login_title')}</h1>
        <p className="text-sm text-[#5E7385] mb-6">{t('tagline')}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onLogin()
          }}
          className="card space-y-4"
        >
          <div>
            <label className="field-label">{t('login_email')}</label>
            <input type="email" className="field-input" placeholder="nom@exemple.com" defaultValue="maria@exemple.com" />
          </div>
          <div>
            <label className="field-label">{t('login_password')}</label>
            <input type="password" className="field-input" placeholder="••••••••" defaultValue="demo1234" />
          </div>
          <button type="submit" className="btn-gold w-full">
            {t('login_btn')}
          </button>
          <p className="text-[11.5px] text-[#7A8FA0] leading-relaxed">{t('login_help')}</p>
        </form>
      </div>
    </main>
  )
}

const NAV = [
  { id: 'profile', Icon: User, key: 'nav_profile' },
  { id: 'documents', Icon: FileText, key: 'nav_documents' },
  { id: 'form', Icon: Download, key: 'nav_form' },
  { id: 'messages', Icon: MessageSquare, key: 'nav_messages' },
]

function Dashboard({ t, lang }) {
  const [tab, setTab] = useState('profile')
  return (
    <div className="flex-1 flex flex-col sm:flex-row max-w-[1000px] w-full mx-auto p-4 sm:p-6 gap-5">
      {/* Nav latérale */}
      <nav className="sm:w-[210px] flex sm:flex-col gap-1.5 flex-shrink-0 overflow-x-auto">
        {NAV.map(({ id, Icon, key }) => (
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
          {t('welcome')}, Maria 👋
        </h1>
        {tab === 'profile' && <ProfileTab t={t} />}
        {tab === 'documents' && <DocumentsTab t={t} />}
        {tab === 'form' && <FormTab t={t} />}
        {tab === 'messages' && <MessagesTab t={t} />}

        <p className="mt-5 text-[11.5px] text-[#7A8FA0] flex items-start gap-1.5 leading-relaxed">
          <Clock size={13} className="text-steel flex-shrink-0 mt-0.5" />
          {t('proof_note')}
        </p>
      </div>
    </div>
  )
}

function ProfileTab({ t }) {
  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-[15px] font-bold">{t('profile_title')}</h2>
        <p className="text-[12.5px] text-[#5E7385] mt-0.5">{t('profile_desc')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label">{t('field_nas')}</label>
          <input className="field-input" defaultValue={maskNAS('123456782')} readOnly />
        </div>
        <div>
          <label className="field-label">{t('field_permit')}</label>
          <input className="field-input" placeholder="UCI / permis" />
        </div>
        <div>
          <label className="field-label">{t('field_lang_primary')}</label>
          <select className="field-input" defaultValue="es">
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">{t('field_lang_secondary')}</label>
          <select className="field-input" defaultValue="en">
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>
      <button className="btn-primary">{t('save')}</button>
    </div>
  )
}

function DocumentsTab({ t }) {
  const docs = [
    { key: 'doc_permit', done: true, at: stamp(new Date(NOW.getTime() - 2 * 86400000)) },
    { key: 'doc_passport', done: true, at: stamp(new Date(NOW.getTime() - 86400000)) },
    { key: 'doc_license', done: false, at: null },
  ]
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-[15px] font-bold">{t('documents_title')}</h2>
        <p className="text-[12.5px] text-[#5E7385] mt-0.5">{t('documents_desc')}</p>
      </div>
      <div>
        {docs.map((d) => (
          <div key={d.key} className="flex items-center gap-3 px-5 py-3.5 border-b border-mist last:border-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: d.done ? '#E6F4EC' : '#FBF1DE' }}
            >
              {d.done ? <Check size={16} className="text-ok" /> : <Upload size={16} className="text-amber" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold">{t(d.key)}</div>
              <div className="text-[11.5px] text-[#7A8FA0]">
                {d.done ? `${t('status_done')} · ${t('uploaded_on')} ${d.at}` : t('status_todo')}
              </div>
            </div>
            <button className={d.done ? 'filter-btn' : 'btn-gold !py-2 !px-3.5 text-[12.5px]'}>
              <Upload size={14} /> {t('upload_btn')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function FormTab({ t }) {
  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-[15px] font-bold">{t('form_title')}</h2>
        <p className="text-[12.5px] text-[#5E7385] mt-0.5">{t('form_desc')}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary">
          <Download size={15} /> {t('download_btn')} — Français
        </button>
        <button className="btn-primary">
          <Download size={15} /> {t('download_btn')} — English
        </button>
      </div>
      <p className="text-[11.5px] text-[#7A8FA0]">{t('form_lang_note')}</p>
    </div>
  )
}

function MessagesTab({ t }) {
  const thread = [
    {
      from: 'employer',
      name: 'Acadie Xpress (employeur)',
      body: "Bonjour Maria, merci de téléverser votre permis de conduire avant vendredi.",
      at: stamp(new Date(NOW.getTime() - 3 * 3600000)),
      read: true,
    },
    {
      from: 'employee',
      name: 'Maria',
      body: "Bonjour, c'est noté, je l'envoie demain.",
      at: stamp(new Date(NOW.getTime() - 2 * 3600000)),
      read: true,
    },
  ]
  return (
    <div className="card p-0 overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-[15px] font-bold">{t('messages_title')}</h2>
        <p className="text-[12.5px] text-[#5E7385] mt-0.5">{t('messages_desc')}</p>
      </div>
      <div className="p-5 space-y-3 max-h-[340px] overflow-y-auto">
        {thread.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'employee' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                m.from === 'employee' ? 'bg-steel text-white' : 'bg-mist text-ink'
              }`}
            >
              <div className="text-[11px] font-bold opacity-80 mb-0.5">{m.name}</div>
              <div className="text-[13.5px] leading-snug">{m.body}</div>
              <div className={`text-[10.5px] mt-1 flex items-center gap-1 ${m.from === 'employee' ? 'text-white/70' : 'text-[#7A8FA0]'}`}>
                <Clock size={10} /> {m.at}
                {m.read && <span>· {t('read_receipt')} ✓</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-line p-3 flex gap-2">
        <input className="field-input flex-1" placeholder={t('reply_placeholder')} />
        <button className="btn-gold !px-4">
          <Send size={15} /> {t('send_btn')}
        </button>
      </div>
    </div>
  )
}
