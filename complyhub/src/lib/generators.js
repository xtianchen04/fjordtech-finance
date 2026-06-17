// ============================================================
//  Générateur de documents ComplyHub
//  Produit des documents HTML imprimables (→ « Enregistrer en PDF »)
//  remplis avec les données réelles de l'organisation / du travailleur.
// ============================================================

const PROVINCE_NAMES = {
  AB: 'Alberta', BC: 'Colombie-Britannique', MB: 'Manitoba', NB: 'Nouveau-Brunswick',
  NL: 'Terre-Neuve-et-Labrador', NS: 'Nouvelle-Écosse', NT: 'Territoires du Nord-Ouest',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Île-du-Prince-Édouard', QC: 'Québec',
  SK: 'Saskatchewan', YT: 'Yukon',
}

function fmtDate(value) {
  if (!value) return '____________________'
  try {
    return new Date(value).toLocaleDateString('fr-CA', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return String(value)
  }
}

const provinceName = (code) => PROVINCE_NAMES[code] ?? code ?? '____________________'
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

// Enveloppe HTML commune (style conforme à la charte ComplyHub).
function wrap(title, bodyHtml, org) {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>
  @page { margin: 2cm; }
  body { font-family: Georgia, serif; color: #0B1F33; line-height: 1.6; max-width: 760px; margin: 0 auto; padding: 28px; }
  header { border-bottom: 3px solid #C99A3B; padding-bottom: 14px; margin-bottom: 26px; }
  .brand { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #2E6CA4; font-weight: bold; }
  h1 { font-size: 22px; margin: 6px 0 2px; }
  .org { font-size: 13px; color: #5E7385; }
  h2 { font-size: 15px; margin: 22px 0 6px; color: #13314F; border-bottom: 1px solid #D7E3EE; padding-bottom: 4px; }
  p, li { font-size: 13.5px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12.5px; }
  th, td { text-align: left; padding: 7px 9px; border-bottom: 1px solid #D7E3EE; }
  th { background: #E8F1F8; color: #13314F; }
  .sign { margin-top: 40px; display: flex; gap: 60px; }
  .sign div { flex: 1; border-top: 1px solid #0B1F33; padding-top: 6px; font-size: 12px; }
  .meta { font-size: 11px; color: #7A8FA0; margin-top: 30px; }
  .ok { color: #2E9E6B; } .warn { color: #E0A030; } .missing { color: #D1495B; } .na { color: #8AA0B2; }
  .toolbar { background:#0B1F33;color:#fff;padding:10px 14px;border-radius:8px;margin-bottom:20px;font-family:sans-serif;font-size:13px;display:flex;justify-content:space-between;align-items:center; }
  .toolbar button { background:#C99A3B;color:#0B1F33;border:0;border-radius:6px;padding:7px 14px;font-weight:bold;cursor:pointer; }
  @media print { .toolbar { display:none; } body { padding:0; } }
</style></head>
<body>
  <div class="toolbar">
    <span>Document généré par ComplyHub — utilisez « Imprimer » puis « Enregistrer en PDF ».</span>
    <button onclick="window.print()">Imprimer / PDF</button>
  </div>
  <header>
    <div class="brand">ComplyHub · Conformité TET · PMI</div>
    <h1>${esc(title)}</h1>
    <div class="org">${esc(org?.name ?? '')}${org?.legal_name ? ' · ' + esc(org.legal_name) : ''}</div>
  </header>
  ${bodyHtml}
  <div class="meta">Généré le ${fmtDate(new Date())} · ComplyHub n'est pas un conseil juridique (CICC).</div>
</body></html>`
}

const STATUS_FR = {
  ok: ['ok', 'Conforme'], warn: ['warn', 'À vérifier'], pending: ['warn', 'À vérifier'],
  missing: ['missing', 'Manquant'], na: ['na', 'N/A'],
}

// ---- Modèles ----

function ententeEmploi(org, worker) {
  const w = worker ?? {}
  return wrap(
    "Entente d'emploi",
    `
    <p>La présente entente d'emploi est conclue entre <b>${esc(org?.legal_name || org?.name || "l'employeur")}</b>
    (« l'employeur ») et <b>${esc(w.full_name || 'le travailleur')}</b> (« le travailleur »),
    conformément aux exigences du programme ${esc(w.program || 'PMI/PTET')} et au Règlement sur
    l'immigration et la protection des réfugiés (RIPR).</p>

    <h2>1. Poste et lieu de travail</h2>
    <p>Profession : <b>${esc(w.occupation || '____________________')}</b><br>
    Province de travail : <b>${provinceName(w.work_province)}</b><br>
    Date de début : <b>${fmtDate(w.start_date)}</b></p>

    <h2>2. Rémunération et horaire</h2>
    <p>Salaire offert : <b>${w.offered_wage != null ? esc(w.offered_wage) + ' $/heure' : '____________________'}</b><br>
    Heures par semaine : <b>${w.offered_hours != null ? esc(w.offered_hours) : '____________________'}</b></p>
    <p>Le salaire versé sera substantiellement le même que celui de l'offre d'emploi (R209.2(1)(a)(iii)).</p>

    <h2>3. Conditions de travail</h2>
    <p>L'employeur s'engage à respecter les lois fédérales et provinciales du travail, à offrir un
    milieu exempt d'abus (R196.2) et à fournir au travailleur l'information sur ses droits au Canada.</p>

    <h2>4. Frais</h2>
    <p>Aucuns frais de recrutement ne sont facturés au travailleur (R303.1(1)).</p>

    <div class="sign">
      <div>Signature de l'employeur — date</div>
      <div>Signature du travailleur — date</div>
    </div>`,
    org,
  )
}

function registreConformite(org, workers, complianceByWorker, score) {
  const rows = workers
    .map((w) => {
      const c = complianceByWorker[w.id] ?? []
      const ok = c.filter((r) => r.status === 'ok').length
      const app = c.filter((r) => r.status !== 'na').length
      return `<tr><td>${esc(w.full_name)}</td><td>${esc(w.occupation || '—')}</td>
        <td>${esc(w.program)}</td><td>${fmtDate(w.permit_expiry)}</td>
        <td>${app ? Math.round((ok / app) * 100) : 0} %</td></tr>`
    })
    .join('')

  return wrap(
    'Registre de conformité',
    `
    <p>Récapitulatif de l'état de conformité de l'organisation, prêt à être présenté lors d'une
    inspection d'IRCC ou d'ESDC.</p>
    <h2>Score global de préparation : <b>${score} %</b></h2>
    <h2>Travailleurs étrangers</h2>
    <table>
      <thead><tr><th>Nom</th><th>Profession</th><th>Programme</th><th>Expiration permis</th><th>Score</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">Aucun travailleur enregistré.</td></tr>'}</tbody>
    </table>
    <p>Les documents justificatifs sont conservés pendant 6 ans conformément à l'article R209.4 du RIPR.</p>`,
    org,
  )
}

function reponseInspection(org) {
  return wrap(
    "Réponse à un avis d'inspection",
    `
    <p>Objet : Réponse à l'avis d'inspection reçu le ____________________.</p>
    <p>Madame, Monsieur,</p>
    <p>Faisant suite à votre avis d'inspection concernant <b>${esc(org?.legal_name || org?.name || "notre entreprise")}</b>,
    nous vous transmettons les renseignements et documents demandés, conformément à l'article R209.2(3) du RIPR.</p>
    <h2>1. Documents joints</h2>
    <ul>
      <li>Ententes d'emploi signées</li>
      <li>Registres de paie des 6 dernières années (R209.4)</li>
      <li>Preuves de versements salariaux</li>
      <li>Permis de travail en cours de validité</li>
    </ul>
    <h2>2. Justifications</h2>
    <p>____________________________________________________________________</p>
    <div class="sign"><div>Signature du représentant autorisé — date</div></div>`,
    org,
  )
}

function declarationChangement(org) {
  return wrap(
    'Lettre de déclaration de changement',
    `
    <p>Objet : Déclaration d'un changement aux conditions d'emploi.</p>
    <p>Par la présente, <b>${esc(org?.legal_name || org?.name || "l'employeur")}</b> notifie aux autorités
    le changement suivant, avant qu'il ne prenne effet :</p>
    <h2>Nature du changement</h2>
    <p>____________________________________________________________________</p>
    <h2>Date d'entrée en vigueur</h2>
    <p>____________________</p>
    <h2>Justification</h2>
    <p>____________________________________________________________________</p>
    <div class="sign"><div>Signature du représentant autorisé — date</div></div>`,
    org,
  )
}

/**
 * Génère un document par clé et l'ouvre dans un nouvel onglet imprimable.
 * @param {string} key  identifiant du modèle
 * @param {object} ctx  { org, worker, workers, complianceByWorker, score }
 */
export function generateDocument(key, ctx = {}) {
  const { org, worker, workers = [], complianceByWorker = {}, score = 0 } = ctx
  let html
  switch (key) {
    case 'entente':
      html = ententeEmploi(org, worker)
      break
    case 'registre':
      html = registreConformite(org, workers, complianceByWorker, score)
      break
    case 'reponse':
      html = reponseInspection(org)
      break
    case 'declaration':
      html = declarationChangement(org)
      break
    default:
      throw new Error('Modèle de document inconnu : ' + key)
  }

  const win = window.open('', '_blank')
  if (!win) {
    // Repli : téléchargement du fichier HTML si les pop-ups sont bloqués.
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${key}.html`
    a.click()
    URL.revokeObjectURL(url)
    return
  }
  win.document.write(html)
  win.document.close()
}

export { STATUS_FR }
