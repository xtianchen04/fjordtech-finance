# ComplyHub — Contexte projet (pour Claude Code)

## Vue d'ensemble

**ComplyHub** est une plateforme SaaS de **conformité réglementaire** pour les
employeurs canadiens de **travailleurs étrangers temporaires (TET)**, couvrant
le **Programme de mobilité internationale (PMI)** et le **Programme des
travailleurs étrangers temporaires (PTET)**.

Objectif : aider l'employeur à **rester conforme** au Règlement sur
l'immigration et la protection des réfugiés (RIPR) et à être **prêt en cas
d'inspection** d'IRCC ou d'ESDC.

> ⚠️ ComplyHub est un outil de **gestion et d'organisation documentaire**. Il ne
> fournit **pas de conseil juridique** en immigration (réservé aux avocats et
> consultants réglementés CICC).

## Stack technique

- **Front-end** : React 18 + Vite
- **Style** : TailwindCSS (palette bleu marine + or, titres en Georgia serif)
- **Icônes** : lucide-react
- **Back-end / Auth / DB / Storage** : Supabase (PostgreSQL + RLS)

## Palette de design

| Token  | Hex       | Usage                         |
| ------ | --------- | ----------------------------- |
| ink    | `#0B1F33` | Texte principal, sidebar      |
| deep   | `#13314F` | Survol, encarts foncés        |
| steel  | `#2E6CA4` | Accent principal, liens       |
| sky    | `#5AA0DC` | Sous-titres clairs            |
| mist   | `#E8F1F8` | Fonds doux                    |
| gold   | `#C99A3B` | Accent secondaire (logo, CTA) |
| ok     | `#2E9E6B` | Conforme                      |
| amber  | `#E0A030` | À vérifier                    |
| danger | `#D1495B` | Manquant / critique           |

Typographie : **Georgia (serif)** pour les titres, **Segoe UI / system-ui** pour le corps.

## Structure du projet

```
complyhub/
├── CLAUDE.md                       ← ce fichier
├── README.md
├── schema.sql                      ← schéma DB + RLS (à exécuter dans Supabase)
├── seed_compliance_conditions.sql  ← référentiel des conditions
├── storage_policies.sql            ← bucket "documents" + politiques RLS
├── .env.local.example
├── ComplyHub.prototype.html        ← maquette HTML d'origine (référence design)
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx                     ← routeur de flux (Auth → Onboarding → Dashboard)
    ├── index.css                   ← directives Tailwind + classes utilitaires
    ├── lib/
    │   ├── supabase.js             ← client + helpers auth (onAuthChange, signIn…)
    │   ├── api.js                  ← couche d'accès aux données (organizations, workers…)
    │   └── constants.js            ← STATUS, provinces, questions, dossiers…
    │   └── generators.js           ← génération de documents imprimables
    └── components/
        ├── Landing.jsx             ← page d'accueil publique
        ├── Auth.jsx                ← connexion / inscription
        ├── Onboarding.jsx          ← création de l'organisation
        ├── ComplyHub.jsx           ← coquille + tableau de bord (données réelles)
        ├── WorkerForm.jsx          ← modal d'ajout d'un travailleur
        ├── WorkerDetail.jsx        ← modal d'édition de la conformité d'un travailleur
        ├── Gauge.jsx               ← jauge de score SVG
        ├── Alerts.jsx              ← vue des alertes
        ├── Simulator.jsx           ← simulateur d'inspection (sauvegardé)
        ├── Vault.jsx               ← coffre-fort documentaire (Supabase Storage)
        ├── Generator.jsx           ← générateur de documents
        ├── Messaging.jsx           ← messagerie employeur ↔ employé (Phase 2)
        ├── Billing.jsx             ← abonnement / Stripe
        └── employee/
            ├── EmployeePortal.jsx  ← maquette publique (#/employe)
            ├── EmployeeApp.jsx     ← portail employé authentifié (données réelles)
            └── InviteLanding.jsx   ← page d'invitation (#/invite?token=…)

supabase/functions/
├── create-checkout/index.ts        ← session Stripe Checkout
└── stripe-webhook/index.ts         ← met à jour subscription_tier
```

## Modèle de données

- **organizations** — l'entreprise de l'utilisateur (`created_by = auth.uid()`).
- **workers** — travailleurs étrangers rattachés à une organisation. Colonnes de
  portail (migration `2026-10_team_messaging.sql`) : `user_id` (compte employé lié),
  `email`, `primary_language`, `secondary_language`.
- **compliance_conditions** — référentiel des conditions réglementaires (lecture seule).
- **worker_compliance** — état de conformité par travailleur × condition.
- **documents** — métadonnées des fichiers du coffre-fort (Supabase Storage).
- **invitations** — invitations d'employés au portail (`pending`/`accepted`/`revoked`).
- **messages** — fil employeur ↔ employé par travailleur ; `read_at` = accusé de
  lecture (preuve de communication horodatée).
- **audit_logs** — journal d'audit immuable (migration `2026-10_audit_logs.sql`).
  Alimenté par des triggers PostgreSQL sur `workers`, `worker_compliance`,
  `documents`, `messages`, `invitations`. Lecture employeur uniquement, aucune
  écriture/modification directe (triggers SECURITY DEFINER) ; le NAS est retiré
  des détails. Onglet « Journal d'audit » + export CSV côté employeur.

**Rôles** :
- *Employeur* = a créé une organisation (`organizations.created_by = auth.uid()`).
- *Employé* = utilisateur lié à une fiche via `workers.user_id = auth.uid()`.

**RLS** : isolation par organisation pour l'employeur. Un **employé** n'accède
qu'à SA fiche, SES documents et SON fil de messages. Le rattachement du compte
se fait à la connexion via `accept_pending_invitations()` (correspondance du
courriel vérifié). L'employé modifie ses champs autorisés via
`update_my_worker_profile()` (SECURITY DEFINER, colonnes sur liste blanche).

## Flux applicatif

```
non connecté → Auth → employeur : (pas d'org) → Onboarding → ComplyHub
                        employé  : EmployeeApp (portail)
lien d'invitation : .../#/invite?token=…  (→ inscription, rattachement auto)
aperçu public du portail : .../#/employe  (maquette, hors connexion)
```

À la création d'un travailleur (`api.createWorker`), les lignes
`worker_compliance` sont **générées automatiquement** à partir du référentiel,
filtrées sur le régime du travailleur (`Commun` + `PMI`/`PTET`).

## Score de préparation

`computeReadinessScore()` = `ok / (total des conditions applicables, hors 'na')`,
arrondi en pourcentage. Vert ≥ 85, ambre ≥ 70, rouge sinon.

## Mise en route

1. `npm install`
2. `cp .env.local.example .env.local` puis renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
3. Exécuter `schema.sql`, `seed_compliance_conditions.sql` puis `storage_policies.sql` dans Supabase
4. `npm run dev` → http://localhost:5173

## Conventions

- Code et UI en **français** (libellés, commentaires).
- Conserver fidèlement le **design de la maquette** (`ComplyHub.prototype.html`).
- Toujours référencer les articles du **RIPR** pour les conditions de conformité.
- Ne jamais committer `.env.local` ni aucune clé Supabase.
