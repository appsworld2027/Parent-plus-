-- Isolated F2 projection candidate only. No owner update or live migration.
begin;
create or replace function coach_private.workspace_class_roster(workspace uuid,session uuid)
returns table(student_id uuid,student_name text)
language plpgsql volatile security definer set search_path='' as $$
begin
 if not coalesce(coach_private.workspace_class_access(workspace,session,'roster.read'),false) then
   raise exception 'Workspace operation not permitted' using errcode='42501';
 end if;
 return query
 select s.id,s.name from public.class_sessions c
 join coach_private.workspace_session_links l on l.session_id=c.id and l.academy_id=c.academy_id and l.workspace_id=workspace
 join public.academies a on a.id=c.academy_id
 join public.enrolments e on e.academy_id=c.academy_id and e.batch_id=c.batch_id
 join public.students s on s.id=e.student_id and s.academy_id=e.academy_id
 where c.id=session and s.archived_at is null
   and e.starts_on<=(c.starts_at at time zone a.timezone)::date
   and (e.ends_on is null or e.ends_on>=(c.starts_at at time zone a.timezone)::date)
 order by s.id;
end $$;
revoke all on function coach_private.workspace_class_roster(uuid,uuid) from public,anon,authenticated,service_role;
commit;
