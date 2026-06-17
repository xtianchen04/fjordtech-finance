# Déploiement — Vercel + GitHub + Supabase

ComplyHub se déploie en quelques minutes : **Vercel** héberge l'interface React,
**Supabase** héberge la base de données et l'authentification.

> ⚠️ Le code de ComplyHub vit dans le **sous-dossier `complyhub/`** du dépôt.
> Sur Vercel, il faut donc régler le **Root Directory** sur `complyhub`.

---

## Étape 1 — Pré-requis Supabase (déjà fait)

Votre projet Supabase doit exister et contenir le schéma :

1. `schema.sql`
2. `seed_compliance_conditions.sql`
3. `storage_policies.sql`

(exécutés dans Supabase → SQL Editor). Notez votre **Project URL** et la clé **`anon` `public`**
(Settings → API).

---

## Étape 2 — Importer le projet dans Vercel

1. Allez sur **https://vercel.com** → connectez-vous **avec GitHub**.
2. **Add New… → Project**.
3. Choisissez le dépôt **`fjordtech-finance`** → **Import**.
4. Dans l'écran de configuration :
   - **Root Directory** → cliquez **Edit** → sélectionnez **`complyhub`** ✅ (étape la plus importante)
   - **Framework Preset** → doit afficher **Vite** (détecté automatiquement)
   - **Build Command** : `npm run build` (par défaut)
   - **Output Directory** : `dist` (par défaut)

---

## Étape 3 — Variables d'environnement

Toujours dans l'écran d'import (section **Environment Variables**), ajoutez :

| Name                     | Value                                   |
| ------------------------ | --------------------------------------- |
| `VITE_SUPABASE_URL`      | `https://VOTRE_PROJET.supabase.co`      |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (votre clé anon)               |

Puis cliquez **Deploy**. Après ~2 min, Vercel vous donne une URL
(ex. `https://complyhub.vercel.app`).

> Les variables doivent commencer par `VITE_`. Si vous les modifiez plus tard,
> relancez un déploiement (**Deployments → ⋯ → Redeploy**).

---

## Étape 4 — Configurer les URL d'authentification dans Supabase

Pour que la confirmation d'email et la connexion fonctionnent sur le domaine de production :

**Supabase → Authentication → URL Configuration** :

- **Site URL** : `https://complyhub.vercel.app` (votre URL Vercel)
- **Redirect URLs** : ajoutez
  - `https://complyhub.vercel.app/**`
  - `http://localhost:5173/**` (pour continuer à tester en local)

Enregistrez.

---

## Étape 5 — Déploiements automatiques

C'est déjà actif : chaque `git push` sur la branche connectée déclenche un nouveau
déploiement. Les Pull Requests obtiennent une **URL de prévisualisation** automatique.

- Branche de production recommandée : `main` (après fusion de la PR).
- Vercel construit toujours depuis le **Root Directory** `complyhub`.

---

## Étape 6 (optionnel) — Domaine personnalisé

**Vercel → Project → Settings → Domains** → ajoutez `app.complyhub.ca` (ou autre)
et suivez les instructions DNS. N'oubliez pas de réajuster les URL à l'étape 4.

---

## Facturation Stripe (optionnel)

Les fonctions Edge Stripe (`supabase/functions/`) se déploient **via la CLI Supabase**,
pas via Vercel. Voir la section *Facturation* du `README.md`.

---

## Récapitulatif

```
GitHub (push)  →  Vercel (build + hébergement de l'interface)
                       │
                       └── variables VITE_SUPABASE_* →  Supabase (BD + Auth + Storage)
```
