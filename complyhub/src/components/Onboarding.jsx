import { useState } from 'react'
import { ShieldCheck, Loader2, Building2 } from 'lucide-react'
import { createOrganization } from '../lib/api'
import { signOut } from '../lib/supabase'
import { PROVINCES } from '../lib/constants'

// Affiché après la connexion lorsque l'utilisateur n'a pas encore d'organisation.
export default function Onboarding({ onCreated }) {
  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    business_number: '',
    address: '',
    province: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const org = await createOrganization(form)
      onCreated?.(org)
    } catch (err) {
      setError(err.message ?? "Impossible de créer l'organisation.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-line bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-gold rounded-xl p-2">
            <ShieldCheck size={22} className="text-ink" strokeWidth={2.5} />
          </div>
          <div className="font-serif font-extrabold text-lg">ComplyHub</div>
        </div>
        <button className="text-[13px] text-[#5E7385] hover:text-ink font-semibold" onClick={() => signOut()}>
          Se déconnecter
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-mist rounded-xl p-2.5">
              <Building2 size={22} className="text-steel" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-extrabold leading-tight">
                Bienvenue dans ComplyHub
              </h1>
              <p className="text-sm text-[#5E7385] mt-1">
                Configurons votre organisation pour démarrer votre dossier de conformité.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="field-label" htmlFor="name">
                Nom commercial *
              </label>
              <input
                id="name"
                required
                className="field-input"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Acadie Xpress Negocio"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="legal_name">
                Raison sociale
              </label>
              <input
                id="legal_name"
                className="field-input"
                value={form.legal_name}
                onChange={(e) => update('legal_name', e.target.value)}
                placeholder="11919644 Canada Inc."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="business_number">
                  Numéro d'entreprise
                </label>
                <input
                  id="business_number"
                  className="field-input"
                  value={form.business_number}
                  onChange={(e) => update('business_number', e.target.value)}
                  placeholder="123456789 RP0001"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="province">
                  Province
                </label>
                <select
                  id="province"
                  className="field-input"
                  value={form.province}
                  onChange={(e) => update('province', e.target.value)}
                >
                  <option value="">Sélectionner…</option>
                  {PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="address">
                Adresse
              </label>
              <input
                id="address"
                className="field-input"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="123 rue Principale, Moncton, NB"
              />
            </div>

            {error && <div className="text-[12.5px] text-danger font-medium">{error}</div>}

            <button type="submit" disabled={loading || !form.name} className="btn-gold w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Créer mon organisation
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
