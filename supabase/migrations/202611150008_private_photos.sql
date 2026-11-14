begin;
do $$ begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611150007') then raise exception 'Apply update007 first'; end if;
end $$;
create table if not exists public.coach_photos (
  kind text not null check(kind in ('student','observation')), entity_id uuid not null,
  academy_id uuid not null references public.academies(id),
  student_id uuid, observation_id uuid, object_path text not null unique,
  object_id uuid not null references storage.objects(id),
  updated_by uuid not null references auth.users(id), updated_at timestamptz not null default now(),
  primary key(kind,entity_id),
  foreign key(student_id,academy_id) references public.students(id,academy_id),
  foreign key(observation_id,academy_id) references public.observations(id,academy_id),
  check((kind='student' and student_id is not null and student_id=entity_id and observation_id is null)
    or (kind='observation' and observation_id is not null and observation_id=entity_id and student_id is null))
);
alter table public.coach_photos enable row level security;
revoke all on public.coach_photos from public,anon,authenticated;
grant select on public.coach_photos to authenticated;
grant all on public.coach_photos to service_role;
drop policy if exists academy_access on public.coach_photos;
create policy academy_access on public.coach_photos for select to authenticated using(coach_private.owns_academy(academy_id));
create index if not exists coach_photos_academy_idx on public.coach_photos(academy_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('parentplus-coach-photos','parentplus-coach-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
  on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

create or replace function coach_private.photo_path_owned(path text, editable boolean)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare parts text[]; academy uuid; entity uuid;
begin
  parts:=string_to_array(path,'/');
  if cardinality(parts)<>4 or parts[1] !~* '^[0-9a-f-]{36}$' or parts[3] !~* '^[0-9a-f-]{36}$'
    or parts[4] !~* '^[0-9a-f-]{36}[.](jpg|png|webp)$' then return false; end if;
  academy:=parts[1]::uuid; entity:=parts[3]::uuid;
  if not coach_private.owns_academy(academy) then return false; end if;
  if parts[2]='student' then return exists(select 1 from public.students where id=entity and academy_id=academy and (not editable or archived_at is null)); end if;
  if parts[2]='observation' then return exists(select 1 from public.observations where id=entity and academy_id=academy and (not editable or status='draft')); end if;
  return false;
exception when invalid_text_representation then return false;
end $$;
revoke all on function coach_private.photo_path_owned(text,boolean) from public,anon;
grant execute on function coach_private.photo_path_owned(text,boolean) to authenticated;

drop policy if exists coach_photo_insert on storage.objects;
create policy coach_photo_insert on storage.objects for insert to authenticated
  with check(bucket_id='parentplus-coach-photos' and coach_private.photo_path_owned(name,true));
drop policy if exists coach_photo_read on storage.objects;
create policy coach_photo_read on storage.objects for select to authenticated
  using(bucket_id='parentplus-coach-photos' and coach_private.photo_path_owned(name,false));
-- Objects are immutable. Replacements get a fresh random name; deletion is
-- allowed only once metadata no longer references an object, protecting a
-- committed upload whose response was lost.
drop policy if exists coach_photo_delete on storage.objects;
create policy coach_photo_delete on storage.objects for delete to authenticated
  using(bucket_id='parentplus-coach-photos' and coach_private.photo_path_owned(name,false)
    and not exists(select 1 from public.coach_photos p where p.object_path=name));

create or replace function public.attach_coach_photo(target_academy uuid,entity_kind text,target_entity uuid,target_path text,expected_path text)
returns text language plpgsql security definer set search_path='' as $$
declare existing public.coach_photos; state text; stored_object uuid;
begin
  if not coach_private.owns_academy(target_academy) then raise exception 'Photo unavailable' using errcode='42501'; end if;
  if entity_kind='student' then
    select case when archived_at is null then 'active' else 'archived' end into state from public.students where id=target_entity and academy_id=target_academy for update;
  elsif entity_kind='observation' then
    select status into state from public.observations where id=target_entity and academy_id=target_academy for update;
  end if;
  if state is null then raise exception 'Photo unavailable' using errcode='42501'; end if;
  select * into existing from public.coach_photos where kind=entity_kind and entity_id=target_entity;
  if existing.object_path is not distinct from target_path then return target_path; end if;
  if state in ('recorded','archived') then raise exception 'Recorded photos are fixed' using errcode='22023'; end if;
  if existing.object_path is distinct from expected_path then raise exception 'Photo changed; refresh' using errcode='40001'; end if;
  if target_path is null then
    delete from public.coach_photos where kind=entity_kind and entity_id=target_entity;
    return null;
  end if;
  if target_path not like target_academy::text||'/'||entity_kind||'/'||target_entity::text||'/%'
    or not coach_private.photo_path_owned(target_path,true)
    or not exists(select 1 from storage.objects where bucket_id='parentplus-coach-photos' and name=target_path
      and (metadata->>'size')::bigint between 1 and 5242880 and metadata->>'mimetype' in ('image/jpeg','image/png','image/webp')) then
    raise exception 'Upload a supported photo first' using errcode='22023';
  end if;
  select id into stored_object from storage.objects where bucket_id='parentplus-coach-photos' and name=target_path for key share;
  if stored_object is null then raise exception 'Photo upload unavailable' using errcode='22023'; end if;
  insert into public.coach_photos(kind,entity_id,academy_id,student_id,observation_id,object_path,object_id,updated_by)
    values(entity_kind,target_entity,target_academy,case when entity_kind='student' then target_entity end,
      case when entity_kind='observation' then target_entity end,target_path,stored_object,auth.uid())
    on conflict(kind,entity_id) do update set object_path=excluded.object_path,object_id=excluded.object_id,updated_by=excluded.updated_by,updated_at=now();
  return target_path;
end $$;
revoke all on function public.attach_coach_photo(uuid,text,uuid,text,text) from public,anon;
grant execute on function public.attach_coach_photo(uuid,text,uuid,text,text) to authenticated;
insert into coach_private.schema_migrations(version) values('202611150008') on conflict do nothing;
notify pgrst,'reload schema';
commit;
