-- CANDIDATE (also applied to the dev project). Lets an admin see verified providers so they can revoke (decide_provider_profile 'reject' on a Verified profile).
create function public.list_verified_providers() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not coach_private.is_provider_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'name', p.name, 'decided_at', p.decided_at, 'submitted_at', p.submitted_at) order by p.decided_at desc)
    from public.provider_profiles p where p.status = 'verified' and p.user_id <> auth.uid()), '[]'::jsonb);
end $$;
revoke all on function public.list_verified_providers() from public, anon; grant execute on function public.list_verified_providers() to authenticated;
