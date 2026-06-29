-- ============================================================
--  Migration (OPTIONNEL) — Planifier l'envoi quotidien des alertes
--  Programme un appel quotidien de la fonction Edge « send-alerts »
--  via pg_cron + pg_net (disponibles sur Supabase).
--
--  PRÉ-REQUIS :
--   1) Déployer la fonction :  supabase functions deploy send-alerts
--   2) Configurer les secrets (RESEND_API_KEY, ALERTS_FROM, …).
--   3) Remplacer <PROJECT_REF> et <CRON_SECRET> ci-dessous.
--
--  Astuce : protégez l'appel par un en-tête secret et vérifiez-le au
--  début de la fonction si vous l'exposez publiquement.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Tous les jours à 08:07 (heure du serveur). Ajustez au besoin.
select cron.schedule(
  'complyhub-send-alerts',
  '7 8 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.functions.supabase.co/send-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_OR_CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Pour retirer la planification :
--   select cron.unschedule('complyhub-send-alerts');
