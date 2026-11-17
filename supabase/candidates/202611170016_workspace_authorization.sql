-- F2 permission-kernel CANDIDATE. Isolated tests only; NOT a live update.
-- No client execution grants, new public RPCs, or changes to legacy authority.
begin;
do $$ begin
  if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170015-f1-candidate') then
    raise exception 'The isolated F1 candidate is required';
  end if;
  if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170016-f2-kernel-candidate') and (
    exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='coach_private' and c.relname in ('workspace_batch_branches','workspace_feedback_links','workspace_history_lookup'))
    or exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in (
      'workspace_actor_eligible','workspace_active_membership','workspace_has_role','workspace_has_capability','workspace_own_contexts','workspace_class_access',
      'workspace_feedback_access','workspace_finance_access','workspace_lock_actor','workspace_assert_class_write','workspace_revoke_membership','workspace_revoke_assignment'))
  ) then raise exception 'Untracked F2 kernel objects found; inspect before applying candidate'; end if;
end $$;

-- A missing branch mapping means a workspace-level resource, never any branch.
create table if not exists coach_private.workspace_batch_branches (
  batch_id uuid primary key,workspace_id uuid not null,branch_id uuid not null,
  foreign key(batch_id,workspace_id) references coach_private.workspace_batch_links(batch_id,workspace_id),
  foreign key(branch_id,workspace_id) references coach_private.workspace_branches(id,workspace_id)
);
-- Legacy author accounts are known; their historical membership/teacher is not.
-- Future scoped feedback APIs must write membership provenance atomically.
create table if not exists coach_private.workspace_feedback_links (
  observation_id uuid primary key,academy_id uuid not null,workspace_id uuid not null,author_user_id uuid not null references auth.users(id),
  author_membership_id uuid,provenance text not null check(provenance in ('legacy_account','membership_write')),
  check((provenance='legacy_account' and author_membership_id is null) or (provenance='membership_write' and author_membership_id is not null)),
  foreign key(observation_id,academy_id) references public.observations(id,academy_id),
  foreign key(academy_id,workspace_id) references coach_private.academy_workspace_links(academy_id,workspace_id),
  foreign key(author_membership_id,workspace_id,author_user_id) references coach_private.workspace_memberships(id,workspace_id,user_id)
);
create index if not exists workspace_history_lookup on coach_private.workspace_history_grants(workspace_id,membership_id,student_id) where revoked_at is null;
alter table coach_private.workspace_batch_branches enable row level security;
alter table coach_private.workspace_feedback_links enable row level security;
revoke all on coach_private.workspace_batch_branches,coach_private.workspace_feedback_links from public,anon,authenticated,service_role;
insert into coach_private.workspace_feedback_links(observation_id,academy_id,workspace_id,author_user_id,provenance)
  select o.id,o.academy_id,l.workspace_id,o.author_id,'legacy_account' from public.observations o
  join coach_private.academy_workspace_links l on l.academy_id=o.academy_id on conflict(observation_id) do nothing;

-- VOLATILE + wall-clock time: a long transaction must not freeze expiry or use
-- a pre-lock snapshot after waiting for a revocation. Never accept a user ID.
-- Higher isolation could retain a pre-revocation snapshot. Until explicitly
-- supported, deny those transactions instead of silently weakening revocation.
create or replace function coach_private.workspace_actor_eligible() returns boolean language sql volatile security definer set search_path='' as $$
  select current_setting('transaction_isolation')='read committed' and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at<=clock_timestamp()
    and length(trim(u.email))>0 and not coalesce(u.is_anonymous,false) and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=clock_timestamp()))
$$;
create or replace function coach_private.workspace_active_membership(workspace uuid) returns uuid language sql volatile security definer set search_path='' as $$
  select m.id from coach_private.workspace_memberships m where m.workspace_id=workspace and m.user_id=auth.uid()
    and coach_private.workspace_actor_eligible() and m.status='active' and m.accepted_at<=clock_timestamp()
    and m.effective_from<=clock_timestamp() and (m.valid_until is null or m.valid_until>clock_timestamp()) and m.ended_at is null
$$;
create or replace function coach_private.workspace_has_role(workspace uuid,wanted text,branch uuid default null) returns boolean language sql volatile security definer set search_path='' as $$
  select (branch is null or exists(select 1 from coach_private.workspace_branches b where b.id=branch and b.workspace_id=workspace and b.archived_at is null))
    and exists(select 1 from coach_private.workspace_role_grants g where g.workspace_id=workspace
      and g.membership_id=coach_private.workspace_active_membership(workspace) and g.role_code=wanted
      and g.valid_from<=clock_timestamp() and (g.valid_until is null or g.valid_until>clock_timestamp()) and g.revoked_at is null
      and (g.scope='workspace' or (branch is not null and g.branch_id=branch)))
$$;
create or replace function coach_private.workspace_has_capability(workspace uuid,wanted text,branch uuid default null) returns boolean language sql volatile security definer set search_path='' as $$
  select (branch is null or exists(select 1 from coach_private.workspace_branches b where b.id=branch and b.workspace_id=workspace and b.archived_at is null))
    and exists(select 1 from coach_private.workspace_capability_grants g where g.workspace_id=workspace
      and g.membership_id=coach_private.workspace_active_membership(workspace) and g.capability=wanted
      and g.valid_from<=clock_timestamp() and (g.valid_until is null or g.valid_until>clock_timestamp()) and g.revoked_at is null
      and (g.branch_id is null or (branch is not null and g.branch_id=branch)))
$$;
create or replace function coach_private.workspace_own_contexts()
returns table(workspace_id uuid,kind text,name text,membership_id uuid) language sql volatile security definer set search_path='' as $$
  select w.id,w.kind,w.name,m.id from coach_private.teaching_workspaces w join coach_private.workspace_memberships m on m.workspace_id=w.id
  where m.id=coach_private.workspace_active_membership(w.id) order by w.name,w.id
$$;

-- These are academic decisions, NOT media consent or Parent delivery checks.
-- Management can see schedules but does not imply teaching/feedback authorship.
create or replace function coach_private.workspace_class_access(workspace uuid,session uuid,operation text) returns boolean language plpgsql volatile security definer set search_path='' as $$
declare c record; member uuid;
begin
  member:=coach_private.workspace_active_membership(workspace);
  if member is null or operation is null or operation not in ('manage','roster.read','attendance.write','feedback.write') then return false; end if;
  select s.*,bb.branch_id into c from public.class_sessions s
    join coach_private.workspace_session_links sl on sl.session_id=s.id and sl.academy_id=s.academy_id and sl.workspace_id=workspace
    join coach_private.workspace_batch_links bl on bl.batch_id=s.batch_id and bl.academy_id=s.academy_id and bl.workspace_id=workspace
    join public.batches b on b.id=s.batch_id and b.academy_id=s.academy_id
    left join coach_private.workspace_batch_branches bb on bb.batch_id=b.id and bb.workspace_id=workspace
    where s.id=session and b.archived_at is null;
  if not found or (c.branch_id is not null and not exists(select 1 from coach_private.workspace_branches b where b.id=c.branch_id and b.workspace_id=workspace and b.archived_at is null)) then return false; end if;
  if operation='manage' then return coach_private.workspace_has_role(workspace,'owner',c.branch_id)
    or coach_private.workspace_has_role(workspace,'admin',c.branch_id) or coach_private.workspace_has_role(workspace,'branch_manager',c.branch_id); end if;
  if operation='roster.read' and coach_private.workspace_class_access(workspace,session,'manage') then return true; end if;
  if c.status='cancelled' or not exists(select 1 from coach_private.coach_identities i where i.user_id=auth.uid())
    or not coach_private.workspace_has_role(workspace,'instructor',c.branch_id) then return false; end if;
  return exists(select 1 from coach_private.workspace_teaching_assignments a where a.workspace_id=workspace and a.membership_id=member
    and (a.session_id=c.id or a.batch_id=c.batch_id) and a.revoked_at is null
    and c.starts_at>=a.teaches_from and (a.teaches_until is null or c.ends_at<=a.teaches_until)
    and a.access_from<=clock_timestamp() and (a.access_until is null or a.access_until>clock_timestamp())
    and (operation='roster.read' or a.feedback_write_until is null or a.feedback_write_until>clock_timestamp()));
end $$;
create or replace function coach_private.workspace_feedback_access(workspace uuid,observation uuid,operation text) returns boolean language plpgsql volatile security definer set search_path='' as $$
declare o record; member uuid; branch uuid;
begin
  member:=coach_private.workspace_active_membership(workspace);
  if member is null or operation is null or operation not in ('read','edit','correct') then return false; end if;
  select n.*,l.author_membership_id,l.provenance into o from public.observations n join coach_private.workspace_feedback_links l
    on l.observation_id=n.id and l.academy_id=n.academy_id and l.author_user_id=n.author_id and l.workspace_id=workspace where n.id=observation;
  if not found then return false; end if;
  select bb.branch_id into branch from coach_private.workspace_batch_links bl left join coach_private.workspace_batch_branches bb on bb.batch_id=bl.batch_id and bb.workspace_id=workspace
    where bl.batch_id=o.batch_id and bl.workspace_id=workspace and bl.academy_id=o.academy_id;
  if not found or (branch is not null and not exists(select 1 from coach_private.workspace_branches b where b.id=branch and b.workspace_id=workspace and b.archived_at is null)) then return false; end if;
  if operation='correct' then return o.status='recorded' and (coach_private.workspace_has_role(workspace,'owner',branch)
    or coach_private.workspace_has_capability(workspace,'feedback.correct',branch)); end if;
  if operation='read' and (coach_private.workspace_has_role(workspace,'owner',branch)
    or coach_private.workspace_has_role(workspace,'admin',branch) or coach_private.workspace_has_role(workspace,'branch_manager',branch)) then return true; end if;
  if o.author_id=auth.uid() and o.author_membership_id=member and o.provenance='membership_write' and o.session_id is not null
    and coach_private.workspace_class_access(workspace,o.session_id,case when operation='edit' then 'feedback.write' else 'roster.read' end) then return true; end if;
  if operation='edit' or o.status<>'recorded' or not coach_private.workspace_has_capability(workspace,'history.read',branch) then return false; end if;
  -- A group note cannot leak an ungranted student's text through one recipient.
  return exists(select 1 from public.observation_recipients r where r.observation_id=o.id and r.academy_id=o.academy_id)
    and not exists(select 1 from public.observation_recipients r where r.observation_id=o.id and r.academy_id=o.academy_id and not exists(
      select 1 from coach_private.workspace_history_grants h join coach_private.workspace_student_links sl on sl.student_id=h.student_id and sl.workspace_id=h.workspace_id
      where h.workspace_id=workspace and h.membership_id=member and h.student_id=r.student_id and h.allow_feedback and h.revoked_at is null
        and h.expires_at>clock_timestamp() and o.recorded_at>=h.recorded_from and o.recorded_at<h.recorded_until));
end $$;
create or replace function coach_private.workspace_finance_access(workspace uuid,branch uuid default null) returns boolean language sql volatile security definer set search_path='' as $$
  select coach_private.workspace_has_role(workspace,'owner',branch) or coach_private.workspace_has_role(workspace,'finance',branch)
$$;

-- Candidate authority lock protocol: legacy child/academy/request locks FIRST
-- when a converted endpoint needs them, THEN workspace, THEN actor account.
-- All scoped authority mutations must acquire this same workspace anchor before
-- touching membership/grant/assignment rows. No row-trigger lock inversion.
-- Exclusive workspace lock is deliberately conservative, not a scale claim.
create or replace function coach_private.workspace_lock_actor(workspace uuid) returns uuid language plpgsql volatile security definer set search_path='' as $$
declare member uuid;
begin
  if coach_private.workspace_active_membership(workspace) is null then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
  perform 1 from coach_private.teaching_workspaces w where w.id=workspace for update;
  perform 1 from auth.users u where u.id=auth.uid() for share;
  member:=coach_private.workspace_active_membership(workspace);
  if member is null then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
  return member;
end $$;
create or replace function coach_private.workspace_assert_class_write(workspace uuid,session uuid,operation text) returns void language plpgsql volatile security definer set search_path='' as $$
begin
  perform coach_private.workspace_lock_actor(workspace);
  if operation is null or operation not in ('attendance.write','feedback.write') or not coach_private.workspace_class_access(workspace,session,operation) then
    raise exception 'Workspace operation not permitted' using errcode='42501';
  end if;
end $$;
-- First lifecycle endpoints deliberately owner-only. Delegated grant/transfer/
-- invitation APIs are separate work; a staff.manage flag cannot invent them.
create or replace function coach_private.workspace_revoke_membership(workspace uuid,target uuid) returns void language plpgsql volatile security definer set search_path='' as $$
declare actor uuid; subject record;
begin
  actor:=coach_private.workspace_lock_actor(workspace);
  if not coach_private.workspace_has_role(workspace,'owner') then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
  select m.* into subject from coach_private.workspace_memberships m where m.id=target and m.workspace_id=workspace for update;
  if not found then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
  if subject.status in ('left','revoked','expired') then return; end if;
  if exists(select 1 from coach_private.workspace_role_grants g where g.membership_id=target and g.workspace_id=workspace and g.role_code='owner'
    and g.revoked_at is null and g.valid_from<=clock_timestamp() and (g.valid_until is null or g.valid_until>clock_timestamp())) and not exists(
      select 1 from coach_private.workspace_memberships m join coach_private.workspace_role_grants g on g.membership_id=m.id and g.workspace_id=m.workspace_id
      join auth.users u on u.id=m.user_id where m.workspace_id=workspace and m.id<>target and m.status='active' and m.accepted_at<=clock_timestamp()
        and m.effective_from<=clock_timestamp() and (m.valid_until is null or m.valid_until>clock_timestamp()) and m.ended_at is null
        and g.role_code='owner' and g.revoked_at is null and g.valid_from<=clock_timestamp() and (g.valid_until is null or g.valid_until>clock_timestamp())
        and u.email_confirmed_at<=clock_timestamp() and length(trim(u.email))>0 and not coalesce(u.is_anonymous,false) and u.deleted_at is null
        and (u.banned_until is null or u.banned_until<=clock_timestamp())
    ) then raise exception 'An accepted active owner must remain' using errcode='42501'; end if;
  update coach_private.workspace_memberships set status='revoked',ended_at=greatest(clock_timestamp(),effective_from) where id=target;
  insert into coach_private.workspace_audit_events(workspace_id,actor_user_id,actor_membership_id,subject_membership_id,event_kind,source)
    values(workspace,auth.uid(),actor,target,'membership_revoked','actor_action');
end $$;
create or replace function coach_private.workspace_revoke_assignment(workspace uuid,target uuid) returns void language plpgsql volatile security definer set search_path='' as $$
declare actor uuid; subject record;
begin
  actor:=coach_private.workspace_lock_actor(workspace);
  if not coach_private.workspace_has_role(workspace,'owner') then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
  select a.* into subject from coach_private.workspace_teaching_assignments a where a.id=target and a.workspace_id=workspace for update;
  if not found then raise exception 'Workspace operation not permitted' using errcode='42501'; end if;
  if subject.revoked_at is not null then return; end if;
  update coach_private.workspace_teaching_assignments set revoked_at=greatest(clock_timestamp(),access_from) where id=target;
  insert into coach_private.workspace_audit_events(workspace_id,actor_user_id,actor_membership_id,subject_assignment_id,event_kind,source)
    values(workspace,auth.uid(),actor,target,'assignment_changed','actor_action');
end $$;
-- Private functions have no client or service execution path until every
-- legacy/public/API/storage path is converted and tested together.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in (
    'workspace_actor_eligible','workspace_active_membership','workspace_has_role','workspace_has_capability','workspace_own_contexts','workspace_class_access',
    'workspace_feedback_access','workspace_finance_access','workspace_lock_actor','workspace_assert_class_write','workspace_revoke_membership','workspace_revoke_assignment') loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
  end loop;
end $$;
insert into coach_private.workspace_foundation_revisions(version) values('202611170016-f2-kernel-candidate') on conflict do nothing;
commit;
