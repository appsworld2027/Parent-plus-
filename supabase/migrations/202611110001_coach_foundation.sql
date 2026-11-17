-- Parent Plus Coach: initial development schema.
-- Run this whole file in Supabase SQL Editor. All changes are transactional.
-- No passwords, API keys, or sample children are included.
begin;

-- Protect an unrelated or previously populated project from name collisions.
do $$
begin
  if to_regclass('coach_private.schema_migrations') is null and exists (
    select 1 from pg_catalog.pg_tables where schemaname = 'public' and tablename in (
      'profiles','academies','students','student_contacts','batches','enrolments','class_sessions',
      'attendance','observations','observation_recipients','fee_invoices','fee_payments')
  ) then
    raise exception 'Existing application tables found. Stop and ask your coding partner to inspect before applying this setup.';
  end if;
end;
$$;

create schema if not exists coach_private;
revoke all on schema coach_private from public, anon, authenticated;
create table if not exists coach_private.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
revoke all on coach_private.schema_migrations from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.academies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 100),
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR' check (currency = 'INR'),
  created_at timestamptz not null default now()
);

create or replace function coach_private.validate_timezone()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid academy timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_academy_timezone on public.academies;
create trigger validate_academy_timezone before insert or update of timezone on public.academies
for each row execute function coach_private.validate_timezone();

create or replace function coach_private.owns_academy(academy uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.academies where id = academy and owner_id = (select auth.uid()));
$$;
revoke all on function coach_private.owns_academy(uuid) from public, anon;
grant usage on schema coach_private to authenticated;
grant execute on function coach_private.owns_academy(uuid) to authenticated;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id),
  name text not null check (length(trim(name)) between 1 and 100),
  age_years smallint check (age_years between 0 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, academy_id)
);

create table if not exists public.student_contacts (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id),
  student_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  email text check (length(email) <= 320),
  phone text check (length(phone) <= 30),
  relationship text not null default 'Guardian' check (length(relationship) between 1 and 40),
  created_at timestamptz not null default now(),
  foreign key (student_id, academy_id) references public.students(id, academy_id)
);

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id),
  name text not null check (length(trim(name)) between 1 and 100),
  room text not null default '' check (length(room) <= 100),
  monthly_fee_paise bigint not null default 0 check (monthly_fee_paise between 0 and 100000000000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, academy_id)
);

create table if not exists public.enrolments (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id),
  student_id uuid not null,
  batch_id uuid not null,
  starts_on date not null default current_date,
  ends_on date check (ends_on >= starts_on),
  created_at timestamptz not null default now(),
  unique (id, academy_id),
  unique (academy_id, student_id, batch_id),
  foreign key (student_id, academy_id) references public.students(id, academy_id),
  foreign key (batch_id, academy_id) references public.batches(id, academy_id)
);

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id),
  batch_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  room text not null default '' check (length(room) <= 100),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (id, academy_id),
  unique (id, academy_id, batch_id),
  unique (academy_id, batch_id, starts_at),
  foreign key (batch_id, academy_id) references public.batches(id, academy_id)
);

create table if not exists public.attendance (
  academy_id uuid not null references public.academies(id),
  session_id uuid not null,
  student_id uuid not null,
  batch_id uuid not null,
  status text not null check (status in ('present', 'late', 'absent')),
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id),
  foreign key (session_id, academy_id, batch_id) references public.class_sessions(id, academy_id, batch_id),
  foreign key (academy_id, student_id, batch_id) references public.enrolments(academy_id, student_id, batch_id)
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id),
  author_id uuid not null default auth.uid() references auth.users(id),
  batch_id uuid not null,
  session_id uuid,
  status text not null default 'draft' check (status in ('draft', 'recorded')),
  note text not null default '' check (length(note) <= 10000),
  created_at timestamptz not null default now(),
  check (status = 'draft' or length(trim(note)) > 0),
  unique (id, academy_id),
  unique (id, academy_id, batch_id),
  foreign key (batch_id, academy_id) references public.batches(id, academy_id),
  foreign key (session_id, academy_id, batch_id) references public.class_sessions(id, academy_id, batch_id)
);

create table if not exists public.observation_recipients (
  academy_id uuid not null references public.academies(id),
  observation_id uuid not null,
  student_id uuid not null,
  batch_id uuid not null,
  primary key (observation_id, student_id),
  foreign key (observation_id, academy_id, batch_id) references public.observations(id, academy_id, batch_id),
  foreign key (academy_id, student_id, batch_id) references public.enrolments(academy_id, student_id, batch_id)
);

create table if not exists public.fee_invoices (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id),
  enrolment_id uuid not null,
  billing_month date not null check (extract(day from billing_month) = 1),
  due_on date not null,
  amount_paise bigint not null check (amount_paise between 1 and 100000000000),
  currency text not null default 'INR' check (currency = 'INR'),
  created_at timestamptz not null default now(),
  unique (id, academy_id),
  unique (enrolment_id, billing_month),
  foreign key (enrolment_id, academy_id) references public.enrolments(id, academy_id)
);

create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id),
  invoice_id uuid not null,
  amount_paise bigint not null check (amount_paise between 1 and 100000000000),
  source text not null check (source in ('manual', 'gateway')),
  mode text not null check (mode in ('test', 'live')),
  provider_payment_id text unique,
  request_id uuid not null unique,
  recorded_at timestamptz not null default now(),
  check ((source = 'gateway' and provider_payment_id is not null) or (source = 'manual' and provider_payment_id is null)),
  foreign key (invoice_id, academy_id) references public.fee_invoices(id, academy_id)
);

-- Default-deny every exposed table. Restrict billing writes to future verified server functions.
do $$
declare t text;
begin
  foreach t in array array['profiles','academies','students','student_contacts','batches','enrolments',
    'class_sessions','attendance','observations','observation_recipients','fee_invoices','fee_payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end;
$$;

drop policy if exists own_profile on public.profiles;
create policy own_profile on public.profiles for all to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant insert, update on public.profiles to authenticated;

drop policy if exists own_academy on public.academies;
create policy own_academy on public.academies for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant insert, update on public.academies to authenticated;

do $$
declare t text;
begin
  foreach t in array array['students','student_contacts','batches','enrolments','class_sessions',
    'attendance','observations','observation_recipients','fee_invoices','fee_payments'] loop
    execute format('drop policy if exists academy_access on public.%I', t);
    execute format('create policy academy_access on public.%I for all to authenticated using (coach_private.owns_academy(academy_id)) with check (coach_private.owns_academy(academy_id))', t);
    execute format('create index if not exists %I on public.%I (academy_id)', t || '_academy_idx', t);
  end loop;
end;
$$;
grant insert, update on public.students, public.student_contacts, public.batches, public.enrolments, public.class_sessions to authenticated;
-- No client DELETE, direct attendance writes, observation publication, or billing writes.

create or replace function public.create_academy(academy_name text, owner_name text)
returns public.academies language plpgsql security invoker set search_path = '' as $$
declare result public.academies;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if length(trim(academy_name)) not between 1 and 100 or length(trim(owner_name)) not between 1 and 100 then
    raise exception 'Enter an academy and owner name' using errcode = '22023';
  end if;
  insert into public.profiles(id, display_name) values(auth.uid(), trim(owner_name))
    on conflict(id) do update set display_name = excluded.display_name;
  insert into public.academies(owner_id, name) values(auth.uid(), trim(academy_name))
    on conflict(owner_id) do nothing returning * into result;
  if result.id is null then select * into result from public.academies where owner_id = auth.uid(); end if;
  return result;
end;
$$;
revoke all on function public.create_academy(text,text) from public, anon;
grant execute on function public.create_academy(text,text) to authenticated;

create or replace function public.save_attendance(target_session uuid, marks jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare session public.class_sessions; item jsonb; seen uuid[] := '{}'; child uuid; marked integer := 0; session_date date;
begin
  select * into session from public.class_sessions
    where id = target_session and coach_private.owns_academy(academy_id) for update;
  if session.id is null or not coach_private.owns_academy(session.academy_id) then
    raise exception 'Session unavailable' using errcode = '42501';
  end if;
  if session.status = 'cancelled' then raise exception 'Session is cancelled' using errcode = '22023'; end if;
  if marks is null or jsonb_typeof(marks) <> 'array' then raise exception 'Attendance must be a list' using errcode = '22023'; end if;
  if jsonb_array_length(marks) < 1 or jsonb_array_length(marks) > 500 then
    raise exception 'Choose between 1 and 500 students' using errcode = '22023';
  end if;
  select (session.starts_at at time zone timezone)::date into session_date from public.academies where id = session.academy_id;
  for item in select value from jsonb_array_elements(marks) loop
    child := (item->>'student_id')::uuid;
    if child is null or child = any(seen) or item->>'status' is null or item->>'status' not in ('present','late','absent') then
      raise exception 'Invalid or repeated attendance entry' using errcode = '22023';
    end if;
    if not exists(select 1 from public.enrolments e join public.students s on s.id = e.student_id
      where e.academy_id = session.academy_id and e.batch_id = session.batch_id and e.student_id = child
      and e.starts_on <= session_date and (e.ends_on is null or e.ends_on >= session_date) and s.archived_at is null) then
      raise exception 'Student is not enrolled for this session' using errcode = '22023';
    end if;
    insert into public.attendance(academy_id, session_id, student_id, batch_id, status)
      values(session.academy_id, session.id, child, session.batch_id, item->>'status')
      on conflict(session_id,student_id) do update set status = excluded.status, updated_at = now();
    seen := array_append(seen,child); marked := marked + 1;
  end loop;
  return marked;
end;
$$;
revoke all on function public.save_attendance(uuid,jsonb) from public, anon;
grant execute on function public.save_attendance(uuid,jsonb) to authenticated;

-- Restrict non-API helper execution too; default PostgreSQL functions grant PUBLIC execute.
revoke all on function coach_private.validate_timezone() from public, anon, authenticated;

comment on table public.student_contacts is 'Academy contacts only; these records do not grant parent account access.';
comment on table public.fee_payments is 'Read-only to app clients. Verified server functions will record payments in a later migration.';

insert into coach_private.schema_migrations(version) values('202611110001') on conflict do nothing;

commit;
