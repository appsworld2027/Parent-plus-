-- PRIVATE learning-context candidate. Disposable tests only, after015–020.
-- No public API, AI execution, Parent publication or deployed migration marker.
begin;
do $$ begin
 if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170020-feedback-candidate') then
  raise exception 'Private015–020 candidates required';
 end if;
 if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611180021-learning-candidate') and (
  exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='coach_private' and c.relname like 'learning_%')
  or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in
   ('workspace_learning_actor','workspace_learning_replay','workspace_learning_finish','workspace_publish_curriculum','workspace_save_learning_plan','workspace_place_learner','workspace_assess_learning','workspace_learning_context'))
 ) then raise exception 'Untracked learning objects; inspect before applying';end if;
end $$;

create table if not exists coach_private.learning_curriculum_versions (
 workspace_id uuid not null references coach_private.teaching_workspaces(id),curriculum_id uuid not null,version integer not null check(version>0),
 title text not null check(length(trim(title)) between 1 and 200),author_user_id uuid not null,author_membership_id uuid not null,
 created_at timestamptz not null default clock_timestamp(),primary key(workspace_id,curriculum_id,version),
 foreign key(author_membership_id,workspace_id,author_user_id) references coach_private.workspace_memberships(id,workspace_id,user_id)
);
create table if not exists coach_private.learning_stages (
 workspace_id uuid not null,curriculum_id uuid not null,version integer not null,stage_id uuid not null,position integer not null check(position between 1 and 20),
 title text not null check(length(trim(title)) between 1 and 200),primary key(workspace_id,curriculum_id,version,stage_id),unique(workspace_id,curriculum_id,version,position),
 foreign key(workspace_id,curriculum_id,version) references coach_private.learning_curriculum_versions(workspace_id,curriculum_id,version)
);
create table if not exists coach_private.learning_objectives (
 workspace_id uuid not null,curriculum_id uuid not null,version integer not null,stage_id uuid not null,objective_id uuid not null,
 position integer not null check(position between 1 and 20),title text not null check(length(trim(title)) between 1 and 200),
 primary key(workspace_id,curriculum_id,version,objective_id),unique(workspace_id,curriculum_id,version,objective_id,stage_id),unique(workspace_id,curriculum_id,version,stage_id,position),
 foreign key(workspace_id,curriculum_id,version,stage_id) references coach_private.learning_stages(workspace_id,curriculum_id,version,stage_id)
);
create table if not exists coach_private.learning_placements (
 workspace_id uuid not null,student_id uuid not null,curriculum_id uuid not null,revision integer not null check(revision>0),
 version integer not null,stage_id uuid not null,session_id uuid not null,effective_at timestamptz not null,
 reason text not null check(length(trim(reason)) between 1 and 1000),actor_user_id uuid not null,actor_membership_id uuid not null,
 created_at timestamptz not null default clock_timestamp(),primary key(workspace_id,student_id,curriculum_id,revision),unique(workspace_id,student_id,curriculum_id,revision,version,stage_id),
 foreign key(student_id,workspace_id) references coach_private.workspace_student_links(student_id,workspace_id),
 foreign key(session_id,workspace_id) references coach_private.workspace_session_links(session_id,workspace_id),
 foreign key(workspace_id,curriculum_id,version,stage_id) references coach_private.learning_stages(workspace_id,curriculum_id,version,stage_id),
 foreign key(actor_membership_id,workspace_id,actor_user_id) references coach_private.workspace_memberships(id,workspace_id,user_id)
);
create index if not exists learning_placements_context on coach_private.learning_placements(workspace_id,student_id,curriculum_id,version,effective_at desc,revision desc);
create table if not exists coach_private.learning_class_plans (
 workspace_id uuid not null,session_id uuid not null,revision integer not null check(revision>0),curriculum_id uuid not null,version integer not null,
 content text not null check(length(trim(content)) between 1 and 4000),actor_user_id uuid not null,actor_membership_id uuid not null,
 created_at timestamptz not null default clock_timestamp(),primary key(workspace_id,session_id,revision),
 unique(workspace_id,session_id,revision,curriculum_id,version),
 foreign key(session_id,workspace_id) references coach_private.workspace_session_links(session_id,workspace_id),
 foreign key(workspace_id,curriculum_id,version) references coach_private.learning_curriculum_versions(workspace_id,curriculum_id,version),
 foreign key(actor_membership_id,workspace_id,actor_user_id) references coach_private.workspace_memberships(id,workspace_id,user_id)
);
create table if not exists coach_private.learning_plan_objectives (
 workspace_id uuid not null,session_id uuid not null,plan_revision integer not null,curriculum_id uuid not null,version integer not null,objective_id uuid not null,
 primary key(workspace_id,session_id,plan_revision,objective_id),
 foreign key(workspace_id,session_id,plan_revision,curriculum_id,version) references coach_private.learning_class_plans(workspace_id,session_id,revision,curriculum_id,version),
 foreign key(workspace_id,curriculum_id,version,objective_id) references coach_private.learning_objectives(workspace_id,curriculum_id,version,objective_id)
);
-- Existing immutable feedback identities need a composite workspace key for
-- structural references, independently of function-side validation.
create unique index if not exists learning_feedback_workspace on coach_private.workspace_feedback_links(observation_id,workspace_id);
create table if not exists coach_private.learning_assessments (
 workspace_id uuid not null,student_id uuid not null,curriculum_id uuid not null,version integer not null,objective_id uuid not null,
 revision integer not null check(revision>0),session_id uuid not null,plan_revision integer not null,placement_revision integer not null,stage_id uuid not null,
 feedback_id uuid not null,feedback_revision integer not null,state text not null check(state in ('observed','practising','achieved','withdrawn')),
 explanation text not null check(length(trim(explanation)) between 1 and 1000),observed_at timestamptz not null,
 actor_user_id uuid not null,actor_membership_id uuid not null,created_at timestamptz not null default clock_timestamp(),
 primary key(workspace_id,student_id,curriculum_id,version,objective_id,revision),
 foreign key(student_id,workspace_id) references coach_private.workspace_student_links(student_id,workspace_id),
 foreign key(workspace_id,session_id,plan_revision,objective_id) references coach_private.learning_plan_objectives(workspace_id,session_id,plan_revision,objective_id),
 foreign key(workspace_id,session_id,plan_revision,curriculum_id,version) references coach_private.learning_class_plans(workspace_id,session_id,revision,curriculum_id,version),
 foreign key(workspace_id,curriculum_id,version,objective_id,stage_id) references coach_private.learning_objectives(workspace_id,curriculum_id,version,objective_id,stage_id),
 foreign key(workspace_id,student_id,curriculum_id,placement_revision,version,stage_id) references coach_private.learning_placements(workspace_id,student_id,curriculum_id,revision,version,stage_id),
 foreign key(feedback_id,workspace_id) references coach_private.workspace_feedback_links(observation_id,workspace_id),
 foreign key(feedback_id,feedback_revision) references public.observation_versions(observation_id,revision),
 foreign key(actor_membership_id,workspace_id,actor_user_id) references coach_private.workspace_memberships(id,workspace_id,user_id)
);
create index if not exists learning_assessments_context on coach_private.learning_assessments(workspace_id,student_id,curriculum_id,version,observed_at desc,objective_id,revision desc);
create table if not exists coach_private.learning_receipts (
 workspace_id uuid not null,membership_id uuid not null,request_id uuid not null,
 operation text not null check(operation in ('curriculum','plan','placement','assessment')),
 payload_hash bytea not null check(octet_length(payload_hash)=32),result jsonb not null check(jsonb_typeof(result)='object'),
 created_at timestamptz not null default clock_timestamp(),primary key(workspace_id,membership_id,request_id),
 foreign key(membership_id,workspace_id) references coach_private.workspace_memberships(id,workspace_id)
);
do $$ declare tab text;begin
 foreach tab in array array['learning_curriculum_versions','learning_stages','learning_objectives','learning_placements','learning_class_plans','learning_plan_objectives','learning_assessments','learning_receipts'] loop
  execute format('alter table coach_private.%I enable row level security',tab);
  execute format('revoke all on coach_private.%I from public,anon,authenticated,service_role',tab);
  execute format('drop trigger if exists learning_immutable on coach_private.%I',tab);
  execute format('create trigger learning_immutable before update or delete on coach_private.%I for each row execute function coach_private.workspace_audit_immutable()',tab);
 end loop;
end $$;

-- Hold the existing authority/resource anchor throughout validation/projection.
-- Management can plan/place learners but never becomes teaching authorship.
create or replace function coach_private.workspace_learning_actor(workspace uuid,session uuid,student uuid,operation text)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare member uuid;
begin
 member:=coach_private.workspace_resource_lock(workspace);
 if operation is null or operation not in ('read','manage','teach') or not (
  (operation='read' and coach_private.workspace_class_access(workspace,session,'roster.read')) or
  (operation='manage' and (coach_private.workspace_class_access(workspace,session,'manage') or coach_private.workspace_class_access(workspace,session,'feedback.write'))) or
  (operation='teach' and coach_private.workspace_class_access(workspace,session,'feedback.write'))
 ) then raise exception 'Learning context unavailable' using errcode='42501';end if;
 if operation<>'read' and not exists(select 1 from public.class_sessions c where c.id=session and c.status in ('scheduled','completed')) then raise exception 'Learning context unavailable' using errcode='42501';end if;
 if student is not null and not exists(select 1 from coach_private.workspace_class_roster(workspace,session) r where r.student_id=student) then
  raise exception 'Learning context unavailable' using errcode='42501';
 end if;
 return member;
end $$;
create or replace function coach_private.workspace_learning_replay(workspace uuid,member uuid,request uuid,kind text,payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare prior coach_private.learning_receipts;
begin
 if request is null then raise exception 'Request identifier required' using errcode='22023';end if;
 select * into prior from coach_private.learning_receipts r where r.workspace_id=workspace and r.membership_id=member and r.request_id=request;
 if found then
  if prior.operation<>kind or prior.payload_hash<>sha256(convert_to(payload::text,'UTF8')) then raise exception 'Learning request changed' using errcode='22023';end if;
  return prior.result;
 end if;
 return null;
end $$;
create or replace function coach_private.workspace_learning_finish(workspace uuid,member uuid,request uuid,kind text,payload jsonb,result jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 insert into coach_private.learning_receipts(workspace_id,membership_id,request_id,operation,payload_hash,result)
 values(workspace,member,request,kind,sha256(convert_to(payload::text,'UTF8')),result);
 return result;
end $$;

create or replace function coach_private.workspace_publish_curriculum(workspace uuid,curriculum uuid,expected integer,request uuid,name text,definitions jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare member uuid;payload jsonb;prior jsonb;current_version integer;stage jsonb;goal jsonb;stage_position integer:=0;goal_position integer;total integer:=0;ids uuid[]:='{}';stage_ids uuid[]:='{}';
begin
 member:=coach_private.workspace_resource_lock(workspace);
 if not (coach_private.workspace_has_role(workspace,'owner',null) or coach_private.workspace_has_role(workspace,'admin',null)) then raise exception 'Curriculum management unavailable' using errcode='42501';end if;
 payload:=jsonb_build_array(curriculum,expected,name,definitions);
 prior:=coach_private.workspace_learning_replay(workspace,member,request,'curriculum',payload);if prior is not null then return prior;end if;
 if curriculum is null or expected is null or expected<0 or expected>=2147483647 or name is null or length(trim(name)) not between 1 and 200
  or definitions is null or jsonb_typeof(definitions)<>'array' then raise exception 'Check curriculum details' using errcode='22023';end if;
 if jsonb_array_length(definitions) not between 1 and 20 then raise exception 'Use1–20curriculum stages' using errcode='22023';end if;
 select coalesce(max(v.version),0) into current_version from coach_private.learning_curriculum_versions v where v.workspace_id=workspace and v.curriculum_id=curriculum;
 if current_version<>expected then raise exception 'Curriculum changed; refresh' using errcode='40001';end if;
 -- Validate every nested item before inserts; no partial curriculum survives.
 for stage in select x from jsonb_array_elements(definitions) x loop
  if jsonb_typeof(stage)<>'object' or (select count(*) from jsonb_object_keys(stage))<>3 or not stage ?& array['id','title','objectives']
   or coalesce(stage->>'id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or jsonb_typeof(stage->'title')<>'string' or length(trim(stage->>'title')) not between 1 and 200
   or jsonb_typeof(stage->'objectives')<>'array' then raise exception 'Check curriculum stage' using errcode='22023';end if;
  if (stage->>'id')::uuid=any(stage_ids) or jsonb_array_length(stage->'objectives') not between 1 and 20 then raise exception 'Check stage objectives' using errcode='22023';end if;
  stage_ids:=array_append(stage_ids,(stage->>'id')::uuid);
  for goal in select x from jsonb_array_elements(stage->'objectives') x loop
   if jsonb_typeof(goal)<>'object' or (select count(*) from jsonb_object_keys(goal))<>2 or not goal ?& array['id','title']
    or coalesce(goal->>'id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(goal->'title')<>'string' or length(trim(goal->>'title')) not between 1 and 200 then raise exception 'Check learning objective' using errcode='22023';end if;
   if (goal->>'id')::uuid=any(ids) then raise exception 'Repeated objective' using errcode='22023';end if;
   ids:=array_append(ids,(goal->>'id')::uuid);total:=total+1;
  end loop;
 end loop;
 if total>200 then raise exception 'Use at most200objectives per version' using errcode='22023';end if;
 insert into coach_private.learning_curriculum_versions(workspace_id,curriculum_id,version,title,author_user_id,author_membership_id) values(workspace,curriculum,expected+1,trim(name),auth.uid(),member);
 for stage in select x from jsonb_array_elements(definitions) x loop
  stage_position:=stage_position+1;goal_position:=0;
  insert into coach_private.learning_stages values(workspace,curriculum,expected+1,(stage->>'id')::uuid,stage_position,trim(stage->>'title'));
  for goal in select x from jsonb_array_elements(stage->'objectives') x loop
   goal_position:=goal_position+1;
   insert into coach_private.learning_objectives values(workspace,curriculum,expected+1,(stage->>'id')::uuid,(goal->>'id')::uuid,goal_position,trim(goal->>'title'));
  end loop;
 end loop;
 return coach_private.workspace_learning_finish(workspace,member,request,'curriculum',payload,jsonb_build_object('curriculum_id',curriculum,'version',expected+1));
end $$;

create or replace function coach_private.workspace_save_learning_plan(workspace uuid,session uuid,expected integer,request uuid,curriculum uuid,curriculum_version integer,content_text text,goals uuid[])
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare member uuid;payload jsonb;prior jsonb;current_revision integer;selected uuid[];
begin
 member:=coach_private.workspace_learning_actor(workspace,session,null,'manage');
 if goals is null or cardinality(goals) not between 1 and 50 or array_position(goals,null) is not null then raise exception 'Choose1–50class objectives' using errcode='22023';end if;
 select array_agg(distinct g order by g) into selected from unnest(goals) g;
 if cardinality(selected)<>cardinality(goals) then raise exception 'Repeated class objective' using errcode='22023';end if;
 payload:=jsonb_build_array(session,expected,curriculum,curriculum_version,content_text,selected);
 prior:=coach_private.workspace_learning_replay(workspace,member,request,'plan',payload);if prior is not null then return prior;end if;
 if expected is null or expected<0 or expected>=2147483647 or content_text is null or length(trim(content_text)) not between 1 and 4000 then raise exception 'Check class plan' using errcode='22023';end if;
 if (select count(*) from coach_private.learning_objectives o where o.workspace_id=workspace and o.curriculum_id=curriculum and o.version=curriculum_version and o.objective_id=any(selected))<>cardinality(selected) then raise exception 'Check class objectives' using errcode='22023';end if;
 select coalesce(max(p.revision),0) into current_revision from coach_private.learning_class_plans p where p.workspace_id=workspace and p.session_id=session;
 if expected<>current_revision then raise exception 'Class plan changed; refresh' using errcode='40001';end if;
 insert into coach_private.learning_class_plans(workspace_id,session_id,revision,curriculum_id,version,content,actor_user_id,actor_membership_id) values(workspace,session,expected+1,curriculum,curriculum_version,trim(content_text),auth.uid(),member);
 insert into coach_private.learning_plan_objectives select workspace,session,expected+1,curriculum,curriculum_version,g from unnest(selected) g;
 return coach_private.workspace_learning_finish(workspace,member,request,'plan',payload,jsonb_build_object('revision',expected+1));
end $$;

create or replace function coach_private.workspace_place_learner(workspace uuid,session uuid,student uuid,curriculum uuid,curriculum_version integer,stage uuid,expected integer,request uuid,reason_text text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare member uuid;payload jsonb;prior jsonb;current_revision integer;class_time timestamptz;
begin
 if student is null then raise exception 'Learning context unavailable' using errcode='42501';end if;
 member:=coach_private.workspace_learning_actor(workspace,session,student,'manage');
 payload:=jsonb_build_array(session,student,curriculum,curriculum_version,stage,expected,reason_text);
 prior:=coach_private.workspace_learning_replay(workspace,member,request,'placement',payload);if prior is not null then return prior;end if;
 if expected is null or expected<0 or expected>=2147483647 or reason_text is null or length(trim(reason_text)) not between 1 and 1000 then raise exception 'Enter a placement reason' using errcode='22023';end if;
 if not exists(select 1 from coach_private.learning_stages s where s.workspace_id=workspace and s.curriculum_id=curriculum and s.version=curriculum_version and s.stage_id=stage) then raise exception 'Check curriculum stage' using errcode='22023';end if;
 select coalesce(max(p.revision),0) into current_revision from coach_private.learning_placements p where p.workspace_id=workspace and p.student_id=student and p.curriculum_id=curriculum;
 if expected<>current_revision then raise exception 'Student placement changed; refresh' using errcode='40001';end if;
 select c.starts_at into class_time from public.class_sessions c where c.id=session;
 insert into coach_private.learning_placements(workspace_id,student_id,curriculum_id,revision,version,stage_id,session_id,effective_at,reason,actor_user_id,actor_membership_id)
 values(workspace,student,curriculum,expected+1,curriculum_version,stage,session,class_time,trim(reason_text),auth.uid(),member);
 return coach_private.workspace_learning_finish(workspace,member,request,'placement',payload,jsonb_build_object('revision',expected+1,'stage_id',stage));
end $$;

create or replace function coach_private.workspace_assess_learning(workspace uuid,session uuid,student uuid,feedback uuid,feedback_revision integer,objective uuid,plan_revision integer,expected integer,request uuid,assessment_state text,evidence_text text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare member uuid;payload jsonb;prior jsonb;p coach_private.learning_class_plans;placement coach_private.learning_placements;o public.observations;class_time timestamptz;current_revision integer;previous coach_private.learning_assessments;
begin
 if student is null then raise exception 'Learning context unavailable' using errcode='42501';end if;
 member:=coach_private.workspace_learning_actor(workspace,session,student,'teach');
 select n.* into o from public.observations n join coach_private.workspace_feedback_links l on l.observation_id=n.id and l.workspace_id=workspace
  where n.id=feedback and n.session_id=session and n.status='recorded' and n.author_id=auth.uid() and l.author_membership_id=member and l.provenance='membership_write';
 -- First slice deliberately excludes raw group notes and other teachers' text.
 if o.id is null or (select count(*) from public.observation_recipients r where r.observation_id=feedback)<>1 or not exists(select 1 from public.observation_recipients r where r.observation_id=feedback and r.student_id=student) then raise exception 'Single-child recorded evidence unavailable' using errcode='42501';end if;
 payload:=jsonb_build_array(session,student,feedback,feedback_revision,objective,plan_revision,expected,assessment_state,evidence_text);
 prior:=coach_private.workspace_learning_replay(workspace,member,request,'assessment',payload);if prior is not null then return prior;end if;
 if assessment_state is null or assessment_state not in ('observed','practising','achieved','withdrawn') or evidence_text is null or length(trim(evidence_text)) not between 1 and 1000 or expected is null or expected<0 or expected>=2147483647 then raise exception 'Check learning evidence' using errcode='22023';end if;
 select c.starts_at into class_time from public.class_sessions c where c.id=session;
 if class_time>clock_timestamp() then raise exception 'A future class is not observed evidence' using errcode='22023';end if;
 select * into p from coach_private.learning_class_plans x where x.workspace_id=workspace and x.session_id=session order by x.revision desc limit 1;
 if p.revision is null or p.revision is distinct from plan_revision or o.revision is distinct from feedback_revision then raise exception 'Plan or feedback changed; review again' using errcode='40001';end if;
 if not exists(select 1 from public.observation_versions v where v.observation_id=feedback and v.revision=feedback_revision and v.status='recorded' and v.author_id=auth.uid() and v.recipient_ids=array[student]) then
  raise exception 'Exact teacher-authored child evidence unavailable' using errcode='42501';
 end if;
 select * into placement from coach_private.learning_placements x where x.workspace_id=workspace and x.student_id=student and x.curriculum_id=p.curriculum_id and x.effective_at<=class_time order by x.effective_at desc,x.revision desc limit 1;
 if placement.version is distinct from p.version or not exists(select 1 from coach_private.learning_plan_objectives g join coach_private.learning_objectives d using(workspace_id,curriculum_id,version,objective_id)
  where g.workspace_id=workspace and g.session_id=session and g.plan_revision=p.revision and g.objective_id=objective and d.stage_id=placement.stage_id) then raise exception 'Objective not planned for this learner stage' using errcode='22023';end if;
 select * into previous from coach_private.learning_assessments a where a.workspace_id=workspace and a.student_id=student and a.curriculum_id=p.curriculum_id and a.version=p.version and a.objective_id=objective order by a.revision desc limit 1;
 current_revision:=coalesce(previous.revision,0);
 if expected<>current_revision then raise exception 'Learning evidence changed; refresh' using errcode='40001';end if;
 if assessment_state='withdrawn' and (previous.revision is null or previous.actor_membership_id<>member or previous.feedback_id<>feedback) then
  raise exception 'Only the original assessment author can withdraw its current source' using errcode='42501';
 end if;
 insert into coach_private.learning_assessments(workspace_id,student_id,curriculum_id,version,objective_id,revision,session_id,plan_revision,placement_revision,stage_id,feedback_id,feedback_revision,state,explanation,observed_at,actor_user_id,actor_membership_id)
 values(workspace,student,p.curriculum_id,p.version,objective,expected+1,session,p.revision,placement.revision,placement.stage_id,feedback,feedback_revision,assessment_state,trim(evidence_text),class_time,auth.uid(),member);
 return coach_private.workspace_learning_finish(workspace,member,request,'assessment',payload,jsonb_build_object('revision',expected+1,'state',assessment_state));
end $$;

create or replace function coach_private.workspace_learning_context(workspace uuid,session uuid,student uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare p coach_private.learning_class_plans;placement coach_private.learning_placements;c public.class_sessions;goals jsonb:='[]';evidence jsonb:='[]';missing text[]:='{}';result jsonb;truncated boolean:=false;
begin
 if student is null then raise exception 'Learning context unavailable' using errcode='42501';end if;
 perform coach_private.workspace_learning_actor(workspace,session,student,'read');
 select * into c from public.class_sessions x where x.id=session;
 result:=jsonb_build_object('schema_version',1,'workspace_id',workspace,'session_id',session,'student_id',student,'class_starts_at',c.starts_at,'class_status',c.status);
 select * into p from coach_private.learning_class_plans x where x.workspace_id=workspace and x.session_id=session order by x.revision desc limit 1;
 if p.revision is null then return result||jsonb_build_object('curriculum',null,'plan',null,'placement',null,'objectives','[]'::jsonb,'evidence','[]'::jsonb,'evidence_truncated',false,'missing',jsonb_build_array('class_plan'));end if;
 -- Select dated placement first, then require exact version. Filtering by
 -- version first could silently resurrect a superseded old-version placement.
 select * into placement from coach_private.learning_placements x where x.workspace_id=workspace and x.student_id=student and x.curriculum_id=p.curriculum_id and x.effective_at<=c.starts_at order by x.effective_at desc,x.revision desc limit 1;
 if placement.version is distinct from p.version then placement:=null;missing:=array_append(missing,'stage_placement');
 else
  select coalesce(jsonb_agg(jsonb_build_object('id',g.objective_id,'title',g.title,'stage_id',g.stage_id) order by g.position),'[]'::jsonb) into goals
  from coach_private.learning_plan_objectives l join coach_private.learning_objectives g using(workspace_id,curriculum_id,version,objective_id)
  where l.workspace_id=workspace and l.session_id=session and l.plan_revision=p.revision and g.stage_id=placement.stage_id;
  if jsonb_array_length(goals)=0 then missing:=array_append(missing,'stage_objectives');end if;
  -- These are explicitly teaching-visible, child-only assessment facts. Raw
  -- teacher feedback/history, group text and private family data are excluded.
  select coalesce(jsonb_agg(x.item order by x.observed_at desc,x.objective_id),'[]'::jsonb),coalesce(max(x.total)>10,false) into evidence,truncated from (
   select a.observed_at,a.objective_id,count(*) over() total,jsonb_build_object('objective_id',a.objective_id,'revision',a.revision,'state',a.state,'explanation',a.explanation,
    'feedback_id',a.feedback_id,'feedback_revision',a.feedback_revision,'session_id',a.session_id,'observed_at',a.observed_at) item from (
    select distinct on (a.objective_id) a.* from coach_private.learning_assessments a
    where a.workspace_id=workspace and a.student_id=student and a.curriculum_id=p.curriculum_id and a.version=p.version and a.observed_at<=c.starts_at and a.observed_at<=clock_timestamp()
     and exists(select 1 from jsonb_array_elements(goals) g where (g->>'id')::uuid=a.objective_id)
    order by a.objective_id,a.observed_at desc,a.revision desc
   ) a order by a.observed_at desc,a.objective_id limit 10
  ) x;
 end if;
 return result||jsonb_build_object('curriculum',(select jsonb_build_object('id',v.curriculum_id,'version',v.version,'title',v.title) from coach_private.learning_curriculum_versions v where v.workspace_id=workspace and v.curriculum_id=p.curriculum_id and v.version=p.version),
  'plan',jsonb_build_object('revision',p.revision,'content',p.content),
  'placement',case when placement.revision is not null then jsonb_build_object('revision',placement.revision,'stage_id',placement.stage_id,'stage_title',(select s.title from coach_private.learning_stages s where s.workspace_id=workspace and s.curriculum_id=p.curriculum_id and s.version=p.version and s.stage_id=placement.stage_id)) else null end,
  'objectives',goals,'evidence',evidence,'evidence_truncated',truncated,'missing',to_jsonb(missing));
end $$;

do $$ declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in
 ('workspace_learning_actor','workspace_learning_replay','workspace_learning_finish','workspace_publish_curriculum','workspace_save_learning_plan','workspace_place_learner','workspace_assess_learning','workspace_learning_context') loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
 end loop;
end $$;
insert into coach_private.workspace_foundation_revisions(version) values('202611180021-learning-candidate') on conflict do nothing;
commit;
