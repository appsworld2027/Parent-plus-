begin;
do $$ begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611150008') then raise exception 'Apply update008 first'; end if;
end $$;
create table if not exists coach_private.roster_scan_usage (
  academy_id uuid not null references public.academies(id), day date not null,
  attempts integer not null check(attempts between 1 and 10), last_attempt timestamptz not null,
  primary key(academy_id,day)
);
create table if not exists coach_private.roster_imports (
  request_id uuid primary key, academy_id uuid not null references public.academies(id),
  payload jsonb not null, student_ids uuid[] not null, created_at timestamptz not null default now()
);
revoke all on coach_private.roster_scan_usage,coach_private.roster_imports from public,anon,authenticated;

create or replace function public.reserve_roster_scan(target_academy uuid)
returns void language plpgsql security definer set search_path='' as $$
declare used coach_private.roster_scan_usage; utc_day date:=(now() at time zone 'UTC')::date;
begin
  perform 1 from public.academies where id=target_academy for update;
  if not found then raise exception 'Academy unavailable' using errcode='42501'; end if;
  select * into used from coach_private.roster_scan_usage where academy_id=target_academy and day=utc_day;
  if used.attempts>=10 or used.last_attempt>now()-interval '10 seconds' then raise exception 'Scan limit reached' using errcode='P0001'; end if;
  insert into coach_private.roster_scan_usage(academy_id,day,attempts,last_attempt) values(target_academy,utc_day,1,now())
    on conflict(academy_id,day) do update set attempts=coach_private.roster_scan_usage.attempts+1,last_attempt=now();
end $$;
revoke all on function public.reserve_roster_scan(uuid) from public,anon,authenticated;
grant execute on function public.reserve_roster_scan(uuid) to service_role;

create or replace function public.import_roster_scan(target_academy uuid,target_batch uuid,import_request uuid,reviewed_students jsonb)
returns uuid[] language plpgsql security definer set search_path='' as $$
declare previous coach_private.roster_imports; body jsonb; item jsonb; student uuid; result uuid[]:='{}'; batches uuid[];
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Academy unavailable' using errcode='42501'; end if;
  perform 1 from public.academies where id=target_academy for update;
  body:=jsonb_build_object('batch',target_batch,'students',reviewed_students);
  select * into previous from coach_private.roster_imports where request_id=import_request;
  if previous.request_id is not null then
    if previous.academy_id<>target_academy or previous.payload is distinct from body then raise exception 'Import request changed' using errcode='22023'; end if;
    return previous.student_ids;
  end if;
  if import_request is null or jsonb_typeof(reviewed_students) is distinct from 'array' or jsonb_array_length(reviewed_students) not between 1 and 50 or length(reviewed_students::text)>100000 then
    raise exception 'Review 1 to 50 students' using errcode='22023';
  end if;
  if target_batch is not null and not exists(select 1 from public.batches where id=target_batch and academy_id=target_academy and archived_at is null) then
    raise exception 'Batch unavailable' using errcode='42501';
  end if;
  batches:=case when target_batch is null then '{}'::uuid[] else array[target_batch] end;
  for item in select * from jsonb_array_elements(reviewed_students) loop
    student:=(item->>'id')::uuid;
    if student is null or student=any(result) then raise exception 'Review duplicate student rows' using errcode='22023'; end if;
    if item->>'mode'='existing' then
      if not exists(select 1 from public.students where id=student and academy_id=target_academy and archived_at is null) then raise exception 'Student unavailable' using errcode='42501'; end if;
      if target_batch is not null then perform public.add_batch_students(target_academy,target_batch,array[student]); end if;
    elsif item->>'mode'='new' then
      if exists(select 1 from public.students where id=student)
        or exists(select 1 from public.students where academy_id=target_academy and lower(trim(regexp_replace(name,'\s+',' ','g')))=lower(trim(regexp_replace(item->>'name','\s+',' ','g')))) then
        raise exception 'A student with this name exists; review the existing profile' using errcode='22023';
      end if;
      perform public.save_student_profile(target_academy,student,item->>'name',nullif(item->>'age','')::integer,
        coalesce(item->>'guardian',''),coalesce(item->>'email',''),coalesce(item->>'phone',''),batches,coalesce(item->>'proficiency','unassessed'));
    else raise exception 'Review the student action' using errcode='22023'; end if;
    result:=array_append(result,student);
  end loop;
  insert into coach_private.roster_imports(request_id,academy_id,payload,student_ids) values(import_request,target_academy,body,result);
  return result;
end $$;
revoke all on function public.import_roster_scan(uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.import_roster_scan(uuid,uuid,uuid,jsonb) to authenticated;
insert into coach_private.schema_migrations(version) values('202611150009') on conflict do nothing;
notify pgrst,'reload schema';
commit;
