-- Forward-only correction: archive cannot leave a claimable invitation.
begin;
do $$ begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611160012') then raise exception 'Apply update012 first'; end if;
end $$;

-- One canonical Coach student per family child in an academy. If old data
-- violates this invariant, stop atomically for an explicit owner review.
do $$ begin
  if exists(select 1 from public.parent_coach_links where active group by academy_id,child_id having count(*)>1) then
    raise exception 'Duplicate active child connections found; review links before update013';
  end if;
end $$;
create unique index if not exists parent_coach_link_child_active on public.parent_coach_links(academy_id,child_id) where active;

-- A child cannot silently disappear while its guardian link still authorises
-- feedback/consent. Disconnect each Coach first; then ordinary archive is safe.
create or replace function coach_private.guard_linked_child_archive() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.archived_at is not null and old.archived_at is null and exists(select 1 from public.parent_coach_links where child_id=old.id and active) then
    raise exception 'Disconnect this child from their coaches before archiving' using errcode='22023';
  end if;
  return new;
end $$;
revoke all on function coach_private.guard_linked_child_archive() from public,anon,authenticated;
drop trigger if exists linked_child_archive on public.family_children;
create trigger linked_child_archive before update of archived_at on public.family_children for each row execute function coach_private.guard_linked_child_archive();

create or replace function public.archive_student(target_student uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare target_academy uuid;
begin
  select academy_id into target_academy from public.students where id=target_student and coach_private.owns_academy(academy_id);
  if target_academy is null then raise exception 'Student unavailable' using errcode='42501'; end if;
  -- Match the academy lock in invitation issue/claim and feedback review.
  perform 1 from public.academies where id=target_academy for update;
  update public.students set archived_at=coalesce(archived_at,now()) where id=target_student and academy_id=target_academy;
  update coach_private.parent_link_invites set revoked=true where academy_id=target_academy and student_id=target_student and consumed_at is null;
  -- Archive stops new participation/connections. Existing approved text history
  -- stays with its already connected family; disconnect remains the revoke action.
  return true;
end $$;

create or replace function public.claim_parent_link(invite_code text,target_child uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare invite coach_private.parent_link_invites; child public.family_children; linked uuid;
begin
  select * into child from public.family_children where id=target_child and archived_at is null and coach_private.owns_family(family_id) for update;
  if child.id is null or auth.uid() is null then raise exception 'Child unavailable' using errcode='42501'; end if;
  if invite_code !~ '^[0-9a-f]{64}$' then raise exception 'Invite unavailable or expired' using errcode='22023'; end if;
  select * into invite from coach_private.parent_link_invites where code_hash=encode(sha256(convert_to(invite_code,'UTF8')),'hex');
  if invite.id is null then raise exception 'Invite unavailable or expired' using errcode='22023'; end if;
  perform 1 from public.academies where id=invite.academy_id for update;
  select * into invite from coach_private.parent_link_invites where id=invite.id for update;
  if invite.consumed_by=auth.uid() and invite.consumed_child=target_child then
    select id into linked from public.parent_coach_links where academy_id=invite.academy_id and student_id=invite.student_id and child_id=target_child and parent_user_id=auth.uid() and active;
    if linked is not null then return linked; end if;
  end if;
  if invite.revoked or invite.expires_at<=now() or invite.consumed_at is not null then raise exception 'Invite unavailable or expired' using errcode='22023'; end if;
  if not exists(select 1 from public.students where id=invite.student_id and academy_id=invite.academy_id and archived_at is null) then raise exception 'Student unavailable' using errcode='22023'; end if;
  if exists(select 1 from public.parent_coach_links where academy_id=invite.academy_id and student_id=invite.student_id and active) then raise exception 'Invite unavailable or expired' using errcode='22023'; end if;
  if exists(select 1 from public.parent_coach_links where academy_id=invite.academy_id and child_id=target_child and active) then raise exception 'This child already has a student connection at this academy' using errcode='22023'; end if;
  insert into public.parent_coach_links(academy_id,student_id,family_id,child_id,parent_user_id) values(invite.academy_id,invite.student_id,child.family_id,child.id,auth.uid()) returning id into linked;
  update coach_private.parent_link_invites set consumed_at=now(),consumed_by=auth.uid(),consumed_child=target_child where id=invite.id;
  insert into public.coach_media_consent_events(academy_id,student_id,guardian_name,evidence_note,allow_photos,allow_videos,allow_parent_sharing,recorded_by,source)
    select invite.academy_id,invite.student_id,f.parent_name,'New Parent connection: awaiting guardian media decision',false,false,false,auth.uid(),'parent_account' from public.parent_families f where f.id=child.family_id;
  update public.parent_feedback_handoffs set state='available_to_parent' where academy_id=invite.academy_id and student_id=invite.student_id and state='awaiting_parent_link';
  return linked;
end $$;

revoke all on function public.archive_student(uuid),public.claim_parent_link(text,uuid) from public,anon;
grant execute on function public.archive_student(uuid),public.claim_parent_link(text,uuid) to authenticated;
insert into coach_private.schema_migrations(version) values('202611160013') on conflict do nothing;
notify pgrst,'reload schema';
commit;
select version as installed_update from coach_private.schema_migrations where version='202611160013';
