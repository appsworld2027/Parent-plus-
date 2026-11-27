-- CANDIDATE, NOT AN APPLIED MIGRATION. Login contract C1.1f (AI-06, AI-09).
-- Purpose: an account whose email is not confirmed can neither create nor read academy data, even if a session
-- exists (for example if hosted "Confirm email" were switched off). Validated only on a disposable database
-- (tests/login-verified-email-candidate.test.ts). Do NOT run on the hosted project without founder authorization.
begin;
create or replace function coach_private.caller_email_verified() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null)
$$;
revoke all on function coach_private.caller_email_verified() from public, anon;
grant execute on function coach_private.caller_email_verified() to authenticated;
grant usage on schema coach_private to authenticated;
-- RESTRICTIVE: combined with the existing own_academy policy; every table that scopes through academies inherits it.
drop policy if exists verified_email_only on public.academies;
create policy verified_email_only on public.academies as restrictive for all to authenticated
  using (coach_private.caller_email_verified()) with check (coach_private.caller_email_verified());
commit;
