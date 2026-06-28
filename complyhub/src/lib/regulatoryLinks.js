// ============================================================
//  Veille réglementaire — liens officiels (fédéral + 13 juridictions)
//  Chaque entrée renvoie vers la PAGE OFFICIELLE du gouvernement, qui est
//  tenue à jour par l'autorité compétente (donc toujours « la dernière version »).
//
//  ⚠️ Les URL des sites gouvernementaux peuvent changer — à revoir périodiquement.
//  Dernière révision des liens : 2026-06.
// ============================================================

// ---- Fédéral : s'applique à TOUTES les organisations ----
export const FEDERAL_UPDATES = [
  {
    topic: "Programme de mobilité internationale (PMI) — employeurs",
    desc: "Embaucher un travailleur étranger sans EIMT, portail des employeurs, conformité.",
    url: "https://www.canada.ca/fr/immigration-refugies-citoyennete/services/travailler-canada/embaucher-etranger-temporaire/programme-mobilite-internationale.html",
    source: "IRCC",
  },
  {
    topic: "Programme des travailleurs étrangers temporaires (PTET / EIMT)",
    desc: "Étude d'impact sur le marché du travail, volets, obligations de l'employeur.",
    url: "https://www.canada.ca/fr/emploi-developpement-social/services/travailleurs-etrangers.html",
    source: "EDSC",
  },
  {
    topic: "Conformité de l'employeur et inspections (RIPR R209)",
    desc: "Régime de conformité, inspections, conséquences et sanctions.",
    url: "https://www.canada.ca/fr/emploi-developpement-social/services/travailleurs-etrangers/conformite-employeur.html",
    source: "EDSC / IRCC",
  },
  {
    topic: "Droits des travailleurs étrangers — « Vos droits sont protégés »",
    desc: "Information sur les droits à remettre au travailleur (obligatoire) ; protections et soutien.",
    url: "https://www.canada.ca/fr/emploi-developpement-social/services/travailleurs-etrangers/droits-proteges.html",
    source: "EDSC",
  },
  {
    topic: "Normes du travail fédérales (entreprises sous réglementation fédérale)",
    desc: "Code canadien du travail — Partie III (si votre secteur est de compétence fédérale).",
    url: "https://www.canada.ca/fr/services/emplois/milieu-travail/normes-travail-federales.html",
    source: "EDSC",
  },
];

// ---- Provincial / territorial : filtré par org.province ----
// Pour chaque juridiction : normes d'emploi/travail + santé-sécurité (+ immigration si pertinent).
export const PROVINCIAL_UPDATES = {
  AB: [
    { topic: "Normes d'emploi — Alberta", desc: "Employment Standards (salaires, heures, congés).", url: "https://www.alberta.ca/employment-standards", source: "Gouv. de l'Alberta" },
    { topic: "Santé et sécurité au travail (OHS)", desc: "Occupational Health and Safety.", url: "https://www.alberta.ca/occupational-health-safety", source: "Gouv. de l'Alberta" },
  ],
  BC: [
    { topic: "Normes d'emploi — Colombie-Britannique", desc: "Employment Standards Branch.", url: "https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards", source: "Gouv. de la C.-B." },
    { topic: "WorkSafeBC (santé et sécurité)", desc: "Prévention, indemnisation.", url: "https://www.worksafebc.com/", source: "WorkSafeBC" },
  ],
  MB: [
    { topic: "Normes d'emploi — Manitoba", desc: "Employment Standards (Code des normes d'emploi).", url: "https://www.gov.mb.ca/labour/standards/index.fr.html", source: "Gouv. du Manitoba" },
    { topic: "Sécurité et hygiène du travail (SAFE Work Manitoba)", desc: "Santé et sécurité.", url: "https://www.safemanitoba.com/", source: "SAFE Work Manitoba" },
  ],
  NB: [
    { topic: "Normes d'emploi — Nouveau-Brunswick", desc: "Direction des normes d'emploi (EPFT).", url: "https://www2.gnb.ca/content/gnb/fr/ministeres/education_postsecondaire_formation_et_travail/Travail/content/NormesDemploi.html", source: "Gouv. du N.-B." },
    { topic: "Travail sécuritaire NB", desc: "Santé, sécurité et indemnisation.", url: "https://www.travailsecuritairenb.ca/", source: "Travail sécuritaire NB" },
  ],
  NL: [
    { topic: "Normes du travail — Terre-Neuve-et-Labrador", desc: "Labour Standards (Non-union employees).", url: "https://www.gov.nl.ca/ecc/labour/nonunion/", source: "Gouv. de T.-N.-L." },
    { topic: "WorkplaceNL (santé et sécurité)", desc: "Prévention et indemnisation.", url: "https://workplacenl.ca/", source: "WorkplaceNL" },
  ],
  NS: [
    { topic: "Droits en matière d'emploi — Nouvelle-Écosse", desc: "Labour Standards / Employment rights.", url: "https://novascotia.ca/lae/employmentrights/", source: "Gouv. de la N.-É." },
    { topic: "WCB Nova Scotia (santé et sécurité)", desc: "Indemnisation des travailleurs.", url: "https://www.wcb.ns.ca/", source: "WCB N.-É." },
  ],
  ON: [
    { topic: "Normes d'emploi — Ontario", desc: "Loi sur les normes d'emploi (LNE).", url: "https://www.ontario.ca/fr/page/vos-droits-en-vertu-des-normes-demploi", source: "Gouv. de l'Ontario" },
    { topic: "Sécurité au travail (santé et sécurité)", desc: "Loi sur la SST ; WSIB.", url: "https://www.ontario.ca/fr/page/sante-et-securite-au-travail", source: "Gouv. de l'Ontario" },
  ],
  PE: [
    { topic: "Normes d'emploi — Île-du-Prince-Édouard", desc: "Employment Standards.", url: "https://www.princeedwardisland.ca/fr/information/travail-et-perfectionnement-de-la-main-doeuvre/employment-standards", source: "Gouv. de l'Î.-P.-É." },
    { topic: "WCB Prince Edward Island", desc: "Santé, sécurité et indemnisation.", url: "https://www.wcb.pe.ca/", source: "WCB Î.-P.-É." },
  ],
  QC: [
    { topic: "Normes du travail — CNESST", desc: "Conditions de travail (normes), santé et sécurité.", url: "https://www.cnesst.gouv.qc.ca/fr/conditions-travail/normes-travail", source: "CNESST" },
    { topic: "Travailleurs étrangers temporaires — Québec (MIFI)", desc: "Obligations de l'employeur (Québec a son propre régime d'immigration).", url: "https://www.quebec.ca/immigration/travailleurs-etrangers/programme-travailleurs-etrangers-temporaires/obligations-employeur", source: "Gouv. du Québec" },
  ],
  SK: [
    { topic: "Normes d'emploi — Saskatchewan", desc: "Saskatchewan Employment Act (Employment Standards).", url: "https://www.saskatchewan.ca/business/employment-standards", source: "Gouv. de la Saskatchewan" },
    { topic: "WorkSafe Saskatchewan", desc: "Santé et sécurité.", url: "https://www.worksafesask.ca/", source: "WorkSafe Saskatchewan" },
  ],
  YT: [
    { topic: "Normes d'emploi — Yukon", desc: "Employment Standards.", url: "https://yukon.ca/en/employment/employment-standards", source: "Gouv. du Yukon" },
    { topic: "Santé et sécurité (YWCHSB)", desc: "Workers' Safety and Compensation Board.", url: "https://wcb.yk.ca/", source: "YWCHSB" },
  ],
  NT: [
    { topic: "Normes d'emploi — Territoires du Nord-Ouest", desc: "Employment Standards (ECE).", url: "https://www.ece.gov.nt.ca/en/services/employment-standards", source: "Gouv. des T.N.-O." },
    { topic: "WSCC (santé et sécurité)", desc: "Workers' Safety and Compensation Commission.", url: "https://www.wscc.nt.ca/", source: "WSCC" },
  ],
  NU: [
    { topic: "Normes du travail — Nunavut", desc: "Labour Standards Compliance Office.", url: "https://nu-lsco.ca/", source: "Gouv. du Nunavut" },
    { topic: "WSCC Nunavut (santé et sécurité)", desc: "Workers' Safety and Compensation Commission.", url: "https://www.wscc.nu.ca/", source: "WSCC" },
  ],
};

// Retourne les liens applicables à une organisation selon sa province.
export function getUpdatesForProvince(provinceCode) {
  const provincial = PROVINCIAL_UPDATES[provinceCode] ?? [];
  return { federal: FEDERAL_UPDATES, provincial };
}
