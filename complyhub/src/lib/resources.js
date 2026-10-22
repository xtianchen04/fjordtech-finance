// ============================================================
//  Contenu FAQ & Ressources (employeur + employé) — fr/en.
//  Repli sur l'anglais si la langue manque (makeT-like par bloc).
//  Les réponses sont informatives — ComplyHub n'est pas un conseil
//  juridique (CICC).
// ============================================================

import { getUpdatesForProvince } from './regulatoryLinks'
import { getMinWage } from './minWage'

const pick = (dict, lang) => dict[lang] ?? dict.en ?? dict.fr

// ---------------- FAQ EMPLOYEUR ----------------
const FAQ_EMPLOYER = {
  fr: [
    { q: "Comment se déroule une inspection d'IRCC ou d'EDSC ?", a: "L'autorité peut demander vos documents (ententes d'emploi, registres de paie, preuves de versement), visiter le lieu de travail et interroger les travailleurs. Vous devez coopérer et fournir les renseignements demandés (R209.5/R209.6)." },
    { q: 'Combien de temps dois-je conserver mes documents ?', a: 'Au moins 6 ans à compter du premier jour d\'emploi du travailleur étranger (R209.4). Le coffre-fort documentaire applique automatiquement cette rétention.' },
    { q: "Puis-je modifier le salaire, le poste ou l'horaire d'un travailleur ?", a: "Un changement important aux conditions peut devoir être déclaré aux autorités avant d'entrer en vigueur. Utilisez le générateur « Lettre de déclaration de changement » et vérifiez que le salaire reste substantiellement le même que l'offre (R209.2(1)(a)(iii))." },
    { q: 'Quelles sont les erreurs les plus fréquentes qui mènent à des sanctions ?', a: "Salaire inférieur à l'offre ou au minimum provincial, absence de registres de paie, défaut de remettre l'information sur les droits, frais de recrutement facturés au travailleur, et conditions de travail différentes de l'offre." },
    { q: "Dois-je remettre de l'information sur les droits au travailleur ?", a: "Oui. Depuis le 26 septembre 2022, vous devez fournir au travailleur l'information sur ses droits au Canada, au plus tard le premier jour de travail (R209.2(1)(a.1)). Une fiche multilingue est disponible dans le portail employé." },
    { q: 'Puis-je facturer des frais de recrutement au travailleur ?', a: "Non. Il est interdit de recouvrer des frais de recrutement auprès du travailleur (R303.1). Ces frais sont à la charge de l'employeur." },
  ],
  en: [
    { q: 'How does an IRCC or ESDC inspection work?', a: 'The authority may request your documents (employment agreements, payroll records, proof of payment), visit the workplace and interview workers. You must cooperate and provide the requested information (R209.5/R209.6).' },
    { q: 'How long must I keep my documents?', a: "At least 6 years from the worker's first day of employment (R209.4). The document vault applies this retention automatically." },
    { q: "Can I change a worker's wage, position or schedule?", a: 'A significant change to conditions may have to be declared to the authorities before it takes effect. Use the "Change declaration letter" generator and ensure the wage stays substantially the same as the offer (R209.2(1)(a)(iii)).' },
    { q: 'What are the most common mistakes that lead to penalties?', a: 'Wage below the offer or the provincial minimum, missing payroll records, failure to provide rights information, recruitment fees charged to the worker, and working conditions that differ from the offer.' },
    { q: 'Must I provide rights information to the worker?', a: 'Yes. Since September 26, 2022, you must provide the worker with information about their rights in Canada, no later than their first day of work (R209.2(1)(a.1)). A multilingual sheet is available in the employee portal.' },
    { q: 'Can I charge recruitment fees to the worker?', a: 'No. Recovering recruitment fees from the worker is prohibited (R303.1). These costs are the employer\'s responsibility.' },
  ],
}

// ---------------- FAQ EMPLOYÉ ----------------
const FAQ_EMPLOYEE = {
  fr: [
    { q: 'Quels sont mes droits en tant que travailleur étranger ?', a: "Vous avez droit au salaire prévu dans votre offre, à un milieu de travail sans abus, à des soins de santé en cas de blessure liée au travail, et à garder vos documents. Personne ne peut confisquer votre passeport ou votre permis." },
    { q: "Comment obtenir mon numéro d'assurance sociale (NAS) ?", a: "Le NAS est gratuit et s'obtient auprès de Service Canada (en ligne ou en personne) avec votre permis de travail. Il est nécessaire pour travailler et être payé." },
    { q: 'Dois-je produire une déclaration de revenus au Canada ?', a: "En général, oui : si vous résidez et travaillez au Canada, vous êtes imposé sur vos revenus et devez produire une déclaration chaque printemps (avant le 30 avril). Vous pourriez avoir droit à des remboursements et crédits." },
    { q: 'Quels crédits ou remboursements puis-je demander ?', a: "Selon votre situation : crédit pour la TPS/TVH, montant personnel de base, frais de garde d'enfants, etc. Des organismes offrent des cliniques d'impôt gratuites pour les nouveaux arrivants." },
    { q: 'Mon employeur peut-il garder mon passeport ?', a: 'Non. Vos documents vous appartiennent. Si on vous les confisque ou si vous subissez des abus, vous pouvez demander de l\'aide et, au besoin, un permis de travail ouvert pour travailleur vulnérable.' },
    { q: 'Où trouver de l\'aide pour m\'intégrer ?', a: "Des services d'établissement gratuits existent (langue, logement, emploi, communauté). L'application ParcoursCA aide à votre intégration sociale et communautaire au Canada." },
  ],
  en: [
    { q: 'What are my rights as a foreign worker?', a: 'You are entitled to the wage set in your offer, a workplace free of abuse, health care for a work-related injury, and to keep your documents. No one may take away your passport or permit.' },
    { q: 'How do I get my Social Insurance Number (SIN)?', a: 'The SIN is free and obtained from Service Canada (online or in person) with your work permit. It is required to work and get paid.' },
    { q: 'Do I need to file a tax return in Canada?', a: 'Generally yes: if you live and work in Canada, you are taxed on your income and must file a return each spring (by April 30). You may be entitled to refunds and credits.' },
    { q: 'Which credits or refunds can I claim?', a: 'Depending on your situation: GST/HST credit, basic personal amount, child care expenses, etc. Organizations offer free tax clinics for newcomers.' },
    { q: 'Can my employer keep my passport?', a: 'No. Your documents belong to you. If they are taken or you experience abuse, you can seek help and, if needed, an open work permit for vulnerable workers.' },
    { q: 'Where can I find help to settle in?', a: 'Free settlement services exist (language, housing, jobs, community). The ParcoursCA app helps with your social and community integration in Canada.' },
  ],
}

// ---------------- RESSOURCES EMPLOYÉ ----------------
const RES_EMPLOYEE = {
  fr: [
    { title: 'ParcoursCA — intégration sociale et communautaire', desc: 'Application qui accompagne votre installation et votre intégration au Canada.', url: 'https://apps.apple.com/ca/app/parcoursca/id6784901044', source: 'ParcoursCA' },
    { title: 'Nouveaux arrivants et impôts', desc: 'Tout ce qu\'il faut savoir pour produire votre première déclaration de revenus au Canada.', url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/themes/tout-votre-declaration-revenus/nouveaux-arrivants-au-canada.html', source: 'ARC' },
    { title: "Numéro d'assurance sociale (NAS)", desc: 'Comment obtenir votre NAS, gratuit, auprès de Service Canada.', url: 'https://www.canada.ca/fr/emploi-developpement-social/services/numero-assurance-sociale.html', source: 'Service Canada' },
    { title: 'Vos droits sont protégés', desc: 'Information officielle sur vos droits comme travailleur étranger au Canada.', url: 'https://www.canada.ca/fr/emploi-developpement-social/services/travailleurs-etrangers/droits-proteges.html', source: 'EDSC' },
  ],
  en: [
    { title: 'ParcoursCA — social & community integration', desc: 'An app that supports your settlement and integration in Canada.', url: 'https://apps.apple.com/ca/app/parcoursca/id6784901044', source: 'ParcoursCA' },
    { title: 'Newcomers and taxes', desc: 'Everything you need to file your first income tax return in Canada.', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/your-tax-return/newcomers-canada.html', source: 'CRA' },
    { title: 'Social Insurance Number (SIN)', desc: 'How to get your free SIN from Service Canada.', url: 'https://www.canada.ca/en/employment-social-development/services/sin.html', source: 'Service Canada' },
    { title: 'Your rights are protected', desc: 'Official information about your rights as a foreign worker in Canada.', url: 'https://www.canada.ca/en/employment-social-development/services/foreign-workers/protected-rights.html', source: 'ESDC' },
  ],
}

// ---------------- API publique ----------------
export function faqEmployer(lang) {
  return pick(FAQ_EMPLOYER, lang)
}
export function faqEmployee(lang) {
  return pick(FAQ_EMPLOYEE, lang)
}
export function resourcesEmployee(lang) {
  return pick(RES_EMPLOYEE, lang)
}

/** Ressources employeur : liens officiels fédéraux + régulateur provincial + salaire min. */
export function resourcesEmployer(lang, province) {
  const { federal, provincial } = getUpdatesForProvince(province)
  const cards = [...federal.slice(0, 3)]
  // Régulateur de santé-sécurité de la province (2e entrée provinciale en général).
  const safety = provincial.find((p) => /sécurité|safety|worksafe|cnesst|wcb|wscc|indemnisation/i.test(p.topic + p.source))
  if (safety) cards.push(safety)
  const mw = getMinWage(province)
  if (mw) {
    cards.push({
      topic: lang === 'en' ? `Provincial minimum wage (${province})` : `Salaire minimum provincial (${province})`,
      desc:
        (lang === 'en' ? 'Reference rate: ' : 'Taux de référence : ') +
        `${mw.rate.toFixed(2)} $/h (${mw.asOf}) — ` +
        (lang === 'en' ? 'verify the current rate.' : 'vérifiez le taux en vigueur.'),
      url: 'https://www.canada.ca/en/employment-social-development/services/labour-standards/reports/minimum-wage.html',
      source: lang === 'en' ? 'Minimum wage' : 'Salaire minimum',
    })
  }
  return cards
}
