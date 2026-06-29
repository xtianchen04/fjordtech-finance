// ============================================================
//  Utilitaires NAS (numéro d'assurance sociale) — donnée sensible (PII)
//  - normalizeNAS : ne conserve que les chiffres
//  - formatNAS    : présentation « 9XX XXX XXX »
//  - maskNAS      : masque tout sauf les 3 derniers chiffres (••• ••• X123)
//  - isValidNAS   : 9 chiffres + validation par l'algorithme de Luhn
// ============================================================

/** Retire tout sauf les chiffres. Retourne '' si vide. */
export function normalizeNAS(value) {
  return (value ?? '').replace(/\D+/g, '').slice(0, 9)
}

/** Met en forme « 123 456 789 » (à partir des chiffres saisis). */
export function formatNAS(value) {
  const d = normalizeNAS(value)
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean)
  return parts.join(' ')
}

/**
 * Masque le NAS pour l'affichage : ne révèle que les 3 derniers chiffres.
 * Ex. « 123456789 » → « ••• ••• •89 ». Retourne '' si vide.
 */
export function maskNAS(value) {
  const d = normalizeNAS(value)
  if (!d) return ''
  const visible = d.slice(-3)
  // Reconstitue un gabarit de 9 caractères : 6 masqués + 3 visibles (groupés par 3).
  const masked = '••••••' + visible
  return [masked.slice(0, 3), masked.slice(3, 6), masked.slice(6, 9)].join(' ')
}

/**
 * Valide un NAS canadien : exactement 9 chiffres et somme de Luhn valide.
 * (Le premier chiffre 0 et 8 ne sont pas attribués, mais on ne bloque pas là-dessus.)
 */
export function isValidNAS(value) {
  const d = normalizeNAS(value)
  if (d.length !== 9) return false

  // Algorithme de Luhn.
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let n = Number(d[i])
    // Double un chiffre sur deux en partant de la 2e position (index impair).
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}
