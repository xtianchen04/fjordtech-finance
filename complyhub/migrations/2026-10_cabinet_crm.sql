-- ============================================================
--  ComplyHub — Migration : Fondations Cabinet (CRM multi-clients)
-- ------------------------------------------------------------
--  À exécuter dans Supabase → SQL Editor, après schema.sql. Idempotent.
--
--  Modèle : un cabinet / consultant gère PLUSIEURS organisations-clients,
--  qu'il crée et possède (organizations.created_by = auth.uid()). La
--  sécurité RLS existante (isolation par created_by) s'applique donc
--  déjà — aucune politique n'est modifiée ici.
--
--  Cette migration ajoute les champs « CRM » sur l'organisation, utilisés
--  par la console Cabinet : statut du client, coordonnées, notes, suivi.
-- ============================================================

alter table public.organizations
  add column if not exists client_status   text default 'active', -- prospect | active | review | inactive
  add column if not exists contact_name    text,
  add column if not exists contact_email   text,
  add column if not exists contact_phone   text,
  add column if not exists client_notes    text,
  add column if not exists last_contact_at timestamptz;
