// ============================================================
//  Régulateurs provinciaux de la santé et sécurité au travail (SST)
// ------------------------------------------------------------
//  Chaque employeur canadien doit généralement s'inscrire auprès de la
//  commission d'indemnisation / de SST de SA province et y déclarer sa
//  masse salariale. C'est une obligation distincte des programmes TET,
//  mais elle fait partie de la conformité globale de l'employeur et est
//  souvent vérifiée lors des inspections.
//
//  Sert aux « rappels proactifs » (computeReminders) : on rappelle à
//  l'employeur le régulateur applicable à sa province, avec le lien.
//  ⚠️ Liens et noms à titre indicatif — à vérifier périodiquement.
// ============================================================

export const REGULATORS = {
  AB: { board: 'WCB-Alberta', url: 'https://www.wcb.ab.ca' },
  BC: { board: 'WorkSafeBC', url: 'https://www.worksafebc.com' },
  MB: { board: 'WCB Manitoba', url: 'https://www.wcb.mb.ca' },
  NB: { board: 'WorkSafeNB', url: 'https://www.worksafenb.ca' },
  NL: { board: 'WorkplaceNL', url: 'https://workplacenl.ca' },
  NS: { board: 'WCB Nova Scotia', url: 'https://www.wcb.ns.ca' },
  NT: { board: 'WSCC (T.N.-O. / Nunavut)', url: 'https://www.wscc.nt.ca' },
  NU: { board: 'WSCC (Nunavut / T.N.-O.)', url: 'https://www.wscc.nt.ca' },
  ON: { board: 'WSIB / CSPAAT', url: 'https://www.wsib.ca' },
  PE: { board: 'WCB PEI', url: 'https://www.wcb.pe.ca' },
  QC: { board: 'CNESST', url: 'https://www.cnesst.gouv.qc.ca' },
  SK: { board: 'WCB Saskatchewan', url: 'https://www.wcbsask.com' },
  YT: { board: "Yukon Workers' Safety and Compensation Board", url: 'https://wcb.yk.ca' },
}

/** Retourne { board, url } pour une province, ou null. */
export function getRegulator(provinceCode) {
  return REGULATORS[provinceCode] ?? null
}
