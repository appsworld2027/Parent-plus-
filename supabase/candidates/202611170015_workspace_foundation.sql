-- F1 CANDIDATE: disposable/staging database tests only. NOT an owner update.
-- Adds private structures and a legacy mapping; does not enable multi-workspace
-- APIs, change old permissions, remove owner uniqueness, or infer who taught.
begin;
do $$ declare tracked boolean:=false; begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611160014') then raise exception 'The tested001–014 schema is required'; end if;
  if to_regclass('coach_private.workspace_foundation_revisions') is not null then
    select exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170015-f1-candidate') into tracked;
  end if;
  if not tracked and (exists(
    select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='coach_private' and c.relname in ('workspace_foundation_revisions','teaching_workspaces','academy_workspace_links','personal_workspace_accounts','coach_identities','workspace_branches','workspace_memberships','workspace_role_grants','workspace_capability_grants','workspace_student_links','workspace_batch_links','workspace_session_links','workspace_teaching_assignments','workspace_history_grants','workspace_invites','workspace_invite_roles','workspace_audit_events','workspace_membership_current','workspace_membership_user','workspace_role_current_global','workspace_role_current_branch','workspace_capability_current_global','workspace_capability_current_branch','workspace_assignment_member','workspace_legacy_audit_once')
  ) or exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname='workspace_audit_immutable')) then
    raise exception 'Untracked workspace foundation objects found; inspect before applying candidate';
  end if;
end $$;
create table if not exists coach_private.workspace_foundation_revisions(version text primary key,installed_at timestamptz not null default now());
create table if not exists coach_private.teaching_workspaces (
  id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('academy','independent')),
  name text not null check(length(trim(name)) between 1 and 100), created_at timestamptz not null default now(),
  unique(id,kind)
);
create table if not exists coach_private.academy_workspace_links (
  academy_id uuid primary key references public.academies(id), workspace_id uuid not null unique,
  kind text not null default 'academy' check(kind='academy'), legacy_owner_id uuid not null references auth.users(id),
  mapped_at timestamptz not null default now(), unique(academy_id,workspace_id),
  foreign key(workspace_id,kind) references coach_private.teaching_workspaces(id,kind)
);
create table if not exists coach_private.personal_workspace_accounts (
  user_id uuid primary key references auth.users(id), workspace_id uuid not null unique,
  kind text not null default 'independent' check(kind='independent'),
  foreign key(workspace_id,kind) references coach_private.teaching_workspaces(id,kind)
);
create table if not exists coach_private.coach_identities (
  user_id uuid primary key references auth.users(id), display_name text not null check(length(trim(display_name)) between 1 and 100),
  created_at timestamptz not null default now()
);
create table if not exists coach_private.workspace_branches (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null,
  kind text not null default 'academy' check(kind='academy'), name text not null check(length(trim(name)) between 1 and 100),
  archived_at timestamptz, unique(id,workspace_id),
  foreign key(workspace_id,kind) references coach_private.teaching_workspaces(id,kind)
);
create table if not exists coach_private.workspace_memberships (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references coach_private.teaching_workspaces(id),
  user_id uuid not null references auth.users(id),
  status text not null check(status in ('pending','active','suspended','left','revoked','expired')),
  source text not null check(source in ('legacy_ownership','accepted_invitation','accepted_join_request','independent_creation')),
  accepted_at timestamptz, effective_from timestamptz not null default now(), valid_until timestamptz, ended_at timestamptz,
  created_at timestamptz not null default now(),
  check(valid_until is null or valid_until>effective_from), check(ended_at is null or ended_at>=effective_from),
  check((status='pending' and accepted_at is null and ended_at is null)
    or (status in ('active','suspended') and accepted_at is not null and ended_at is null)
    or (status in ('left','revoked','expired') and ended_at is not null)),
  unique(id,workspace_id),unique(id,workspace_id,user_id)
);
create unique index if not exists workspace_membership_current on coach_private.workspace_memberships(workspace_id,user_id) where status in ('pending','active','suspended');
create index if not exists workspace_membership_user on coach_private.workspace_memberships(user_id,status,workspace_id);
create table if not exists coach_private.workspace_role_grants (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, membership_id uuid not null, branch_id uuid,
  role_code text not null check(role_code in ('owner','admin','branch_manager','instructor','finance')),
  scope text not null check(scope in ('workspace','branch')), valid_from timestamptz not null default now(),valid_until timestamptz,revoked_at timestamptz,
  source text not null check(source in ('legacy_ownership','explicit_grant')),unique(id,workspace_id),
  check((scope='workspace' and branch_id is null) or (scope='branch' and branch_id is not null)),
  check(role_code not in ('owner','admin') or scope='workspace'),check(role_code<>'branch_manager' or scope='branch'),
  check(valid_until is null or valid_until>valid_from),check(revoked_at is null or revoked_at>=valid_from),
  foreign key(membership_id,workspace_id) references coach_private.workspace_memberships(id,workspace_id),
  foreign key(branch_id,workspace_id) references coach_private.workspace_branches(id,workspace_id)
);
create unique index if not exists workspace_role_current_global on coach_private.workspace_role_grants(membership_id,role_code) where scope='workspace' and revoked_at is null;
create unique index if not exists workspace_role_current_branch on coach_private.workspace_role_grants(membership_id,role_code,branch_id) where scope='branch' and revoked_at is null;
-- Explicit capabilities do not create global account roles. F2 must implement
-- delegation ceilings and actor/assignment checks before exposing any API.
create table if not exists coach_private.workspace_capability_grants (
  id uuid primary key default gen_random_uuid(),workspace_id uuid not null,membership_id uuid not null,branch_id uuid,
  capability text not null check(capability in ('guardian_match.review','feedback.correct','history.read','staff.manage')),unique(id,workspace_id),
  valid_from timestamptz not null default now(),valid_until timestamptz,revoked_at timestamptz,
  check(valid_until is null or valid_until>valid_from),check(revoked_at is null or revoked_at>=valid_from),
  foreign key(membership_id,workspace_id) references coach_private.workspace_memberships(id,workspace_id),
  foreign key(branch_id,workspace_id) references coach_private.workspace_branches(id,workspace_id)
);
create unique index if not exists workspace_capability_current_global on coach_private.workspace_capability_grants(membership_id,capability) where branch_id is null and revoked_at is null;
create unique index if not exists workspace_capability_current_branch on coach_private.workspace_capability_grants(membership_id,capability,branch_id) where branch_id is not null and revoked_at is null;
-- Legacy resource maps keep composite tenant FKs effective while public tables
-- still require academy_id. F2 must replace them with validated workspace FKs
-- before independent-practice learners/classes can be created.
create table if not exists coach_private.workspace_student_links (
  student_id uuid primary key, academy_id uuid not null,workspace_id uuid not null,
  unique(student_id,workspace_id),
  foreign key(student_id,academy_id) references public.students(id,academy_id),
  foreign key(academy_id,workspace_id) references coach_private.academy_workspace_links(academy_id,workspace_id)
);
create table if not exists coach_private.workspace_batch_links (
  batch_id uuid primary key,academy_id uuid not null,workspace_id uuid not null,
  unique(batch_id,workspace_id),
  foreign key(batch_id,academy_id) references public.batches(id,academy_id),
  foreign key(academy_id,workspace_id) references coach_private.academy_workspace_links(academy_id,workspace_id)
);
create table if not exists coach_private.workspace_session_links (
  session_id uuid primary key,academy_id uuid not null,workspace_id uuid not null,
  unique(session_id,workspace_id),
  foreign key(session_id,academy_id) references public.class_sessions(id,academy_id),
  foreign key(academy_id,workspace_id) references coach_private.academy_workspace_links(academy_id,workspace_id)
);
create table if not exists coach_private.workspace_teaching_assignments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null,membership_id uuid not null,batch_id uuid,session_id uuid,
  teaching_role text not null check(teaching_role in ('lead','co_instructor','substitute')),unique(id,workspace_id),
  teaches_from timestamptz not null,teaches_until timestamptz,access_from timestamptz not null,access_until timestamptz,feedback_write_until timestamptz,revoked_at timestamptz,
  check(num_nonnulls(batch_id,session_id)=1),check(teaches_until is null or teaches_until>teaches_from),
  check(access_until is null or access_until>access_from),check(feedback_write_until is null or feedback_write_until>=access_from),
  check(revoked_at is null or revoked_at>=access_from),
  foreign key(membership_id,workspace_id) references coach_private.workspace_memberships(id,workspace_id),
  foreign key(batch_id,workspace_id) references coach_private.workspace_batch_links(batch_id,workspace_id),
  foreign key(session_id,workspace_id) references coach_private.workspace_session_links(session_id,workspace_id)
);
create index if not exists workspace_assignment_member on coach_private.workspace_teaching_assignments(workspace_id,membership_id) where revoked_at is null;
create table if not exists coach_private.workspace_history_grants (
  id uuid primary key default gen_random_uuid(),workspace_id uuid not null,membership_id uuid not null,student_id uuid not null,
  recorded_from timestamptz not null,recorded_until timestamptz not null,expires_at timestamptz not null,
  allow_feedback boolean not null default false,allow_media boolean not null default false,revoked_at timestamptz,
  check(recorded_until>recorded_from),check(allow_feedback or allow_media),
  foreign key(membership_id,workspace_id) references coach_private.workspace_memberships(id,workspace_id),
  foreign key(student_id,workspace_id) references coach_private.workspace_student_links(student_id,workspace_id)
);
create table if not exists coach_private.workspace_invites (
  id uuid primary key default gen_random_uuid(),workspace_id uuid not null,issuer_membership_id uuid not null,
  token_hash text not null unique check(token_hash~'^[0-9a-f]{64}$'),
  intended_email text not null check(intended_email=lower(trim(intended_email)) and length(intended_email)<=320 and intended_email~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  state text not null default 'pending' check(state in ('pending','accepted','revoked','expired')),
  created_at timestamptz not null default now(),expires_at timestamptz not null,
  accepted_at timestamptz,accepted_by uuid references auth.users(id),accepted_membership_id uuid,
  check(expires_at>created_at),check(accepted_at is null or (accepted_at>=created_at and accepted_at<expires_at)),check((state='accepted' and accepted_at is not null and accepted_by is not null and accepted_membership_id is not null)
    or (state<>'accepted' and accepted_at is null and accepted_by is null and accepted_membership_id is null)),
  unique(id,workspace_id),
  foreign key(issuer_membership_id,workspace_id) references coach_private.workspace_memberships(id,workspace_id),
  foreign key(accepted_membership_id,workspace_id,accepted_by) references coach_private.workspace_memberships(id,workspace_id,user_id)
);
create table if not exists coach_private.workspace_invite_roles (
  id uuid primary key default gen_random_uuid(),invite_id uuid not null,workspace_id uuid not null,branch_id uuid,
  role_code text not null check(role_code in ('owner','admin','branch_manager','instructor','finance')),
  check(role_code not in ('owner','admin') or branch_id is null),check(role_code<>'branch_manager' or branch_id is not null),
  foreign key(invite_id,workspace_id) references coach_private.workspace_invites(id,workspace_id),
  foreign key(branch_id,workspace_id) references coach_private.workspace_branches(id,workspace_id)
);
create table if not exists coach_private.workspace_audit_events (
  id uuid primary key default gen_random_uuid(),workspace_id uuid not null references coach_private.teaching_workspaces(id),
  actor_user_id uuid references auth.users(id),actor_membership_id uuid,
  subject_membership_id uuid,subject_role_grant_id uuid,subject_capability_id uuid,subject_assignment_id uuid,
  event_kind text not null check(event_kind in ('legacy_owner_mapped','membership_accepted','membership_revoked','role_changed','capability_changed','assignment_changed','owner_transferred')),
  source text not null check(source in ('legacy_migration','actor_action')),occurred_at timestamptz not null default clock_timestamp(),
  check((source='legacy_migration' and event_kind='legacy_owner_mapped' and actor_user_id is null and actor_membership_id is null)
    or (source='actor_action' and event_kind<>'legacy_owner_mapped' and actor_user_id is not null and actor_membership_id is not null)),
  check(num_nonnulls(subject_membership_id,subject_role_grant_id,subject_capability_id,subject_assignment_id)=1),
  check((event_kind in ('legacy_owner_mapped','membership_accepted','membership_revoked','owner_transferred') and subject_membership_id is not null)
    or (event_kind='role_changed' and subject_role_grant_id is not null)
    or (event_kind='capability_changed' and subject_capability_id is not null)
    or (event_kind='assignment_changed' and subject_assignment_id is not null)),
  foreign key(actor_membership_id,workspace_id,actor_user_id) references coach_private.workspace_memberships(id,workspace_id,user_id),
  foreign key(subject_membership_id,workspace_id) references coach_private.workspace_memberships(id,workspace_id),
  foreign key(subject_role_grant_id,workspace_id) references coach_private.workspace_role_grants(id,workspace_id),
  foreign key(subject_capability_id,workspace_id) references coach_private.workspace_capability_grants(id,workspace_id),
  foreign key(subject_assignment_id,workspace_id) references coach_private.workspace_teaching_assignments(id,workspace_id)
);
create unique index if not exists workspace_legacy_audit_once on coach_private.workspace_audit_events(workspace_id,subject_membership_id) where event_kind='legacy_owner_mapped';
create or replace function coach_private.workspace_audit_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Workspace audit is append-only' using errcode='42501'; end $$;
revoke all on function coach_private.workspace_audit_immutable() from public,anon,authenticated;
drop trigger if exists workspace_audit_no_rewrite on coach_private.workspace_audit_events;
create trigger workspace_audit_no_rewrite before update or delete on coach_private.workspace_audit_events for each row execute function coach_private.workspace_audit_immutable();
-- Nothing here is an application access grant. V2 APIs/RLS come in F2.
do $$ declare tab text; begin
  foreach tab in array array['workspace_foundation_revisions','teaching_workspaces','academy_workspace_links','personal_workspace_accounts','coach_identities','workspace_branches','workspace_memberships','workspace_role_grants','workspace_capability_grants','workspace_student_links','workspace_batch_links','workspace_session_links','workspace_teaching_assignments','workspace_history_grants','workspace_invites','workspace_invite_roles','workspace_audit_events'] loop
    execute format('alter table coach_private.%I enable row level security',tab);
    execute format('revoke all on coach_private.%I from public,anon,authenticated,service_role',tab);
  end loop;
end $$;
-- Detect unexpected pre-existing mappings/ownership changes; never silently adopt.
do $$ begin
  if exists(select 1 from public.academies a join coach_private.academy_workspace_links l on l.academy_id=a.id where l.legacy_owner_id<>a.owner_id) then raise exception 'Legacy ownership changed; review mapping before rerun'; end if;
  if exists(select 1 from public.academies a left join coach_private.academy_workspace_links l on l.academy_id=a.id where l.academy_id is null and exists(select 1 from coach_private.teaching_workspaces w where w.id=a.id)) then raise exception 'Workspace ID collision; inspect before backfill'; end if;
end $$;
insert into coach_private.teaching_workspaces(id,kind,name)
  select a.id,'academy',a.name from public.academies a where not exists(select 1 from coach_private.academy_workspace_links l where l.academy_id=a.id);
insert into coach_private.academy_workspace_links(academy_id,workspace_id,legacy_owner_id)
  select a.id,a.id,a.owner_id from public.academies a on conflict(academy_id) do nothing;
insert into coach_private.workspace_memberships(workspace_id,user_id,status,source,accepted_at)
  select l.workspace_id,l.legacy_owner_id,'active','legacy_ownership',now() from coach_private.academy_workspace_links l
  where not exists(select 1 from coach_private.workspace_memberships m where m.workspace_id=l.workspace_id and m.user_id=l.legacy_owner_id and m.source='legacy_ownership');
insert into coach_private.workspace_role_grants(workspace_id,membership_id,role_code,scope,source)
  select m.workspace_id,m.id,'owner','workspace','legacy_ownership' from coach_private.workspace_memberships m where m.source='legacy_ownership'
  and not exists(select 1 from coach_private.workspace_role_grants r where r.membership_id=m.id and r.role_code='owner' and r.source='legacy_ownership');
insert into coach_private.workspace_student_links(student_id,academy_id,workspace_id)
  select s.id,s.academy_id,l.workspace_id from public.students s join coach_private.academy_workspace_links l on l.academy_id=s.academy_id on conflict(student_id) do nothing;
insert into coach_private.workspace_batch_links(batch_id,academy_id,workspace_id)
  select b.id,b.academy_id,l.workspace_id from public.batches b join coach_private.academy_workspace_links l on l.academy_id=b.academy_id on conflict(batch_id) do nothing;
insert into coach_private.workspace_session_links(session_id,academy_id,workspace_id)
  select s.id,s.academy_id,l.workspace_id from public.class_sessions s join coach_private.academy_workspace_links l on l.academy_id=s.academy_id on conflict(session_id) do nothing;
insert into coach_private.workspace_audit_events(workspace_id,subject_membership_id,event_kind,source)
  select m.workspace_id,m.id,'legacy_owner_mapped','legacy_migration' from coach_private.workspace_memberships m where m.source='legacy_ownership'
  on conflict(workspace_id,subject_membership_id) where event_kind='legacy_owner_mapped' do nothing;
insert into coach_private.workspace_foundation_revisions(version) values('202611170015-f1-candidate') on conflict do nothing;
-- Deliberately no main schema_migrations015 marker, public APIs or owner script.
commit;
