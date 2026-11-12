-- Guard attendance against a class moved/cancelled while a device screen is open.
-- Separate migration preserves the already-published 003 history.
begin;
do $$
begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611120003') then
    raise exception 'Apply classes migration 003 first.';
  end if;
end;
$$;

create or replace function public.save_class_attendance_checked(
  target_session uuid, expected_revision integer, expected_context text, marks jsonb
) returns integer language plpgsql security definer set search_path='' as $$
declare session public.class_sessions; actual_context text;
begin
  select * into session from public.class_sessions
    where id=target_session and coach_private.owns_academy(academy_id) for update;
  if session.id is null then raise exception 'Class unavailable' using errcode='42501'; end if;
  -- Match the client's canonical millisecond UTC representation. Room changes do
  -- not change eligibility; batch/date/time/status changes require a new review.
  actual_context := session.batch_id::text || '|' ||
    pg_catalog.to_char(session.starts_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || '|' ||
    pg_catalog.to_char(session.ends_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || '|' || session.status;
  if expected_context is null or expected_context<>actual_context then
    raise exception 'Class changed; reopen before saving attendance' using errcode='40001';
  end if;
  return public.save_class_attendance(target_session,expected_revision,marks);
end;
$$;
revoke all on function public.save_class_attendance_checked(uuid,integer,text,jsonb) from public,anon;
grant execute on function public.save_class_attendance_checked(uuid,integer,text,jsonb) to authenticated;
revoke all on function public.save_class_attendance(uuid,integer,jsonb) from public,anon,authenticated;

insert into coach_private.schema_migrations(version) values('202611120004') on conflict do nothing;
notify pgrst,'reload schema';
commit;
