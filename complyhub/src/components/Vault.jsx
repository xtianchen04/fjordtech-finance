import { useRef, useState } from 'react'
import { Lock, Clock, Upload, Download, Trash2, Loader2, FileText, ArrowLeft } from 'lucide-react'
import { VAULT_FOLDERS } from '../lib/constants'
import { uploadDocument, deleteDocument, getDocumentUrl } from '../lib/api'

// Coffre-fort documentaire branché sur Supabase Storage.
export default function Vault({ orgId, documents = [], workers = [], onChange }) {
  const [openCategory, setOpenCategory] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [workerId, setWorkerId] = useState('')
  const fileRef = useRef(null)

  const byCategory = documents.reduce((acc, d) => {
    ;(acc[d.category] ??= []).push(d)
    return acc
  }, {})

  const folder = VAULT_FOLDERS.find((f) => f.category === openCategory)
  const folderDocs = openCategory ? byCategory[openCategory] ?? [] : []

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permet de re-téléverser le même fichier
    if (!file || !openCategory) return
    setBusy(true)
    setError('')
    try {
      await uploadDocument(orgId, { file, category: openCategory, workerId: workerId || null })
      await onChange?.()
    } catch (err) {
      setError(err.message ?? 'Échec du téléversement.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload(doc) {
    try {
      const url = await getDocumentUrl(doc.storage_path)
      window.open(url, '_blank')
    } catch (err) {
      setError(err.message ?? 'Impossible d\'ouvrir le document.')
    }
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Supprimer « ${doc.file_name} » ?`)) return
    setBusy(true)
    setError('')
    try {
      await deleteDocument(doc)
      await onChange?.()
    } catch (err) {
      setError(err.message ?? 'Échec de la suppression.')
    } finally {
      setBusy(false)
    }
  }

  // --- Vue d'un dossier ouvert ---
  if (openCategory) {
    return (
      <div>
        <button
          onClick={() => setOpenCategory(null)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-steel mb-4 hover:text-deep"
        >
          <ArrowLeft size={16} /> Tous les dossiers
        </button>

        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-mist rounded-xl p-2.5 flex">
                <Lock size={19} className="text-steel" />
              </div>
              <div>
                <div className="text-base font-bold">{folder?.name}</div>
                <div className="text-[12px] text-[#7A8FA0]">{folderDocs.length} document(s)</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {workers.length > 0 && (
                <select
                  className="field-input max-w-[180px]"
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                >
                  <option value="">Général (org.)</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.full_name}
                    </option>
                  ))}
                </select>
              )}
              <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-primary">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Téléverser
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
            </div>
          </div>

          {error && <div className="text-[12.5px] text-danger font-medium mb-3">{error}</div>}

          {folderDocs.length === 0 ? (
            <p className="text-sm text-[#7A8FA0] py-8 text-center">
              Aucun document dans ce dossier. Téléversez-en un pour commencer.
            </p>
          ) : (
            <div>
              {folderDocs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-3 border-b border-mist last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={18} className="text-steel flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold truncate">{d.file_name}</div>
                      <div className="text-[11.5px] text-[#9FB0BF]">
                        Conservé jusqu'au {d.retention_until ?? '—'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleDownload(d)}
                      className="p-2 text-steel hover:bg-mist rounded-lg"
                      title="Télécharger"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      className="p-2 text-danger hover:bg-[#FAE5E8] rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Grille des dossiers ---
  return (
    <div>
      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {VAULT_FOLDERS.map((f) => {
          const count = byCategory[f.category]?.length ?? 0
          return (
            <button
              key={f.category}
              onClick={() => setOpenCategory(f.category)}
              className="bg-white rounded-2xl p-5 border border-line cursor-pointer transition-transform hover:-translate-y-0.5 text-left"
            >
              <div className="flex justify-between items-start mb-3.5">
                <div className="bg-mist rounded-xl p-2.5 flex">
                  <Lock size={19} className="text-steel" />
                </div>
                <span className="badge">{count}</span>
              </div>
              <div className="text-sm font-bold mb-0.5">{f.name}</div>
              <div className="text-[12px] text-[#7A8FA0]">
                {count} document{count > 1 ? 's' : ''}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-4 bg-mist rounded-2xl px-4 py-3.5 flex items-center gap-3 text-[12.5px] text-deep">
        <Clock size={17} className="text-steel flex-shrink-0" />
        <span>
          <b>Conservation automatique :</b> tous les documents sont conservés pendant 6 ans,
          conformément à l'article R209.4 du RIPR.
        </span>
      </div>
    </div>
  )
}
