# Sécurité — ComplyHub

ComplyHub manipule des données sensibles (PII) de travailleurs étrangers,
notamment le **NAS (numéro d'assurance sociale)**. Ce document décrit les
protections en place et les étapes recommandées.

## Protections actives

- **Isolation par organisation (RLS)** — Row Level Security sur toutes les tables ;
  un utilisateur ne voit que les données de son organisation
  (`organizations.created_by = auth.uid()`). Voir `schema.sql`.
- **Coffre-fort documentaire privé** — bucket Supabase Storage privé, accès par URL
  signée temporaire (1 h). Voir `storage_policies.sql`.
- **NAS — durcissement applicatif** (`src/lib/nas.js`, `WorkerForm.jsx`) :
  - saisie **masquée par défaut** (type `password`) avec bouton afficher/masquer ;
  - **validation Luhn** (9 chiffres) avant enregistrement ;
  - **normalisation** : seuls les chiffres sont stockés (pas d'espaces/tirets) ;
  - le NAS n'est **jamais ré-affiché** ailleurs dans l'interface.

## NAS — chiffrement au repos (recommandé)

Le durcissement applicatif réduit l'exposition à l'écran, mais le NAS reste en
clair dans la colonne `workers.social_insurance_number`. Pour le **chiffrer au
repos**, appliquez `migrations/2026-06_nas_encryption.sql` :

1. Exécuter le script (sans clé, il est **sans effet** — rien n'est cassé).
2. Créer la clé dans Supabase Vault :
   ```sql
   select vault.create_secret(
     encode(gen_random_bytes(32), 'hex'),
     'complyhub_nas_key',
     'Clé de chiffrement du NAS ComplyHub'
   );
   ```
3. Dès lors, tout NAS écrit est chiffré (`pgp_sym_encrypt`) dans `workers.nas_enc`
   et le clair est effacé. Le déchiffrement passe par la fonction contrôlée
   `worker_nas(worker_id)`, réservée au propriétaire de l'organisation.
4. (Optionnel) Re-chiffrer l'existant :
   ```sql
   update public.workers
      set social_insurance_number = social_insurance_number
    where social_insurance_number is not null;
   ```

> ⚠️ Après activation, ne loggez jamais le NAS déchiffré et n'exposez
> `worker_nas()` qu'aux usages strictement nécessaires.

## Pistes d'amélioration (suivi)

- Journal d'accès (audit) sur le déchiffrement du NAS.
- Politique de rétention/suppression pour les travailleurs inactifs.
- Rotation de la clé Vault.
- Limitation de débit (rate limiting) sur l'authentification.
