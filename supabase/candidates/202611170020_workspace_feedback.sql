-- Private class feedback authoring/correction conversion. No public exposure,
-- Parent sharing, provider sends, legacy owner rewrite or live migration marker.
begin;
do $$ begin
 if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170019-attendance-candidate') then raise exception 'Private015–019 candidates required';end if;
 if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170020-feedback-candidate') and (
  exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='coach_private' and c.relname='workspace_feedback_submissions')
  or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in ('workspace_write_feedback','workspace_save_class_feedback','workspace_correct_feedback','workspace_feedback_detail'))
 ) then raise exception 'Untracked feedback objects; inspect before applying';end if;
end $$;
create table if not exists coach_private.workspace_feedback_submissions (
 workspace_id uuid not null,academy_id uuid not null,observation_id uuid not null,editor_user_id uuid not null,editor_membership_id uuid not null,request_id uuid not null,
 revision integer not null check(revision>0),expected_revision integer not null check(expected_revision>=0),payload_hash bytea not null check(octet_length(payload_hash)=32),
 action text not null check(action in ('save','correction')),reason text,previous_snapshot jsonb,snapshot jsonb not null,result jsonb not null,
 author_display_snapshot text check(author_display_snapshot is null or length(trim(author_display_snapshot)) between 1 and 100),
 editor_display_snapshot text check(editor_display_snapshot is null or length(trim(editor_display_snapshot)) between 1 and 100),
 saved_at timestamptz not null default clock_timestamp(),primary key(workspace_id,editor_membership_id,request_id),unique(observation_id,revision),
 check((action='save' and reason is null) or (action='correction' and reason is not null and previous_snapshot is not null and length(trim(reason)) between 1 and 1000)),
 foreign key(academy_id,workspace_id) references coach_private.academy_workspace_links(academy_id,workspace_id),
 foreign key(observation_id,academy_id) references public.observations(id,academy_id),
 foreign key(editor_membership_id,workspace_id,editor_user_id) references coach_private.workspace_memberships(id,workspace_id,user_id)
);
drop trigger if exists feedback_submissions_immutable on coach_private.workspace_feedback_submissions;
create trigger feedback_submissions_immutable before update or delete on coach_private.workspace_feedback_submissions for each row execute function coach_private.workspace_audit_immutable();
alter table coach_private.workspace_feedback_submissions enable row level security;
revoke all on coach_private.workspace_feedback_submissions from public,anon,authenticated,service_role;

-- Both entry points use this same guarded transaction. It is independently
-- authorized and private; a correction cannot impersonate the original teacher.
create or replace function coach_private.workspace_write_feedback(workspace uuid,target uuid,expected_revision integer,request uuid,session uuid,audience_kind text,recipient_ids uuid[],note_text text,desired_status text,correction boolean,correction_reason text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid;academy uuid;c public.class_sessions;existing public.observations;selected uuid[];previous_ids uuid[];eligible uuid[];hash bytea;prior coach_private.workspace_feedback_submissions;next_revision integer;result jsonb;before_state jsonb;after_state jsonb;author_display text;editor_display text;
begin
 actor:=coach_private.workspace_resource_lock(workspace);
 if target is null or correction is null then raise exception 'Feedback unavailable' using errcode='42501';end if;
 select l.academy_id into academy from coach_private.academy_workspace_links l where l.workspace_id=workspace;
 perform pg_advisory_xact_lock(hashtextextended(target::text,0));
 select * into existing from public.observations o where o.id=target for update;
 if existing.id is not null and (existing.academy_id<>academy or not exists(select 1 from coach_private.workspace_feedback_links l where l.observation_id=target and l.workspace_id=workspace)) then raise exception 'Feedback unavailable' using errcode='42501';end if;
 select coalesce(array_agg(r.student_id order by r.student_id),'{}'::uuid[]) into previous_ids from public.observation_recipients r where r.observation_id=target and r.academy_id=academy;
 if correction then
  if existing.id is null or not coach_private.workspace_feedback_access(workspace,target,'correct') then raise exception 'Correction unavailable' using errcode='42501';end if;
  if correction_reason is null or length(trim(correction_reason)) not between 1 and 1000 then raise exception 'Enter a correction reason' using errcode='22023';end if;
  session:=existing.session_id;audience_kind:=existing.audience;recipient_ids:=previous_ids;desired_status:='recorded';
 else
  if existing.id is not null and not coach_private.workspace_feedback_access(workspace,target,'edit') then raise exception 'Feedback unavailable' using errcode='42501';end if;
  if not coach_private.workspace_class_access(workspace,session,'feedback.write') then raise exception 'Feedback unavailable' using errcode='42501';end if;
 end if;
 if request is null or expected_revision is null or expected_revision<0 or note_text is null or length(note_text)>10000 or audience_kind is null or audience_kind not in ('student','batch')
  or desired_status is null or desired_status not in ('draft','recorded') or recipient_ids is null or cardinality(recipient_ids)>500 or array_position(recipient_ids,null) is not null
  or (desired_status='recorded' and (note_text!~'[^[:space:]]' or cardinality(recipient_ids)=0)) or (audience_kind='student' and cardinality(recipient_ids)>1) then raise exception 'Check feedback and selected students' using errcode='22023';end if;
 select coalesce(array_agg(distinct r order by r),'{}'::uuid[]) into selected from unnest(recipient_ids) r;
 if cardinality(selected)<>cardinality(recipient_ids) then raise exception 'Repeated feedback recipient' using errcode='22023';end if;
 hash:=sha256(convert_to(jsonb_build_array(target,expected_revision,session,audience_kind,selected,note_text,desired_status,correction,case when correction then trim(correction_reason) else null end)::text,'UTF8'));
 select * into prior from coach_private.workspace_feedback_submissions s where s.workspace_id=workspace and s.editor_membership_id=actor and s.request_id=request;
 if prior.request_id is not null then
  if prior.payload_hash is distinct from hash then raise exception 'Feedback request changed' using errcode='22023';end if;
  return prior.result;
 end if;
 if expected_revision<>coalesce(existing.revision,0) then raise exception 'Feedback changed; reopen before saving' using errcode='40001';end if;
 if existing.status='recorded' and (desired_status<>'recorded' or session is distinct from existing.session_id or audience_kind<>existing.audience or selected<>previous_ids) then raise exception 'Recorded feedback context and recipients are locked' using errcode='22023';end if;
 if not correction then
  select * into c from public.class_sessions s where s.id=session and s.academy_id=academy;
  if c.id is null then raise exception 'Feedback unavailable' using errcode='42501';end if;
  if existing.status is distinct from 'recorded' then
   select coalesce(array_agg(r.student_id),'{}'::uuid[]) into eligible from coach_private.workspace_class_roster(workspace,session) r;
   if not eligible @> selected then raise exception 'Selected students changed; review recipients' using errcode='22023';end if;
  end if;
 end if;
 if existing.id is not null then
  before_state:=jsonb_build_object('revision',existing.revision,'note',existing.note,'status',existing.status,'audience',existing.audience,'session_id',existing.session_id,'recipients',previous_ids,'author_id',existing.author_id);
 end if;
 select coalesce((select p.display_name from coach_private.workspace_staff_profiles p where p.membership_id=actor and p.workspace_id=workspace),
  (select i.display_name from coach_private.coach_identities i where i.user_id=auth.uid())) into editor_display;
 if existing.id is null then author_display:=editor_display;
 else
  -- Preserve the earliest observed author name, including an explicitly unknown
  -- legacy name. An editor or later profile rename never fills that history in.
  select s.author_display_snapshot into author_display from coach_private.workspace_feedback_submissions s where s.observation_id=target and s.workspace_id=workspace order by s.revision limit 1;
 end if;
 next_revision:=coalesce(existing.revision,0)+1;
 -- Draft recipients reference the observation's batch tuple through an
 -- immediate FK. Clear only after validation and before changing that tuple;
 -- the complete replacement and history still commit atomically.
 if existing.status is distinct from 'recorded' then delete from public.observation_recipients r where r.observation_id=target;end if;
 if existing.id is null then
  insert into public.observations(id,academy_id,author_id,batch_id,session_id,note,status,audience,revision,updated_at,updated_by,recorded_at)
   values(target,academy,auth.uid(),c.batch_id,session,note_text,desired_status,audience_kind,next_revision,clock_timestamp(),auth.uid(),case when desired_status='recorded' then clock_timestamp() else null end);
  insert into coach_private.workspace_feedback_links(observation_id,academy_id,workspace_id,author_user_id,author_membership_id,provenance) values(target,academy,workspace,auth.uid(),actor,'membership_write');
 else
  update public.observations o set note=note_text,status=desired_status,revision=next_revision,updated_at=clock_timestamp(),updated_by=auth.uid(),
   batch_id=case when correction then o.batch_id else c.batch_id end,session_id=session,audience=audience_kind,recorded_at=coalesce(o.recorded_at,case when desired_status='recorded' then clock_timestamp() else null end) where o.id=target;
 end if;
 if existing.status is distinct from 'recorded' then
  insert into public.observation_recipients(academy_id,observation_id,student_id,batch_id) select academy,target,r,c.batch_id from unnest(selected) r;
 end if;
 insert into public.observation_versions(observation_id,academy_id,revision,note,status,audience,recipient_ids,author_id) values(target,academy,next_revision,note_text,desired_status,audience_kind,selected,auth.uid());
 result:=jsonb_build_object('id',target,'revision',next_revision,'status',desired_status);
 after_state:=jsonb_build_object('revision',next_revision,'note',note_text,'status',desired_status,'audience',audience_kind,'session_id',session,'recipients',selected,'author_id',coalesce(existing.author_id,auth.uid()));
 insert into coach_private.workspace_feedback_submissions(workspace_id,academy_id,observation_id,editor_user_id,editor_membership_id,request_id,revision,expected_revision,payload_hash,action,reason,previous_snapshot,snapshot,result,author_display_snapshot,editor_display_snapshot)
  values(workspace,academy,target,auth.uid(),actor,request,next_revision,expected_revision,hash,case when correction then 'correction' else 'save' end,case when correction then trim(correction_reason) else null end,before_state,after_state,result,author_display,editor_display);
 return result;
end $$;

create or replace function coach_private.workspace_save_class_feedback(workspace uuid,target uuid,expected_revision integer,request uuid,session uuid,audience_kind text,recipient_ids uuid[],note_text text,desired_status text)
returns jsonb language sql volatile security definer set search_path='' as $$
 select coach_private.workspace_write_feedback(workspace,target,expected_revision,request,session,audience_kind,recipient_ids,note_text,desired_status,false,null)
$$;
create or replace function coach_private.workspace_correct_feedback(workspace uuid,target uuid,expected_revision integer,request uuid,note_text text,reason text)
returns jsonb language sql volatile security definer set search_path='' as $$
 select coach_private.workspace_write_feedback(workspace,target,expected_revision,request,null,null,null,note_text,'recorded',true,reason)
$$;

create or replace function coach_private.workspace_feedback_detail(workspace uuid,target uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o public.observations;recipients uuid[];versions jsonb;global_manager boolean;
begin
 perform coach_private.workspace_resource_lock(workspace);
 if not coach_private.workspace_feedback_access(workspace,target,'read') then raise exception 'Feedback unavailable' using errcode='42501';end if;
 select * into o from public.observations n where n.id=target;
 select coalesce(array_agg(r.student_id order by r.student_id),'{}'::uuid[]) into recipients from public.observation_recipients r where r.observation_id=target and r.academy_id=o.academy_id;
 global_manager:=coach_private.workspace_has_role(workspace,'owner',null) or coach_private.workspace_has_role(workspace,'admin',null);
 -- Legacy version rows do not retain their class context. A current branch,
 -- author or history grant cannot safely authorize every old draft's contents.
 -- Only global managers receive old versions until per-version scopes exist.
 select coalesce(jsonb_agg(jsonb_build_object('revision',v.revision,'note',v.note,'status',v.status) order by v.revision desc),'[]'::jsonb) into versions from (
  select n.revision,n.note,n.status from public.observation_versions n where n.observation_id=target and n.academy_id=o.academy_id and (global_manager or n.revision=o.revision) order by n.revision desc limit 5
 ) v;
 return jsonb_build_object('id',o.id,'note',o.note,'revision',o.revision,'status',o.status,'audience',o.audience,'session_id',o.session_id,'recipients',recipients,'versions',versions);
end $$;
revoke all on function coach_private.workspace_write_feedback(uuid,uuid,integer,uuid,uuid,text,uuid[],text,text,boolean,text),coach_private.workspace_save_class_feedback(uuid,uuid,integer,uuid,uuid,text,uuid[],text,text),coach_private.workspace_correct_feedback(uuid,uuid,integer,uuid,text,text),coach_private.workspace_feedback_detail(uuid,uuid) from public,anon,authenticated,service_role;
insert into coach_private.workspace_foundation_revisions(version) values('202611170020-feedback-candidate') on conflict do nothing;
commit;
