-- ============================================================
--  Migration (OPTIONNEL) — Planifier la mise à jour auto des taux
--  Programme un appel HEBDOMADAIRE de la fonction Edge « refresh-min-wage »
--  via pg_cron + pg_net (disponibles sur Supabase).
--
--  PRÉ-REQUIS :
--   1) Exécuter 2026-11_min_wage_rates.sql (table des taux).
--   2) Déployer la fonction :  supabase functions deploy refresh-min-wage
--   3) Configurer les secrets : ANTHROPIC_API_KEY (+ RATES_MODEL facultatif).
--   4) Remplacer <PROJECT_REF> et <SERVICE_ROLE_OR_CRON_SECRET> ci-dessous.
--
--  Les changements de taux sont consignés dans public.min_wage_rate_log ;
--  consultez-les régulièrement (la mise à jour reste assistée, pas aveugle).
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Tous les lundis à 06:13 (heure du serveur). Ajustez au besoin.
select cron.schedule(
  'complyhub-refresh-min-wage',
  '13 6 * * 1',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.functions.supabase.co/refresh-min-wage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_OR_CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Pour retirer la planification :
--   select cron.unschedule('complyhub-refresh-min-wage');
