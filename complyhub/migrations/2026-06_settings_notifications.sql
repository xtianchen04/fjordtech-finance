-- ============================================================
--  Migration — Paramètres d'organisation & notifications par courriel
--  À exécuter dans Supabase → SQL Editor (idempotent).
--
--  Ajoute les colonnes nécessaires à l'écran « Paramètres » :
--   - notify_enabled    : l'employeur souhaite-t-il des alertes par courriel ?
--   - notify_email      : adresse de destination des alertes
--   - alert_window_days : délai (jours) avant l'expiration d'un permis pour alerter
--
--  L'écran Paramètres permet déjà de modifier name / legal_name /
--  business_number / address / province (colonnes existantes).
-- ============================================================

alter table public.organizations
  add column if not exists notify_enabled    boolean not null default false,
  add column if not exists notify_email      text,
  add column if not exists alert_window_days integer not null default 90;

-- Borne raisonnable pour la fenêtre d'alerte (1 à 365 jours).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organizations_alert_window_days_check'
  ) then
    alter table public.organizations
      add constraint organizations_alert_window_days_check
      check (alert_window_days between 1 and 365);
  end if;
end $$;
