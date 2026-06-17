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
