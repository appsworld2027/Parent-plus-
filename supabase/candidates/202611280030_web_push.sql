-- Web push for parents (M2-40). Disposable-test validated; applied to dev project parentplus-dev only (see SESSION_STATE).
-- Browser push subscriptions: one row per browser endpoint, owned by one signed-in parent.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 20 and 1000),
  p256dh text not null check (char_length(p256dh) between 10 and 200),
  auth text not null check (char_length(auth) between 10 and 100),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;

-- Server-only settings (VAPID private key). No policies and no client grants: only the service role can read.
create table if not exists public.push_settings (name text primary key, value text not null);
alter table public.push_settings enable row level security;
revoke all on public.push_settings from public, anon, authenticated;

create or replace function public.save_push_subscription(push_endpoint text, push_p256dh text, push_auth text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  insert into public.push_subscriptions(user_id, endpoint, p256dh, auth) values (auth.uid(), push_endpoint, push_p256dh, push_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;
create or replace function public.remove_push_subscription(push_endpoint text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  delete from public.push_subscriptions where endpoint = push_endpoint and user_id = auth.uid();
end $$;
-- Used by the notify-batch function (service role only): browsers of parents actively linked to a child currently enrolled in the batch.
create or replace function public.push_targets(target_batch uuid)
returns table(endpoint text, p256dh text, auth text) language sql stable security definer set search_path = '' as $$
  select distinct s.endpoint, s.p256dh, s.auth
    from public.batches b
    join public.enrolments e on e.academy_id = b.academy_id and e.batch_id = b.id and (e.ends_on is null or e.ends_on >= current_date)
    join public.parent_coach_links l on l.academy_id = e.academy_id and l.student_id = e.student_id and l.active
    join public.push_subscriptions s on s.user_id = l.parent_user_id
   where b.id = target_batch
$$;
create or replace function public.push_forget(dead_endpoint text) returns void language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions where endpoint = dead_endpoint
$$;
revoke all on function public.save_push_subscription(text,text,text), public.remove_push_subscription(text), public.push_targets(uuid), public.push_forget(text) from public, anon, authenticated;
grant execute on function public.save_push_subscription(text,text,text), public.remove_push_subscription(text) to authenticated;
grant execute on function public.push_targets(uuid), public.push_forget(text) to service_role;
grant select, insert on public.push_settings to service_role;
