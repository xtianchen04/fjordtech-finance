import {
  ShieldCheck,
  Lock,
  BarChart3,
  FileCheck,
  Globe,
  MessageSquare,
  ArrowRight,
  Check,
} from 'lucide-react'
import { landingContent } from '../lib/i18n'
import { useLang } from '../lib/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'

// Icônes associées aux fonctionnalités (même ordre que landingContent().features).
const FEATURE_ICONS = [BarChart3, FileCheck, Lock, Globe, MessageSquare, ShieldCheck]

// Page d'accueil publique (visiteurs non connectés) — multilingue.
export default function Landing({ onStart, onDemo }) {
  const { lang } = useLang()
  const c = landingContent(lang)

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Barre de navigation */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 max-w-6xl mx-auto">
        <a href="#/" className="flex items-center gap-2.5">
          <img src="/complyhub-shield.png" alt="ComplyHub" className="h-10 w-auto logo-penumbra" />
          <div className="font-serif font-extrabold text-lg">ComplyHub</div>
        </a>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="light" />
          <button onClick={onStart} className="btn-primary">
            {c.signin}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center px-6 pt-12 pb-20">
        <div className="relative inline-flex justify-center mb-7">
          <div className="absolute -inset-10 logo-halo" aria-hidden="true" />
          <img
            src="/complyhub-shield.png"
            alt="ComplyHub"
            className="relative h-28 sm:h-32 w-auto logo-penumbra"
          />
        </div>
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-mist text-steel text-[12px] font-semibold px-3 py-1.5 rounded-full mb-6">
            <ShieldCheck size={14} /> {c.badge}
          </div>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
          {c.heroTitle}
        </h1>
        <p className="text-[15px] sm:text-base text-[#5E7385] mt-5 leading-relaxed max-w-2xl mx-auto">
          {c.heroSub}
        </p>
        <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
          <button onClick={onStart} className="btn-gold">
            {c.ctaStart} <ArrowRight size={16} />
          </button>
          {onDemo && (
            <button onClick={onDemo} className="btn-primary">
              {c.ctaDemo}
            </button>
          )}
        </div>
        <p className="text-[12px] text-[#9FB0BF] mt-4">{c.disclaimer}</p>
      </section>

      {/* Fonctionnalités */}
      <section className="bg-white border-y border-line py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-serif text-2xl font-extrabold text-center mb-10">{c.featuresTitle}</h2>
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {c.features.map(([title, desc], i) => {
              const Icon = FEATURE_ICONS[i] ?? ShieldCheck
              return (
                <div key={title} className="card">
                  <div className="bg-mist rounded-xl p-2.5 inline-flex mb-3">
                    <Icon size={20} className="text-steel" />
                  </div>
                  <div className="text-[15px] font-bold mb-1.5">{title}</div>
                  <p className="text-[13px] text-[#5E7385] leading-relaxed">{desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section className="py-16 max-w-5xl mx-auto px-6">
        <h2 className="font-serif text-2xl font-extrabold text-center mb-10">{c.pricingTitle}</h2>
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {c.plans.map(([name, price, period, features, cta], i) => {
            const featured = i === 1 // le forfait du milieu est mis en avant
            return (
              <div
                key={name}
                className={`bg-white rounded-2xl p-6 border ${
                  featured ? 'border-gold shadow-lg' : 'border-line'
                } flex flex-col`}
              >
                <div className="text-[15px] font-bold">{name}</div>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-extrabold font-serif">{price}</span>
                  <span className="text-[13px] text-[#7A8FA0]"> {period}</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-[13px] text-[#5E7385]">
                      <Check size={16} className="text-ok flex-shrink-0 mt-0.5" /> {feat}
                    </li>
                  ))}
                </ul>
                <button onClick={onStart} className={`${featured ? 'btn-gold' : 'btn-primary'} w-full`}>
                  {i === 0 ? c.start : cta}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-[12.5px] text-[#9FB0BF]">
        <a href="#/employe" className="text-steel font-semibold hover:underline">
          {c.employeePreview}
        </a>
        <span className="mx-2 text-[#CBD6E0]">·</span>
        <a href="#/cabinet" className="text-steel font-semibold hover:underline">
          Console Cabinet (maquette)
        </a>
        <div className="mt-2">
          © {new Date().getFullYear()} ComplyHub · {c.rights}
        </div>
      </footer>
    </div>
  )
}
