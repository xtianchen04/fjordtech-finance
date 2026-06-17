import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createWorker } from '../lib/api'
import { PROVINCES, PROGRAMS } from '../lib/constants'

// Modal d'ajout d'un travailleur étranger.
// La création génère automatiquement les conditions de conformité (voir api.createWorker).
export default function WorkerForm({ orgId, onClose, onCreated }) {
  const [form, setForm] = useState({
    full_name: '',
    program: 'PMI',
    occupation: '',
    work_permit_number: '',
    permit_expiry: '',
    offered_wage: '',
    offered_hours: '',
    work_province: '',
    start_date: '',
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
      const worker = await createWorker(orgId, form)
      onCreated?.(worker)
      onClose?.()
    } catch (err) {
      setError(err.message ?? "Impossible d'ajouter le travailleur.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl my-6 border border-line shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="font-serif text-lg font-extrabold">Ajouter un travailleur</h2>
          <button onClick={onClose} className="text-[#7A8FA0] hover:text-ink" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="full_name">
                Nom complet *
              </label>
              <input
                id="full_name"
                required
                className="field-input"
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                placeholder="Charles R. Njonou"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="program">
                Programme
              </label>
              <select
                id="program"
                className="field-input"
                value={form.program}
                onChange={(e) => update('program', e.target.value)}
              >
                {PROGRAMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="occupation">
                Profession
              </label>
              <input
                id="occupation"
                className="field-input"
                value={form.occupation}
                onChange={(e) => update('occupation', e.target.value)}
                placeholder="Superviseur"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="work_permit_number">
                N° de permis de travail
              </label>
              <input
                id="work_permit_number"
                className="field-input"
                value={form.work_permit_number}
                onChange={(e) => update('work_permit_number', e.target.value)}
                placeholder="UCI / permis"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="permit_expiry">
                Expiration du permis
              </label>
              <input
                id="permit_expiry"
                type="date"
                className="field-input"
                value={form.permit_expiry}
                onChange={(e) => update('permit_expiry', e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="offered_wage">
                Salaire offert ($/h)
              </label>
              <input
                id="offered_wage"
                type="number"
                step="0.01"
                min="0"
                className="field-input"
                value={form.offered_wage}
                onChange={(e) => update('offered_wage', e.target.value)}
                placeholder="22.50"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="offered_hours">
                Heures offertes / sem.
              </label>
              <input
                id="offered_hours"
                type="number"
                step="0.5"
                min="0"
                className="field-input"
                value={form.offered_hours}
                onChange={(e) => update('offered_hours', e.target.value)}
                placeholder="40"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="work_province">
                Province de travail
              </label>
              <select
                id="work_province"
                className="field-input"
                value={form.work_province}
                onChange={(e) => update('work_province', e.target.value)}
              >
                <option value="">Sélectionner…</option>
                {PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="start_date">
                Date de début
              </label>
              <input
                id="start_date"
                type="date"
                className="field-input"
                value={form.start_date}
                onChange={(e) => update('start_date', e.target.value)}
              />
            </div>
          </div>

          {error && <div className="text-[12.5px] text-danger font-medium">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-[13px] font-semibold text-[#5E7385] px-4 py-2.5 hover:text-ink"
            >
              Annuler
            </button>
            <button type="submit" disabled={loading || !form.full_name} className="btn-primary">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Ajouter le travailleur
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
