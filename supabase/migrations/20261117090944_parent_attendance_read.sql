-- Approved-parent attendance read. Additive after installed 001–014.
-- No staff workspace candidates, data backfill, identity merge or legacy permission changes.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$ begin
 if not exists(select 1 from coach_private.schema_migrations where version='202611160014') then raise exception 'Installed update014 is required'; end if;
end $$;
create or replace function coach_private.parent_attendance_actor_eligible() returns boolean
language sql volatile security definer set search_path='' as $$
 select current_setting('transaction_isolation')='read committed' and exists(
  select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at<=clock_timestamp()
   and length(trim(u.email))>0 and not coalesce(u.is_anonymous,false) and u.deleted_at is null
   and (u.banned_until is null or u.banned_until<=clock_timestamp()))
$$;
revoke all on function coach_private.parent_attendance_actor_eligible() from public,anon,authenticated,service_role;
create or replace function coach_private.parent_attendance_sessions(
 target_child uuid,target_day date,after_start timestamptz default null,after_id uuid default null
) returns table(session_id uuid,academy_id uuid,academy_name text,batch_name text,starts_at timestamptz,ends_at timestamptz,session_status text,attendance_status text)
language plpgsql volatile security definer set search_path='' as $$
begin
 if not coach_private.parent_attendance_actor_eligible() then raise exception 'Parent operation not permitted' using errcode='42501'; end if;
 if target_child is null or target_day is null or (after_start is null)<>(after_id is null) then
   raise exception 'Invalid session request' using errcode='22023';
 end if;
 return query
 select c.id,a.id,a.name,b.name,c.starts_at,c.ends_at,c.status,t.status
 from public.parent_coach_links l
 join public.parent_families f on f.id=l.family_id and f.owner_id=auth.uid()
 join public.family_children child on child.id=l.child_id and child.family_id=f.id and child.archived_at is null
 join public.parent_connection_requests r on r.id=l.approval_request_id and r.status='approved'
   and r.link_id=l.id and r.child_id=l.child_id and r.family_id=l.family_id
   and r.student_id=l.student_id and r.academy_id=l.academy_id and r.parent_user_id=l.parent_user_id
 join public.students s on s.id=l.student_id and s.academy_id=l.academy_id and s.archived_at is null
 join public.academies a on a.id=l.academy_id
 join public.enrolments e on e.student_id=s.id and e.academy_id=a.id
 join public.batches b on b.id=e.batch_id and b.academy_id=a.id and b.archived_at is null
 join public.class_sessions c on c.academy_id=a.id and c.batch_id=b.id
 left join public.attendance t on t.academy_id=a.id and t.session_id=c.id and t.student_id=s.id
 where l.child_id=target_child and l.parent_user_id=auth.uid() and l.active
   and l.guardian_email=coach_private.verified_guardian_email(auth.uid())
   and (c.starts_at at time zone a.timezone)::date=target_day
   and e.starts_on<=target_day and (e.ends_on is null or e.ends_on>=target_day)
   and (after_start is null or (c.starts_at,c.id)>(after_start,after_id))
 order by c.starts_at,c.id limit 50;
end $$;
revoke all on function coach_private.parent_attendance_sessions(uuid,date,timestamptz,uuid) from public,anon,authenticated,service_role;
create or replace function public.get_parent_attendance_sessions(
 target_child uuid,target_day date,after_start timestamptz default null,after_id uuid default null
) returns table(session_id uuid,academy_id uuid,academy_name text,batch_name text,starts_at timestamptz,ends_at timestamptz,session_status text,attendance_status text)
language sql volatile security definer set search_path='' as $$
 select * from coach_private.parent_attendance_sessions(target_child,target_day,after_start,after_id)
$$;
revoke all on function public.get_parent_attendance_sessions(uuid,date,timestamptz,uuid) from public,anon,service_role;
grant execute on function public.get_parent_attendance_sessions(uuid,date,timestamptz,uuid) to authenticated;
-- The existing platform event trigger runs as its owner; API clients need no execute privilege.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke execute on function public.rls_auto_enable() from public,anon,authenticated';
 end if;
end $$;
insert into coach_private.schema_migrations(version) values('20261117090944') on conflict do nothing;
notify pgrst,'reload schema';
commit;
