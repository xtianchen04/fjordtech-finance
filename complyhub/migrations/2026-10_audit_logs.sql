-- ============================================================
--  ComplyHub — Migration : Journal d'audit (audit trail immuable)
-- ------------------------------------------------------------
--  À exécuter dans Supabase → SQL Editor, APRÈS schema.sql et
--  2026-10_team_messaging.sql. Idempotent.
--
--  Enregistre automatiquement, via des triggers PostgreSQL (donc
--  impossibles à contourner côté client), toutes les mutations sur
--  les tables sensibles : workers, worker_compliance, documents,
--  messages, invitations.
--
--  Immuabilité : aucune politique INSERT/UPDATE/DELETE pour les
--  utilisateurs. Seuls les triggers (SECURITY DEFINER) écrivent ;
--  personne ne peut modifier ni effacer une ligne a posteriori.
--
--  Confidentialité : le NAS (social_insurance_number) est retiré
--  des détails journalisés.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) TABLE
-- ------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null, -- null = action système
  actor_role  text not null,                 -- 'employer' | 'employee' | 'system'
  action      text not null,                 -- ex. 'insert.workers', 'update.messages'
  entity_type text not null,                 -- nom de la table concernée
  entity_id   uuid,                          -- id de l'entité
  worker_id   uuid references public.workers (id) on delete set null,
  details     jsonb not null default '{}',   -- { old, new } (NAS retiré)
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_org_created on public.audit_logs (org_id, created_at desc);
create index if not exists idx_audit_worker      on public.audit_logs (worker_id, created_at desc);
create index if not exists idx_audit_entity      on public.audit_logs (entity_type, entity_id);

-- ------------------------------------------------------------
-- 2) RLS — lecture par l'employeur propriétaire ; aucune écriture directe
-- ------------------------------------------------------------
alter table public.audit_logs enable row level security;

drop policy if exists "audit_select_own" on public.audit_logs;
create policy "audit_select_own" on public.audit_logs
  for select using (
    org_id in (select id from public.organizations where created_by = auth.uid())
  );
-- Pas de politique insert/update/delete : les triggers SECURITY DEFINER
-- contournent la RLS pour écrire, mais nul ne peut modifier/supprimer.

-- ------------------------------------------------------------
-- 3) FONCTION DE TRIGGER GÉNÉRIQUE
-- ------------------------------------------------------------
create or replace function public.fn_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec         jsonb := to_jsonb(coalesce(NEW, OLD));
  v_worker_id uuid;
  v_org_id    uuid;
  v_role      text;
  v_new       jsonb;
  v_old       jsonb;
begin
  -- worker_id : colonne directe, ou l'id lui-même pour la table workers.
  if rec ? 'worker_id' then
    v_worker_id := nullif(rec->>'worker_id', '')::uuid;
  elsif TG_TABLE_NAME = 'workers' then
    v_worker_id := nullif(rec->>'id', '')::uuid;
  end if;

  -- org_id : colonne directe, sinon via la fiche travailleur.
  if rec ? 'org_id' then
    v_org_id := nullif(rec->>'org_id', '')::uuid;
  else
    select org_id into v_org_id from public.workers where id = v_worker_id;
  end if;

  if v_org_id is null then
    return coalesce(NEW, OLD); -- rien à rattacher : on n'enregistre pas.
  end if;

  -- Rôle de l'acteur.
  if auth.uid() is null then
    v_role := 'system';
  elsif exists (select 1 from public.organizations where id = v_org_id and created_by = auth.uid()) then
    v_role := 'employer';
  elsif v_worker_id is not null
        and exists (select 1 from public.workers where id = v_worker_id and user_id = auth.uid()) then
    v_role := 'employee';
  else
    v_role := 'system';
  end if;

  -- Détails, NAS retiré.
  v_new := case when NEW is not null then to_jsonb(NEW) - 'social_insurance_number' end;
  v_old := case when OLD is not null then to_jsonb(OLD) - 'social_insurance_number' end;

  insert into public.audit_logs (
    org_id, user_id, actor_role, action, entity_type, entity_id, worker_id, details
  ) values (
    v_org_id,
    auth.uid(),
    v_role,
    lower(TG_OP) || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    nullif(rec->>'id', '')::uuid,
    v_worker_id,
    jsonb_strip_nulls(jsonb_build_object('old', v_old, 'new', v_new))
  );

  return coalesce(NEW, OLD);
end;
$$;

-- ------------------------------------------------------------
-- 4) TRIGGERS sur les tables sensibles
-- ------------------------------------------------------------
drop trigger if exists trg_audit_workers on public.workers;
create trigger trg_audit_workers
  after insert or update or delete on public.workers
  for each row execute function public.fn_audit();

drop trigger if exists trg_audit_worker_compliance on public.worker_compliance;
create trigger trg_audit_worker_compliance
  after insert or update or delete on public.worker_compliance
  for each row execute function public.fn_audit();

drop trigger if exists trg_audit_documents on public.documents;
create trigger trg_audit_documents
  after insert or update or delete on public.documents
  for each row execute function public.fn_audit();

drop trigger if exists trg_audit_messages on public.messages;
create trigger trg_audit_messages
  after insert or update or delete on public.messages
  for each row execute function public.fn_audit();

drop trigger if exists trg_audit_invitations on public.invitations;
create trigger trg_audit_invitations
  after insert or update or delete on public.invitations
  for each row execute function public.fn_audit();
