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
