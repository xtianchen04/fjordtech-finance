import { useState } from 'react'
import { ChevronDown, ExternalLink, HelpCircle, BookOpen } from 'lucide-react'
import { useLang } from '../lib/LanguageContext'
import { faqEmployer, faqEmployee, resourcesEmployee, resourcesEmployer } from '../lib/resources'

// ============================================================
//  Centre FAQ + Ressources — employeur ou employé.
//  props : kind ('employer' | 'employee'), province (employeur),
//          lang (optionnel ; sinon langue globale).
// ============================================================
export default function ResourceCenter({ kind = 'employer', province = null, lang: langProp }) {
  const ctx = useLang()
  const lang = langProp ?? ctx.lang
  const t = ctx.t

  const faq = kind === 'employer' ? faqEmployer(lang) : faqEmployee(lang)
  const resources =
    kind === 'employer' ? resourcesEmployer(lang, province) : resourcesEmployee(lang)

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* FAQ */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center gap-2.5">
          <HelpCircle size={18} className="text-steel" />
          <div className="text-[15px] font-bold">{t('rc_faq_title')}</div>
        </div>
        <div>
          {faq.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>

      {/* Ressources */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center gap-2.5">
          <BookOpen size={18} className="text-steel" />
          <div className="text-[15px] font-bold">{t('rc_resources_title')}</div>
        </div>
        <div>
          {resources.map((r, i) => {
            const title = r.title ?? r.topic
            return (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 px-5 py-3.5 border-b border-mist last:border-0 hover:bg-paper transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-ink group-hover:text-steel transition">
                    {title}
                  </div>
                  <div className="text-[12px] text-[#5E7385] mt-0.5 leading-snug">{r.desc}</div>
                </div>
                {r.source && <span className="badge flex-shrink-0">{r.source}</span>}
                <ExternalLink size={16} className="text-[#9FB0BF] group-hover:text-steel transition flex-shrink-0" />
              </a>
            )
          })}
        </div>
      </div>

      <p className="text-[11.5px] text-[#9FB0BF] px-1">{t('rc_disclaimer')}</p>
    </div>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-mist last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-paper transition"
      >
        <span className="flex-1 text-[13.5px] font-semibold">{q}</span>
        <ChevronDown
          size={17}
          className={`text-[#9FB0BF] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <p className="px-5 pb-4 -mt-1 text-[13px] text-[#5E7385] leading-relaxed">{a}</p>}
    </div>
  )
}
