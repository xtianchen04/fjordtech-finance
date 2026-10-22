// ============================================================
//  Mode démo — données et magasin en mémoire (aucun Supabase requis)
// ============================================================
//  Activé via enableDemo(). Quand isDemo() est vrai, la couche api.js
//  délègue à demoStore au lieu d'appeler Supabase. Tout vit en mémoire
//  pour la durée de la session (rechargement = réinitialisation).
// ============================================================

import { normalizeNAS } from './nas'

let DEMO = false
export function enableDemo() {
  DEMO = true
}
export function isDemo() {
  return DEMO
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? 'id-' + Math.random().toString(36).slice(2)

export const DEMO_USER = { id: 'demo-user', email: 'demo@complyhub.ca' }
export const DEMO_ORG = {
  id: 'demo-org',
  name: 'Acadie Xpress Negocio',
  legal_name: '11919644 Canada Inc.',
  business_number: '123456789 RP0001',
  address: '123 rue Principale, Moncton, NB',
  province: 'NB',
  subscription_tier: 'free',
  notify_enabled: false,
  notify_email: 'demo@complyhub.ca',
  alert_window_days: 90,
  created_by: DEMO_USER.id,
}

// Référentiel des conditions (identique au seed).
const CONDITIONS = [
  { id: 1, regime: 'Commun', category: 'Emploi', label: "Emploi dans la même profession que l'offre", reference: 'R209.2(1)(a)(iii)' },
  { id: 2, regime: 'Commun', category: 'Salaire', label: "Salaire substantiellement le même que l'offre", reference: 'R209.2(1)(a)(iii)' },
  { id: 3, regime: 'Commun', category: 'Conditions', label: "Conditions de travail conformes à l'offre", reference: 'R209.2(1)(a)(iii)' },
  { id: 4, regime: 'Commun', category: 'Légal', label: 'Respect des lois fédérales et provinciales du travail', reference: 'R209.3 / R209.4' },
  { id: 5, regime: 'Commun', category: 'Activité', label: "Activité commerciale conforme à l'offre d'emploi", reference: 'R209.3 / R209.4' },
  { id: 6, regime: 'Commun', category: 'Documents', label: 'Conservation des registres pendant 6 ans', reference: 'R209.4' },
  { id: 7, regime: 'PMI', category: 'Abus', label: "Milieu de travail exempt d'abus (R196.2)", reference: 'R196.2' },
  { id: 8, regime: 'PMI', category: 'Information', label: 'Information sur les droits fournie au travailleur', reference: 'R209.2(1)(a.1)' },
  { id: 9, regime: 'PMI', category: 'Santé', label: 'Accès aux soins de santé en cas de blessure', reference: 'R209.2(1)(b)' },
  { id: 10, regime: 'PTET', category: 'Logement', label: 'Logement adéquat (si applicable)', reference: 'R209.3(1)' },
  { id: 11, regime: 'Commun', category: 'Déclaration', label: "Déclaration des changements à l'autorité", reference: 'R209.2 / R209.3' },
  { id: 12, regime: 'Commun', category: 'Coopération', label: "Coopération lors d'une inspection", reference: 'R209.5 / R209.6' },
]

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// Travailleurs d'exemple.
const workers = [
  { id: 'w1', org_id: DEMO_ORG.id, full_name: 'Charles R. Njonou', program: 'PMI', occupation: 'Superviseur', work_permit_number: 'UCI-001', permit_expiry: daysFromNow(420), offered_wage: 24.5, offered_hours: 40, work_province: 'NB', start_date: '2024-03-01', status: 'active', email: 'charles@exemple.com', primary_language: 'fr', secondary_language: 'en', user_id: 'demo-emp-1' },
  { id: 'w2', org_id: DEMO_ORG.id, full_name: 'Patrick E. Imoisili', program: 'PMI', occupation: 'Superviseur', work_permit_number: 'UCI-002', permit_expiry: daysFromNow(75), offered_wage: 24.5, offered_hours: 40, work_province: 'NB', start_date: '2024-05-15', status: 'active', email: 'patrick@exemple.com', primary_language: 'en', secondary_language: null, user_id: null },
  { id: 'w3', org_id: DEMO_ORG.id, full_name: 'Nurudeen T. Ibrahim', program: 'PMI', occupation: 'Superviseur', work_permit_number: 'UCI-003', permit_expiry: daysFromNow(300), offered_wage: 24.5, offered_hours: 40, work_province: 'NB', start_date: '2024-06-01', status: 'active', email: null, primary_language: null, secondary_language: null, user_id: null },
]

// Invitations d'exemple : w1 a un compte actif, w2 a été invité (en attente).
let invitations = [
  { id: 'inv1', org_id: DEMO_ORG.id, worker_id: 'w1', email: 'charles@exemple.com', token: 'demo-token-1', status: 'accepted', created_at: new Date(Date.now() - 6 * 86400000).toISOString(), accepted_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'inv2', org_id: DEMO_ORG.id, worker_id: 'w2', email: 'patrick@exemple.com', token: 'demo-token-2', status: 'pending', created_at: new Date(Date.now() - 86400000).toISOString(), accepted_at: null },
]

// Fils de messages d'exemple (par travailleur).
let messages = [
  { id: 'm1', org_id: DEMO_ORG.id, worker_id: 'w1', sender_user_id: DEMO_USER.id, sender_role: 'employer', body: "Bonjour Charles, merci de téléverser votre permis de conduire avant vendredi.", created_at: new Date(Date.now() - 3 * 3600000).toISOString(), read_at: new Date(Date.now() - 2.5 * 3600000).toISOString() },
  { id: 'm2', org_id: DEMO_ORG.id, worker_id: 'w1', sender_user_id: 'demo-emp-1', sender_role: 'employee', body: "Bonjour, c'est noté, je l'envoie demain.", created_at: new Date(Date.now() - 2 * 3600000).toISOString(), read_at: null },
]

// Journal d'audit d'exemple + utilitaire d'ajout (mode démo).
let auditLogs = [
  { id: uid(), org_id: DEMO_ORG.id, user_id: DEMO_USER.id, actor_role: 'employer', action: 'insert.workers', entity_type: 'workers', entity_id: 'w1', worker_id: 'w1', details: {}, created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: uid(), org_id: DEMO_ORG.id, user_id: DEMO_USER.id, actor_role: 'employer', action: 'insert.invitations', entity_type: 'invitations', entity_id: 'inv1', worker_id: 'w1', details: {}, created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: uid(), org_id: DEMO_ORG.id, user_id: 'demo-emp-1', actor_role: 'employee', action: 'insert.documents', entity_type: 'documents', entity_id: uid(), worker_id: 'w1', details: { new: { category: 'permit' } }, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: uid(), org_id: DEMO_ORG.id, user_id: DEMO_USER.id, actor_role: 'employer', action: 'insert.messages', entity_type: 'messages', entity_id: 'm1', worker_id: 'w1', details: {}, created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: uid(), org_id: DEMO_ORG.id, user_id: 'demo-emp-1', actor_role: 'employee', action: 'update.messages', entity_type: 'messages', entity_id: 'm1', worker_id: 'w1', details: {}, created_at: new Date(Date.now() - 2.5 * 3600000).toISOString() },
]
function pushAudit(entry) {
  auditLogs.unshift({
    id: uid(),
    org_id: DEMO_ORG.id,
    user_id: DEMO_USER.id,
    actor_role: 'employer',
    entity_id: null,
    worker_id: null,
    details: {},
    created_at: new Date().toISOString(),
    ...entry,
  })
}

// Statuts par travailleur (clé = condition_id). Tout le reste = 'ok'.
const OVERRIDES = {
  w1: { 2: 'warn' },
  w2: { 8: 'missing', 6: 'warn', 2: 'warn' },
  w3: { 8: 'warn' },
}

// Construit les lignes de conformité pour un travailleur selon son régime.
function buildCompliance(worker) {
  const applicable = CONDITIONS.filter((c) => c.regime === 'Commun' || c.regime === worker.program)
  const ov = OVERRIDES[worker.id] ?? {}
  return applicable.map((c) => ({
    id: uid(),
    worker_id: worker.id,
    condition_id: c.id,
    status: ov[c.id] ?? 'ok',
    notes: null,
    condition: c,
  }))
}

let compliance = workers.flatMap(buildCompliance)
let documents = []
let simulations = []
const blobs = new Map() // storage_path -> URL d'objet (fichiers téléversés en démo)

// ---------- Magasin démo (mêmes signatures que api.js) ----------
export const demoStore = {
  async getMyOrganization() {
    return DEMO_ORG
  },
  async updateOrganization(orgId, patch) {
    // Mutation en mémoire de l'organisation de démo.
    Object.assign(DEMO_ORG, patch)
    return { ...DEMO_ORG }
  },
  async getWorkers() {
    return [...workers]
  },
  async getConditions() {
    return [...CONDITIONS]
  },
  async getWorkerCompliance(workerId) {
    return compliance.filter((r) => r.worker_id === workerId).map((r) => ({ ...r }))
  },
  async createWorker(orgId, payload) {
    const worker = {
      id: uid(),
      org_id: orgId,
      full_name: payload.full_name,
      program: payload.program ?? 'PMI',
      occupation: payload.occupation ?? null,
      work_permit_number: payload.work_permit_number ?? null,
      social_insurance_number: normalizeNAS(payload.social_insurance_number) || null,
      permit_expiry: payload.permit_expiry || null,
      offered_wage: payload.offered_wage ? Number(payload.offered_wage) : null,
      offered_hours: payload.offered_hours ? Number(payload.offered_hours) : null,
      work_province: payload.work_province ?? null,
      start_date: payload.start_date || null,
      status: payload.status ?? 'active',
    }
    workers.unshift(worker)
    // Nouvelles conditions au statut 'pending'.
    const rows = buildCompliance(worker).map((r) => ({ ...r, status: 'pending' }))
    compliance = compliance.concat(rows)
    pushAudit({ action: 'insert.workers', entity_type: 'workers', entity_id: worker.id, worker_id: worker.id })
    return worker
  },
  async updateWorkerCompliance(id, patch) {
    const row = compliance.find((r) => r.id === id)
    if (row) Object.assign(row, patch)
    pushAudit({ action: 'update.worker_compliance', entity_type: 'worker_compliance', entity_id: id, worker_id: row?.worker_id })
    return row
  },
  async getDocuments() {
    return [...documents]
  },
  async uploadDocument(orgId, { file, category, workerId = null }) {
    const retention = new Date()
    retention.setFullYear(retention.getFullYear() + 6)
    const storagePath = `${orgId}/${workerId ?? 'general'}/${Date.now()}-${file.name}`
    blobs.set(storagePath, URL.createObjectURL(file))
    const doc = {
      id: uid(),
      org_id: orgId,
      worker_id: workerId,
      category,
      file_name: file.name,
      storage_path: storagePath,
      retention_until: retention.toISOString().slice(0, 10),
      uploaded_at: new Date().toISOString(),
    }
    documents.unshift(doc)
    pushAudit({ action: 'insert.documents', entity_type: 'documents', entity_id: doc.id, worker_id: workerId, details: { new: { category } } })
    return doc
  },
  async getDocumentUrl(storagePath) {
    return blobs.get(storagePath) ?? '#'
  },
  async deleteDocument(doc) {
    documents = documents.filter((d) => d.id !== doc.id)
    if (blobs.has(doc.storage_path)) {
      URL.revokeObjectURL(blobs.get(doc.storage_path))
      blobs.delete(doc.storage_path)
    }
    pushAudit({ action: 'delete.documents', entity_type: 'documents', entity_id: doc.id, worker_id: doc.worker_id })
  },
  async saveSimulation(orgId, { score, answers }) {
    const sim = { id: uid(), org_id: orgId, score, answers, created_at: new Date().toISOString() }
    simulations.unshift(sim)
    return sim
  },
  async getSimulations() {
    return [...simulations]
  },
  async startCheckout() {
    throw new Error('Le paiement Stripe est désactivé en mode démo.')
  },

  // ---------- Équipe & invitations ----------
  async getInvitations() {
    return [...invitations]
  },
  async inviteWorker(orgId, workerId, email) {
    const w = workers.find((x) => x.id === workerId)
    if (w) w.email = email
    const inv = {
      id: uid(),
      org_id: orgId,
      worker_id: workerId,
      email,
      token: 'demo-' + uid(),
      status: 'pending',
      created_at: new Date().toISOString(),
      accepted_at: null,
    }
    invitations = [inv, ...invitations.filter((i) => i.worker_id !== workerId)]
    pushAudit({ action: 'insert.invitations', entity_type: 'invitations', entity_id: inv.id, worker_id: workerId })
    return inv
  },
  async revokeInvitation(invitationId) {
    const inv = invitations.find((i) => i.id === invitationId)
    if (inv) inv.status = 'revoked'
    pushAudit({ action: 'update.invitations', entity_type: 'invitations', entity_id: invitationId, worker_id: inv?.worker_id })
  },

  async getWorkerNas(workerId) {
    const w = workers.find((x) => x.id === workerId)
    return w?.social_insurance_number ?? null
  },

  // ---------- Journal d'audit ----------
  async getAuditLogs(orgId, opts = {}) {
    let rows = auditLogs.filter((l) => l.org_id === orgId)
    if (opts.workerId) rows = rows.filter((l) => l.worker_id === opts.workerId)
    if (opts.action) rows = rows.filter((l) => l.action === opts.action)
    return rows.slice(0, opts.limit ?? 200).map((l) => ({ ...l }))
  },

  // ---------- Messagerie ----------
  async getOrgMessages(orgId) {
    return messages.filter((m) => m.org_id === orgId).map((m) => ({ ...m }))
  },
  async getMessages(workerId) {
    return messages.filter((m) => m.worker_id === workerId).map((m) => ({ ...m }))
  },
  async sendMessage({ orgId, workerId, body, role }) {
    const msg = {
      id: uid(),
      org_id: orgId,
      worker_id: workerId,
      sender_user_id: role === 'employer' ? DEMO_USER.id : 'demo-emp',
      sender_role: role,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
    }
    messages = messages.concat(msg)
    pushAudit({ action: 'insert.messages', entity_type: 'messages', entity_id: msg.id, worker_id: workerId, actor_role: role })
    return msg
  },
  async markMessagesRead(workerId, readerRole) {
    const senderRole = readerRole === 'employer' ? 'employee' : 'employer'
    let changed = false
    for (const m of messages) {
      if (m.worker_id === workerId && m.sender_role === senderRole && !m.read_at) {
        m.read_at = new Date().toISOString()
        changed = true
      }
    }
    if (changed) pushAudit({ action: 'update.messages', entity_type: 'messages', worker_id: workerId, actor_role: readerRole })
  },
}
