import { Bell, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
import { useLang } from '../lib/LanguageContext'

const SEVERITY = {
  missing: { Icon: XCircle, color: '#D1495B', bg: '#FAE5E8', labelKey: 'al_critical' },
  warn: { Icon: AlertTriangle, color: '#E0A030', bg: '#FBF1DE', labelKey: 'al_warning' },
}

// Vue dédiée aux alertes (permis qui expirent, conditions manquantes).
export default function Alerts({ alerts = [] }) {
  const { t } = useLang()
  if (alerts.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center text-center py-16">
        <div className="bg-[#E6F4EC] rounded-2xl p-4 mb-4">
          <CheckCircle2 size={28} className="text-ok" />
        </div>
        <h2 className="font-serif text-xl font-extrabold mb-1.5">{t('al_none_title')}</h2>
        <p className="text-sm text-[#5E7385] max-w-sm">{t('al_none_desc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[15px] font-bold mb-1">
        <Bell size={18} className="text-gold" /> {alerts.length} {t('d_alerts_active')}
      </div>
      {alerts.map((a) => {
        const sev = SEVERITY[a.severity] ?? SEVERITY.warn
        return (
          <div key={a.id} className="card flex items-start gap-3.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: sev.bg }}
            >
              <sev.Icon size={18} style={{ color: sev.color }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[14px] font-semibold">{a.title}</span>
                <span
                  className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-lg uppercase"
                  style={{ background: sev.bg, color: sev.color }}
                >
                  {t(sev.labelKey)}
                </span>
              </div>
              <p className="text-[12.5px] text-[#5E7385] mt-1">{a.detail}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
