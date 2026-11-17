-- Isolated staging API candidate only; not an owner update/live migration.
-- Requires001–014, F1/F2 kernel and parent_attendance_projection.sql.
begin;
create or replace function public.get_parent_attendance_sessions(
 target_child uuid,target_day date,after_start timestamptz default null,after_id uuid default null
) returns table(session_id uuid,academy_id uuid,academy_name text,batch_name text,starts_at timestamptz,ends_at timestamptz,session_status text,attendance_status text)
language sql volatile security definer set search_path='' as $$
 select * from coach_private.parent_attendance_sessions(target_child,target_day,after_start,after_id)
$$;
revoke all on function public.get_parent_attendance_sessions(uuid,date,timestamptz,uuid) from public,anon,service_role;
grant execute on function public.get_parent_attendance_sessions(uuid,date,timestamptz,uuid) to authenticated;
commit;
