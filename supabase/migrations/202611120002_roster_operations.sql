-- Module 3: atomic student/contact/enrolment writes. Run after migration 001.
begin;
do $$
begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611110001') then
    raise exception 'Apply the initial coach database setup first.';
  end if;
end;
$$;

alter table public.student_contacts add column if not exists is_primary boolean not null default false;
create unique index if not exists one_primary_student_contact on public.student_contacts(student_id) where is_primary;

create or replace function public.save_student(
  target_academy uuid, target_student uuid, student_name text, age_years integer default null,
  guardian_name text default '', guardian_email text default '', guardian_phone text default '',
  batch_ids uuid[] default '{}'
) returns uuid language plpgsql security definer set search_path='' as $$
declare b uuid; existing public.students; local_day date;
begin
  if target_student is null or not coach_private.owns_academy(target_academy) then
    raise exception 'Workspace unavailable' using errcode='42501';
  end if;
  if student_name is null or length(trim(student_name)) not between 1 and 100
    or (age_years is not null and age_years not between 0 and 120)
    or length(coalesce(guardian_name,''))>100 or length(coalesce(guardian_email,''))>320
    or length(coalesce(guardian_phone,''))>30 then
    raise exception 'Check student and contact details' using errcode='22023';
  end if;
  if (length(trim(coalesce(guardian_email,'')))>0 or length(trim(coalesce(guardian_phone,'')))>0)
    and length(trim(coalesce(guardian_name,'')))=0 then
    raise exception 'Enter the guardian name with contact details' using errcode='22023';
  end if;
  if length(trim(coalesce(guardian_email,'')))>0 and trim(guardian_email) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Check the guardian email address' using errcode='22023';
  end if;
  if batch_ids is null or cardinality(batch_ids)>50 or array_position(batch_ids,null) is not null then
    raise exception 'Invalid batch selection' using errcode='22023';
  end if;
  -- Same UUID is reused when a response is lost. Serialize retries before deciding insert/update.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_student::text,0));
  select * into existing from public.students where id=target_student;
  if existing.id is not null and existing.academy_id<>target_academy then
    raise exception 'Student unavailable' using errcode='42501';
  end if;
  if existing.archived_at is not null then raise exception 'Student is archived' using errcode='22023'; end if;
  foreach b in array batch_ids loop
    if not exists(select 1 from public.batches where id=b and academy_id=target_academy and archived_at is null) then
      raise exception 'Batch unavailable' using errcode='42501';
    end if;
  end loop;
  insert into public.students(id,academy_id,name,age_years) values(target_student,target_academy,trim(student_name),age_years)
    on conflict(id) do update set name=excluded.name,age_years=excluded.age_years;
  if length(trim(coalesce(guardian_name,'')))>0 then
    insert into public.student_contacts(academy_id,student_id,name,email,phone,is_primary)
      values(target_academy,target_student,trim(guardian_name),nullif(trim(guardian_email),''),nullif(trim(guardian_phone),''),true)
      on conflict(student_id) where is_primary do update set name=excluded.name,email=excluded.email,phone=excluded.phone;
  else
    -- Clearing the primary contact is an explicit form edit; other contacts remain intact.
    delete from public.student_contacts where student_id=target_student and academy_id=target_academy and is_primary;
  end if;
  select (now() at time zone timezone)::date into local_day from public.academies where id=target_academy;
  foreach b in array batch_ids loop
    insert into public.enrolments(academy_id,student_id,batch_id,starts_on)
      values(target_academy,target_student,b,local_day)
      on conflict(academy_id,student_id,batch_id) do nothing;
  end loop;
  return target_student;
end;
$$;
revoke all on function public.save_student(uuid,uuid,text,integer,text,text,text,uuid[]) from public,anon;
grant execute on function public.save_student(uuid,uuid,text,integer,text,text,text,uuid[]) to authenticated;

create or replace function public.archive_student(target_student uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
  update public.students set archived_at=coalesce(archived_at,now())
    where id=target_student and coach_private.owns_academy(academy_id);
  get diagnostics changed=row_count;
  if changed=0 then raise exception 'Student unavailable' using errcode='42501'; end if;
  return true;
end;
$$;
revoke all on function public.archive_student(uuid) from public,anon;
grant execute on function public.archive_student(uuid) to authenticated;
revoke insert,update on public.students,public.student_contacts,public.enrolments from authenticated;

insert into coach_private.schema_migrations(version) values('202611120002') on conflict do nothing;
notify pgrst,'reload schema';
commit;
