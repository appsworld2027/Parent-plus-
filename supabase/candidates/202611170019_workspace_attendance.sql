-- Private staff-aware attendance conversion. Disposable tests only; no public
-- RPC, role grants or changes to the installed001–014 authority model.
begin;
do $$ begin
 if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170018-staff-candidate') then raise exception 'Private015–018 candidates required';end if;
 if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170019-attendance-candidate') and (
  exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='coach_private' and c.relname='workspace_attendance_submissions')
  or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in ('workspace_class_attendance','workspace_save_attendance'))
 ) then raise exception 'Untracked attendance objects; inspect before applying';end if;
end $$;
create table if not exists coach_private.workspace_attendance_submissions (
 workspace_id uuid not null,session_id uuid not null,actor_user_id uuid not null,actor_membership_id uuid not null,request_id uuid not null,
 expected_revision integer not null check(expected_revision>=0),revision integer not null check(revision=expected_revision+1),
 context text not null,payload_hash bytea not null check(octet_length(payload_hash)=32),marks jsonb not null check(jsonb_typeof(marks)='array' and jsonb_array_length(marks) between 1 and 500),
 actor_display_snapshot text not null check(length(trim(actor_display_snapshot)) between 1 and 100),submitted_at timestamptz not null default clock_timestamp(),
 primary key(workspace_id,actor_membership_id,request_id),unique(session_id,revision),
 foreign key(session_id,workspace_id) references coach_private.workspace_session_links(session_id,workspace_id),
 foreign key(actor_membership_id,workspace_id,actor_user_id) references coach_private.workspace_memberships(id,workspace_id,user_id)
);
drop trigger if exists attendance_submissions_immutable on coach_private.workspace_attendance_submissions;
create trigger attendance_submissions_immutable before update or delete on coach_private.workspace_attendance_submissions for each row execute function coach_private.workspace_audit_immutable();
alter table coach_private.workspace_attendance_submissions enable row level security;
revoke all on coach_private.workspace_attendance_submissions from public,anon,authenticated,service_role;

create or replace function coach_private.workspace_class_attendance(workspace uuid,session uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare c public.class_sessions;roster jsonb;context text;
begin
 perform coach_private.workspace_resource_lock(workspace);
 if not coach_private.workspace_class_access(workspace,session,'roster.read') then raise exception 'Class unavailable' using errcode='42501';end if;
 select * into c from public.class_sessions s where s.id=session;
 context:=c.batch_id::text||'|'||to_char(c.starts_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')||'|'||to_char(c.ends_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')||'|'||c.status;
 select coalesce(jsonb_agg(jsonb_build_object('student_id',r.student_id,'name',r.name,'age_years',r.age_years,'proficiency_level',r.proficiency_level,'status',a.status) order by r.name,r.student_id),'[]'::jsonb) into roster
  from coach_private.workspace_class_roster(workspace,session) r left join public.attendance a on a.session_id=session and a.student_id=r.student_id and a.academy_id=c.academy_id;
 return jsonb_build_object('revision',c.attendance_revision,'context',context,'students',roster);
end $$;

create or replace function coach_private.workspace_save_attendance(workspace uuid,session uuid,expected_revision integer,expected_context text,request uuid,marks jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid;c public.class_sessions;item jsonb;student uuid;seen uuid[]:='{}';eligible uuid[];canonical jsonb;hash bytea;context text;prior coach_private.workspace_attendance_submissions;display text;roster_count integer;
begin
 actor:=coach_private.workspace_resource_lock(workspace);
 if not coach_private.workspace_class_access(workspace,session,'attendance.write') then raise exception 'Attendance unavailable' using errcode='42501';end if;
 select * into c from public.class_sessions s where s.id=session for update;
 if request is null or expected_revision is null or expected_revision<0 or expected_context is null or length(expected_context)>200 or jsonb_typeof(marks) is distinct from 'array' then raise exception 'Check attendance submission' using errcode='22023';end if;
 if jsonb_array_length(marks) not between 1 and 500 then raise exception 'Choose between 1 and 500 students' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(marks) loop
  if jsonb_typeof(item)<>'object' then raise exception 'Check attendance entry' using errcode='22023';end if;
  if exists(select 1 from jsonb_object_keys(item) k where k not in ('student_id','status')) then raise exception 'Check attendance entry fields' using errcode='22023';end if;
  student:=(item->>'student_id')::uuid;
  if student is null or student=any(seen) or item->>'status' is null or item->>'status' not in ('present','late','absent') then raise exception 'Check attendance entry' using errcode='22023';end if;
  seen:=array_append(seen,student);
 end loop;
 select jsonb_agg(jsonb_build_object('student_id',(value->>'student_id')::uuid,'status',value->>'status') order by (value->>'student_id')::uuid) into canonical from jsonb_array_elements(marks);
 hash:=sha256(convert_to(jsonb_build_array(session,expected_revision,expected_context,canonical)::text,'UTF8'));
 select * into prior from coach_private.workspace_attendance_submissions s where s.workspace_id=workspace and s.actor_membership_id=actor and s.request_id=request;
 if prior.request_id is not null then
  if prior.payload_hash is distinct from hash then raise exception 'Attendance request changed' using errcode='22023';end if;
  return jsonb_build_object('revision',prior.revision,'marked',jsonb_array_length(prior.marks));
 end if;
 context:=c.batch_id::text||'|'||to_char(c.starts_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')||'|'||to_char(c.ends_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')||'|'||c.status;
 if c.attendance_revision<>expected_revision or context<>expected_context then raise exception 'Class or attendance changed; reopen before saving' using errcode='40001';end if;
 select coalesce(array_agg(r.student_id order by r.student_id),'{}'::uuid[]) into eligible from coach_private.workspace_class_roster(workspace,session) r;
 -- A partially mapped legacy roster must fail closed rather than silently omit
 -- a child. Mixed old/new write paths remain an activation blocker.
 select count(*) into roster_count from public.enrolments e join public.students s on s.id=e.student_id and s.academy_id=e.academy_id join public.academies a on a.id=e.academy_id
  where e.academy_id=c.academy_id and e.batch_id=c.batch_id and s.archived_at is null and e.starts_on<=(c.starts_at at time zone a.timezone)::date and (e.ends_on is null or e.ends_on>=(c.starts_at at time zone a.timezone)::date);
 if roster_count<>cardinality(eligible) then raise exception 'Class roster mapping unavailable' using errcode='42501';end if;
 if cardinality(seen)<>cardinality(eligible) or not seen @> eligible or not eligible @> seen then raise exception 'Roster changed; reopen and mark every enrolled student' using errcode='22023';end if;
 select coalesce(p.display_name,i.display_name) into display from coach_private.coach_identities i left join coach_private.workspace_staff_profiles p on p.membership_id=actor and p.workspace_id=workspace where i.user_id=auth.uid();
 if display is null then raise exception 'Teaching profile unavailable' using errcode='42501';end if;
 insert into public.attendance(academy_id,session_id,student_id,batch_id,status,updated_at)
  select c.academy_id,c.id,(value->>'student_id')::uuid,c.batch_id,value->>'status',clock_timestamp() from jsonb_array_elements(canonical)
  on conflict(session_id,student_id) do update set status=excluded.status,updated_at=excluded.updated_at;
 update public.class_sessions s set attendance_revision=s.attendance_revision+1 where s.id=c.id returning s.attendance_revision into c.attendance_revision;
 insert into coach_private.workspace_attendance_submissions(workspace_id,session_id,actor_user_id,actor_membership_id,request_id,expected_revision,revision,context,payload_hash,marks,actor_display_snapshot)
  values(workspace,c.id,auth.uid(),actor,request,expected_revision,c.attendance_revision,context,hash,canonical,display);
 return jsonb_build_object('revision',c.attendance_revision,'marked',cardinality(seen));
exception when invalid_text_representation then raise exception 'Check attendance entry' using errcode='22023';
end $$;
revoke all on function coach_private.workspace_class_attendance(uuid,uuid),coach_private.workspace_save_attendance(uuid,uuid,integer,text,uuid,jsonb) from public,anon,authenticated,service_role;
insert into coach_private.workspace_foundation_revisions(version) values('202611170019-attendance-candidate') on conflict do nothing;
commit;
