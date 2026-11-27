-- CANDIDATE, NOT AN APPLIED MIGRATION. Provider contract C1.3 (LP-03..LP-12). Depends on 202611270022 and 202611270023.
-- "Published" means ready and approved to be offered; nothing here makes a listing visible outside its owner and admins (founder D-03).
-- Validated only on a disposable database (tests/provider-listing-database.test.ts). Do NOT run on the hosted project without founder authorization.
begin;
create table public.provider_listings (
  user_id uuid primary key references public.provider_profiles(user_id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80), description text not null check (char_length(description) between 20 and 1000),
  sport text not null check (char_length(sport) between 1 and 60), age_group text not null check (char_length(age_group) between 1 and 60),
  location text not null check (char_length(location) between 1 and 120), price_note text not null check (char_length(price_note) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'published')), published_at timestamptz, updated_at timestamptz not null default now());
alter table public.provider_listings enable row level security;
revoke all on public.provider_listings from public, anon, authenticated; grant select on public.provider_listings to authenticated;
create policy own_or_admin on public.provider_listings for select to authenticated using (coach_private.caller_email_verified() and (user_id = auth.uid() or coach_private.is_provider_admin()));

-- LP-11: leaving Verified (rejected or revoked) unpublishes at once, in the same transaction as the decision.
create function coach_private.unpublish_on_unverify() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'verified' and new.status <> 'verified' then update public.provider_listings set status = 'draft', published_at = null where user_id = new.user_id and status = 'published'; end if;
  return new;
end $$;
create trigger unpublish_on_unverify after update of status on public.provider_profiles for each row execute function coach_private.unpublish_on_unverify();

create function public.get_my_provider_listing() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l public.provider_listings; begin
  if not coach_private.caller_email_verified() then raise exception 'Verify your email first' using errcode = '42501'; end if;
  select * into l from public.provider_listings where user_id = auth.uid();
  return jsonb_build_object('is_admin', coach_private.is_provider_admin(), 'eligible', exists (select 1 from public.provider_profiles where user_id = auth.uid() and status = 'verified'), 'status', coalesce(l.status, 'draft'), 'published_at', l.published_at,
    'listing', jsonb_build_object('title', coalesce(l.title, ''), 'description', coalesce(l.description, ''), 'sport', coalesce(l.sport, ''), 'age_group', coalesce(l.age_group, ''), 'location', coalesce(l.location, ''), 'price_note', coalesce(l.price_note, '')));
end $$;
-- No function takes a user id: every write acts on the caller's own row only (LP-12).
create function public.save_provider_listing(p_title text, p_description text, p_sport text, p_age_group text, p_location text, p_price_note text) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not coach_private.caller_email_verified() or not exists (select 1 from public.provider_profiles where user_id = auth.uid() and status = 'verified') then raise exception 'Get verified first' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 3 and 80 or char_length(btrim(coalesce(p_description, ''))) not between 20 and 1000 or btrim(coalesce(p_sport, '')) = '' or btrim(coalesce(p_age_group, '')) = ''
    or btrim(coalesce(p_location, '')) = '' or btrim(coalesce(p_price_note, '')) = '' or char_length(p_sport) > 60 or char_length(p_age_group) > 60 or char_length(p_location) > 120 or char_length(p_price_note) > 120
    then raise exception 'Invalid listing' using errcode = '22023'; end if;
  insert into public.provider_listings (user_id, title, description, sport, age_group, location, price_note) values (auth.uid(), btrim(p_title), btrim(p_description), btrim(p_sport), btrim(p_age_group), btrim(p_location), btrim(p_price_note))
  on conflict (user_id) do update set title = excluded.title, description = excluded.description, sport = excluded.sport, age_group = excluded.age_group, location = excluded.location, price_note = excluded.price_note, updated_at = now();
  return public.get_my_provider_listing();
end $$;
create function public.publish_provider_listing() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not coach_private.caller_email_verified() or not exists (select 1 from public.provider_profiles where user_id = auth.uid() and status = 'verified') then raise exception 'Get verified first' using errcode = '42501'; end if;
  update public.provider_listings set status = 'published', published_at = coalesce(published_at, now()) where user_id = auth.uid();
  if not found then raise exception 'Save a draft first' using errcode = '22023'; end if;
  return public.get_my_provider_listing();
end $$;
create function public.unpublish_provider_listing() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not coach_private.caller_email_verified() then raise exception 'Verify your email first' using errcode = '42501'; end if;
  update public.provider_listings set status = 'draft', published_at = null where user_id = auth.uid();
  return public.get_my_provider_listing();
end $$;
create function public.list_provider_listings() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not coach_private.is_provider_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', l.user_id, 'owner_name', p.name, 'title', l.title, 'description', l.description, 'sport', l.sport, 'age_group', l.age_group,
    'location', l.location, 'price_note', l.price_note, 'published_at', l.published_at) order by l.published_at) from public.provider_listings l join public.provider_profiles p using (user_id) where l.status = 'published'), '[]'::jsonb);
end $$;
revoke all on function public.get_my_provider_listing(), public.save_provider_listing(text, text, text, text, text, text), public.publish_provider_listing(), public.unpublish_provider_listing(), public.list_provider_listings() from public, anon;
grant execute on function public.get_my_provider_listing(), public.save_provider_listing(text, text, text, text, text, text), public.publish_provider_listing(), public.unpublish_provider_listing(), public.list_provider_listings() to authenticated;
commit;
