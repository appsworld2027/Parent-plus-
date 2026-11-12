-- Module 4: trusted session editing and optimistic attendance concurrency.
-- Run after 001 and 002. Existing attendance/history is preserved.
begin;
do $$
begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611120002') then
    raise exception 'Apply roster migration 002 first.';
  end if;
end;
$$;

alter table public.class_sessions add column if not exists attendance_revision integer not null default 0 check(attendance_revision>=0);

create or replace function public.save_class_session(
  target_academy uuid, target_session uuid, target_batch uuid,
  begins_at timestamptz, finishes_at timestamptz, class_room text default '', class_status text default 'scheduled'
) returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.class_sessions;
begin
  if target_session is null or not coach_private.owns_academy(target_academy) then
    raise exception 'Workspace unavailable' using errcode='42501';
  end if;
  if begins_at is null or finishes_at is null or not pg_catalog.isfinite(begins_at) or not pg_catalog.isfinite(finishes_at)
    or finishes_at<=begins_at or length(coalesce(class_room,''))>100
    or class_status is null or class_status not in ('scheduled','completed','cancelled') then
    raise exception 'Check class details' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_session::text,0));
  select * into existing from public.class_sessions where id=target_session for update;
  if existing.id is not null and existing.academy_id<>target_academy then
    raise exception 'Class unavailable' using errcode='42501';
  end if;
  if not exists(select 1 from public.batches where id=target_batch and academy_id=target_academy and archived_at is null) then
    raise exception 'Batch unavailable' using errcode='42501';
  end if;
  -- Attendance refers to the original class/roster context. Allow room/status
  -- corrections but do not silently reinterpret recorded attendance on another date.
  if existing.id is not null and exists(select 1 from public.attendance where session_id=target_session)
    and (existing.batch_id<>target_batch or existing.starts_at<>begins_at or existing.ends_at<>finishes_at) then
    raise exception 'Recorded attendance protects class times; cancel and create a replacement class' using errcode='22023';
  end if;
  insert into public.class_sessions(id,academy_id,batch_id,starts_at,ends_at,room,status)
    values(target_session,target_academy,target_batch,begins_at,finishes_at,trim(coalesce(class_room,'')),class_status)
    on conflict(id) do update set batch_id=excluded.batch_id,starts_at=excluded.starts_at,ends_at=excluded.ends_at,room=excluded.room,status=excluded.status;
  return target_session;
end;
$$;
revoke all on function public.save_class_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text) from public,anon;
grant execute on function public.save_class_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text) to authenticated;
revoke insert,update on public.class_sessions from authenticated;

create or replace function public.save_class_attendance(target_session uuid, expected_revision integer, marks jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare session public.class_sessions; next_revision integer; expected_count integer; session_day date;
begin
  select * into session from public.class_sessions
    where id=target_session and coach_private.owns_academy(academy_id) for update;
  if session.id is null then raise exception 'Class unavailable' using errcode='42501'; end if;
  if expected_revision is null or expected_revision<>session.attendance_revision then
    raise exception 'Attendance changed; reload before saving' using errcode='40001';
  end if;
  -- Reuse the owner/enrolment/date/cancellation validation in the original
  -- atomic function, then advance the revision in this same transaction.
  perform public.save_attendance(target_session,marks);
  select (session.starts_at at time zone timezone)::date into session_day from public.academies where id=session.academy_id;
  select count(*) into expected_count from public.enrolments e join public.students s on s.id=e.student_id
    where e.academy_id=session.academy_id and e.batch_id=session.batch_id and s.archived_at is null
    and e.starts_on<=session_day and (e.ends_on is null or e.ends_on>=session_day);
  if jsonb_array_length(marks)<>expected_count then
    raise exception 'Roster changed; reopen the class and mark every enrolled student' using errcode='40001';
  end if;
  update public.class_sessions set attendance_revision=attendance_revision+1 where id=target_session returning attendance_revision into next_revision;
  return next_revision;
end;
$$;
revoke all on function public.save_class_attendance(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_class_attendance(uuid,integer,jsonb) to authenticated;
-- Clients must use the revision-checked wrapper, not bypass concurrency checks.
revoke all on function public.save_attendance(uuid,jsonb) from public,anon,authenticated;

insert into coach_private.schema_migrations(version) values('202611120003') on conflict do nothing;
notify pgrst,'reload schema';
commit;
