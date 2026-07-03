import { useState } from 'react'
import { Loader2, Check, Building2, Bell } from 'lucide-react'
import { updateOrganization } from '../lib/api'
import { PROVINCES } from '../lib/constants'

// Paramètres de l'organisation : modifier les coordonnées, la province
// (lieu d'établissement — pilote la veille réglementaire) et les
// préférences de notification par courriel.
export default function Settings({ org, onSaved }) {
  const [form, setForm] = useState({
    name: org.name ?? '',
    legal_name: org.legal_name ?? '',
    business_number: org.business_number ?? '',
    address: org.address ?? '',
    province: org.province ?? '',
    notify_enabled: org.notify_enabled ?? false,
    notify_email: org.notify_email ?? '',
    alert_window_days: org.alert_window_days ?? 90,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setLoading(true)
    try {
      const patch = {
        ...form,
        alert_window_days: Number(form.alert_window_days) || 90,
        notify_email: form.notify_email?.trim() || null,
      }
      const updated = await updateOrganization(org.id, patch)
      onSaved?.(updated)
      setSaved(true)
    } catch (err) {
      setError(err.message ?? 'Impossible d’enregistrer les modifications.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      {/* Coordonnées de l'organisation */}
      <div className="card">
        <div className="flex items-center gap-2.5 mb-4">
          <Building2 size={18} className="text-steel" />
          <h2 className="text-[15px] font-bold">Organisation</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="name">Nom commercial *</label>
            <input
              id="name"
              required
              className="field-input"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="legal_name">Raison sociale</label>
            <input
              id="legal_name"
              className="field-input"
              value={form.legal_name}
              onChange={(e) => update('legal_name', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="business_number">Numéro d'entreprise</label>
              <input
                id="business_number"
                className="field-input"
                value={form.business_number}
                onChange={(e) => update('business_number', e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="province">
                Province (lieu d'établissement)
              </label>
              <select
                id="province"
                className="field-input"
                value={form.province}
                onChange={(e) => update('province', e.target.value)}
              >
                <option value="">Sélectionner…</option>
                {PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[#7A8FA0]">
                Détermine les liens provinciaux affichés dans « Veille réglementaire ».
              </p>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="address">Adresse</label>
            <input
              id="address"
              className="field-input"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Préférences de notification */}
      <div className="card">
        <div className="flex items-center gap-2.5 mb-4">
          <Bell size={18} className="text-steel" />
          <h2 className="text-[15px] font-bold">Notifications par courriel</h2>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-steel"
            checked={form.notify_enabled}
            onChange={(e) => update('notify_enabled', e.target.checked)}
          />
          <span className="text-[13.5px] text-ink">
            Recevoir un rappel par courriel lorsqu'un permis approche de son expiration ou
            qu'une condition de conformité est manquante.
            <span className="block text-[11.5px] text-[#7A8FA0] mt-0.5">
              L'envoi requiert l'activation du service d'alertes côté serveur (voir la
              documentation). Sans cela, les alertes restent visibles dans l'application.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="field-label" htmlFor="notify_email">Courriel de destination</label>
            <input
              id="notify_email"
              type="email"
              className="field-input"
              value={form.notify_email}
              onChange={(e) => update('notify_email', e.target.value)}
              placeholder="conformite@monentreprise.ca"
              disabled={!form.notify_enabled}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="alert_window_days">
              Délai d'alerte avant expiration (jours)
            </label>
            <input
              id="alert_window_days"
              type="number"
              min="1"
              max="365"
              className="field-input"
              value={form.alert_window_days}
              onChange={(e) => update('alert_window_days', e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className="text-[12.5px] text-danger font-medium">{error}</div>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading || !form.name} className="btn-gold">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Enregistrer les modifications
        </button>
        {saved && !loading && (
          <span className="text-[13px] font-semibold text-ok flex items-center gap-1.5">
            <Check size={16} /> Enregistré
          </span>
        )}
      </div>
    </form>
  )
}
