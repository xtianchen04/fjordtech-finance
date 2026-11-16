// ============================================================
//  Salaire minimum par province / territoire (référence)
// ------------------------------------------------------------
//  ⚠️ Les taux changent régulièrement (souvent au 1er avril ou 1er octobre).
//  Valeurs à titre indicatif — À VÉRIFIER et mettre à jour à chaque révision.
//  Dernière révision manuelle : 2025-10. Source : sites provinciaux officiels.
//
//  Sert à l'alerte de conformité « salaire sous le minimum provincial »
//  (le salaire versé doit être au moins le minimum applicable, et rester
//  substantiellement le même que l'offre — R209.2(1)(a)(iii)).
// ============================================================

// taux général (hors cas particuliers : pourboires, étudiants, etc.).
export const MIN_WAGE = {
  AB: { rate: 15.0, asOf: '2024-10-01' },
  BC: { rate: 17.4, asOf: '2025-06-01' },
  MB: { rate: 15.8, asOf: '2025-10-01' },
  NB: { rate: 15.3, asOf: '2025-04-01' },
  NL: { rate: 16.0, asOf: '2025-04-01' },
  NS: { rate: 15.7, asOf: '2025-04-01' },
  NT: { rate: 16.7, asOf: '2024-09-01' },
  NU: { rate: 19.0, asOf: '2024-01-01' },
  ON: { rate: 17.6, asOf: '2025-10-01' },
  PE: { rate: 16.0, asOf: '2025-04-01' },
  QC: { rate: 16.1, asOf: '2025-05-01' },
  SK: { rate: 15.0, asOf: '2024-10-01' },
  YT: { rate: 17.94, asOf: '2025-04-01' },
}

// Surcharges chargées depuis la base (table min_wage_rates, tenue à jour par
// la fonction Edge refresh-min-wage). La table statique ci-dessus reste le
// repli si la migration n'est pas appliquée ou si le chargement échoue.
let OVERRIDES = {}

/**
 * Remplace les taux par ceux chargés depuis la base.
 * @param {Record<string, {rate:number, asOf?:string}>} map
 */
export function setMinWageOverrides(map) {
  OVERRIDES = map && typeof map === 'object' ? map : {}
}

/** Retourne { rate, asOf } pour une province (base si disponible, sinon statique), ou null. */
export function getMinWage(provinceCode) {
  return OVERRIDES[provinceCode] ?? MIN_WAGE[provinceCode] ?? null
}

/**
 * Le salaire minimum de cette province a-t-il changé récemment (ou va-t-il
 * changer prochainement) ? Sert au rappel proactif « reconfirmer les salaires ».
 * @param {string} provinceCode
 * @param {number} windowDays fenêtre autour d'aujourd'hui (défaut 120 j)
 * @returns {null | { rate:number, asOf:string, upcoming:boolean, days:number }}
 */
export function minWageChange(provinceCode, windowDays = 120) {
  const mw = MIN_WAGE[provinceCode]
  if (!mw?.asOf) return null
  const asOf = new Date(mw.asOf)
  if (Number.isNaN(asOf.getTime())) return null
  const days = Math.round((asOf - new Date()) / (1000 * 60 * 60 * 24))
  if (Math.abs(days) > windowDays) return null
  return { rate: mw.rate, asOf: mw.asOf, upcoming: days > 0, days }
}
