-- Add private Parent planning records to APVerse without importing the
-- independent MM family schema or migration history.
begin;

create schema if not exists parent_private;
revoke all on schema parent_private from public, anon, authenticated, service_role;
grant usage on schema parent_private to authenticated;

create or replace function parent_private.owns_created_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.children c
    where c.id = p_child_id
      and c.created_by = auth.uid()
  );
$$;
revoke all on function parent_private.owns_created_child(uuid) from public, anon, authenticated, service_role;
grant execute on function parent_private.owns_created_child(uuid) to authenticated;

create table public.parent_family_moments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  note text not null check (length(btrim(note)) between 1 and 2000),
  minutes integer not null default 0 check (minutes between 0 and 1440),
  kind text not null default 'memory' check (kind in ('memory','together')),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.parent_family_todos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.parent_family_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text check (location is null or length(location) <= 200),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index parent_family_moments_owner_child_date_idx on public.parent_family_moments(owner_id,child_id,occurred_on desc,id);
create index parent_family_todos_owner_child_created_idx on public.parent_family_todos(owner_id,child_id,created_at desc,id);
create index parent_family_events_owner_child_start_idx on public.parent_family_events(owner_id,child_id,starts_at,id);

do $$
declare t text;
begin
  foreach t in array array['parent_family_moments','parent_family_todos','parent_family_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public,anon,service_role',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for all to authenticated using (owner_id = (select auth.uid()) and parent_private.owns_created_child(child_id)) with check (owner_id = (select auth.uid()) and parent_private.owns_created_child(child_id))',t||'_owner_only',t);
  end loop;
end;
$$;

commit;
