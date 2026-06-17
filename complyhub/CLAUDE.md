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
    └── components/
        ├── Auth.jsx                ← connexion / inscription
        ├── Onboarding.jsx          ← création de l'organisation
        ├── ComplyHub.jsx           ← coquille + tableau de bord (données réelles)
        ├── WorkerForm.jsx          ← modal d'ajout d'un travailleur
        ├── Gauge.jsx               ← jauge de score SVG
        ├── Simulator.jsx           ← simulateur d'inspection
        ├── Vault.jsx               ← coffre-fort documentaire
        └── Generator.jsx           ← générateur de documents
```

## Modèle de données

- **organizations** — l'entreprise de l'utilisateur (`created_by = auth.uid()`).
- **workers** — travailleurs étrangers rattachés à une organisation.
- **compliance_conditions** — référentiel des conditions réglementaires (lecture seule).
- **worker_compliance** — état de conformité par travailleur × condition.
- **documents** — métadonnées des fichiers du coffre-fort (Supabase Storage).

**RLS** : isolation par organisation. Un utilisateur ne voit que les données dont
l'organisation a `created_by = auth.uid()`.

## Flux applicatif

```
non connecté → Auth → (pas d'organisation) → Onboarding → Dashboard (ComplyHub)
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
