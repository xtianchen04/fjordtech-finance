import { useState } from 'react'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { PLANS } from '../lib/constants'
import { startCheckout } from '../lib/api'
import { useLang } from '../lib/LanguageContext'
import { landingContent } from '../lib/i18n'

// Page de facturation : paliers d'abonnement + Stripe Checkout.
export default function Billing({ org }) {
  const { t, lang } = useLang()
  const planText = landingContent(lang).plans // [name, price, period, features[], cta] par index
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState('')
  const currentTier = org?.subscription_tier ?? 'free'

  async function choose(plan) {
    if (plan.id === 'free' || plan.id === currentTier) return
    setLoadingPlan(plan.id)
    setError('')
    try {
      await startCheckout(plan.id)
    } catch (err) {
      setError((err.message ?? 'Erreur') + t('bl_error_suffix'))
      setLoadingPlan(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-xl font-extrabold mb-1">{t('d_nav_billing')}</h2>
        <p className="text-sm text-[#5E7385]">
          {t('bl_current_label')} <b className="capitalize">{currentTier}</b>. {t('bl_current_desc')}
        </p>
      </div>

      {error && (
        <div className="mb-5 text-[12.5px] bg-[#FAE5E8] text-danger rounded-xl px-4 py-3">{error}</div>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {PLANS.map((plan, i) => {
          const isCurrent = plan.id === currentTier
          const [name, price, period, features, cta] = planText[i] ?? [plan.name, plan.price, plan.period, plan.features, plan.cta]
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-6 border ${
                plan.featured ? 'border-gold shadow-lg' : 'border-line'
              } flex flex-col`}
            >
              {plan.featured && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gold uppercase tracking-wide mb-2">
                  <Sparkles size={14} /> {t('bl_recommended')}
                </div>
              )}
              <div className="text-[15px] font-bold">{name}</div>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-extrabold font-serif">{price}</span>
                <span className="text-[13px] text-[#7A8FA0]"> {period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-[#5E7385]">
                    <Check size={16} className="text-ok flex-shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => choose(plan)}
                disabled={isCurrent || loadingPlan === plan.id}
                className={`${plan.featured ? 'btn-gold' : 'btn-primary'} w-full`}
              >
                {loadingPlan === plan.id && <Loader2 size={16} className="animate-spin" />}
                {isCurrent ? t('bl_current_plan') : cta}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-[11.5px] text-[#9FB0BF] mt-5">{t('bl_stripe_note')}</p>
    </div>
  )
}
