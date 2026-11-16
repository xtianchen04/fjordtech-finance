-- ============================================================
--  ComplyHub — Migration : Taux de salaire minimum en base (source unique)
-- ------------------------------------------------------------
--  À exécuter dans Supabase → SQL Editor, après schema.sql. Idempotent.
--
--  Jusqu'ici les taux de salaire minimum étaient codés en dur (src/lib/minWage.js
--  et dans la fonction send-alerts). Cette table devient la SOURCE UNIQUE,
--  modifiable sans redéploiement et tenue à jour automatiquement par la
--  fonction Edge « refresh-min-wage » (Claude + recherche web), avec URL
--  source et journal des changements pour la traçabilité.
--
--  Sécurité : données de RÉFÉRENCE publiques (non liées à une organisation).
--  Lecture ouverte aux utilisateurs authentifiés ; écriture réservée au
--  rôle service (la fonction Edge contourne la RLS). Aucune politique d'écriture.
-- ============================================================

-- Table des taux courants (un enregistrement par province/territoire).
create table if not exists public.min_wage_rates (
  province    text primary key,                 -- code (AB, BC, …)
  rate        numeric(6, 2) not null,           -- taux général $/h
  as_of       date,                             -- date d'entrée en vigueur
  source_url  text,                             -- source officielle vérifiée
  checked_at  timestamptz,                       -- dernière vérification auto
  updated_at  timestamptz not null default now()
);

-- Journal immuable des changements de taux (traçabilité / audit).
create table if not exists public.min_wage_rate_log (
  id          uuid primary key default gen_random_uuid(),
  province    text not null,
  old_rate    numeric(6, 2),
  new_rate    numeric(6, 2),
  old_as_of   date,
  new_as_of   date,
  source_url  text,
  note        text,
  created_at  timestamptz not null default now()
);

-- Valeurs initiales (dernière révision manuelle 2025-10). on conflict do nothing :
-- ne jamais écraser une valeur déjà mise à jour en base.
insert into public.min_wage_rates (province, rate, as_of) values
  ('AB', 15.00, '2024-10-01'),
  ('BC', 17.40, '2025-06-01'),
  ('MB', 15.80, '2025-10-01'),
  ('NB', 15.30, '2025-04-01'),
  ('NL', 16.00, '2025-04-01'),
  ('NS', 15.70, '2025-04-01'),
  ('NT', 16.70, '2024-09-01'),
  ('NU', 19.00, '2024-01-01'),
  ('ON', 17.60, '2025-10-01'),
  ('PE', 16.00, '2025-04-01'),
  ('QC', 16.10, '2025-05-01'),
  ('SK', 15.00, '2024-10-01'),
  ('YT', 17.94, '2025-04-01')
on conflict (province) do nothing;

-- RLS : lecture pour les utilisateurs authentifiés, aucune écriture directe.
alter table public.min_wage_rates enable row level security;
alter table public.min_wage_rate_log enable row level security;

do $$ begin
  create policy "min_wage_rates_read"
    on public.min_wage_rates for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "min_wage_rate_log_read"
    on public.min_wage_rate_log for select to authenticated using (true);
exception when duplicate_object then null; end $$;
