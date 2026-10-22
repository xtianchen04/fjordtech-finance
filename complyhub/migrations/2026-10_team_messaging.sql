-- ============================================================
--  ComplyHub — Migration : Équipe, invitations & messagerie
--  Phase 1 (fondation : rôles + invitations + comptes employés)
--  Phase 2 (messagerie + preuves de communication)
-- ------------------------------------------------------------
--  À exécuter dans Supabase → SQL Editor, APRÈS schema.sql.
--  Idempotent : réexécutable sans danger.
--
--  Modèle de rôles
--    • Employeur = utilisateur ayant créé l'organisation
--      (organizations.created_by = auth.uid()).
--    • Employé   = utilisateur lié à une ligne workers via
--      workers.user_id = auth.uid().
--
--  Un employé n'accède QU'À sa propre fiche, ses documents et le
--  fil de messages le concernant (isolation stricte par RLS).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) WORKERS — colonnes pour le compte employé et le portail
-- ------------------------------------------------------------
alter table public.workers
  add column if not exists user_id            uuid references auth.users (id) on delete set null,
  add column if not exists email              text,
  add column if not exists primary_language   text,   -- langue principale (code i18n : fr, en, es, tl, pa…)
  add column if not exists secondary_language text;

create index if not exists idx_workers_user_id on public.workers (user_id);
create index if not exists idx_workers_email    on public.workers (lower(email));

-- ------------------------------------------------------------
-- 2) INVITATIONS — l'employeur invite un travailleur au portail
-- ------------------------------------------------------------
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  worker_id   uuid not null references public.workers (id) on delete cascade,
  email       text not null,
  token       text not null unique default encode(gen_random_bytes(16), 'hex'),
  status      text not null default 'pending',   -- 'pending' | 'accepted' | 'revoked'
  created_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists idx_invitations_org_id on public.invitations (org_id);
create index if not exists idx_invitations_email  on public.invitations (lower(email));

-- ------------------------------------------------------------
-- 3) MESSAGES — fil de discussion employeur ↔ employé (par travailleur)
--    Chaque message est horodaté ; read_at matérialise l'accusé de
--    lecture (preuve de communication pour IRCC/EDSC).
-- ------------------------------------------------------------
create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id) on delete cascade,
  worker_id      uuid not null references public.workers (id) on delete cascade,
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  sender_role    text not null check (sender_role in ('employer', 'employee')),
  body           text not null,
  created_at     timestamptz not null default now(),
  read_at        timestamptz
);

create index if not exists idx_messages_worker_id on public.messages (worker_id, created_at);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table public.invitations enable row level security;
alter table public.messages    enable row level security;

-- ---------- workers : l'employé peut lire sa propre fiche ----------
-- (La politique existante "workers_all_own" couvre déjà l'employeur.)
drop policy if exists "workers_select_self" on public.workers;
create policy "workers_select_self" on public.workers
  for select using (user_id = auth.uid());

-- ---------- invitations : réservées à l'employeur propriétaire ----------
drop policy if exists "invitations_all_own" on public.invitations;
create policy "invitations_all_own" on public.invitations
  for all
  using (org_id in (select id from public.organizations where created_by = auth.uid()))
  with check (org_id in (select id from public.organizations where created_by = auth.uid()));

-- ---------- documents : l'employé accède à SES documents ----------
drop policy if exists "documents_select_self" on public.documents;
create policy "documents_select_self" on public.documents
  for select using (
    worker_id in (select id from public.workers where user_id = auth.uid())
  );

drop policy if exists "documents_insert_self" on public.documents;
create policy "documents_insert_self" on public.documents
  for insert with check (
    worker_id in (select id from public.workers where user_id = auth.uid())
    and org_id in (select org_id from public.workers where user_id = auth.uid())
  );

-- ---------- messages ----------
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    org_id in (select id from public.organizations where created_by = auth.uid())
    or worker_id in (select id from public.workers where user_id = auth.uid())
  );

drop policy if exists "messages_insert_employer" on public.messages;
create policy "messages_insert_employer" on public.messages
  for insert with check (
    sender_user_id = auth.uid()
    and sender_role = 'employer'
    and org_id in (select id from public.organizations where created_by = auth.uid())
  );

drop policy if exists "messages_insert_employee" on public.messages;
create policy "messages_insert_employee" on public.messages
  for insert with check (
    sender_user_id = auth.uid()
    and sender_role = 'employee'
    and worker_id in (select id from public.workers where user_id = auth.uid())
  );

-- Accusé de lecture : les deux parties peuvent marquer comme lu ce qu'elles voient.
drop policy if exists "messages_update_read" on public.messages;
create policy "messages_update_read" on public.messages
  for update using (
    org_id in (select id from public.organizations where created_by = auth.uid())
    or worker_id in (select id from public.workers where user_id = auth.uid())
  );

-- ============================================================
--  FONCTIONS (SECURITY DEFINER — contournent la RLS de façon contrôlée)
-- ============================================================

-- Rattache l'utilisateur connecté aux fiches travailleur dont une
-- invitation en attente cible son courriel. Déclenchée à la connexion.
-- Repose sur le courriel vérifié par Supabase → sûr.
create or replace function public.accept_pending_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_count integer := 0;
begin
  if v_email is null then
    return 0;
  end if;

  update public.workers w
     set user_id = auth.uid()
    from public.invitations i
   where i.worker_id = w.id
     and i.status = 'pending'
     and lower(i.email) = v_email
     and w.user_id is null;

  update public.invitations i
     set status = 'accepted', accepted_at = now()
   where i.status = 'pending'
     and lower(i.email) = v_email;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.accept_pending_invitations() to authenticated;

-- L'employé met à jour les champs de SA fiche qu'il est autorisé à modifier.
-- (Le nom, le salaire, le programme… restent contrôlés par l'employeur.)
create or replace function public.update_my_worker_profile(
  p_primary_language   text default null,
  p_secondary_language text default null,
  p_work_permit_number text default null,
  p_permit_expiry      date default null
)
returns public.workers
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.workers;
begin
  update public.workers
     set primary_language   = coalesce(p_primary_language, primary_language),
         secondary_language = coalesce(p_secondary_language, secondary_language),
         work_permit_number = coalesce(p_work_permit_number, work_permit_number),
         permit_expiry      = coalesce(p_permit_expiry, permit_expiry)
   where user_id = auth.uid()
  returning * into w;

  if w.id is null then
    raise exception 'Aucune fiche travailleur liée à cet utilisateur.';
  end if;
  return w;
end;
$$;

grant execute on function public.update_my_worker_profile(text, text, text, date) to authenticated;

-- Informations minimales sur une invitation (pour la page d'invitation,
-- avant même que la personne ne soit connectée). N'expose rien de sensible.
create or replace function public.invitation_info(p_token text)
returns table (email text, org_name text, worker_name text, status text)
language sql
security definer
set search_path = public
stable
as $$
  select i.email, o.name, w.full_name, i.status
    from public.invitations i
    join public.organizations o on o.id = i.org_id
    join public.workers w       on w.id = i.worker_id
   where i.token = p_token
   limit 1;
$$;

grant execute on function public.invitation_info(text) to anon, authenticated;

-- ============================================================
--  STORAGE — l'employé lit/écrit dans SON dossier <org_id>/<worker_id>/…
--  (Les politiques employeur de storage_policies.sql restent en place.)
-- ============================================================
drop policy if exists "documents_select_self_storage" on storage.objects;
create policy "documents_select_self_storage" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] in (
      select id::text from public.workers where user_id = auth.uid()
    )
  );

drop policy if exists "documents_insert_self_storage" on storage.objects;
create policy "documents_insert_self_storage" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] in (
      select id::text from public.workers where user_id = auth.uid()
    )
  );
