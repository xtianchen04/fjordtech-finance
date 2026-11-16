# Fonction Edge — `refresh-min-wage`

Met à jour **automatiquement** les taux de salaire minimum provinciaux en base
(`public.min_wage_rates`) en interrogeant Claude avec l'**outil de recherche
web**, à partir des sources officielles. Chaque changement est consigné dans
`public.min_wage_rate_log` (traçabilité), avec l'URL source et un horodatage de
vérification (`checked_at`).

C'est la brique « maintenance auto des taux » : la table devient la **source
unique** que l'app et la fonction `send-alerts` consultent (repli sur les taux
intégrés si la table n'est pas migrée).

## Garde-fous

La conformité dépend de ces taux, donc aucune valeur douteuse n'est écrite :

- bande de plausibilité **13–35 $/h** ;
- code de province connu (AB…YT) ;
- **URL source obligatoire** ;
- tout changement est **journalisé** ;
- une juridiction non confirmée par une source est **omise**, pas devinée.

La mise à jour reste **assistée** : consultez le journal des changements
(onglet Paramètres → « Veille automatique des taux », ou la table
`min_wage_rate_log`) pour valider.

## Déploiement

1. Exécuter la migration `migrations/2026-11_min_wage_rates.sql`.
2. Secrets (clé partagée avec `ask-assistant`) :

   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   # (facultatif) modèle — défaut claude-opus-5-5
   supabase secrets set RATES_MODEL=claude-opus-5-5
   ```

3. Déployer :

   ```bash
   supabase functions deploy refresh-min-wage
   ```

4. (Facultatif) Planifier l'exécution hebdomadaire :
   `migrations/2026-11_schedule_refresh_min_wage.sql` (pg_cron).

## Variables d'environnement

| Secret                      | Requis | Défaut            | Rôle                                  |
| --------------------------- | :----: | ----------------- | ------------------------------------- |
| `ANTHROPIC_API_KEY`         |   ✔    | —                 | Clé de l'API Anthropic                |
| `SUPABASE_URL`              |   ✔    | (plateforme)      | URL du projet                         |
| `SUPABASE_SERVICE_ROLE_KEY` |   ✔    | (plateforme)      | Écriture en base (contourne la RLS)   |
| `RATES_MODEL`               |        | `claude-opus-5-5` | Modèle Claude utilisé                 |

## Déclenchement manuel

Depuis l'app : **Paramètres → Veille automatique des taux → « Vérifier
maintenant »**. Ou via `supabase functions invoke refresh-min-wage`.
