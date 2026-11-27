-- CANDIDATE, NOT AN APPLIED MIGRATION. Provider contract C1.2 (PV-03..PV-12). Depends on 202611270022_verified_email_gate.sql.
-- Validated only on a disposable database (tests/provider-verification-database.test.ts). Do NOT run on the hosted project, and do not
-- create the storage bucket there, without founder authorization. Real short-lived signed links need a hosted storage service: NOT RUN.
begin;
create table if not exists coach_private.provider_admins (user_id uuid primary key references auth.users(id) on delete cascade, added_at timestamptz not null default now());
revoke all on coach_private.provider_admins from public, anon, authenticated;
create or replace function coach_private.is_provider_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select coach_private.caller_email_verified() and exists (select 1 from coach_private.provider_admins where user_id = auth.uid())
$$;
revoke all on function coach_private.is_provider_admin() from public, anon; grant execute on function coach_private.is_provider_admin() to authenticated;

create table public.provider_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '', phone text not null default '', bio text not null default '', sports text[] not null default '{}',
  experience_years integer check (experience_years between 0 and 60),
  status text not null default 'draft' check (status in ('draft', 'pending', 'verified', 'rejected')),
  reason text, submitted_at timestamptz, decided_at timestamptz, decided_by uuid references auth.users(id), updated_at timestamptz not null default now());
create table public.provider_documents (
  user_id uuid not null references public.provider_profiles(user_id) on delete cascade, kind text not null check (kind in ('photo_id', 'qualification')),
  path text not null, file_name text not null, mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 5242880), created_at timestamptz not null default now(), primary key (user_id, kind));
create table public.provider_decisions (
  id bigint generated always as identity primary key, user_id uuid not null references public.provider_profiles(user_id) on delete cascade,
  decision text not null check (decision in ('approve', 'reject')), reason text, decided_by uuid not null references auth.users(id), decided_at timestamptz not null default now());
alter table public.provider_profiles enable row level security; alter table public.provider_documents enable row level security; alter table public.provider_decisions enable row level security;
revoke all on public.provider_profiles, public.provider_documents, public.provider_decisions from public, anon, authenticated;
grant select on public.provider_profiles, public.provider_documents, public.provider_decisions to authenticated;
-- Reads only; every write goes through the functions below, so a coach can never set their own status.
create policy own_or_admin on public.provider_profiles for select to authenticated using (coach_private.caller_email_verified() and (user_id = auth.uid() or coach_private.is_provider_admin()));
create policy own_or_admin on public.provider_documents for select to authenticated using (coach_private.caller_email_verified() and (user_id = auth.uid() or coach_private.is_provider_admin()));
create policy admin_only on public.provider_decisions for select to authenticated using (coach_private.is_provider_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('provider-documents', 'provider-documents', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf']) on conflict (id) do nothing;
create policy provider_docs_read on storage.objects for select to authenticated using (bucket_id = 'provider-documents' and coach_private.caller_email_verified() and (split_part(name, '/', 1) = auth.uid()::text or coach_private.is_provider_admin()));
create policy provider_docs_write on storage.objects for insert to authenticated with check (bucket_id = 'provider-documents' and coach_private.caller_email_verified() and split_part(name, '/', 1) = auth.uid()::text
  and not exists (select 1 from public.provider_profiles p where p.user_id = auth.uid() and p.status in ('pending', 'verified')));
create policy provider_docs_delete on storage.objects for delete to authenticated using (bucket_id = 'provider-documents' and split_part(name, '/', 1) = auth.uid()::text
  and not exists (select 1 from public.provider_profiles p where p.user_id = auth.uid() and p.status in ('pending', 'verified')));

create function public.get_my_provider_profile() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.provider_profiles; begin
  if not coach_private.caller_email_verified() then raise exception 'Verify your email first' using errcode = '42501'; end if;
  select * into p from public.provider_profiles where user_id = auth.uid();
  return jsonb_build_object('status', coalesce(p.status, 'draft'), 'reason', p.reason, 'submitted_at', p.submitted_at, 'decided_at', p.decided_at, 'is_admin', coach_private.is_provider_admin(),
    'profile', jsonb_build_object('name', coalesce(p.name, ''), 'phone', coalesce(p.phone, ''), 'bio', coalesce(p.bio, ''), 'sports', coalesce(to_jsonb(p.sports), '[]'::jsonb), 'experience', p.experience_years),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('kind', d.kind, 'file_name', d.file_name)) from public.provider_documents d where d.user_id = auth.uid()), '[]'::jsonb));
end $$;
create function public.save_provider_profile(p_name text, p_phone text, p_bio text, p_sports text[], p_experience integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s text[]; begin
  if not coach_private.caller_email_verified() then raise exception 'Verify your email first' using errcode = '42501'; end if;
  if exists (select 1 from public.provider_profiles where user_id = auth.uid() and status in ('pending', 'verified')) then raise exception 'Profile is locked' using errcode = '42501'; end if;
  select coalesce(array_agg(btrim(x)) filter (where btrim(x) <> ''), '{}') into s from unnest(coalesce(p_sports, '{}')) x;
  if btrim(coalesce(p_name, '')) = '' or coalesce(p_phone, '') !~ '^[0-9]{10}$' or char_length(btrim(coalesce(p_bio, ''))) < 20 or cardinality(s) = 0 or p_experience is null or p_experience not between 0 and 60
    then raise exception 'Invalid profile' using errcode = '22023'; end if;
  insert into public.provider_profiles (user_id, name, phone, bio, sports, experience_years) values (auth.uid(), btrim(p_name), p_phone, btrim(p_bio), s, p_experience)
  on conflict (user_id) do update set name = excluded.name, phone = excluded.phone, bio = excluded.bio, sports = excluded.sports, experience_years = excluded.experience_years, updated_at = now();
  return public.get_my_provider_profile();
end $$;
create function public.register_provider_document(p_kind text, p_path text, p_file_name text, p_mime text, p_size integer) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not coach_private.caller_email_verified() then raise exception 'Verify your email first' using errcode = '42501'; end if;
  if not exists (select 1 from public.provider_profiles where user_id = auth.uid() and status in ('draft', 'rejected')) then raise exception 'Save your profile first, or it is locked' using errcode = '42501'; end if;
  if split_part(p_path, '/', 1) <> auth.uid()::text or not exists (select 1 from storage.objects where bucket_id = 'provider-documents' and name = p_path) then raise exception 'Unknown document' using errcode = '22023'; end if;
  insert into public.provider_documents (user_id, kind, path, file_name, mime_type, size_bytes) values (auth.uid(), p_kind, p_path, left(p_file_name, 200), p_mime, p_size)
  on conflict (user_id, kind) do update set path = excluded.path, file_name = excluded.file_name, mime_type = excluded.mime_type, size_bytes = excluded.size_bytes, created_at = now();
  return public.get_my_provider_profile();
end $$;
create function public.submit_provider_profile() returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.provider_profiles; begin
  if not coach_private.caller_email_verified() then raise exception 'Verify your email first' using errcode = '42501'; end if;
  select * into p from public.provider_profiles where user_id = auth.uid() for update;
  if not found or p.status not in ('draft', 'rejected') then raise exception 'Cannot submit' using errcode = '42501'; end if;
  if p.name = '' or p.phone = '' or p.bio = '' or cardinality(p.sports) = 0 or p.experience_years is null or (select count(*) from public.provider_documents where user_id = auth.uid()) <> 2
    then raise exception 'Profile incomplete' using errcode = '22023'; end if;
  update public.provider_profiles set status = 'pending', reason = null, submitted_at = now(), decided_at = null, decided_by = null where user_id = auth.uid();
  return public.get_my_provider_profile();
end $$;
create function public.list_provider_review_queue() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not coach_private.is_provider_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'name', p.name, 'phone', p.phone, 'bio', p.bio, 'sports', to_jsonb(p.sports), 'experience', p.experience_years, 'submitted_at', p.submitted_at,
    'documents', (select jsonb_agg(jsonb_build_object('kind', d.kind, 'path', d.path, 'file_name', d.file_name)) from public.provider_documents d where d.user_id = p.user_id)) order by p.submitted_at)
    from public.provider_profiles p where p.status = 'pending'), '[]'::jsonb);
end $$;
-- Approve only a pending profile. Reject (with a reason) a pending profile, or revoke a verified one (used by C1.3 LP-11).
create function public.decide_provider_profile(p_user uuid, p_decision text, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare p public.provider_profiles; begin
  if not coach_private.is_provider_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into p from public.provider_profiles where user_id = p_user for update;
  if not found or p_decision not in ('approve', 'reject') or (p_decision = 'approve' and p.status <> 'pending') or (p_decision = 'reject' and p.status not in ('pending', 'verified'))
    or (p_decision = 'reject' and btrim(coalesce(p_reason, '')) = '') then raise exception 'Cannot decide' using errcode = '22023'; end if;
  update public.provider_profiles set status = case when p_decision = 'approve' then 'verified' else 'rejected' end, reason = case when p_decision = 'reject' then btrim(p_reason) end,
    decided_at = now(), decided_by = auth.uid() where user_id = p_user;
  insert into public.provider_decisions (user_id, decision, reason, decided_by) values (p_user, p_decision, case when p_decision = 'reject' then btrim(p_reason) end, auth.uid());
end $$;
revoke all on function public.get_my_provider_profile(), public.save_provider_profile(text, text, text, text[], integer), public.register_provider_document(text, text, text, text, integer),
  public.submit_provider_profile(), public.list_provider_review_queue(), public.decide_provider_profile(uuid, text, text) from public, anon;
grant execute on function public.get_my_provider_profile(), public.save_provider_profile(text, text, text, text[], integer), public.register_provider_document(text, text, text, text, integer),
  public.submit_provider_profile(), public.list_provider_review_queue(), public.decide_provider_profile(uuid, text, text) to authenticated;
commit;
