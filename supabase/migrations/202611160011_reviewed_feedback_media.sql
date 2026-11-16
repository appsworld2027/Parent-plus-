-- New capabilities only. Existing updates001–010 must not be rerun.
begin;
do $$ begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611150010') then
    raise exception 'Apply update010 first';
  end if;
end $$;

create table if not exists public.coach_media_consent_events (
  event_id bigint generated always as identity primary key,
  academy_id uuid not null references public.academies(id),
  student_id uuid not null,
  guardian_name text not null check(length(trim(guardian_name)) between 1 and 100),
  evidence_note text not null check(length(trim(evidence_note)) between 3 and 500),
  allow_photos boolean not null, allow_videos boolean not null, allow_parent_sharing boolean not null,
  recorded_by uuid not null references auth.users(id), recorded_at timestamptz not null default clock_timestamp(),
  foreign key(student_id,academy_id) references public.students(id,academy_id)
);
create index if not exists coach_media_consent_latest on public.coach_media_consent_events(academy_id,student_id,event_id desc);
alter table public.coach_media_consent_events enable row level security;
revoke all on public.coach_media_consent_events from public,anon,authenticated;
grant select on public.coach_media_consent_events to authenticated;
drop policy if exists academy_access on public.coach_media_consent_events;
create policy academy_access on public.coach_media_consent_events for select to authenticated using(coach_private.owns_academy(academy_id));
create or replace view public.coach_media_consents with(security_invoker=true) as
  select distinct on(academy_id,student_id) * from public.coach_media_consent_events order by academy_id,student_id,event_id desc;
revoke all on public.coach_media_consents from public,anon;
grant select on public.coach_media_consents to authenticated,service_role;

create table if not exists public.class_media (
  id uuid primary key, academy_id uuid not null references public.academies(id), session_id uuid not null,
  subject_ids uuid[] not null check(cardinality(subject_ids) between 1 and 500),
  kind text not null check(kind in ('photo','video')), object_path text not null unique,
  content_type text not null check(content_type in ('image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm')),
  byte_size bigint not null check(byte_size between 1 and 26214400),
  state text not null default 'prepared' check(state in ('prepared','ready')),
  object_id uuid references storage.objects(id),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default clock_timestamp(),
  foreign key(session_id,academy_id) references public.class_sessions(id,academy_id),
  check((state='prepared' and object_id is null) or (state='ready' and object_id is not null)),
  check((kind='photo' and content_type like 'image/%' and byte_size<=5242880) or (kind='video' and content_type like 'video/%'))
);
alter table public.class_media enable row level security;
revoke all on public.class_media from public,anon,authenticated;
grant select on public.class_media to authenticated;
drop policy if exists academy_access on public.class_media;
create policy academy_access on public.class_media for select to authenticated using(coach_private.owns_academy(academy_id));
create index if not exists class_media_session on public.class_media(academy_id,session_id,created_at);

create table if not exists coach_private.feedback_review_requests (
  id uuid primary key, academy_id uuid not null references public.academies(id), body jsonb not null, handoff_ids uuid[] not null default '{}'
);
alter table coach_private.feedback_review_requests enable row level security;
revoke all on coach_private.feedback_review_requests from public,anon,authenticated;
create table if not exists public.parent_feedback_handoffs (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references coach_private.feedback_review_requests(id),
  academy_id uuid not null references public.academies(id), observation_id uuid not null,
  observation_revision integer not null, student_id uuid not null,
  media_ids uuid[] not null, snapshot jsonb not null,
  state text not null default 'awaiting_parent_link' check(state in ('awaiting_parent_link','cancelled')),
  reviewed_by uuid not null references auth.users(id), reviewed_at timestamptz not null default clock_timestamp(),
  foreign key(observation_id,academy_id) references public.observations(id,academy_id),
  foreign key(student_id,academy_id) references public.students(id,academy_id),
  unique(request_id,student_id)
);
alter table public.parent_feedback_handoffs enable row level security;
revoke all on public.parent_feedback_handoffs from public,anon,authenticated;
grant select on public.parent_feedback_handoffs to authenticated;
drop policy if exists academy_access on public.parent_feedback_handoffs;
create policy academy_access on public.parent_feedback_handoffs for select to authenticated using(coach_private.owns_academy(academy_id));
create unique index if not exists parent_feedback_handoff_active on public.parent_feedback_handoffs(academy_id,observation_id,observation_revision,student_id) where state<>'cancelled';
create index if not exists parent_feedback_handoffs_observation on public.parent_feedback_handoffs(academy_id,observation_id,reviewed_at);

create or replace function public.record_coach_media_consent(target_academy uuid,target_student uuid,guardian_name text,evidence_note text,allow_photos boolean,allow_videos boolean,allow_parent_sharing boolean)
returns bigint language plpgsql security definer set search_path='' as $$
declare event bigint;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Consent unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  if not exists(select 1 from public.students where id=target_student and academy_id=target_academy and archived_at is null) then raise exception 'Student unavailable' using errcode='42501'; end if;
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

create or replace function coach_private.media_consent_allowed(academy uuid,subjects uuid[],media_kind text,sharing boolean)
returns boolean language sql stable security definer set search_path='' as $$
  select coach_private.owns_academy(academy) and cardinality(subjects) between 1 and 500
    and (select count(distinct s) from unnest(subjects) s)=cardinality(subjects)
    and not exists(select 1 from unnest(subjects) child where not exists(
      select 1 from public.students s join public.coach_media_consents c on c.academy_id=s.academy_id and c.student_id=s.id
      where s.academy_id=academy and s.id=child and s.archived_at is null
        and case when media_kind='photo' then c.allow_photos when media_kind='video' then c.allow_videos else false end
        and (not sharing or c.allow_parent_sharing)))
$$;
revoke all on function coach_private.media_consent_allowed(uuid,uuid[],text,boolean) from public,anon;
grant execute on function coach_private.media_consent_allowed(uuid,uuid[],text,boolean) to authenticated;

create or replace function public.prepare_class_media(target_academy uuid,target_session uuid,target_media uuid,subjects uuid[],media_kind text,mime text,size_bytes bigint)
returns text language plpgsql security definer set search_path='' as $$
declare current public.class_media; class public.class_sessions; path text; ext text;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Class unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  select * into class from public.class_sessions where id=target_session and academy_id=target_academy;
  if class.id is null or class.status='cancelled' then raise exception 'Class unavailable' using errcode='22023'; end if;
  if subjects is null or not coalesce(coach_private.media_consent_allowed(target_academy,subjects,media_kind,false),false) then raise exception 'Record guardian permission for everyone in this media first' using errcode='42501'; end if;
  if exists(select 1 from unnest(subjects) child where not exists(select 1 from public.enrolments e join public.academies a on a.id=e.academy_id
    where e.academy_id=target_academy and e.batch_id=class.batch_id and e.student_id=child
      and e.starts_on<=(class.starts_at at time zone a.timezone)::date
      and (e.ends_on is null or e.ends_on>=(class.starts_at at time zone a.timezone)::date))) then raise exception 'Review class students' using errcode='22023'; end if;
  ext:=case mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'video/mp4' then 'mp4' when 'video/quicktime' then 'mov' when 'video/webm' then 'webm' end;
  if ext is null or size_bytes is null or size_bytes<1 or size_bytes>26214400 or (media_kind='photo' and (size_bytes>5242880 or mime not like 'image/%')) or (media_kind='video' and mime not like 'video/%') then raise exception 'Unsupported media' using errcode='22023'; end if;
  path:=target_academy::text||'/'||target_session::text||'/'||target_media::text||'.'||ext;
  select * into current from public.class_media where id=target_media;
  if current.id is not null then
    if current.academy_id<>target_academy or current.session_id<>target_session or current.subject_ids<>subjects or current.kind<>media_kind or current.content_type<>mime or current.byte_size<>size_bytes then raise exception 'Media retry changed' using errcode='40001'; end if;
    return current.object_path;
  end if;
  if (select count(*) from public.class_media where academy_id=target_academy and session_id=target_session)>=30 then raise exception 'Class media limit reached' using errcode='54000'; end if;
  insert into public.class_media(id,academy_id,session_id,subject_ids,kind,object_path,content_type,byte_size,created_by)
    values(target_media,target_academy,target_session,subjects,media_kind,path,mime,size_bytes,auth.uid());
  return path;
end $$;

create or replace function coach_private.class_media_path_allowed(path text,uploading boolean)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.class_media m where m.object_path=path
    and ((uploading and m.state='prepared') or (not uploading and m.state='ready'))
    and coalesce(coach_private.media_consent_allowed(m.academy_id,m.subject_ids,m.kind,false),false))
$$;
revoke all on function coach_private.class_media_path_allowed(text,boolean) from public,anon;
grant execute on function coach_private.class_media_path_allowed(text,boolean) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('parentplus-class-media','parentplus-class-media',false,26214400,array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
  on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists coach_class_media_insert on storage.objects;
create policy coach_class_media_insert on storage.objects for insert to authenticated with check(bucket_id='parentplus-class-media' and coach_private.class_media_path_allowed(name,true));
drop policy if exists coach_class_media_read on storage.objects;
create policy coach_class_media_read on storage.objects for select to authenticated using(bucket_id='parentplus-class-media' and coach_private.class_media_path_allowed(name,false));
-- New observation media must go through the class consent workflow.
-- Profile-photo upload behaviour is unchanged; old observation photos stay readable.
drop policy if exists coach_photo_insert on storage.objects;
create policy coach_photo_insert on storage.objects for insert to authenticated
  with check(bucket_id='parentplus-coach-photos' and split_part(name,'/',2)='student' and coach_private.photo_path_owned(name,true));
-- No client overwrites/deletes; completed objects have a metadata foreign key.
create or replace function public.finish_class_media(target_academy uuid,target_media uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare media public.class_media; stored uuid;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Media unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  select * into media from public.class_media where id=target_media and academy_id=target_academy for update;
  if media.id is null or not coalesce(coach_private.media_consent_allowed(target_academy,media.subject_ids,media.kind,false),false) then raise exception 'Consent required' using errcode='42501'; end if;
  if media.state='ready' then return media.id; end if;
  select id into stored from storage.objects where bucket_id='parentplus-class-media' and name=media.object_path
    and metadata->>'mimetype'=media.content_type and (metadata->>'size')::bigint=media.byte_size for key share;
  if stored is null then raise exception 'Upload not confirmed' using errcode='22023'; end if;
  update public.class_media set state='ready',object_id=stored where id=media.id;
  return media.id;
end $$;

create or replace function public.queue_parent_feedback(target_academy uuid,target_observation uuid,expected_revision integer,target_request uuid,selected_students uuid[],selected_media uuid[])
returns setof uuid language plpgsql security definer set search_path='' as $$
declare saved public.observations; existing coach_private.feedback_review_requests; body jsonb; media public.class_media; child uuid; payload jsonb; held public.parent_feedback_handoffs; result_ids uuid[]:='{}'; result_id uuid;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Feedback unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  if target_request is null or selected_students is null or selected_media is null or cardinality(selected_students) not between 1 and 500
    or cardinality(selected_media)>30 or (select count(distinct x) from unnest(selected_students) x)<>cardinality(selected_students)
    or (select count(distinct x) from unnest(selected_media) x)<>cardinality(selected_media) then raise exception 'Review selected recipients and media' using errcode='22023'; end if;
  selected_students:=array(select unnest(selected_students) order by 1);
  selected_media:=array(select unnest(selected_media) order by 1);
  body:=jsonb_build_object('observation',target_observation,'revision',expected_revision,'students',to_jsonb(selected_students),'media',to_jsonb(selected_media));
  select * into existing from coach_private.feedback_review_requests where id=target_request;
  if existing.id is not null then
    if existing.academy_id<>target_academy or existing.body<>body then raise exception 'Review retry changed' using errcode='40001'; end if;
    return query select unnest(existing.handoff_ids); return;
  end if;
  select * into saved from public.observations where id=target_observation and academy_id=target_academy for update;
  if saved.id is null or saved.status<>'recorded' or saved.revision<>expected_revision then raise exception 'Reopen saved feedback before reviewing' using errcode='40001'; end if;
  if exists(select 1 from unnest(selected_students) x where not exists(select 1 from public.observation_recipients r where r.observation_id=saved.id and r.academy_id=target_academy and r.student_id=x)) then raise exception 'Recipient is outside saved feedback' using errcode='42501'; end if;
  foreach child in array selected_media loop
    select * into media from public.class_media where id=child and academy_id=target_academy;
    if media.id is null or media.state<>'ready' or media.session_id is distinct from saved.session_id
      or not coalesce(coach_private.media_consent_allowed(target_academy,media.subject_ids,media.kind,true),false)
      or exists(select 1 from unnest(selected_students) recipient where not recipient=any(media.subject_ids)) then
      raise exception 'Media must belong to this class, include each recipient, and have sharing consent from everyone pictured' using errcode='42501';
    end if;
  end loop;
  insert into coach_private.feedback_review_requests(id,academy_id,body) values(target_request,target_academy,body);
  foreach child in array selected_students loop
    -- One recipient per snapshot. Future Parent workers must verify family
    -- authorisation and fresh media consent; contact matching is not a link.
    payload:=jsonb_build_object('schema_version',1,'observation_id',saved.id,'revision',saved.revision,'note',saved.note,
      'recorded_at',saved.recorded_at,'student_id',child,'student_name',(select name from public.students where id=child),
      'academy_name',(select name from public.academies where id=target_academy),'batch_id',saved.batch_id,'session_id',saved.session_id,'media_ids',to_jsonb(selected_media));
    select * into held from public.parent_feedback_handoffs where academy_id=target_academy and observation_id=saved.id and observation_revision=saved.revision and student_id=child and state<>'cancelled';
    if held.id is not null then
      if held.media_ids<>selected_media then raise exception 'Cancel the held review before changing its media' using errcode='40001'; end if;
      result_ids:=array_append(result_ids,held.id); continue;
    end if;
    insert into public.parent_feedback_handoffs(request_id,academy_id,observation_id,observation_revision,student_id,media_ids,snapshot,reviewed_by)
      values(target_request,target_academy,saved.id,saved.revision,child,selected_media,payload,auth.uid()) returning id into result_id;
    result_ids:=array_append(result_ids,result_id);
  end loop;
  update coach_private.feedback_review_requests set handoff_ids=result_ids where id=target_request;
  return query select unnest(result_ids);
end $$;
create or replace function public.cancel_parent_feedback(target_academy uuid,target_handoff uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Feedback unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  update public.parent_feedback_handoffs set state='cancelled' where id=target_handoff and academy_id=target_academy;
end $$;
revoke all on function public.record_coach_media_consent(uuid,uuid,text,text,boolean,boolean,boolean),public.prepare_class_media(uuid,uuid,uuid,uuid[],text,text,bigint),public.finish_class_media(uuid,uuid),public.queue_parent_feedback(uuid,uuid,integer,uuid,uuid[],uuid[]),public.cancel_parent_feedback(uuid,uuid) from public,anon;
grant execute on function public.record_coach_media_consent(uuid,uuid,text,text,boolean,boolean,boolean),public.prepare_class_media(uuid,uuid,uuid,uuid[],text,text,bigint),public.finish_class_media(uuid,uuid),public.queue_parent_feedback(uuid,uuid,integer,uuid,uuid[],uuid[]),public.cancel_parent_feedback(uuid,uuid) to authenticated;
grant all on public.coach_media_consent_events,public.class_media,public.parent_feedback_handoffs to service_role;
insert into coach_private.schema_migrations(version) values('202611160011') on conflict do nothing;
notify pgrst,'reload schema';
commit;

select version as installed_update from coach_private.schema_migrations where version='202611160011';
