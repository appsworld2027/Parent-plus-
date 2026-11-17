-- Private staff lifecycle candidate. No public RPC/grants, mail or live SQL.
begin;
do $$ begin
 if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170017-roster-candidate') then raise exception 'Private015–017 candidates required';end if;
 if not exists(select 1 from coach_private.workspace_foundation_revisions where version='202611170018-staff-candidate') and (
  exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='coach_private' and c.relname in ('workspace_staff_offers','workspace_staff_profiles','workspace_staff_events'))
  or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in ('workspace_staff_owner','workspace_staff_accept_lock','workspace_issue_staff_offer','workspace_preview_staff_offer','workspace_accept_staff_offer','workspace_revoke_staff_offer','workspace_assign_teacher','workspace_staff_directory'))
 ) then raise exception 'Untracked staff objects; inspect before applying';end if;
end $$;
create table if not exists coach_private.workspace_staff_offers (
 invite_id uuid primary key,workspace_id uuid not null,kind text not null check(kind in ('staff','ownership')),
 proposal_hash bytea not null check(octet_length(proposal_hash)=32),issuer_role_id uuid not null,issuer_ceiling timestamptz,accept_hash bytea check(accept_hash is null or octet_length(accept_hash)=32),
 foreign key(invite_id,workspace_id) references coach_private.workspace_invites(id,workspace_id),
 foreign key(issuer_role_id,workspace_id) references coach_private.workspace_role_grants(id,workspace_id)
);
create table if not exists coach_private.workspace_staff_profiles (
 membership_id uuid primary key,workspace_id uuid not null,display_name text not null check(length(trim(display_name)) between 1 and 100),
 accepted_email text not null,foreign key(membership_id,workspace_id) references coach_private.workspace_memberships(id,workspace_id)
);
create table if not exists coach_private.workspace_staff_events (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,invite_id uuid not null,membership_id uuid,
 actor_user_id uuid not null,actor_membership_id uuid not null,kind text not null check(kind in ('offered','revoked','accepted','owner_transferred')),occurred_at timestamptz not null default clock_timestamp(),
 check((kind in ('offered','revoked') and membership_id is null) or (kind in ('accepted','owner_transferred') and membership_id is not null)),
 foreign key(invite_id,workspace_id) references coach_private.workspace_invites(id,workspace_id),
 foreign key(membership_id,workspace_id) references coach_private.workspace_memberships(id,workspace_id),
 foreign key(actor_membership_id,workspace_id,actor_user_id) references coach_private.workspace_memberships(id,workspace_id,user_id)
);
drop trigger if exists staff_events_immutable on coach_private.workspace_staff_events;
create trigger staff_events_immutable before update or delete on coach_private.workspace_staff_events for each row execute function coach_private.workspace_audit_immutable();
alter table coach_private.workspace_staff_offers enable row level security;
alter table coach_private.workspace_staff_profiles enable row level security;
alter table coach_private.workspace_staff_events enable row level security;
revoke all on coach_private.workspace_staff_offers,coach_private.workspace_staff_profiles,coach_private.workspace_staff_events from public,anon,authenticated,service_role;

-- Issuer eligibility is evaluated from stored membership/account links, never
-- by changing the caller's identity claim. NULL ceiling means indefinite.
create or replace function coach_private.workspace_staff_owner(workspace uuid,member uuid)
returns table(role_id uuid,ceiling timestamptz) language sql volatile security definer set search_path='' as $$
 select g.id,least(m.valid_until,g.valid_until) from coach_private.workspace_memberships m
 join auth.users u on u.id=m.user_id join coach_private.workspace_role_grants g on g.membership_id=m.id and g.workspace_id=m.workspace_id
 where current_setting('transaction_isolation')='read committed' and m.id=member and m.workspace_id=workspace and m.status='active' and m.ended_at is null
  and m.accepted_at<=clock_timestamp() and m.effective_from<=clock_timestamp() and (m.valid_until is null or m.valid_until>clock_timestamp())
  and u.email_confirmed_at<=clock_timestamp() and length(trim(u.email))>0 and not coalesce(u.is_anonymous,false) and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp())
  and g.role_code='owner' and g.scope='workspace' and g.revoked_at is null and g.valid_from<=clock_timestamp() and (g.valid_until is null or g.valid_until>clock_timestamp())
$$;
create or replace function coach_private.workspace_staff_accept_lock(workspace uuid,issuer uuid) returns void language plpgsql volatile security definer set search_path='' as $$
declare academy uuid;issuer_user uuid;
begin
 if not coach_private.workspace_actor_eligible() then raise exception 'Invitation unavailable' using errcode='42501';end if;
 select l.academy_id into academy from coach_private.academy_workspace_links l where l.workspace_id=workspace;
 if academy is null then raise exception 'Invitation unavailable' using errcode='42501';end if;
 perform 1 from public.academies a where a.id=academy for update;
 perform 1 from coach_private.teaching_workspaces w where w.id=workspace for update;
 select m.user_id into issuer_user from coach_private.workspace_memberships m where m.id=issuer and m.workspace_id=workspace;
 perform u.id from auth.users u where u.id=any(array[auth.uid(),issuer_user]) order by u.id for share;
 if not coach_private.workspace_actor_eligible() then raise exception 'Invitation unavailable' using errcode='42501';end if;
end $$;

create or replace function coach_private.workspace_issue_staff_offer(workspace uuid,request uuid,recipient text,token_digest text,expires timestamptz,roles jsonb,ownership boolean default false)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare actor uuid;owner record;entry jsonb;role_code text;branch uuid;canonical jsonb;proposal bytea;prior coach_private.workspace_invites;prior_offer coach_private.workspace_staff_offers;created timestamptz;
begin
 actor:=coach_private.workspace_resource_lock(workspace);select * into owner from coach_private.workspace_staff_owner(workspace,actor);
 if owner.role_id is null then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if request is null or recipient is null or length(trim(recipient))>320 or lower(trim(recipient))!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  or token_digest is null or token_digest!~'^[0-9a-f]{64}$' or ownership is null or jsonb_typeof(roles) is distinct from 'array' then raise exception 'Check invitation details' using errcode='22023';end if;
 if jsonb_array_length(roles) not between 1 and 50 then raise exception 'Choose invitation roles' using errcode='22023';end if;
 for entry in select value from jsonb_array_elements(roles) loop
  if jsonb_typeof(entry)<>'object' then raise exception 'Check invitation role' using errcode='22023';end if;
  if exists(select 1 from jsonb_object_keys(entry) k where k not in ('role','branch')) then raise exception 'Check invitation role fields' using errcode='22023';end if;
  role_code:=entry->>'role';branch:=nullif(entry->>'branch','')::uuid;
  if role_code is null or role_code not in ('owner','admin','branch_manager','instructor','finance') or (role_code in ('owner','admin') and branch is not null)
   or (role_code='branch_manager' and branch is null) or (role_code='owner' and not ownership)
   or (ownership and (role_code<>'owner' or jsonb_array_length(roles)<>1 or owner.ceiling is not null))
   or (branch is not null and not exists(select 1 from coach_private.workspace_branches b where b.id=branch and b.workspace_id=workspace and b.archived_at is null))
   then raise exception 'Check invitation role/scope' using errcode='22023';end if;
 end loop;
 select jsonb_agg(jsonb_build_object('role',r.role,'branch',r.branch) order by r.role,r.branch) into canonical
  from (select value->>'role' role,nullif(value->>'branch','')::uuid branch from jsonb_array_elements(roles)) r;
 if (select count(*) from (select distinct value->>'role',nullif(value->>'branch','')::uuid from jsonb_array_elements(roles)) r)<>jsonb_array_length(roles) then raise exception 'Duplicate invitation roles' using errcode='22023';end if;
 proposal:=sha256(convert_to(jsonb_build_array(lower(trim(recipient)),token_digest,extract(epoch from expires),canonical,ownership)::text,'UTF8'));
 select * into prior from coach_private.workspace_invites i where i.id=request;
 if prior.id is not null then
  select * into prior_offer from coach_private.workspace_staff_offers o where o.invite_id=request and o.workspace_id=workspace;
  if prior.workspace_id<>workspace or prior.issuer_membership_id<>actor then raise exception 'Invitation unavailable' using errcode='42501';end if;
  if prior_offer.proposal_hash is distinct from proposal then raise exception 'Invitation request changed' using errcode='22023';end if;
  if prior.state='pending' and prior_offer.issuer_role_id is distinct from owner.role_id then raise exception 'Invitation unavailable' using errcode='42501';end if;
  if prior.state not in ('pending','accepted') or (prior.state='pending' and prior.expires_at<=clock_timestamp()) then raise exception 'Invitation unavailable' using errcode='42501';end if;
  return request;
 end if;
 created:=clock_timestamp();
 if expires is null or not isfinite(expires) or expires<=created or expires>created+interval '7 days' then raise exception 'Invitation expiry must be within seven days' using errcode='22023';end if;
 if ownership then update coach_private.workspace_invites i set state='revoked' from coach_private.workspace_staff_offers o where o.invite_id=i.id and o.workspace_id=workspace and o.kind='ownership' and i.issuer_membership_id=actor and i.state='pending';end if;
 insert into coach_private.workspace_invites(id,workspace_id,issuer_membership_id,token_hash,intended_email,created_at,expires_at)
  values(request,workspace,actor,token_digest,lower(trim(recipient)),created,least(expires,owner.ceiling));
 insert into coach_private.workspace_staff_offers(invite_id,workspace_id,kind,proposal_hash,issuer_role_id,issuer_ceiling) values(request,workspace,case when ownership then 'ownership' else 'staff' end,proposal,owner.role_id,owner.ceiling);
 insert into coach_private.workspace_invite_roles(invite_id,workspace_id,role_code,branch_id) select request,workspace,value->>'role',nullif(value->>'branch','')::uuid from jsonb_array_elements(canonical);
 insert into coach_private.workspace_staff_events(workspace_id,invite_id,actor_user_id,actor_membership_id,kind) values(workspace,request,auth.uid(),actor,'offered');
 return request;
exception when invalid_text_representation then raise exception 'Check invitation scope' using errcode='22023';
 when unique_violation then raise exception 'Invitation unavailable' using errcode='42501';
end $$;

create or replace function coach_private.workspace_preview_staff_offer(token text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare invite coach_private.workspace_invites;offer coach_private.workspace_staff_offers;owner record;result jsonb;
begin
 if token is null or token!~'^[a-z0-9]{64}$' or not coach_private.workspace_actor_eligible() then raise exception 'Invitation unavailable' using errcode='42501';end if;
 select * into invite from coach_private.workspace_invites i where i.token_hash=encode(sha256(convert_to(token,'UTF8')),'hex');
 if invite.id is null then raise exception 'Invitation unavailable' using errcode='42501';end if;
 perform coach_private.workspace_staff_accept_lock(invite.workspace_id,invite.issuer_membership_id);
 select * into invite from coach_private.workspace_invites i where i.id=invite.id for update;
 select * into offer from coach_private.workspace_staff_offers o where o.invite_id=invite.id and o.workspace_id=invite.workspace_id;
 select * into owner from coach_private.workspace_staff_owner(invite.workspace_id,invite.issuer_membership_id);
 if owner.role_id is null or offer.issuer_role_id is distinct from owner.role_id or invite.state<>'pending' or invite.expires_at<=clock_timestamp()
  or invite.intended_email is distinct from (select lower(trim(u.email)) from auth.users u where u.id=auth.uid()) then raise exception 'Invitation unavailable' using errcode='42501';end if;
 select jsonb_build_object('workspace_name',w.name,'kind',o.kind,'expires_at',invite.expires_at,
  'roles',(select jsonb_agg(jsonb_build_object('role',r.role_code,'branch',r.branch_id) order by r.role_code,r.branch_id) from coach_private.workspace_invite_roles r where r.invite_id=invite.id and r.workspace_id=invite.workspace_id)) into result
  from coach_private.teaching_workspaces w join coach_private.workspace_staff_offers o on o.workspace_id=w.id and o.invite_id=invite.id where w.id=invite.workspace_id;
 if result is null then raise exception 'Invitation unavailable' using errcode='42501';end if;return result;
end $$;

create or replace function coach_private.workspace_accept_staff_offer(token text,shared_name text,coach_name text default null)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare invite coach_private.workspace_invites;offer coach_private.workspace_staff_offers;owner record;member coach_private.workspace_memberships;entry record;new_role uuid;actor uuid:=auth.uid();ceiling timestamptz;accepted timestamptz;hash bytea;
begin
 if token is null or token!~'^[a-z0-9]{64}$' or not coach_private.workspace_actor_eligible() then raise exception 'Invitation unavailable' using errcode='42501';end if;
 select * into invite from coach_private.workspace_invites i where i.token_hash=encode(sha256(convert_to(token,'UTF8')),'hex');
 if invite.id is null then raise exception 'Invitation unavailable' using errcode='42501';end if;
 perform coach_private.workspace_staff_accept_lock(invite.workspace_id,invite.issuer_membership_id);
 select * into invite from coach_private.workspace_invites i where i.id=invite.id for update;
 select * into offer from coach_private.workspace_staff_offers o where o.invite_id=invite.id and o.workspace_id=invite.workspace_id;
 if offer.invite_id is null or invite.intended_email is distinct from (select lower(trim(u.email)) from auth.users u where u.id=actor) then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if shared_name is null or length(trim(shared_name)) not between 1 and 100 then raise exception 'Enter shared staff name' using errcode='22023';end if;
 hash:=sha256(convert_to(jsonb_build_array(trim(shared_name),coach_name)::text,'UTF8'));
 if invite.state='accepted' then
  if invite.accepted_by<>actor or coach_private.workspace_active_membership(invite.workspace_id) is distinct from invite.accepted_membership_id then raise exception 'Invitation unavailable' using errcode='42501';end if;
  if offer.accept_hash is distinct from hash then raise exception 'Acceptance details changed' using errcode='22023';end if;
  return invite.accepted_membership_id;
 end if;
 select * into owner from coach_private.workspace_staff_owner(invite.workspace_id,invite.issuer_membership_id);
 if owner.role_id is null or offer.issuer_role_id is distinct from owner.role_id or invite.state<>'pending' or invite.expires_at<=clock_timestamp() then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if exists(select 1 from coach_private.workspace_invite_roles r left join coach_private.workspace_branches b on b.id=r.branch_id and b.workspace_id=r.workspace_id where r.invite_id=invite.id and r.branch_id is not null and (b.id is null or b.archived_at is not null)) then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if not exists(select 1 from coach_private.workspace_invite_roles r where r.invite_id=invite.id and r.workspace_id=invite.workspace_id) then raise exception 'Invitation unavailable' using errcode='42501';end if;
 select * into member from coach_private.workspace_memberships m where m.workspace_id=invite.workspace_id and m.user_id=actor and m.status in ('pending','active','suspended');
 if member.id is not null and member.status<>'active' then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if member.id is not null and coach_private.workspace_active_membership(invite.workspace_id) is distinct from member.id then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if offer.kind='staff' and member.id is not null then raise exception 'Already a member; use explicit role management' using errcode='22023';end if;
 if exists(select 1 from coach_private.workspace_memberships m where m.workspace_id=invite.workspace_id and m.user_id=actor and m.ended_at>=invite.created_at) then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if offer.kind='ownership' and (owner.ceiling is not null or offer.issuer_ceiling is not null or member.valid_until is not null or actor=(select m.user_id from coach_private.workspace_memberships m where m.id=invite.issuer_membership_id)) then raise exception 'Ownership offer unavailable' using errcode='42501';end if;
 -- A permanent handoff cannot silently reuse a recipient's temporary owner
 -- grant and remove the last indefinite owner. Require explicit role review.
 if offer.kind='ownership' and exists(select 1 from coach_private.workspace_role_grants g where g.membership_id=member.id and g.role_code='owner' and g.revoked_at is null and g.valid_until is not null and g.valid_until>clock_timestamp()) then raise exception 'Review existing temporary ownership first' using errcode='22023';end if;
 ceiling:=least(offer.issuer_ceiling,owner.ceiling);accepted:=clock_timestamp();
 if ceiling is not null and ceiling<=accepted then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if exists(select 1 from coach_private.workspace_invite_roles r where r.invite_id=invite.id and r.role_code='instructor') and not exists(select 1 from coach_private.coach_identities c where c.user_id=actor) then
  if coach_name is null or length(trim(coach_name)) not between 1 and 100 then raise exception 'Confirm your teaching profile name' using errcode='22023';end if;
  insert into coach_private.coach_identities(user_id,display_name) values(actor,trim(coach_name));
 end if;
 if member.id is null then
  insert into coach_private.workspace_memberships(workspace_id,user_id,status,source,accepted_at,effective_from,valid_until)
   values(invite.workspace_id,actor,'active','accepted_invitation',accepted,accepted,ceiling) returning * into member;
  insert into coach_private.workspace_audit_events(workspace_id,actor_user_id,actor_membership_id,subject_membership_id,event_kind,source) values(invite.workspace_id,actor,member.id,member.id,'membership_accepted','actor_action');
 end if;
 insert into coach_private.workspace_staff_profiles(membership_id,workspace_id,display_name,accepted_email) values(member.id,member.workspace_id,trim(shared_name),invite.intended_email)
  on conflict(membership_id) do nothing;
 for entry in select * from coach_private.workspace_invite_roles r where r.invite_id=invite.id and r.workspace_id=invite.workspace_id loop
  select g.id into new_role from coach_private.workspace_role_grants g where g.membership_id=member.id and g.role_code=entry.role_code and g.branch_id is not distinct from entry.branch_id and g.revoked_at is null
   and g.valid_from<=clock_timestamp() and (g.valid_until is null or g.valid_until>clock_timestamp());
  if new_role is null then
   update coach_private.workspace_role_grants g set revoked_at=greatest(clock_timestamp(),g.valid_from) where g.membership_id=member.id and g.role_code=entry.role_code and g.branch_id is not distinct from entry.branch_id and g.revoked_at is null;
   insert into coach_private.workspace_role_grants(workspace_id,membership_id,branch_id,role_code,scope,valid_from,valid_until,source)
    values(member.workspace_id,member.id,entry.branch_id,entry.role_code,case when entry.branch_id is null then 'workspace' else 'branch' end,accepted,least(ceiling,member.valid_until),'explicit_grant') returning id into new_role;
   insert into coach_private.workspace_audit_events(workspace_id,actor_user_id,actor_membership_id,subject_role_grant_id,event_kind,source) values(member.workspace_id,actor,member.id,new_role,'role_changed','actor_action');
  end if;
 end loop;
 if offer.kind='ownership' then
  update coach_private.workspace_role_grants set revoked_at=clock_timestamp() where id=owner.role_id;
  insert into coach_private.workspace_audit_events(workspace_id,actor_user_id,actor_membership_id,subject_role_grant_id,event_kind,source) values(member.workspace_id,actor,member.id,owner.role_id,'role_changed','actor_action');
  insert into coach_private.workspace_audit_events(workspace_id,actor_user_id,actor_membership_id,subject_membership_id,event_kind,source) values(member.workspace_id,actor,member.id,member.id,'owner_transferred','actor_action');
 end if;
 update coach_private.workspace_invites set state='accepted',accepted_at=accepted,accepted_by=actor,accepted_membership_id=member.id where id=invite.id;
 update coach_private.workspace_staff_offers set accept_hash=hash where invite_id=invite.id;
 insert into coach_private.workspace_staff_events(workspace_id,invite_id,membership_id,actor_user_id,actor_membership_id,kind) values(member.workspace_id,invite.id,member.id,actor,member.id,case when offer.kind='ownership' then 'owner_transferred' else 'accepted' end);
 return member.id;
end $$;

create or replace function coach_private.workspace_revoke_staff_offer(workspace uuid,target uuid) returns void language plpgsql volatile security definer set search_path='' as $$
declare actor uuid;owner record;invite coach_private.workspace_invites;
begin
 actor:=coach_private.workspace_resource_lock(workspace);select * into owner from coach_private.workspace_staff_owner(workspace,actor);
 if owner.role_id is null then raise exception 'Invitation unavailable' using errcode='42501';end if;
 select i.* into invite from coach_private.workspace_invites i join coach_private.workspace_staff_offers o on o.invite_id=i.id and o.workspace_id=i.workspace_id where i.id=target and i.workspace_id=workspace for update of i;
 if invite.id is null then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if invite.state='accepted' then raise exception 'Use membership management for accepted staff' using errcode='22023';end if;
 if invite.state in ('revoked','expired') then return;end if;
 update coach_private.workspace_invites set state='revoked' where id=target;
 insert into coach_private.workspace_staff_events(workspace_id,invite_id,actor_user_id,actor_membership_id,kind) values(workspace,target,auth.uid(),actor,'revoked');
end $$;

create or replace function coach_private.workspace_assign_teacher(workspace uuid,request uuid,target_member uuid,batch uuid,session uuid,teaching_role text,
 teaches_from timestamptz,teaches_until timestamptz,access_from timestamptz,access_until timestamptz,write_until timestamptz)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare actor uuid;owner record;member coach_private.workspace_memberships;branch uuid;class public.class_sessions;prior coach_private.workspace_teaching_assignments;ceiling timestamptz;
begin
 actor:=coach_private.workspace_resource_lock(workspace);select * into owner from coach_private.workspace_staff_owner(workspace,actor);
 if owner.role_id is null then raise exception 'Assignment unavailable' using errcode='42501';end if;
 select * into member from coach_private.workspace_memberships m where m.id=target_member and m.workspace_id=workspace;
 perform 1 from auth.users u where u.id=member.user_id for share;
 if member.id is null or member.status<>'active' or member.accepted_at>clock_timestamp() or member.effective_from>clock_timestamp() or (member.valid_until is not null and member.valid_until<=clock_timestamp())
  or not exists(select 1 from auth.users u where u.id=member.user_id and u.email_confirmed_at<=clock_timestamp() and length(trim(u.email))>0 and not coalesce(u.is_anonymous,false) and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp()))
  or not exists(select 1 from coach_private.coach_identities c where c.user_id=member.user_id) then raise exception 'Assignment unavailable' using errcode='42501';end if;
 if request is null or num_nonnulls(batch,session)<>1 or teaching_role is null or teaching_role not in ('lead','co_instructor','substitute') then raise exception 'Check teaching assignment' using errcode='22023';end if;
 if session is not null then
  select c.* into class from public.class_sessions c join coach_private.workspace_session_links l on l.session_id=c.id and l.academy_id=c.academy_id and l.workspace_id=workspace where c.id=session;
  if class.id is null then raise exception 'Assignment unavailable' using errcode='42501';end if;
 end if;
 select bb.branch_id into branch from public.batches b join coach_private.workspace_batch_links l on l.batch_id=b.id and l.academy_id=b.academy_id and l.workspace_id=workspace
  left join coach_private.workspace_batch_branches bb on bb.batch_id=b.id and bb.workspace_id=workspace where b.id=coalesce(batch,class.batch_id) and b.archived_at is null;
 if not found or (branch is not null and not exists(select 1 from coach_private.workspace_branches b where b.id=branch and b.workspace_id=workspace and b.archived_at is null)) then raise exception 'Assignment unavailable' using errcode='42501';end if;
 select max(coalesce(g.valid_until,'infinity'::timestamptz)) into ceiling from coach_private.workspace_role_grants g where g.membership_id=member.id and g.workspace_id=workspace and g.role_code='instructor' and g.revoked_at is null
  and g.valid_from<=clock_timestamp() and (g.valid_until is null or g.valid_until>clock_timestamp()) and (g.branch_id is null or g.branch_id=branch);
 if ceiling is null then raise exception 'Assignment unavailable' using errcode='42501';end if;
 ceiling:=least(owner.ceiling,member.valid_until,ceiling);
 select * into prior from coach_private.workspace_teaching_assignments a where a.id=request;
 if prior.id is not null then
  if prior.workspace_id<>workspace or prior.membership_id<>member.id or prior.revoked_at is not null then raise exception 'Assignment unavailable' using errcode='42501';end if;
  if row(prior.batch_id,prior.session_id,prior.teaching_role,prior.teaches_from,prior.teaches_until,prior.access_from,prior.access_until,prior.feedback_write_until)
   is distinct from row(batch,session,teaching_role,teaches_from,teaches_until,access_from,access_until,write_until) then raise exception 'Assignment request changed' using errcode='22023';end if;
  return request;
 end if;
 if teaches_from is null or teaches_until is null or access_from is null or access_until is null or write_until is null
  or not isfinite(teaches_from) or not isfinite(teaches_until) or not isfinite(access_from) or not isfinite(access_until) or not isfinite(write_until)
  or teaches_until<=teaches_from or access_until<=access_from or write_until<access_from or write_until>access_until or access_from<member.accepted_at or access_until>ceiling
  or (batch is not null and teaches_from<member.accepted_at)
  or (session is not null and (class.ends_at<=member.accepted_at or class.status='cancelled' or class.starts_at<teaches_from or class.ends_at>teaches_until)) then raise exception 'Check assignment dates/history scope' using errcode='22023';end if;
 insert into coach_private.workspace_teaching_assignments(id,workspace_id,membership_id,batch_id,session_id,teaching_role,teaches_from,teaches_until,access_from,access_until,feedback_write_until)
  values(request,workspace,member.id,batch,session,teaching_role,teaches_from,teaches_until,access_from,access_until,write_until);
 insert into coach_private.workspace_audit_events(workspace_id,actor_user_id,actor_membership_id,subject_assignment_id,event_kind,source) values(workspace,auth.uid(),actor,request,'assignment_changed','actor_action');
 return request;
end $$;

create or replace function coach_private.workspace_staff_directory(workspace uuid)
returns table(membership_id uuid,display_name text,status text,roles jsonb) language plpgsql volatile security definer set search_path='' as $$
declare actor uuid;owner record;
begin
 actor:=coach_private.workspace_resource_lock(workspace);select * into owner from coach_private.workspace_staff_owner(workspace,actor);
 if owner.role_id is null then raise exception 'Staff directory unavailable' using errcode='42501';end if;
 return query select m.id,p.display_name,m.status,coalesce((select jsonb_agg(jsonb_build_object('role',g.role_code,'branch',g.branch_id) order by g.role_code,g.branch_id)
  from coach_private.workspace_role_grants g where g.membership_id=m.id and g.workspace_id=workspace and g.revoked_at is null and g.valid_from<=clock_timestamp() and (g.valid_until is null or g.valid_until>clock_timestamp())),'[]'::jsonb)
  from coach_private.workspace_memberships m left join coach_private.workspace_staff_profiles p on p.membership_id=m.id and p.workspace_id=m.workspace_id where m.workspace_id=workspace order by m.created_at,m.id;
end $$;
do $$ declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='coach_private' and p.proname in (
  'workspace_staff_owner','workspace_staff_accept_lock','workspace_issue_staff_offer','workspace_preview_staff_offer','workspace_accept_staff_offer','workspace_revoke_staff_offer','workspace_assign_teacher','workspace_staff_directory') loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
 end loop;
end $$;
insert into coach_private.workspace_foundation_revisions(version) values('202611170018-staff-candidate') on conflict do nothing;
commit;
