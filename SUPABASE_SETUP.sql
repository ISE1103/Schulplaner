-- Schulplaner PWA v2.3 – gemeinsames Familienkonto
-- In Supabase: SQL Editor -> New query -> einfügen -> Run

create table if not exists public.planner_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"subjects":[],"books":[],"tasks":[],"lessons":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.planner_state enable row level security;

grant select, insert, update, delete on public.planner_state to authenticated;

drop policy if exists "family_select_own_state" on public.planner_state;
create policy "family_select_own_state"
on public.planner_state
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "family_insert_own_state" on public.planner_state;
create policy "family_insert_own_state"
on public.planner_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "family_update_own_state" on public.planner_state;
create policy "family_update_own_state"
on public.planner_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "family_delete_own_state" on public.planner_state;
create policy "family_delete_own_state"
on public.planner_state
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Echtzeit für diese Tabelle aktivieren.
do $$
begin
  alter publication supabase_realtime add table public.planner_state;
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- v2.11 – Private Dokumente & Galerie
-- ============================================================
create table if not exists public.member_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person text not null check (person in ('Lara','Bianca','Ivan')),
  category text not null check (category in ('Blutbild','Labor','Befund','Arztbrief','Sonstiges')),
  document_date date not null,
  title text not null,
  notes text not null default '',
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);
alter table public.member_documents enable row level security;
grant select, insert, update, delete on public.member_documents to authenticated;
drop policy if exists "gallery_select_own" on public.member_documents;
create policy "gallery_select_own" on public.member_documents for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "gallery_insert_own" on public.member_documents;
create policy "gallery_insert_own" on public.member_documents for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "gallery_update_own" on public.member_documents;
create policy "gallery_update_own" on public.member_documents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "gallery_delete_own" on public.member_documents;
create policy "gallery_delete_own" on public.member_documents for delete to authenticated using ((select auth.uid()) = user_id);

-- Privater Storage-Bucket. public=false ist für sensible Dokumente wichtig.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('member-documents','member-documents',false,15728640,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=15728640,allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];

-- Ein Benutzer darf ausschließlich Dateien in seinem eigenen Ordner <user-id>/... lesen/schreiben.
drop policy if exists "gallery_storage_select_own" on storage.objects;
create policy "gallery_storage_select_own" on storage.objects for select to authenticated using (bucket_id='member-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "gallery_storage_insert_own" on storage.objects;
create policy "gallery_storage_insert_own" on storage.objects for insert to authenticated with check (bucket_id='member-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "gallery_storage_update_own" on storage.objects;
create policy "gallery_storage_update_own" on storage.objects for update to authenticated using (bucket_id='member-documents' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='member-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "gallery_storage_delete_own" on storage.objects;
create policy "gallery_storage_delete_own" on storage.objects for delete to authenticated using (bucket_id='member-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
