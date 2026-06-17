import { supabase, getCurrentUser } from './supabase'
import { isDemo, demoStore } from './demo'

// ============================================================
//  Couche d'accès aux données ComplyHub (Supabase / PostgREST)
//  En mode démo (isDemo()), les fonctions délèguent à demoStore.
// ============================================================

// ---------- Organisations ----------

/**
 * Crée l'organisation de l'utilisateur courant et le rattache via created_by.
 * @param {{name:string, legal_name?:string, business_number?:string, address?:string, province?:string}} payload
 */
export async function createOrganization(payload) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Aucun utilisateur connecté.')

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: payload.name,
      legal_name: payload.legal_name ?? null,
      business_number: payload.business_number ?? null,
      address: payload.address ?? null,
      province: payload.province ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Récupère l'organisation de l'utilisateur connecté (ou null s'il n'en a pas encore). */
export async function getMyOrganization() {
  if (isDemo()) return demoStore.getMyOrganization()
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

// ---------- Travailleurs ----------

/** Liste les travailleurs d'une organisation. */
export async function getWorkers(orgId) {
  if (isDemo()) return demoStore.getWorkers(orgId)
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Crée un travailleur, puis génère automatiquement ses lignes de conformité
 * (une par condition du référentiel) avec le statut 'pending'.
 */
export async function createWorker(orgId, payload) {
  if (isDemo()) return demoStore.createWorker(orgId, payload)
  const { data: worker, error } = await supabase
    .from('workers')
    .insert({
      org_id: orgId,
      full_name: payload.full_name,
      program: payload.program ?? 'PMI',
      occupation: payload.occupation ?? null,
      work_permit_number: payload.work_permit_number ?? null,
      permit_expiry: payload.permit_expiry || null,
      offered_wage: payload.offered_wage ? Number(payload.offered_wage) : null,
      offered_hours: payload.offered_hours ? Number(payload.offered_hours) : null,
      work_province: payload.work_province ?? null,
      start_date: payload.start_date || null,
      status: payload.status ?? 'active',
    })
    .select()
    .single()

  if (error) throw error

  await generateWorkerCompliance(worker.id, worker.program)
  return worker
}

// ---------- Référentiel de conformité ----------

/** Récupère le référentiel des conditions de conformité (table de référence). */
export async function getConditions() {
  if (isDemo()) return demoStore.getConditions()
  const { data, error } = await supabase
    .from('compliance_conditions')
    .select('*')
    .order('id', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Génère les lignes worker_compliance pour un travailleur à partir du référentiel.
 * Filtre les conditions applicables au régime du travailleur (ou 'Commun').
 */
export async function generateWorkerCompliance(workerId, program = 'PMI') {
  const conditions = await getConditions()
  const applicable = conditions.filter(
    (c) => c.regime === 'Commun' || c.regime === program,
  )

  if (applicable.length === 0) return []

  const rows = applicable.map((c) => ({
    worker_id: workerId,
    condition_id: c.id,
    status: 'pending',
  }))

  const { data, error } = await supabase
    .from('worker_compliance')
    .insert(rows)
    .select()

  if (error) throw error
  return data ?? []
}

/** Récupère l'état de conformité d'un travailleur, joint au référentiel. */
export async function getWorkerCompliance(workerId) {
  if (isDemo()) return demoStore.getWorkerCompliance(workerId)
  const { data, error } = await supabase
    .from('worker_compliance')
    .select('*, condition:compliance_conditions(*)')
    .eq('worker_id', workerId)

  if (error) throw error
  return data ?? []
}

/** Met à jour le statut d'une ligne de conformité. */
export async function updateWorkerCompliance(complianceId, patch) {
  if (isDemo()) return demoStore.updateWorkerCompliance(complianceId, patch)
  const { data, error } = await supabase
    .from('worker_compliance')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', complianceId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ---------- Calcul du score ----------

/**
 * Calcule le score de préparation à l'inspection (0–100).
 * Les conditions 'na' (non applicables) sont exclues du dénominateur.
 * @param {Array<{status:string}>} complianceRows
 */
export function computeReadinessScore(complianceRows) {
  if (!complianceRows || complianceRows.length === 0) return 0
  const applicable = complianceRows.filter((r) => r.status !== 'na')
  if (applicable.length === 0) return 0
  const ok = applicable.filter((r) => r.status === 'ok').length
  return Math.round((ok / applicable.length) * 100)
}

// ---------- Coffre-fort documentaire (Supabase Storage) ----------

const DOCUMENTS_BUCKET = 'documents'

/** Liste les documents d'une organisation. */
export async function getDocuments(orgId) {
  if (isDemo()) return demoStore.getDocuments(orgId)
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('org_id', orgId)
    .order('uploaded_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Téléverse un fichier dans le bucket privé puis enregistre ses métadonnées.
 * Chemin : <org_id>/<worker_id|general>/<timestamp>-<nom>  (cohérent avec les RLS Storage).
 * La conservation est fixée à 6 ans (R209.4).
 */
export async function uploadDocument(orgId, { file, category, workerId = null }) {
  if (isDemo()) return demoStore.uploadDocument(orgId, { file, category, workerId })
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const scope = workerId ?? 'general'
  const storagePath = `${orgId}/${scope}/${Date.now()}-${safeName}`

  const { error: upErr } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, { upsert: false })
  if (upErr) throw upErr

  const retention = new Date()
  retention.setFullYear(retention.getFullYear() + 6)

  const { data, error } = await supabase
    .from('documents')
    .insert({
      org_id: orgId,
      worker_id: workerId,
      category,
      file_name: file.name,
      storage_path: storagePath,
      retention_until: retention.toISOString().slice(0, 10),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Génère une URL signée temporaire pour télécharger / visualiser un document. */
export async function getDocumentUrl(storagePath, expiresIn = 3600) {
  if (isDemo()) return demoStore.getDocumentUrl(storagePath)
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresIn)
  if (error) throw error
  return data.signedUrl
}

/** Supprime un document (fichier + métadonnées). */
export async function deleteDocument(doc) {
  if (isDemo()) return demoStore.deleteDocument(doc)
  const { error: rmErr } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([doc.storage_path])
  if (rmErr) throw rmErr

  const { error } = await supabase.from('documents').delete().eq('id', doc.id)
  if (error) throw error
}

// ---------- Simulateur d'inspection ----------

/** Enregistre un résultat de simulation. */
export async function saveSimulation(orgId, { score, answers }) {
  if (isDemo()) return demoStore.saveSimulation(orgId, { score, answers })
  const user = await getCurrentUser()
  if (!user) throw new Error('Aucun utilisateur connecté.')

  const { data, error } = await supabase
    .from('inspection_simulations')
    .insert({ org_id: orgId, score, answers, created_by: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Historique des simulations d'une organisation. */
export async function getSimulations(orgId) {
  if (isDemo()) return demoStore.getSimulations(orgId)
  const { data, error } = await supabase
    .from('inspection_simulations')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// ---------- Alertes (calculées côté client) ----------

/**
 * Dérive la liste des alertes à partir des travailleurs et de leur conformité.
 * @param {Array} workers
 * @param {Object<string, Array>} complianceByWorker  workerId -> lignes de conformité
 * @param {number} permitWindowDays  fenêtre d'alerte avant expiration (défaut 90 j)
 */
export function computeAlerts(workers, complianceByWorker, permitWindowDays = 90) {
  const alerts = []
  const today = new Date()

  for (const w of workers) {
    // Permis qui expire bientôt / expiré.
    if (w.permit_expiry) {
      const exp = new Date(w.permit_expiry)
      const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
      if (days < 0) {
        alerts.push({
          id: `permit-${w.id}`,
          severity: 'missing',
          title: `Permis expiré — ${w.full_name}`,
          detail: `Le permis de travail a expiré il y a ${Math.abs(days)} jour(s).`,
        })
      } else if (days <= permitWindowDays) {
        alerts.push({
          id: `permit-${w.id}`,
          severity: 'warn',
          title: `Permis bientôt expiré — ${w.full_name}`,
          detail: `Le permis de travail expire dans ${days} jour(s).`,
        })
      }
    }

    // Conditions manquantes.
    const rows = complianceByWorker[w.id] ?? []
    const missing = rows.filter((r) => r.status === 'missing')
    for (const r of missing) {
      alerts.push({
        id: `cond-${r.id}`,
        severity: 'missing',
        title: `Condition manquante — ${w.full_name}`,
        detail: r.condition?.label ?? 'Condition de conformité non satisfaite.',
      })
    }
  }

  // Les éléments manquants d'abord, puis les avertissements.
  const rank = { missing: 0, warn: 1 }
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity])
}

// ---------- Facturation (Stripe via fonction Edge Supabase) ----------

/**
 * Démarre une session de paiement Stripe Checkout.
 * Nécessite la fonction Edge « create-checkout » déployée (voir supabase/functions/).
 * Redirige le navigateur vers l'URL de paiement renvoyée.
 */
export async function startCheckout(plan) {
  if (isDemo()) return demoStore.startCheckout(plan)
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { plan, origin: window.location.origin },
  })
  if (error) throw error
  if (data?.url) {
    window.location.href = data.url
  } else {
    throw new Error('URL de paiement introuvable. Vérifiez la fonction Edge create-checkout.')
  }
}
