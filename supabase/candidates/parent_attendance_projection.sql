-- Source concept: ParentPlus PR7 / 380adba parent-feed sessions.
-- Destination-native isolated candidate only. No live migration/public grant.
begin;
create or replace function coach_private.parent_attendance_sessions(
 target_child uuid,target_day date,after_start timestamptz default null,after_id uuid default null
) returns table(session_id uuid,academy_id uuid,academy_name text,batch_name text,starts_at timestamptz,ends_at timestamptz,session_status text,attendance_status text)
language plpgsql volatile security definer set search_path='' as $$
begin
 if not coach_private.workspace_actor_eligible() then raise exception 'Parent operation not permitted' using errcode='42501'; end if;
 if target_child is null or target_day is null or (after_start is null)<>(after_id is null) then
   raise exception 'Invalid session request' using errcode='22023';
 end if;
 return query
 select c.id,a.id,a.name,b.name,c.starts_at,c.ends_at,c.status,t.status
 from public.parent_coach_links l
 join public.parent_families f on f.id=l.family_id and f.owner_id=auth.uid()
 join public.family_children child on child.id=l.child_id and child.family_id=f.id and child.archived_at is null
 join public.parent_connection_requests r on r.id=l.approval_request_id and r.status='approved'
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
commit;
