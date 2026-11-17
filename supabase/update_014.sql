-- Apply ONLY after installed001–013. No students/classes/notes are deleted.
-- Old unbound invitations are revoked. Old unverified links are disconnected;
-- their shared copies are cancelled in history and must be reviewed/shared again.
begin;
do $$ begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611160013') then raise exception 'Apply update013 first'; end if;
  if not exists(select 1 from coach_private.schema_migrations where version='202611160014') and exists(select 1 from pg_catalog.pg_tables where schemaname='public' and tablename='parent_connection_requests') then raise exception 'Existing untracked parent_connection_requests table: inspect before update014'; end if;
end $$;
alter table coach_private.parent_link_invites add column if not exists guardian_email text;
alter table public.parent_coach_links add column if not exists guardian_email text;
alter table public.parent_coach_links add column if not exists coach_approved_at timestamptz;
alter table public.parent_coach_links add column if not exists coach_approved_by uuid references auth.users(id);
alter table public.parent_coach_links add column if not exists approval_request_id uuid;
create table if not exists public.parent_connection_requests (
  id uuid primary key default gen_random_uuid(), academy_id uuid not null references public.academies(id),student_id uuid not null,
  family_id uuid not null,child_id uuid not null,parent_user_id uuid not null references auth.users(id),
  invite_id uuid not null unique references coach_private.parent_link_invites(id),
  guardian_email text not null,parent_name text not null,child_name text not null,born_on date,
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  requested_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by uuid references auth.users(id),
  link_id uuid references public.parent_coach_links(id),
  foreign key(student_id,academy_id) references public.students(id,academy_id),
  foreign key(child_id,family_id) references public.family_children(id,family_id)
);
create unique index if not exists pending_parent_student on public.parent_connection_requests(academy_id,student_id) where status='pending';
alter table public.parent_connection_requests enable row level security;
revoke all on public.parent_connection_requests from public,anon,authenticated;
grant select on public.parent_connection_requests to authenticated;
grant all on public.parent_connection_requests to service_role;
drop policy if exists connection_request_participant on public.parent_connection_requests;
create policy connection_request_participant on public.parent_connection_requests for select to authenticated using(
  coach_private.owns_academy(academy_id) or (parent_user_id=auth.uid() and coach_private.owns_family(family_id)));
-- Re-running014 must not revoke connections approved under the new rules.
with suspended as (
  update public.parent_coach_links set active=false where active and approval_request_id is null returning academy_id,student_id
) update public.parent_feedback_handoffs h set state='cancelled' from suspended s where h.academy_id=s.academy_id and h.student_id=s.student_id and h.state<>'cancelled';
update coach_private.parent_link_invites set revoked=true where guardian_email is null;
alter table public.parent_coach_links drop constraint if exists parent_link_approval_required;
alter table public.parent_coach_links add constraint parent_link_approval_required check(not active or
  (guardian_email is not null and coach_approved_at is not null and coach_approved_by is not null and approval_request_id is not null));
do $$ begin
  if not exists(select 1 from pg_catalog.pg_constraint where conname='parent_link_approval_request' and conrelid='public.parent_coach_links'::regclass) then
    alter table public.parent_coach_links add constraint parent_link_approval_request foreign key(approval_request_id) references public.parent_connection_requests(id);
  end if;
end $$;
-- Old account-derived media consent must not survive an unverified link.
create or replace function coach_private.consent_identity_current(academy uuid,student uuid,actor uuid,origin text) returns boolean language sql stable security definer set search_path='' as $$
  select origin<>'parent_account' or exists(
    select 1 from public.parent_coach_links l where l.academy_id=academy and l.student_id=student and l.parent_user_id=actor and l.active and l.approval_request_id is not null)
$$;
revoke all on function coach_private.consent_identity_current(uuid,uuid,uuid,text) from public,anon;
grant execute on function coach_private.consent_identity_current(uuid,uuid,uuid,text) to authenticated,service_role;
create or replace view public.coach_media_consents with(security_invoker=true) as
  select c.event_id,c.academy_id,c.student_id,c.guardian_name,c.evidence_note,
    c.allow_photos and coach_private.consent_identity_current(c.academy_id,c.student_id,c.recorded_by,c.source) as allow_photos,
    c.allow_videos and coach_private.consent_identity_current(c.academy_id,c.student_id,c.recorded_by,c.source) as allow_videos,
    c.allow_parent_sharing and coach_private.consent_identity_current(c.academy_id,c.student_id,c.recorded_by,c.source) as allow_parent_sharing,
    c.recorded_by,c.recorded_at,c.source
  from (select distinct on(academy_id,student_id) * from public.coach_media_consent_events order by academy_id,student_id,event_id desc) c;

create or replace function coach_private.verified_guardian_email(who uuid) returns text language sql stable security definer set search_path='' as $$
  select lower(trim(email)) from auth.users where id=who and email_confirmed_at is not null and length(trim(email))>0
$$;
revoke all on function coach_private.verified_guardian_email(uuid) from public,anon,authenticated;
-- Old clients must not create an unbound invitation.
create or replace function public.issue_parent_link_invite(target_academy uuid,target_student uuid) returns text language plpgsql security definer set search_path='' as $$
begin raise exception 'Update the app and enter the intended guardian email' using errcode='22023'; end $$;
revoke all on function public.issue_parent_link_invite(uuid,uuid) from public,anon,authenticated;
create or replace function public.issue_parent_link_invite(target_academy uuid,target_student uuid,guardian_email text) returns text language plpgsql security definer set search_path='' as $$
declare code text; recipient text:=lower(trim(guardian_email));
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Student unavailable' using errcode='42501'; end if;
  if recipient is null or length(recipient)>320 or recipient !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Enter the intended guardian email' using errcode='22023'; end if;
  perform 1 from public.academies where id=target_academy for update;
  if not exists(select 1 from public.students where id=target_student and academy_id=target_academy and archived_at is null) then raise exception 'Student unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.parent_coach_links where academy_id=target_academy and student_id=target_student and active)
    or exists(select 1 from public.parent_connection_requests where academy_id=target_academy and student_id=target_student and status='pending') then raise exception 'Resolve the existing connection or request first' using errcode='22023'; end if;
  update coach_private.parent_link_invites set revoked=true where academy_id=target_academy and student_id=target_student and consumed_at is null;
  code:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into coach_private.parent_link_invites(academy_id,student_id,code_hash,created_by,guardian_email)
    values(target_academy,target_student,encode(sha256(convert_to(code,'UTF8')),'hex'),auth.uid(),recipient);
  return code;
end $$;
create or replace function public.preview_parent_link(invite_code text) returns jsonb language plpgsql security definer set search_path='' as $$
declare invite coach_private.parent_link_invites; verified text:=coach_private.verified_guardian_email(auth.uid());
begin
  if verified is null then raise exception 'Verify your email and sign in' using errcode='42501'; end if;
  select * into invite from coach_private.parent_link_invites where code_hash=encode(sha256(convert_to(invite_code,'UTF8')),'hex') and guardian_email=verified and not revoked and consumed_at is null and expires_at>now();
  if invite.id is null or not exists(select 1 from public.students where id=invite.student_id and academy_id=invite.academy_id and archived_at is null) then raise exception 'Invitation unavailable for this account' using errcode='22023'; end if;
  return jsonb_build_object('academy_name',(select name from public.academies where id=invite.academy_id),'student_name',(select name from public.students where id=invite.student_id),'expires_at',invite.expires_at);
end $$;
create or replace function public.claim_parent_link(invite_code text,target_child uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare invite coach_private.parent_link_invites; child public.family_children; requested uuid; verified text:=coach_private.verified_guardian_email(auth.uid());
begin
  if verified is null then raise exception 'Verify your email and sign in' using errcode='42501'; end if;
  select * into child from public.family_children where id=target_child and archived_at is null and coach_private.owns_family(family_id) for update;
  if child.id is null then raise exception 'Child unavailable' using errcode='42501'; end if;
  if invite_code is null or invite_code !~ '^[0-9a-f]{64}$' then raise exception 'Invitation unavailable for this account' using errcode='22023'; end if;
  select * into invite from coach_private.parent_link_invites where code_hash=encode(sha256(convert_to(invite_code,'UTF8')),'hex');
  if invite.id is null or invite.guardian_email is distinct from verified then raise exception 'Invitation unavailable for this account' using errcode='22023'; end if;
  perform 1 from public.academies where id=invite.academy_id for update;
  select * into invite from coach_private.parent_link_invites where id=invite.id for update;
  if invite.consumed_by=auth.uid() and invite.consumed_child=target_child then
    select id into requested from public.parent_connection_requests where invite_id=invite.id and parent_user_id=auth.uid() and child_id=target_child and (status='pending' or (status='approved' and exists(select 1 from public.parent_coach_links l where l.id=link_id and l.active)));
    if requested is not null then return requested; end if;
  end if;
  if invite.revoked or invite.expires_at<=now() or invite.consumed_at is not null then raise exception 'Invitation unavailable for this account' using errcode='22023'; end if;
  if not exists(select 1 from public.students where id=invite.student_id and academy_id=invite.academy_id and archived_at is null) then raise exception 'Student unavailable' using errcode='22023'; end if;
  if exists(select 1 from public.parent_coach_links where academy_id=invite.academy_id and active and (student_id=invite.student_id or child_id=target_child)) then raise exception 'Resolve the existing connection first' using errcode='22023'; end if;
  insert into public.parent_connection_requests(academy_id,student_id,family_id,child_id,parent_user_id,invite_id,guardian_email,parent_name,child_name,born_on)
    select invite.academy_id,invite.student_id,child.family_id,child.id,auth.uid(),invite.id,verified,f.parent_name,child.name,child.born_on from public.parent_families f where f.id=child.family_id returning id into requested;
  update coach_private.parent_link_invites set consumed_at=now(),consumed_by=auth.uid(),consumed_child=target_child where id=invite.id;
  -- No active link, media authority, or feedback is released by a claim.
  return requested;
end $$;
create or replace function public.get_parent_connection_requests() returns setof public.parent_connection_requests language sql stable security definer set search_path='' as $$
  select r.* from public.parent_connection_requests r where r.parent_user_id=auth.uid() and coach_private.owns_family(r.family_id) order by r.requested_at desc
$$;
create or replace function public.get_coach_parent_requests(target_academy uuid) returns table(
  id uuid,student_id uuid,student_name text,parent_user_id uuid,guardian_email text,parent_name text,child_name text,born_on date,requested_at timestamptz
) language sql stable security definer set search_path='' as $$
  select r.id,r.student_id,s.name,r.parent_user_id,r.guardian_email,r.parent_name,r.child_name,r.born_on,r.requested_at
  from public.parent_connection_requests r join public.students s on s.id=r.student_id and s.academy_id=r.academy_id
  where r.academy_id=target_academy and coach_private.owns_academy(target_academy) and r.status='pending' order by r.requested_at
$$;
create or replace function public.review_parent_connection_request(target_request uuid,approve boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare request public.parent_connection_requests; child public.family_children; linked uuid; guardian text;
begin
  if approve is null then raise exception 'Choose approve or reject explicitly' using errcode='22023'; end if;
  select * into request from public.parent_connection_requests where id=target_request;
  if request.id is null or not coach_private.owns_academy(request.academy_id) then raise exception 'Request unavailable' using errcode='42501'; end if;
  select * into child from public.family_children where id=request.child_id for update;
  perform 1 from public.academies where id=request.academy_id for update;
  select * into request from public.parent_connection_requests where id=target_request for update;
  if request.status='approved' and approve then
    select id into linked from public.parent_coach_links where id=request.link_id and active;
    if linked is not null then return linked; end if;
  end if;
  if request.status='rejected' and not approve then return null; end if;
  if request.status<>'pending' then raise exception 'Request already resolved' using errcode='22023'; end if;
  if not approve then
    update public.parent_connection_requests set status='rejected',reviewed_at=now(),reviewed_by=auth.uid() where id=target_request;
    return null;
  end if;
  select parent_name into guardian from public.parent_families where id=request.family_id and owner_id=request.parent_user_id;
  if guardian is distinct from request.parent_name or child.family_id is distinct from request.family_id or child.archived_at is not null
    or child.name is distinct from request.child_name or child.born_on is distinct from request.born_on
    or coach_private.verified_guardian_email(request.parent_user_id) is distinct from request.guardian_email then
    raise exception 'Parent details changed; reject and request a fresh invitation' using errcode='40001';
  end if;
  if not exists(select 1 from public.students where id=request.student_id and academy_id=request.academy_id and archived_at is null) then raise exception 'Student unavailable' using errcode='22023'; end if;
  if exists(select 1 from public.parent_coach_links where academy_id=request.academy_id and active and (student_id=request.student_id or child_id=request.child_id)) then raise exception 'Resolve the existing connection first' using errcode='22023'; end if;
  insert into public.parent_coach_links(academy_id,student_id,family_id,child_id,parent_user_id,guardian_email,coach_approved_at,coach_approved_by,approval_request_id)
    values(request.academy_id,request.student_id,request.family_id,request.child_id,request.parent_user_id,request.guardian_email,now(),auth.uid(),request.id) returning id into linked;
  update public.parent_connection_requests set status='approved',reviewed_at=now(),reviewed_by=auth.uid(),link_id=linked where id=target_request;
  insert into public.coach_media_consent_events(academy_id,student_id,guardian_name,evidence_note,allow_photos,allow_videos,allow_parent_sharing,recorded_by,source)
    values(request.academy_id,request.student_id,guardian,'Approved Parent connection: awaiting guardian media decision',false,false,false,request.parent_user_id,'parent_account');
  update public.parent_feedback_handoffs set state='available_to_parent' where academy_id=request.academy_id and student_id=request.student_id and state='awaiting_parent_link';
  return linked;
end $$;
create or replace function public.cancel_parent_connection_request(target_request uuid) returns void language plpgsql security definer set search_path='' as $$
declare request public.parent_connection_requests;
begin
  select * into request from public.parent_connection_requests where id=target_request;
  if request.id is null or not (coach_private.owns_academy(request.academy_id) or (request.parent_user_id=auth.uid() and coach_private.owns_family(request.family_id))) then raise exception 'Request unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=request.academy_id for update;
  select * into request from public.parent_connection_requests where id=target_request for update;
  if request.status='cancelled' then return; end if;
  if request.status<>'pending' then raise exception 'Request already resolved' using errcode='22023'; end if;
  update public.parent_connection_requests set status='cancelled',reviewed_at=now(),reviewed_by=auth.uid() where id=target_request;
end $$;
create or replace function coach_private.guard_linked_child_archive() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.archived_at is not null and old.archived_at is null and (
    exists(select 1 from public.parent_coach_links where child_id=old.id and active) or exists(select 1 from public.parent_connection_requests where child_id=old.id and status='pending')) then
    raise exception 'Disconnect coaches and cancel pending requests before archiving' using errcode='22023';
  end if;
  return new;
end $$;
create or replace function public.archive_student(target_student uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare academy uuid;
begin
  select academy_id into academy from public.students where id=target_student and coach_private.owns_academy(academy_id);
  if academy is null then raise exception 'Student unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=academy for update;
  update public.students set archived_at=coalesce(archived_at,now()) where id=target_student;
  update coach_private.parent_link_invites set revoked=true where student_id=target_student and consumed_at is null;
  update public.parent_connection_requests set status='cancelled',reviewed_at=now(),reviewed_by=auth.uid() where student_id=target_student and status='pending';
  return true;
end $$;
revoke all on function public.issue_parent_link_invite(uuid,uuid,text),public.get_parent_connection_requests(),public.get_coach_parent_requests(uuid),public.review_parent_connection_request(uuid,boolean),public.cancel_parent_connection_request(uuid) from public,anon;
grant execute on function public.issue_parent_link_invite(uuid,uuid,text),public.get_parent_connection_requests(),public.get_coach_parent_requests(uuid),public.review_parent_connection_request(uuid,boolean),public.cancel_parent_connection_request(uuid) to authenticated;
insert into coach_private.schema_migrations(version) values('202611160014') on conflict do nothing;
notify pgrst,'reload schema';
commit;
select version as installed_update from coach_private.schema_migrations where version='202611160014';
