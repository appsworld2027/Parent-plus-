-- Private F2 transaction candidate. Disposable/staging tests ONLY, not owner SQL.
-- Does not alter live001–014 RPCs/RLS or enable independent resource records.
begin;
do $$ begin
 if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170016-f2-kernel-candidate') then raise exception 'Isolated F1/F2 kernel required'; end if;
 if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170017-roster-candidate') and (
  exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='coach_private' and c.relname in ('workspace_resource_versions','workspace_resource_receipts'))
  or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in ('workspace_resource_lock','workspace_batch_manage','workspace_resource_replay','workspace_resource_next_revision','workspace_resource_finish','workspace_save_batch','workspace_save_student','workspace_save_class','workspace_class_roster','workspace_student_profile'))
 ) then raise exception 'Untracked workspace roster objects; inspect before applying'; end if;
end $$;
create table if not exists coach_private.workspace_resource_versions (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,student_id uuid unique,batch_id uuid unique,session_id uuid unique,
 revision integer not null check(revision>0),check(num_nonnulls(student_id,batch_id,session_id)=1),
 foreign key(student_id,workspace_id) references coach_private.workspace_student_links(student_id,workspace_id),
 foreign key(batch_id,workspace_id) references coach_private.workspace_batch_links(batch_id,workspace_id),
 foreign key(session_id,workspace_id) references coach_private.workspace_session_links(session_id,workspace_id)
);
create table if not exists coach_private.workspace_resource_receipts (
 workspace_id uuid not null,membership_id uuid not null,request_id uuid not null,
 operation text not null check(operation in ('student','batch','class')),student_id uuid,batch_id uuid,session_id uuid,
 request_hash bytea not null,revision integer not null check(revision>0),created_at timestamptz not null default clock_timestamp(),
 primary key(workspace_id,membership_id,request_id),check(octet_length(request_hash)=32),
 check((operation='student' and student_id is not null and batch_id is null and session_id is null)
  or (operation='batch' and batch_id is not null and student_id is null and session_id is null)
  or (operation='class' and session_id is not null and student_id is null and batch_id is null)),
 foreign key(membership_id,workspace_id) references coach_private.workspace_memberships(id,workspace_id),
 foreign key(student_id,workspace_id) references coach_private.workspace_student_links(student_id,workspace_id),
 foreign key(batch_id,workspace_id) references coach_private.workspace_batch_links(batch_id,workspace_id),
 foreign key(session_id,workspace_id) references coach_private.workspace_session_links(session_id,workspace_id)
);
alter table coach_private.workspace_resource_versions enable row level security;
alter table coach_private.workspace_resource_receipts enable row level security;
revoke all on coach_private.workspace_resource_versions,coach_private.workspace_resource_receipts from public,anon,authenticated,service_role;
insert into coach_private.workspace_resource_versions(workspace_id,student_id,revision) select workspace_id,student_id,1 from coach_private.workspace_student_links on conflict(student_id) do nothing;
insert into coach_private.workspace_resource_versions(workspace_id,batch_id,revision) select workspace_id,batch_id,1 from coach_private.workspace_batch_links on conflict(batch_id) do nothing;
insert into coach_private.workspace_resource_versions(workspace_id,session_id,revision) select workspace_id,session_id,1 from coach_private.workspace_session_links on conflict(session_id) do nothing;

-- Match legacy014 ordering: academy before workspace before actor. All new
-- authority mutations share the workspace anchor. Legacy writes remain gated
-- at release: they do not yet participate in017 revision/receipt semantics.
create or replace function coach_private.workspace_resource_lock(workspace uuid) returns uuid language plpgsql volatile security definer set search_path='' as $$
declare academy uuid;
begin
 if coach_private.workspace_active_membership(workspace) is null then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
 select l.academy_id into academy from coach_private.academy_workspace_links l where l.workspace_id=workspace;
 if academy is null then raise exception 'Workspace resource conversion required' using errcode='42501'; end if;
 perform 1 from public.academies a where a.id=academy for update;
 return coach_private.workspace_lock_actor(workspace);
end $$;
create or replace function coach_private.workspace_batch_manage(workspace uuid,branch uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select coach_private.workspace_has_role(workspace,'owner',branch) or coach_private.workspace_has_role(workspace,'admin',branch)
  or coach_private.workspace_has_role(workspace,'branch_manager',branch)
$$;
create or replace function coach_private.workspace_resource_replay(workspace uuid,member uuid,kind text,target uuid,request uuid,payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare receipt coach_private.workspace_resource_receipts;
begin
 if target is null or request is null then raise exception 'Resource and request identifiers required' using errcode='22023'; end if;
 select * into receipt from coach_private.workspace_resource_receipts r where r.workspace_id=workspace and r.membership_id=member and r.request_id=request;
 if not found then return null; end if;
 if receipt.operation<>kind or coalesce(receipt.student_id,receipt.batch_id,receipt.session_id)<>target
  or receipt.request_hash<>pg_catalog.sha256(pg_catalog.convert_to(payload::text,'UTF8')) then raise exception 'Request details changed' using errcode='22023'; end if;
 return jsonb_build_object('id',target,'revision',receipt.revision);
end $$;
create or replace function coach_private.workspace_resource_next_revision(workspace uuid,kind text,target uuid,expected integer,already_exists boolean)
returns integer language plpgsql volatile security definer set search_path='' as $$
declare current_revision integer;
begin
 if expected is null or expected<0 or expected>=2147483647 then raise exception 'Invalid resource revision' using errcode='22023'; end if;
 select v.revision into current_revision from coach_private.workspace_resource_versions v where v.workspace_id=workspace
  and ((kind='student' and v.student_id=target) or (kind='batch' and v.batch_id=target) or (kind='class' and v.session_id=target));
 if (already_exists and current_revision is null) or (not already_exists and current_revision is not null) or expected<>coalesce(current_revision,0) then
  raise exception 'Resource changed; refresh before saving' using errcode='40001';
 end if;
 return expected+1;
end $$;
create or replace function coach_private.workspace_resource_finish(workspace uuid,member uuid,kind text,target uuid,request uuid,payload jsonb,next_revision integer)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 update coach_private.workspace_resource_versions v set revision=next_revision where v.workspace_id=workspace
  and ((kind='student' and v.student_id=target) or (kind='batch' and v.batch_id=target) or (kind='class' and v.session_id=target));
 if not found then insert into coach_private.workspace_resource_versions(workspace_id,student_id,batch_id,session_id,revision)
  values(workspace,case when kind='student' then target end,case when kind='batch' then target end,case when kind='class' then target end,next_revision); end if;
 insert into coach_private.workspace_resource_receipts(workspace_id,membership_id,request_id,operation,student_id,batch_id,session_id,request_hash,revision)
  values(workspace,member,request,kind,case when kind='student' then target end,case when kind='batch' then target end,case when kind='class' then target end,
   pg_catalog.sha256(pg_catalog.convert_to(payload::text,'UTF8')),next_revision);
 return jsonb_build_object('id',target,'revision',next_revision);
end $$;

-- Scheduling/roster projection deliberately excludes fee fields. Finance APIs
-- retain separate authority; editing a batch never resets its existing fee.
create or replace function coach_private.workspace_save_batch(workspace uuid,target uuid,expected_revision integer,request_id uuid,batch_name text,batch_room text,branch uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare member uuid; academy uuid; old public.batches; old_branch uuid; payload jsonb; receipt jsonb; next_revision integer;
begin
 member:=coach_private.workspace_resource_lock(workspace);
 if not coach_private.workspace_batch_manage(workspace,branch) then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
 select l.academy_id into academy from coach_private.academy_workspace_links l where l.workspace_id=workspace;
 select * into old from public.batches b where b.id=target;
 if old.id is not null then
  if old.academy_id<>academy or not exists(select 1 from coach_private.workspace_batch_links l where l.batch_id=target and l.workspace_id=workspace) then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
  select b.branch_id into old_branch from coach_private.workspace_batch_branches b where b.batch_id=target and b.workspace_id=workspace;
  if not coach_private.workspace_batch_manage(workspace,old_branch) then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
  -- Moving a batch would carry all classes/assignments into another branch.
  if branch is distinct from old_branch then raise exception 'Branch changes require a reviewed transfer' using errcode='42501'; end if;
 end if;
 payload:=jsonb_build_array(expected_revision,batch_name,batch_room,branch);
 receipt:=coach_private.workspace_resource_replay(workspace,member,'batch',target,request_id,payload);if receipt is not null then return receipt; end if;
 if batch_name is null or length(trim(batch_name)) not between 1 and 100 or length(coalesce(batch_room,''))>100 then raise exception 'Check batch details' using errcode='22023'; end if;
 if old.archived_at is not null then raise exception 'Batch archived' using errcode='22023'; end if;
 next_revision:=coach_private.workspace_resource_next_revision(workspace,'batch',target,expected_revision,old.id is not null);
 if old.id is null then
  insert into public.batches(id,academy_id,name,room) values(target,academy,trim(batch_name),trim(coalesce(batch_room,''))) on conflict(id) do nothing;
  if not found then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
  insert into coach_private.workspace_batch_links(batch_id,academy_id,workspace_id) values(target,academy,workspace);
  if branch is not null then insert into coach_private.workspace_batch_branches(batch_id,workspace_id,branch_id) values(target,workspace,branch);end if;
 else update public.batches set name=trim(batch_name),room=trim(coalesce(batch_room,'')) where id=target and academy_id=academy;end if;
 return coach_private.workspace_resource_finish(workspace,member,'batch',target,request_id,payload,next_revision);
end $$;

-- Global student/contact records can span branches. Only workspace owner/admin
-- can change them; teaching/branch assignment alone does not expose contacts.
create or replace function coach_private.workspace_save_student(workspace uuid,target uuid,expected_revision integer,request_id uuid,student_name text,age integer,level text,
 guardian_name text,guardian_email text,guardian_phone text,batch_ids uuid[])
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare member uuid; academy uuid; old public.students; payload jsonb; receipt jsonb; next_revision integer; batch uuid; local_day date; normalized uuid[]; old_contact_email text;
begin
 member:=coach_private.workspace_resource_lock(workspace);
 if not (coach_private.workspace_has_role(workspace,'owner') or coach_private.workspace_has_role(workspace,'admin')) then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
 select l.academy_id into academy from coach_private.academy_workspace_links l where l.workspace_id=workspace;
 select * into old from public.students s where s.id=target;
 if old.id is not null and (old.academy_id<>academy or not exists(select 1 from coach_private.workspace_student_links l where l.student_id=target and l.workspace_id=workspace)) then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
 if batch_ids is null or cardinality(batch_ids)>50 or array_position(batch_ids,null) is not null then raise exception 'Invalid batch selection' using errcode='22023'; end if;
 select coalesce(array_agg(b order by b),'{}'::uuid[]) into normalized from (select distinct unnest(batch_ids) b) selected;
 payload:=jsonb_build_array(expected_revision,student_name,age,level,guardian_name,guardian_email,guardian_phone,normalized);
 receipt:=coach_private.workspace_resource_replay(workspace,member,'student',target,request_id,payload);if receipt is not null then return receipt;end if;
 if student_name is null or length(trim(student_name)) not between 1 and 100 or (age is not null and age not between 0 and 120)
  or level is null or level not in ('unassessed','new','beginner','intermediate','advanced') or length(coalesce(guardian_name,''))>100
  or length(coalesce(guardian_email,''))>320 or length(coalesce(guardian_phone,''))>30
  or (length(trim(coalesce(guardian_name,'')))=0 and (length(trim(coalesce(guardian_email,'')))>0 or length(trim(coalesce(guardian_phone,'')))>0))
  or (length(trim(coalesce(guardian_email,'')))>0 and trim(guardian_email)!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then raise exception 'Check student/contact details' using errcode='22023'; end if;
 if old.archived_at is not null then raise exception 'Student archived' using errcode='22023';end if;
 select lower(nullif(trim(c.email),'')) into old_contact_email from public.student_contacts c where c.academy_id=academy and c.student_id=target and c.is_primary;
 -- The approved Parent may intentionally differ from the saved primary contact.
 -- Only an actual contact-email edit needs the explicit connection review flow.
 if old_contact_email is distinct from lower(nullif(trim(guardian_email),'')) and exists(
  select 1 from public.parent_coach_links l where l.academy_id=academy and l.student_id=target and l.active)
  then raise exception 'Review the existing Parent connection before changing its guardian contact email' using errcode='22023';end if;
 foreach batch in array normalized loop
  if not exists(select 1 from public.batches b join coach_private.workspace_batch_links l on l.batch_id=b.id and l.academy_id=b.academy_id where b.id=batch and l.workspace_id=workspace and b.archived_at is null) then raise exception 'Workspace operation not permitted' using errcode='42501';end if;
  if exists(select 1 from public.enrolments e where e.student_id=target and e.batch_id=batch and e.academy_id=academy and e.ends_on is not null) then raise exception 'Review ended enrolment before rejoining' using errcode='22023';end if;
 end loop;
 next_revision:=coach_private.workspace_resource_next_revision(workspace,'student',target,expected_revision,old.id is not null);
 if old.id is null then
  insert into public.students(id,academy_id,name,age_years,proficiency_level) values(target,academy,trim(student_name),age,level) on conflict(id) do nothing;
  if not found then raise exception 'Workspace operation not permitted' using errcode='42501';end if;
  insert into coach_private.workspace_student_links(student_id,academy_id,workspace_id) values(target,academy,workspace);
 else update public.students set name=trim(student_name),age_years=age,proficiency_level=level where id=target and academy_id=academy;end if;
 if length(trim(coalesce(guardian_name,'')))>0 then
  insert into public.student_contacts(academy_id,student_id,name,email,phone,is_primary) values(academy,target,trim(guardian_name),nullif(trim(guardian_email),''),nullif(trim(guardian_phone),''),true)
   on conflict(student_id) where is_primary do update set name=excluded.name,email=excluded.email,phone=excluded.phone;
 else delete from public.student_contacts where academy_id=academy and student_id=target and is_primary;end if;
 select (clock_timestamp() at time zone a.timezone)::date into local_day from public.academies a where a.id=academy;
 foreach batch in array normalized loop
  insert into public.enrolments(academy_id,student_id,batch_id,starts_on) values(academy,target,batch,local_day) on conflict(academy_id,student_id,batch_id) do nothing;
 end loop;
 return coach_private.workspace_resource_finish(workspace,member,'student',target,request_id,payload,next_revision);
end $$;

create or replace function coach_private.workspace_save_class(workspace uuid,target uuid,expected_revision integer,request_id uuid,batch uuid,begins timestamptz,finishes timestamptz,room text,status text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare member uuid; academy uuid; old public.class_sessions; branch uuid; payload jsonb; receipt jsonb; next_revision integer;
begin
 member:=coach_private.workspace_resource_lock(workspace);
 select l.academy_id into academy from coach_private.academy_workspace_links l where l.workspace_id=workspace;
 select bb.branch_id into branch from public.batches b join coach_private.workspace_batch_links l on l.batch_id=b.id and l.academy_id=b.academy_id
  left join coach_private.workspace_batch_branches bb on bb.batch_id=b.id and bb.workspace_id=workspace
  where b.id=batch and l.workspace_id=workspace and b.archived_at is null;
 if not found or not coach_private.workspace_batch_manage(workspace,branch) then raise exception 'Workspace operation not permitted' using errcode='42501';end if;
 select * into old from public.class_sessions c where c.id=target;
 if old.id is not null and (old.academy_id<>academy or not coach_private.workspace_class_access(workspace,target,'manage')) then raise exception 'Workspace operation not permitted' using errcode='42501';end if;
 payload:=jsonb_build_array(expected_revision,batch,extract(epoch from begins),extract(epoch from finishes),room,status);
 receipt:=coach_private.workspace_resource_replay(workspace,member,'class',target,request_id,payload);if receipt is not null then return receipt;end if;
 if begins is null or finishes is null or not isfinite(begins) or not isfinite(finishes) or finishes<=begins or length(coalesce(room,''))>100
  or status is null or status not in ('scheduled','completed','cancelled') then raise exception 'Check class details' using errcode='22023';end if;
 if old.id is not null and (old.batch_id<>batch or old.starts_at<>begins or old.ends_at<>finishes) and (
  exists(select 1 from public.attendance a where a.session_id=target) or exists(select 1 from public.observations o where o.session_id=target)
  or exists(select 1 from public.class_media m where m.session_id=target)) then raise exception 'Existing class history protects this context; create a replacement' using errcode='22023';end if;
 if old.id is not null and old.batch_id<>batch and exists(select 1 from coach_private.workspace_teaching_assignments a where a.session_id=target and a.revoked_at is null) then raise exception 'Review teaching assignments before changing the batch' using errcode='22023';end if;
 next_revision:=coach_private.workspace_resource_next_revision(workspace,'class',target,expected_revision,old.id is not null);
 if old.id is null then
  insert into public.class_sessions(id,academy_id,batch_id,starts_at,ends_at,room,status) values(target,academy,batch,begins,finishes,trim(coalesce(room,'')),status) on conflict(id) do nothing;
  if not found then raise exception 'Workspace operation not permitted' using errcode='42501';end if;
  insert into coach_private.workspace_session_links(session_id,academy_id,workspace_id) values(target,academy,workspace);
 else update public.class_sessions set batch_id=batch,starts_at=begins,ends_at=finishes,room=trim(coalesce(workspace_save_class.room,'')),status=workspace_save_class.status where id=target and academy_id=academy;end if;
 return coach_private.workspace_resource_finish(workspace,member,'class',target,request_id,payload,next_revision);
end $$;

-- Full profile reads are for global roster management, never a teaching-role
-- shortcut to contact records or a Parent family's private identity/profile.
create or replace function coach_private.workspace_student_profile(workspace uuid,target uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;
begin
 perform coach_private.workspace_resource_lock(workspace);
 if not (coach_private.workspace_has_role(workspace,'owner') or coach_private.workspace_has_role(workspace,'admin')) then raise exception 'Workspace operation not permitted' using errcode='42501';end if;
 select jsonb_build_object(
  'student',jsonb_build_object('id',s.id,'name',s.name,'age_years',s.age_years,'proficiency_level',s.proficiency_level,'archived_at',s.archived_at,'revision',v.revision),
  'primary_contact',(select jsonb_build_object('name',c.name,'email',c.email,'phone',c.phone) from public.student_contacts c where c.student_id=s.id and c.academy_id=s.academy_id and c.is_primary),
  'enrolments',coalesce((select jsonb_agg(jsonb_build_object('batch_id',e.batch_id,'starts_on',e.starts_on,'ends_on',e.ends_on) order by e.batch_id)
   from public.enrolments e join coach_private.workspace_batch_links b on b.batch_id=e.batch_id and b.academy_id=e.academy_id and b.workspace_id=workspace where e.student_id=s.id and e.academy_id=s.academy_id),'[]'::jsonb)) into result
 from public.students s join coach_private.workspace_student_links l on l.student_id=s.id and l.academy_id=s.academy_id and l.workspace_id=workspace
 join coach_private.workspace_resource_versions v on v.student_id=s.id and v.workspace_id=workspace where s.id=target;
 if result is null then raise exception 'Workspace operation not permitted' using errcode='42501';end if;
 return result;
end $$;

create or replace function coach_private.workspace_class_roster(workspace uuid,session uuid)
returns table(student_id uuid,name text,age_years smallint,proficiency_level text) language plpgsql volatile security definer set search_path='' as $$
begin
 -- Pin authority and class context through projection. Without this anchor a
 -- concurrent move could replace an authorized batch between two snapshots.
 perform coach_private.workspace_resource_lock(workspace);
 if not coach_private.workspace_class_access(workspace,session,'roster.read') then raise exception 'Workspace operation not permitted' using errcode='42501';end if;
 return query select s.id,s.name,s.age_years,s.proficiency_level from public.class_sessions c join public.academies a on a.id=c.academy_id
  join public.enrolments e on e.academy_id=c.academy_id and e.batch_id=c.batch_id
  join public.students s on s.id=e.student_id and s.academy_id=e.academy_id
  join coach_private.workspace_student_links l on l.student_id=s.id and l.academy_id=s.academy_id and l.workspace_id=workspace
  where c.id=session and s.archived_at is null and e.starts_on<=(c.starts_at at time zone a.timezone)::date
   and (e.ends_on is null or e.ends_on>=(c.starts_at at time zone a.timezone)::date) order by s.name,s.id;
end $$;
do $$ declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in (
  'workspace_resource_lock','workspace_batch_manage','workspace_resource_replay','workspace_resource_next_revision','workspace_resource_finish','workspace_save_batch','workspace_save_student','workspace_save_class','workspace_class_roster','workspace_student_profile') loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
 end loop;
end $$;
insert into coach_private.workspace_foundation_revisions(version) values('202611170017-roster-candidate') on conflict do nothing;
commit;
