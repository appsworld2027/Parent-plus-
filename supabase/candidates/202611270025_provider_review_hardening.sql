-- CANDIDATE (also applied to the dev project as migration provider_review_hardening). Follow-ups from the independent review of C1.2.
-- 1) A decision is bound to the submission the admin saw (p_submitted_at, optional for older callers).
-- 2) Admins can read only submitted profiles (pending, verified, rejected), never someone's unsubmitted draft or its files.
drop function if exists public.decide_provider_profile(uuid, text, text);
create function public.decide_provider_profile(p_user uuid, p_decision text, p_reason text, p_submitted_at timestamptz default null) returns void language plpgsql security definer set search_path = '' as $$
declare p public.provider_profiles; begin
  if not coach_private.is_provider_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into p from public.provider_profiles where user_id = p_user for update;
  if not found or p_user = auth.uid() or p_decision not in ('approve', 'reject') or (p_decision = 'approve' and p.status <> 'pending') or (p_decision = 'reject' and p.status not in ('pending', 'verified'))
    or (p_decision = 'reject' and btrim(coalesce(p_reason, '')) = '') then raise exception 'Cannot decide' using errcode = '22023'; end if;
  if p_submitted_at is not null and p.submitted_at is distinct from p_submitted_at then raise exception 'This profile was resubmitted. Reload the queue.' using errcode = '40001'; end if;
  update public.provider_profiles set status = case when p_decision = 'approve' then 'verified' else 'rejected' end, reason = case when p_decision = 'reject' then btrim(p_reason) end,
    decided_at = now(), decided_by = auth.uid() where user_id = p_user;
  insert into public.provider_decisions (user_id, decision, reason, decided_by) values (p_user, p_decision, case when p_decision = 'reject' then btrim(p_reason) end, auth.uid());
end $$;
revoke all on function public.decide_provider_profile(uuid, text, text, timestamptz) from public, anon; grant execute on function public.decide_provider_profile(uuid, text, text, timestamptz) to authenticated;
drop policy own_or_admin on public.provider_profiles;
create policy own_or_admin on public.provider_profiles for select to authenticated using (coach_private.caller_email_verified() and (user_id = auth.uid() or (coach_private.is_provider_admin() and status <> 'draft')));
drop policy own_or_admin on public.provider_documents;
create policy own_or_admin on public.provider_documents for select to authenticated using (coach_private.caller_email_verified() and (user_id = auth.uid()
  or (coach_private.is_provider_admin() and exists (select 1 from public.provider_profiles p where p.user_id = provider_documents.user_id and p.status <> 'draft'))));
drop policy provider_docs_read on storage.objects;
create policy provider_docs_read on storage.objects for select to authenticated using (bucket_id = 'provider-documents' and coach_private.caller_email_verified() and (split_part(name, '/', 1) = auth.uid()::text
  or (coach_private.is_provider_admin() and exists (select 1 from public.provider_profiles p where p.user_id::text = split_part(objects.name, '/', 1) and p.status <> 'draft'))));
