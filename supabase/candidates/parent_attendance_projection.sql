-- Retired preview: canonical implementation is migration 20261117090944_parent_attendance_read.
-- Compatibility sentinel only. Never redefine or weaken the installed reader.
do $$ begin
 if not exists(select 1 from coach_private.schema_migrations where version='20261117090944')
  or to_regprocedure('coach_private.parent_attendance_sessions(uuid,date,timestamptz,uuid)') is null then
  raise exception 'Apply the reviewed parent_attendance_read migration; do not run the historical preview';
 end if;
end $$;
