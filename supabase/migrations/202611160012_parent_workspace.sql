-- Separate Parent workspace on the existing Auth/database; no family data is
-- granted to a coach by virtue of owning an academy or knowing a contact.
begin;
do $$ begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611160011') then raise exception 'Apply update011 first'; end if;
  if not exists(select 1 from coach_private.schema_migrations where version='202611160012') and exists(select 1 from pg_catalog.pg_tables where schemaname='public' and tablename in ('parent_families','family_children','family_moments','family_todos','family_events','parent_coach_links')) then raise exception 'Existing Parent tables found; inspect before applying this update'; end if;
end $$;

create table if not exists public.parent_families (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id),
  parent_name text not null check(length(trim(parent_name)) between 1 and 100),
  name text not null check(length(trim(name)) between 1 and 100),
  timezone text not null default 'Asia/Kolkata', created_at timestamptz not null default now()
);
create or replace function coach_private.owns_family(family uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.parent_families f where f.id=family and f.owner_id=auth.uid())
$$;
revoke all on function coach_private.owns_family(uuid) from public,anon;
grant execute on function coach_private.owns_family(uuid) to authenticated;
alter table public.parent_families enable row level security;
revoke all on public.parent_families from public,anon,authenticated;
grant select,insert,update on public.parent_families to authenticated;
drop policy if exists family_owner on public.parent_families;
create policy family_owner on public.parent_families to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop trigger if exists parent_family_timezone on public.parent_families;
create trigger parent_family_timezone before insert or update of timezone on public.parent_families for each row execute function coach_private.validate_timezone();
create table if not exists public.family_children (
  id uuid primary key, family_id uuid not null references public.parent_families(id),
  name text not null check(length(trim(name)) between 1 and 100), born_on date check(born_on between '1900-01-01' and current_date),
  color text not null default 'sun' check(color in ('sun','rose','sky','mint','grape','tang')),
  archived_at timestamptz, created_at timestamptz not null default now(), unique(id,family_id)
);
create table if not exists public.family_moments (
  id uuid primary key, family_id uuid not null references public.parent_families(id), child_id uuid not null,
  note text not null check(length(trim(note)) between 1 and 4000), minutes integer not null default 0 check(minutes between 0 and 1440),
  kind text not null default 'memory' check(kind in ('memory','together')), occurred_on date not null default current_date,
  created_at timestamptz not null default now(), foreign key(child_id,family_id) references public.family_children(id,family_id)
);
create table if not exists public.family_todos (
  id uuid primary key, family_id uuid not null references public.parent_families(id), child_id uuid not null,
  title text not null check(length(trim(title)) between 1 and 160), done boolean not null default false,
  created_at timestamptz not null default now(), foreign key(child_id,family_id) references public.family_children(id,family_id)
);
create table if not exists public.family_events (
  id uuid primary key, family_id uuid not null references public.parent_families(id), child_id uuid not null,
  title text not null check(length(trim(title)) between 1 and 160), starts_at timestamptz not null, ends_at timestamptz not null,
  location text not null default '' check(length(location)<=200), created_at timestamptz not null default now(),
  foreign key(child_id,family_id) references public.family_children(id,family_id), check(ends_at>starts_at)
);
do $$ declare tab text; begin
  foreach tab in array array['family_children','family_moments','family_todos','family_events'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('revoke all on public.%I from public,anon,authenticated',tab);
    execute format('grant select,insert,update on public.%I to authenticated',tab);
    execute format('drop policy if exists family_owner on public.%I',tab);
    execute format('create policy family_owner on public.%I to authenticated using(coach_private.owns_family(family_id)) with check(coach_private.owns_family(family_id))',tab);
  end loop;
end $$;

create table if not exists coach_private.parent_link_invites (
  id uuid primary key default gen_random_uuid(), academy_id uuid not null references public.academies(id), student_id uuid not null,
  code_hash text not null unique, expires_at timestamptz not null default now()+interval '48 hours',
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  consumed_at timestamptz, consumed_by uuid references auth.users(id), consumed_child uuid references public.family_children(id), revoked boolean not null default false,
  foreign key(student_id,academy_id) references public.students(id,academy_id)
);
alter table coach_private.parent_link_invites enable row level security;
revoke all on coach_private.parent_link_invites from public,anon,authenticated;
create table if not exists public.parent_coach_links (
  id uuid primary key default gen_random_uuid(), academy_id uuid not null references public.academies(id), student_id uuid not null,
  family_id uuid not null, child_id uuid not null, parent_user_id uuid not null references auth.users(id),
  active boolean not null default true, linked_at timestamptz not null default now(),
  foreign key(child_id,family_id) references public.family_children(id,family_id),
  foreign key(student_id,academy_id) references public.students(id,academy_id)
);
-- Initial release supports one explicitly invited family owner per academy student.
create unique index if not exists parent_coach_link_active on public.parent_coach_links(academy_id,student_id) where active;
alter table public.parent_coach_links enable row level security;
revoke all on public.parent_coach_links from public,anon,authenticated;
grant select on public.parent_coach_links to authenticated;
drop policy if exists linked_owner on public.parent_coach_links;
create policy linked_owner on public.parent_coach_links for select to authenticated using(coach_private.owns_academy(academy_id) or (parent_user_id=auth.uid() and coach_private.owns_family(family_id)));

alter table public.coach_media_consent_events add column if not exists source text not null default 'coach_attestation' check(source in ('coach_attestation','parent_account'));
create or replace view public.coach_media_consents with(security_invoker=true) as select distinct on(academy_id,student_id) * from public.coach_media_consent_events order by academy_id,student_id,event_id desc;
alter table public.parent_feedback_handoffs drop constraint if exists parent_feedback_handoffs_state_check;
alter table public.parent_feedback_handoffs add constraint parent_feedback_handoffs_state_check check(state in ('awaiting_parent_link','available_to_parent','cancelled'));
drop index if exists public.parent_feedback_handoff_active;
create unique index parent_feedback_handoff_active on public.parent_feedback_handoffs(academy_id,observation_id,observation_revision,student_id) where state<>'cancelled';

create or replace function coach_private.current_media_permission(academy uuid,subjects uuid[],kind text) returns boolean language sql stable security definer set search_path='' as $$
  select cardinality(subjects)>0 and not exists(select 1 from unnest(subjects) child where not exists(
    select 1 from public.coach_media_consents c join public.students s on s.id=c.student_id and s.academy_id=c.academy_id
    where c.academy_id=academy and c.student_id=child and s.archived_at is null and c.allow_parent_sharing
      and case when kind='photo' then c.allow_photos when kind='video' then c.allow_videos else false end))
$$;
revoke all on function coach_private.current_media_permission(uuid,uuid[],text) from public,anon,authenticated;
create or replace function coach_private.parent_can_read_handoff(handoff uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.parent_feedback_handoffs h join public.parent_coach_links l on l.academy_id=h.academy_id and l.student_id=h.student_id
    join public.family_children child on child.id=l.child_id and child.family_id=l.family_id
    where h.id=handoff and h.state='available_to_parent' and l.active and l.parent_user_id=auth.uid() and child.archived_at is null and coach_private.owns_family(l.family_id)
      and not exists(select 1 from unnest(h.media_ids) media_id where not exists(select 1 from public.class_media m where m.id=media_id and m.academy_id=h.academy_id and m.state='ready' and coach_private.current_media_permission(m.academy_id,m.subject_ids,m.kind))))
$$;
revoke all on function coach_private.parent_can_read_handoff(uuid) from public,anon;
grant execute on function coach_private.parent_can_read_handoff(uuid) to authenticated;
drop policy if exists parent_reviewed_feedback on public.parent_feedback_handoffs;
create policy parent_reviewed_feedback on public.parent_feedback_handoffs for select to authenticated using(coach_private.parent_can_read_handoff(id));
create or replace view public.parent_feedback_feed with(security_invoker=true) as
  select h.id,l.child_id,h.snapshot,h.reviewed_at from public.parent_feedback_handoffs h
    join public.parent_coach_links l on l.academy_id=h.academy_id and l.student_id=h.student_id
    where l.active and l.parent_user_id=auth.uid() and h.state='available_to_parent';
revoke all on public.parent_feedback_feed from public,anon;
grant select on public.parent_feedback_feed to authenticated;
create or replace function coach_private.parent_can_read_media(media uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.parent_feedback_handoffs h where media=any(h.media_ids) and coach_private.parent_can_read_handoff(h.id))
$$;
revoke all on function coach_private.parent_can_read_media(uuid) from public,anon;
grant execute on function coach_private.parent_can_read_media(uuid) to authenticated;
drop policy if exists parent_reviewed_media on public.class_media;
create policy parent_reviewed_media on public.class_media for select to authenticated using(coach_private.parent_can_read_media(id));
create or replace function coach_private.parent_media_path(path text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.class_media m where m.object_path=path and coach_private.parent_can_read_media(m.id))
$$;
revoke all on function coach_private.parent_media_path(text) from public,anon;
grant execute on function coach_private.parent_media_path(text) to authenticated;
drop policy if exists parent_class_media_read on storage.objects;
create policy parent_class_media_read on storage.objects for select to authenticated using(bucket_id='parentplus-class-media' and coach_private.parent_media_path(name));

create or replace function coach_private.publish_linked_parent_feedback() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.state='awaiting_parent_link' and exists(select 1 from public.parent_coach_links l where l.academy_id=new.academy_id and l.student_id=new.student_id and l.active) then new.state:='available_to_parent'; end if;
  return new;
end $$;
revoke all on function coach_private.publish_linked_parent_feedback() from public,anon,authenticated;
drop trigger if exists publish_linked_parent_feedback on public.parent_feedback_handoffs;
create trigger publish_linked_parent_feedback before insert on public.parent_feedback_handoffs for each row execute function coach_private.publish_linked_parent_feedback();

create or replace function public.issue_parent_link_invite(target_academy uuid,target_student uuid) returns text language plpgsql security definer set search_path='' as $$
declare code text;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Student unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  if not exists(select 1 from public.students where id=target_student and academy_id=target_academy and archived_at is null) then raise exception 'Student unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.parent_coach_links where academy_id=target_academy and student_id=target_student and active) then raise exception 'Disconnect the existing parent link first' using errcode='22023'; end if;
  update coach_private.parent_link_invites set revoked=true where academy_id=target_academy and student_id=target_student and consumed_at is null;
  code:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into coach_private.parent_link_invites(academy_id,student_id,code_hash,created_by) values(target_academy,target_student,encode(sha256(convert_to(code,'UTF8')),'hex'),auth.uid());
  return code;
end $$;
create or replace function public.preview_parent_link(invite_code text) returns jsonb language plpgsql security definer set search_path='' as $$
declare invite coach_private.parent_link_invites;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
  select * into invite from coach_private.parent_link_invites where code_hash=encode(sha256(convert_to(invite_code,'UTF8')),'hex') and not revoked and consumed_at is null and expires_at>now();
  if invite.id is null then raise exception 'Invite unavailable or expired' using errcode='22023'; end if;
  return jsonb_build_object('academy_name',(select name from public.academies where id=invite.academy_id),'student_name',(select name from public.students where id=invite.student_id),'expires_at',invite.expires_at);
end $$;
create or replace function public.get_parent_coach_connections() returns table(id uuid,academy_id uuid,student_id uuid,child_id uuid,active boolean,academy_name text,student_name text) language sql stable security definer set search_path='' as $$
  select l.id,l.academy_id,l.student_id,l.child_id,l.active,a.name,s.name from public.parent_coach_links l
  join public.academies a on a.id=l.academy_id join public.students s on s.id=l.student_id and s.academy_id=l.academy_id
  where l.active and l.parent_user_id=auth.uid() and coach_private.owns_family(l.family_id)
$$;
revoke all on function public.get_parent_coach_connections() from public,anon;
grant execute on function public.get_parent_coach_connections() to authenticated;
create or replace function public.get_parent_media_permissions() returns table(link_id uuid,allow_photos boolean,allow_videos boolean,allow_parent_sharing boolean,source text,recorded_at timestamptz) language sql stable security definer set search_path='' as $$
  select l.id,c.allow_photos,c.allow_videos,c.allow_parent_sharing,c.source,c.recorded_at
  from public.parent_coach_links l join public.coach_media_consents c on c.academy_id=l.academy_id and c.student_id=l.student_id
  where l.active and l.parent_user_id=auth.uid() and coach_private.owns_family(l.family_id)
$$;
revoke all on function public.preview_parent_link(text),public.get_parent_media_permissions() from public,anon;
grant execute on function public.preview_parent_link(text),public.get_parent_media_permissions() to authenticated;
create or replace function public.claim_parent_link(invite_code text,target_child uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare invite coach_private.parent_link_invites; child public.family_children; linked uuid;
begin
  select * into child from public.family_children where id=target_child and archived_at is null and coach_private.owns_family(family_id);
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
  if exists(select 1 from public.parent_coach_links where academy_id=invite.academy_id and student_id=invite.student_id and active) then raise exception 'Invite unavailable or expired' using errcode='22023'; end if;
  insert into public.parent_coach_links(academy_id,student_id,family_id,child_id,parent_user_id) values(invite.academy_id,invite.student_id,child.family_id,child.id,auth.uid()) returning id into linked;
  update coach_private.parent_link_invites set consumed_at=now(),consumed_by=auth.uid(),consumed_child=target_child where id=invite.id;
  insert into public.coach_media_consent_events(academy_id,student_id,guardian_name,evidence_note,allow_photos,allow_videos,allow_parent_sharing,recorded_by,source)
    select invite.academy_id,invite.student_id,f.parent_name,'New Parent connection: awaiting guardian media decision',false,false,false,auth.uid(),'parent_account' from public.parent_families f where f.id=child.family_id;
  update public.parent_feedback_handoffs set state='available_to_parent' where academy_id=invite.academy_id and student_id=invite.student_id and state='awaiting_parent_link';
  return linked;
end $$;
create or replace function public.disconnect_parent_link(target_link uuid) returns void language plpgsql security definer set search_path='' as $$
declare linked public.parent_coach_links;
begin
  select * into linked from public.parent_coach_links where id=target_link;
  if linked.id is null or not (coach_private.owns_academy(linked.academy_id) or (linked.parent_user_id=auth.uid() and coach_private.owns_family(linked.family_id))) then raise exception 'Link unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=linked.academy_id for update;
  -- Recheck under the same academy lock used by claim/review. A stale call
  -- on an old inactive link must never cancel a replacement family's approvals.
  select * into linked from public.parent_coach_links where id=target_link for update;
  if not linked.active then return; end if;
  update public.parent_coach_links set active=false where id=linked.id and active;
  -- An old approval must not silently reach a different replacement family.
  update public.parent_feedback_handoffs set state='cancelled' where academy_id=linked.academy_id and student_id=linked.student_id and state<>'cancelled';
end $$;
create or replace function public.parent_media_permission(target_link uuid,photos boolean,videos boolean,sharing boolean) returns void language plpgsql security definer set search_path='' as $$
declare linked public.parent_coach_links; guardian text;
begin
  select * into linked from public.parent_coach_links where id=target_link and active and parent_user_id=auth.uid() and coach_private.owns_family(family_id);
  if linked.id is null then raise exception 'Link unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=linked.academy_id for update;
  if not exists(select 1 from public.parent_coach_links where id=linked.id and active) then raise exception 'Link unavailable' using errcode='42501'; end if;
  select parent_name into guardian from public.parent_families where id=linked.family_id;
  insert into public.coach_media_consent_events(academy_id,student_id,guardian_name,evidence_note,allow_photos,allow_videos,allow_parent_sharing,recorded_by,source)
    values(linked.academy_id,linked.student_id,guardian,'Decision recorded in the signed-in Parent workspace',photos,videos,sharing,auth.uid(),'parent_account');
  update public.parent_feedback_handoffs h set state='cancelled' where h.academy_id=linked.academy_id and h.state<>'cancelled' and exists(
    select 1 from public.class_media m where m.id=any(h.media_ids) and linked.student_id=any(m.subject_ids)
      and ((m.kind='photo' and not photos) or (m.kind='video' and not videos) or not sharing));
end $$;
create or replace function public.record_coach_media_consent(target_academy uuid,target_student uuid,guardian_name text,evidence_note text,allow_photos boolean,allow_videos boolean,allow_parent_sharing boolean)
returns bigint language plpgsql security definer set search_path='' as $$
declare event bigint; parent_choice public.coach_media_consent_events;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Consent unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  if not exists(select 1 from public.students where id=target_student and academy_id=target_academy and archived_at is null) then raise exception 'Student unavailable' using errcode='42501'; end if;
  select * into parent_choice from public.coach_media_consent_events where academy_id=target_academy and student_id=target_student and source='parent_account' order by event_id desc limit 1;
  if parent_choice.event_id is not null and ((allow_photos and not parent_choice.allow_photos) or (allow_videos and not parent_choice.allow_videos) or (allow_parent_sharing and not parent_choice.allow_parent_sharing)) then raise exception 'The linked parent must approve these permissions in Parent Plus' using errcode='42501'; end if;
  insert into public.coach_media_consent_events(academy_id,student_id,guardian_name,evidence_note,allow_photos,allow_videos,allow_parent_sharing,recorded_by)
    values(target_academy,target_student,guardian_name,evidence_note,allow_photos,allow_videos,allow_parent_sharing,auth.uid()) returning event_id into event;
  -- Revocation cancels unsent media handoffs involving that child, including
  -- group photos in another child's handoff. Audit snapshots are retained.
  update public.parent_feedback_handoffs h set state='cancelled'
    where h.academy_id=target_academy and h.state<>'cancelled' and exists(
      select 1 from public.class_media m where m.id=any(h.media_ids) and target_student=any(m.subject_ids)
        and ((m.kind='photo' and not allow_photos) or (m.kind='video' and not allow_videos) or not allow_parent_sharing));
  return event;
end $$;
revoke all on function public.issue_parent_link_invite(uuid,uuid),public.claim_parent_link(text,uuid),public.disconnect_parent_link(uuid),public.parent_media_permission(uuid,boolean,boolean,boolean) from public,anon;
grant execute on function public.issue_parent_link_invite(uuid,uuid),public.claim_parent_link(text,uuid),public.disconnect_parent_link(uuid),public.parent_media_permission(uuid,boolean,boolean,boolean) to authenticated;
grant all on public.parent_families,public.family_children,public.family_moments,public.family_todos,public.family_events,public.parent_coach_links to service_role;
insert into coach_private.schema_migrations(version) values('202611160012') on conflict do nothing;
notify pgrst,'reload schema';
commit;
select version as installed_update from coach_private.schema_migrations where version='202611160012';
