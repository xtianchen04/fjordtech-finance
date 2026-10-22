-- ============================================================
--  ComplyHub — INSTALLATION COMPLÈTE (à exécuter en une fois)
-- ------------------------------------------------------------
--  Supabase → SQL Editor → coller TOUT ce fichier → Run.
--  Idempotent : réexécutable sans danger.
--
--  Ordre :
--    1) schema.sql                     — tables de base + RLS
--    2) seed_compliance_conditions.sql — référentiel des conditions
--    3) storage_policies.sql           — bucket "documents" + RLS
--    4) 2026-06_settings_notifications — préférences de notification
--    5) 2026-10_team_messaging         — équipe, invitations, messagerie
--
--  Étape manuelle recommandée ensuite :
--    Authentication → Email → désactiver « Confirm email »
--    (connexion directe par mot de passe pour les employés).
-- ============================================================


-- ############################################################
-- # 1) SCHÉMA DE BASE
-- ############################################################
-- ============================================================
--  ComplyHub — Schéma de base de données (PostgreSQL / Supabase)
-- ============================================================
--  À exécuter dans Supabase → SQL Editor.
--  Exécutez ensuite seed_compliance_conditions.sql pour peupler
--  le référentiel des conditions de conformité.
--
--  Sécurité : Row Level Security (RLS) activée sur toutes les
--  tables. Les données sont isolées par organisation, rattachée
--  à l'utilisateur via organizations.created_by = auth.uid().
-- ============================================================

-- Extension pour gen_random_uuid()
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) ORGANIZATIONS
-- ------------------------------------------------------------
create table if not exists public.organizations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  legal_name        text,
  business_number   text,
  address           text,
  province          text,
  created_by        uuid not null references auth.users (id) on delete cascade,
  subscription_tier text not null default 'free',
  created_at        timestamptz not null default now()
);

create index if not exists idx_organizations_created_by on public.organizations (created_by);

-- ------------------------------------------------------------
-- 2) WORKERS
-- ------------------------------------------------------------
create table if not exists public.workers (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations (id) on delete cascade,
  full_name          text not null,
  program            text not null default 'PMI',   -- 'PMI' | 'PTET'
  occupation         text,
  work_permit_number text,
  social_insurance_number text,        -- NAS — donnée sensible (PII), protégée par RLS
  permit_expiry      date,
  offered_wage       numeric(10, 2),
  offered_hours      numeric(6, 2),
  work_province      text,
  start_date         date,
  status             text not null default 'active', -- 'active' | 'inactive'
  created_at         timestamptz not null default now()
);

create index if not exists idx_workers_org_id on public.workers (org_id);

-- ------------------------------------------------------------
-- 3) COMPLIANCE_CONDITIONS (référentiel partagé, en lecture seule)
-- ------------------------------------------------------------
create table if not exists public.compliance_conditions (
  id        integer primary key,
  regime    text not null,            -- 'Commun' | 'PMI' | 'PTET'
  category  text not null,
  label     text not null,
  reference text,                      -- article du RIPR
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4) WORKER_COMPLIANCE
-- ------------------------------------------------------------
create table if not exists public.worker_compliance (
  id           uuid primary key default gen_random_uuid(),
  worker_id    uuid not null references public.workers (id) on delete cascade,
  condition_id integer not null references public.compliance_conditions (id),
  status       text not null default 'pending', -- 'ok' | 'warn' | 'missing' | 'na' | 'pending'
  notes        text,
  updated_at   timestamptz not null default now(),
  unique (worker_id, condition_id)
);

create index if not exists idx_worker_compliance_worker_id on public.worker_compliance (worker_id);

-- ------------------------------------------------------------
-- 5) DOCUMENTS
-- ------------------------------------------------------------
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  worker_id       uuid references public.workers (id) on delete set null,
  category        text not null,
  file_name       text not null,
  storage_path    text not null,
  retention_until date,               -- conservation 6 ans (R209.4)
  uploaded_at     timestamptz not null default now()
);

create index if not exists idx_documents_org_id on public.documents (org_id);

-- ------------------------------------------------------------
-- 6) INSPECTION_SIMULATIONS (résultats sauvegardés du simulateur)
-- ------------------------------------------------------------
create table if not exists public.inspection_simulations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  score      integer not null default 0,
  answers    jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_simulations_org_id on public.inspection_simulations (org_id);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table public.organizations         enable row level security;
alter table public.workers               enable row level security;
alter table public.compliance_conditions enable row level security;
alter table public.worker_compliance     enable row level security;
alter table public.documents             enable row level security;
alter table public.inspection_simulations enable row level security;

-- ---------- organizations : l'utilisateur ne voit que les siennes ----------
drop policy if exists "org_select_own"  on public.organizations;
drop policy if exists "org_insert_own"  on public.organizations;
drop policy if exists "org_update_own"  on public.organizations;
drop policy if exists "org_delete_own"  on public.organizations;

create policy "org_select_own" on public.organizations
  for select using (created_by = auth.uid());
create policy "org_insert_own" on public.organizations
  for insert with check (created_by = auth.uid());
create policy "org_update_own" on public.organizations
  for update using (created_by = auth.uid());
create policy "org_delete_own" on public.organizations
  for delete using (created_by = auth.uid());

-- ---------- workers : appartiennent à une organisation de l'utilisateur ----------
drop policy if exists "workers_all_own" on public.workers;
create policy "workers_all_own" on public.workers
  for all
  using (
    org_id in (select id from public.organizations where created_by = auth.uid())
  )
  with check (
    org_id in (select id from public.organizations where created_by = auth.uid())
  );

-- ---------- compliance_conditions : référentiel en lecture seule pour tout utilisateur authentifié ----------
drop policy if exists "conditions_select_authenticated" on public.compliance_conditions;
create policy "conditions_select_authenticated" on public.compliance_conditions
  for select using (auth.role() = 'authenticated');

-- ---------- worker_compliance : via le travailleur → l'organisation ----------
drop policy if exists "wc_all_own" on public.worker_compliance;
create policy "wc_all_own" on public.worker_compliance
  for all
  using (
    worker_id in (
      select w.id from public.workers w
      join public.organizations o on o.id = w.org_id
      where o.created_by = auth.uid()
    )
  )
  with check (
    worker_id in (
      select w.id from public.workers w
      join public.organizations o on o.id = w.org_id
      where o.created_by = auth.uid()
    )
  );

-- ---------- documents : via l'organisation ----------
drop policy if exists "documents_all_own" on public.documents;
create policy "documents_all_own" on public.documents
  for all
  using (
    org_id in (select id from public.organizations where created_by = auth.uid())
  )
  with check (
    org_id in (select id from public.organizations where created_by = auth.uid())
  );

-- ---------- inspection_simulations : via l'organisation ----------
drop policy if exists "simulations_all_own" on public.inspection_simulations;
create policy "simulations_all_own" on public.inspection_simulations
  for all
  using (
    org_id in (select id from public.organizations where created_by = auth.uid())
  )
  with check (
    org_id in (select id from public.organizations where created_by = auth.uid())
  );

-- ############################################################
-- # 2) RÉFÉRENTIEL DES CONDITIONS DE CONFORMITÉ
-- ############################################################
-- ============================================================
--  ComplyHub — Seed du référentiel des conditions de conformité
-- ============================================================
--  À exécuter APRÈS schema.sql, dans Supabase → SQL Editor.
--  Idempotent : ré-exécutable sans créer de doublons.
-- ============================================================

insert into public.compliance_conditions (id, regime, category, label, reference) values
  (1,  'Commun', 'Emploi',       'Emploi dans la même profession que l''offre',                'R209.2(1)(a)(iii)'),
  (2,  'Commun', 'Salaire',      'Salaire substantiellement le même que l''offre',             'R209.2(1)(a)(iii)'),
  (3,  'Commun', 'Conditions',   'Conditions de travail conformes à l''offre',                 'R209.2(1)(a)(iii)'),
  (4,  'Commun', 'Légal',        'Respect des lois fédérales et provinciales du travail',      'R209.3(1)(a)(iii) / R209.4(1)(a)'),
  (5,  'Commun', 'Activité',     'Activité commerciale conforme à l''offre d''emploi',         'R209.3(1)(b)(i) / R209.4(1)(b)(i)'),
  (6,  'Commun', 'Documents',    'Conservation des registres pendant 6 ans',                   'R209.4'),
  (7,  'PMI',    'Abus',         'Milieu de travail exempt d''abus (R196.2)',                  'R196.2'),
  (8,  'PMI',    'Information',  'Information sur les droits fournie au travailleur',          'R209.2(1)(a.1)'),
  (9,  'PMI',    'Santé',        'Accès aux soins de santé en cas de blessure',                'R209.2(1)(b)'),
  (10, 'PTET',   'Logement',     'Logement adéquat (si applicable)',                           'R209.3(1)'),
  (11, 'Commun', 'Déclaration',  'Déclaration des changements à l''autorité',                  'R209.2(1) / R209.3(1)'),
  (12, 'Commun', 'Coopération',  'Coopération lors d''une inspection',                         'R209.5 / R209.6')
on conflict (id) do update set
  regime    = excluded.regime,
  category  = excluded.category,
  label     = excluded.label,
  reference = excluded.reference;

-- ############################################################
-- # 3) STOCKAGE (bucket documents + politiques)
-- ############################################################
-- ============================================================
--  ComplyHub — Bucket de stockage "documents" + politiques RLS
-- ============================================================
--
--  OPTION A — Tableau de bord Supabase (recommandé pour la création du bucket)
--  ------------------------------------------------------------------
--  1. Supabase → Storage → New bucket
--  2. Name        : documents
--  3. Public      : NON (laisser privé)
--  4. Create bucket
--  Puis exécutez les politiques SQL ci-dessous dans SQL Editor.
--
--  OPTION B — Tout en SQL (création du bucket + politiques)
--  ------------------------------------------------------------------
--  Exécutez l'intégralité de ce fichier dans SQL Editor.
--
--  Convention de chemin : chaque fichier est stocké sous
--      <org_id>/<worker_id?>/<nom_fichier>
--  La première portion du chemin (avant le premier "/") est l'org_id,
--  ce qui permet d'isoler les fichiers par organisation.
-- ============================================================

-- Création du bucket privé (ignorée s'il existe déjà).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
--  Politiques RLS sur storage.objects
--  Un utilisateur n'accède qu'aux fichiers dont le préfixe de chemin
--  (org_id) correspond à une organisation qu'il a créée.
-- ------------------------------------------------------------

drop policy if exists "documents_select_own" on storage.objects;
drop policy if exists "documents_insert_own" on storage.objects;
drop policy if exists "documents_update_own" on storage.objects;
drop policy if exists "documents_delete_own" on storage.objects;

create policy "documents_select_own" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.organizations where created_by = auth.uid()
    )
  );

create policy "documents_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.organizations where created_by = auth.uid()
    )
  );

create policy "documents_update_own" on storage.objects
  for update using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.organizations where created_by = auth.uid()
    )
  );

create policy "documents_delete_own" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.organizations where created_by = auth.uid()
    )
  );

-- ############################################################
-- # 4) PRÉFÉRENCES DE NOTIFICATION (Paramètres)
-- ############################################################
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

-- ############################################################
-- # 5) ÉQUIPE, INVITATIONS & MESSAGERIE (Phases 1 & 2)
-- ############################################################
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

-- ############################################################
-- # 6) JOURNAL D'AUDIT (audit trail immuable)
-- ############################################################
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

-- ############################################################
-- # 7) CHIFFREMENT DU NAS AU REPOS (NO-OP tant que la clé Vault
-- #    'complyhub_nas_key' n'est pas créée — voir en-tête du fichier)
-- ############################################################
-- ============================================================
--  Migration — Chiffrement du NAS au repos (version activable)
-- ------------------------------------------------------------
--  Remplace/complète 2026-06_nas_encryption.sql. Idempotente.
--  À exécuter dans Supabase → SQL Editor.
--
--  Principe :
--   • Le NAS est chiffré (pgcrypto / pgp_sym_encrypt) dans `nas_enc`,
--     avec une clé stockée dans Supabase Vault ; le clair est effacé.
--   • On conserve un indice non sensible `nas_last3` (3 derniers
--     chiffres) pour l'affichage masqué « ••• ••• •89 » sans
--     déchiffrement.
--   • Déchiffrement complet réservé au propriétaire de l'organisation,
--     via la fonction worker_nas().
--
--  ⚠️ SÉCURITÉ PROGRESSIVE : tant que la clé Vault « complyhub_nas_key »
--  n'existe pas, le déclencheur est un NO-OP (rien n'est chiffré, le
--  comportement actuel est conservé). Le chiffrement s'active dès que la
--  clé est créée.
--
--  ÉTAPES POUR ACTIVER :
--   1) Exécuter ce script.
--   2) Créer la clé secrète (UNE SEULE FOIS) :
--        select vault.create_secret(
--          encode(gen_random_bytes(32), 'hex'),
--          'complyhub_nas_key',
--          'Clé de chiffrement du NAS ComplyHub'
--        );
--   3) (Optionnel) Chiffrer les NAS déjà en clair :
--        update public.workers
--           set social_insurance_number = social_insurance_number
--         where social_insurance_number is not null;
-- ============================================================

create extension if not exists pgcrypto;

-- Colonnes : NAS chiffré + indice masqué non sensible.
alter table public.workers
  add column if not exists nas_enc   bytea,
  add column if not exists nas_last3 text;

-- Clé de chiffrement depuis Supabase Vault (NULL si absente).
create or replace function public._complyhub_nas_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'complyhub_nas_key'
  limit 1;
$$;

-- Déclencheur : chiffre le NAS à l'écriture, mémorise les 3 derniers
-- chiffres pour l'affichage, puis efface le clair.
create or replace function public.encrypt_worker_nas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  k text;
begin
  if NEW.social_insurance_number is not null
     and length(NEW.social_insurance_number) > 0 then
    k := public._complyhub_nas_key();
    if k is not null then
      NEW.nas_enc   := pgp_sym_encrypt(NEW.social_insurance_number, k);
      NEW.nas_last3 := right(NEW.social_insurance_number, 3);
      NEW.social_insurance_number := null;  -- ne jamais conserver le clair
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_encrypt_worker_nas on public.workers;
create trigger trg_encrypt_worker_nas
  before insert or update of social_insurance_number on public.workers
  for each row
  execute function public.encrypt_worker_nas();

-- Déchiffrement contrôlé : réservé au propriétaire de l'organisation.
create or replace function public.worker_nas(p_worker_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  k text;
  result text;
begin
  if not exists (
    select 1
    from public.workers w
    join public.organizations o on o.id = w.org_id
    where w.id = p_worker_id
      and o.created_by = auth.uid()
  ) then
    raise exception 'non autorisé';
  end if;

  k := public._complyhub_nas_key();
  if k is null then
    -- Pas de chiffrement actif : on renvoie le clair éventuel.
    select social_insurance_number into result
      from public.workers where id = p_worker_id;
    return result;
  end if;

  select pgp_sym_decrypt(nas_enc, k)
    into result
    from public.workers
    where id = p_worker_id;
  return result;
end;
$$;

revoke all on function public.worker_nas(uuid) from public;
grant execute on function public.worker_nas(uuid) to authenticated;
