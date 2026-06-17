import { supabase, getCurrentUser } from './supabase'

// ============================================================
//  Couche d'accès aux données ComplyHub (Supabase / PostgREST)
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
  const { data, error } = await supabase
    .from('worker_compliance')
    .select('*, condition:compliance_conditions(*)')
    .eq('worker_id', workerId)

  if (error) throw error
  return data ?? []
}

/** Met à jour le statut d'une ligne de conformité. */
export async function updateWorkerCompliance(complianceId, patch) {
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
