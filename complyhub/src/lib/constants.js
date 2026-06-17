// Mapping statut → couleur / libellé, partagé par le tableau de bord et le coffre-fort.
export const STATUS = {
  ok: { color: '#2E9E6B', bg: '#E6F4EC', label: 'Conforme' },
  warn: { color: '#E0A030', bg: '#FBF1DE', label: 'À vérifier' },
  missing: { color: '#D1495B', bg: '#FAE5E8', label: 'Manquant' },
  pending: { color: '#E0A030', bg: '#FBF1DE', label: 'À vérifier' },
  na: { color: '#8AA0B2', bg: '#EEF3F7', label: 'N/A' },
}

// Provinces et territoires du Canada (menus déroulants).
export const PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'Colombie-Britannique' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'Nouveau-Brunswick' },
  { code: 'NL', name: 'Terre-Neuve-et-Labrador' },
  { code: 'NS', name: 'Nouvelle-Écosse' },
  { code: 'NT', name: 'Territoires du Nord-Ouest' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Île-du-Prince-Édouard' },
  { code: 'QC', name: 'Québec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
]

// Régimes / programmes de travailleurs étrangers.
export const PROGRAMS = ['PMI', 'PTET']

// Questions du simulateur d'inspection (reproduisent celles d'IRCC / ESDC).
export const SIM_QUESTIONS = [
  {
    q: 'Pouvez-vous produire les registres de paie des 6 dernières années pour chaque travailleur ?',
    ref: 'R209.4 — conservation des documents',
    crit: true,
  },
  {
    q: "Les salaires versés correspondent-ils à ceux de l'offre d'emploi ?",
    ref: 'R209.2(1)(a)(iii) — salaire substantiellement le même',
    crit: true,
  },
  {
    q: 'Avez-vous fourni au travailleur l\'information sur ses droits au Canada ?',
    ref: 'R209.2(1)(a.1) — depuis le 26 sept. 2022',
    crit: false,
  },
  {
    q: "Le travailleur occupe-t-il la même profession que dans l'offre ?",
    ref: 'R209.2(1)(a)(iii) — même profession',
    crit: true,
  },
  {
    q: "Avez-vous une entente d'emploi signée par les deux parties ?",
    ref: 'R209.11(1)(e) — entente conforme',
    crit: true,
  },
  {
    q: "Êtes-vous certain qu'aucuns frais n'ont été facturés au travailleur ?",
    ref: 'R303.1(1) — interdiction des frais',
    crit: true,
  },
]

// Dossiers du coffre-fort documentaire (catégories).
export const VAULT_FOLDERS = [
  { name: 'Permis de travail', category: 'permit', status: 'ok' },
  { name: "Offres d'emploi signées", category: 'offer', status: 'ok' },
  { name: 'Registres de paie', category: 'payroll', status: 'warn' },
  { name: 'Contrats de travail', category: 'contract', status: 'ok' },
  { name: 'Information sur les droits', category: 'rights', status: 'missing' },
  { name: 'Preuves de versements', category: 'payments', status: 'ok' },
]

// Modèles disponibles dans le générateur de documents.
export const GENERATORS = [
  {
    t: "Entente d'emploi conforme",
    d: "Génère un contrat conforme aux exigences du PMI/PTET (salaire, poste, conditions).",
  },
  {
    t: "Réponse à un avis d'inspection",
    d: "Modèle structuré de justification sous l'article R209.2(3) du RIPR.",
  },
  {
    t: 'Lettre de déclaration de changement',
    d: 'Notifie un changement de conditions aux autorités avant qu\'il prenne effet.',
  },
  {
    t: 'Registre de conformité',
    d: 'Document récapitulatif prêt à présenter lors d\'une inspection.',
  },
]
