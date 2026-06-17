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
