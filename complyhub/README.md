# ComplyHub

Plateforme SaaS de **conformité TET/PMI** pour les employeurs canadiens de
travailleurs étrangers temporaires. Suivez vos conditions réglementaires (RIPR),
préparez-vous aux inspections d'IRCC/ESDC et centralisez vos documents.

> ⚠️ Outil de gestion documentaire — **ne constitue pas un conseil juridique**
> en immigration (réservé aux avocats et consultants réglementés CICC).

## Stack

React 18 · Vite · TailwindCSS · lucide-react · Supabase (PostgreSQL + RLS + Storage)

## Mise en route

### 1. Dépendances

```bash
npm install
```

### 2. Variables d'environnement

```bash
cp .env.local.example .env.local
```

Renseignez vos valeurs depuis **Supabase → Settings → API** :

```
VITE_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> Les variables **doivent** commencer par `VITE_`. Redémarrez Vite après
> toute modification de `.env.local`. Ne committez jamais ce fichier.

### 3. Base de données (Supabase → SQL Editor)

Exécutez dans l'ordre :

1. [`schema.sql`](./schema.sql) — tables + Row Level Security
2. [`seed_compliance_conditions.sql`](./seed_compliance_conditions.sql) — référentiel des conditions
3. [`storage_policies.sql`](./storage_policies.sql) — bucket privé `documents` + politiques

### 4. Lancer

```bash
npm run dev
```

→ http://localhost:5173

## Flux

```
Inscription / connexion  →  Onboarding (créer l'organisation)  →  Tableau de bord
```

Lors de l'ajout d'un travailleur, ses conditions de conformité sont générées
automatiquement et le score de préparation est recalculé.

## Modules

- **Tableau de bord** — score de préparation, statistiques, liste des travailleurs (cliquables pour éditer leur conformité), conditions agrégées.
- **Alertes** — permis qui expirent (≤ 90 j) et conditions manquantes, calculées automatiquement.
- **Simulateur d'inspection** — questions types d'un inspecteur IRCC/ESDC, résultat calculé et **sauvegardé** (historique).
- **Coffre-fort documentaire** — upload / téléchargement / suppression réels via **Supabase Storage**, conservation 6 ans.
- **Générateur de documents** — documents imprimables (PDF) remplis avec vos données réelles.
- **Abonnement** — paliers et paiement via **Stripe Checkout**.

## Facturation (Stripe) — optionnel

La facturation s'appuie sur deux fonctions Edge Supabase (`supabase/functions/`).

1. Créez vos produits/prix dans Stripe (plans Pro et Cabinet) et notez les `price_...`.
2. Définissez les secrets :
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_...
   supabase secrets set STRIPE_PRICE_PRO=price_...
   supabase secrets set STRIPE_PRICE_CABINET=price_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```
3. Déployez :
   ```bash
   supabase functions deploy create-checkout
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
4. Dans Stripe → Developers → Webhooks, ajoutez l'endpoint
   `https://<projet>.supabase.co/functions/v1/stripe-webhook` (événement `checkout.session.completed`).

Sans cette configuration, l'app fonctionne normalement ; seul le bouton de paiement
affichera une erreur explicite.

## Structure

Voir [`CLAUDE.md`](./CLAUDE.md) pour l'architecture détaillée et les conventions.

## Déploiement (Vercel + GitHub + Supabase)

Voir le guide complet : [`DEPLOY.md`](./DEPLOY.md).

En bref : importez le dépôt dans Vercel, réglez le **Root Directory** sur `complyhub`,
ajoutez les variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, puis **Deploy**.
Pensez à ajouter votre URL Vercel dans **Supabase → Authentication → URL Configuration**.

## Scripts

| Commande          | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Serveur de développement (port 5173) |
| `npm run build`   | Build de production (`dist/`)        |
| `npm run preview` | Prévisualisation du build            |
