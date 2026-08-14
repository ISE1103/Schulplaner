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
