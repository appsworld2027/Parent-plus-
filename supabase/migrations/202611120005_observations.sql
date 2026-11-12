-- Module 5: private observations, explicit recipient snapshots, revisions/history.
begin;
do $$
begin
  if not exists(select 1 from coach_private.schema_migrations where version='202611120004') then
    raise exception 'Apply the existing coach updates through 004 first.';
  end if;
end;
$$;
alter table public.observations add column if not exists revision integer not null default 1 check(revision>0);
alter table public.observations add column if not exists audience text not null default 'batch' check(audience in ('student','batch'));
alter table public.observations add column if not exists updated_at timestamptz not null default now();
alter table public.observations add column if not exists updated_by uuid references auth.users(id);
alter table public.observations add column if not exists recorded_at timestamptz;

create table if not exists public.observation_versions (
  observation_id uuid not null, academy_id uuid not null, revision integer not null check(revision>0),
  note text not null check(length(note)<=10000), status text not null check(status in ('draft','recorded')),
  audience text not null check(audience in ('student','batch')), recipient_ids uuid[] not null,
  author_id uuid not null references auth.users(id), saved_at timestamptz not null default now(),
  primary key(observation_id,revision),
  foreign key(observation_id,academy_id) references public.observations(id,academy_id)
);
alter table public.observation_versions enable row level security;
revoke all on public.observation_versions from public,anon,authenticated;
grant select on public.observation_versions to authenticated;
grant all on public.observation_versions to service_role;
drop policy if exists academy_access on public.observation_versions;
create policy academy_access on public.observation_versions for select to authenticated
  using(coach_private.owns_academy(academy_id));
create index if not exists observation_versions_academy_idx on public.observation_versions(academy_id);
revoke insert,update,delete on public.observations,public.observation_recipients from authenticated;

create or replace function public.save_observation(
  target_academy uuid, target_observation uuid, expected_revision integer, target_batch uuid,
  target_session uuid, audience_kind text, recipient_ids uuid[], note_text text, desired_status text
) returns public.observations language plpgsql security definer set search_path='' as $$
declare existing public.observations; result public.observations; selected uuid[]; previous_ids uuid[];
  child uuid; local_day date; new_revision integer;
begin
  if target_observation is null or not coach_private.owns_academy(target_academy) then
    raise exception 'Observation unavailable' using errcode='42501';
  end if;
  if expected_revision is null or expected_revision<0 or note_text is null or length(note_text)>10000
    or audience_kind is null or audience_kind not in ('student','batch')
    or desired_status is null or desired_status not in ('draft','recorded')
    or recipient_ids is null or cardinality(recipient_ids)>500 or array_position(recipient_ids,null) is not null
    or (desired_status='recorded' and (note_text !~ '[^[:space:]]' or cardinality(recipient_ids)=0))
    or (audience_kind='student' and cardinality(recipient_ids)>1) then
    raise exception 'Check observation details and selected students' using errcode='22023';
  end if;
  select coalesce(array_agg(distinct r order by r),'{}'::uuid[]) into selected from unnest(recipient_ids) r;
  if cardinality(selected)<>cardinality(recipient_ids) then raise exception 'Repeated recipient' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_observation::text,0));
  select * into existing from public.observations where id=target_observation for update;
  if existing.id is not null and existing.academy_id<>target_academy then raise exception 'Observation unavailable' using errcode='42501'; end if;
  select coalesce(array_agg(student_id order by student_id),'{}'::uuid[]) into previous_ids
    from public.observation_recipients where observation_id=target_observation;
  -- Recorded recipients and class context are immutable, including edits after
  -- enrolments end or students are archived. Only the note text can be revised.
  if existing.status='recorded' and (desired_status<>'recorded' or target_batch is distinct from existing.batch_id
    or target_session is distinct from existing.session_id or audience_kind<>existing.audience or selected<>previous_ids) then
    raise exception 'Recorded observation recipients and class are locked' using errcode='22023';
  end if;
  if existing.id is null then
    if expected_revision<>0 then raise exception 'Observation changed; reload' using errcode='40001'; end if;
    new_revision:=1;
  else
    if expected_revision>existing.revision then raise exception 'Observation changed; reload' using errcode='40001'; end if;
    -- Lost-response retry: confirm the same complete state without duplicating
    -- records, history or publication timestamps. Never accept a changed stale edit.
    if existing.note=note_text and existing.status=desired_status and existing.batch_id=target_batch
      and existing.session_id is not distinct from target_session and existing.audience=audience_kind and selected=previous_ids then return existing; end if;
    if expected_revision<>existing.revision then raise exception 'Observation changed; reload' using errcode='40001'; end if;
    new_revision:=existing.revision+1;
  end if;
  if existing.status is distinct from 'recorded' then
    if not exists(select 1 from public.batches where id=target_batch and academy_id=target_academy and archived_at is null) then
      raise exception 'Batch unavailable' using errcode='42501';
    end if;
    if target_session is not null then
      select (c.starts_at at time zone a.timezone)::date into local_day
        from public.class_sessions c join public.academies a on a.id=c.academy_id
        where c.id=target_session and c.academy_id=target_academy and c.batch_id=target_batch and c.status<>'cancelled';
      if local_day is null then raise exception 'Class unavailable' using errcode='22023'; end if;
    else
      select (now() at time zone timezone)::date into local_day from public.academies where id=target_academy;
    end if;
    foreach child in array selected loop
      if not exists(select 1 from public.enrolments e join public.students s on s.id=e.student_id
        where e.academy_id=target_academy and e.batch_id=target_batch and e.student_id=child and s.archived_at is null
        and e.starts_on<=local_day and (e.ends_on is null or e.ends_on>=local_day)) then
        raise exception 'Selected students changed; review recipients' using errcode='22023';
      end if;
    end loop;
  end if;
  insert into public.observations(id,academy_id,author_id,batch_id,session_id,note,status,audience,revision,updated_at,updated_by,recorded_at)
    values(target_observation,target_academy,auth.uid(),target_batch,target_session,note_text,desired_status,audience_kind,new_revision,now(),auth.uid(),case when desired_status='recorded' then now() else null end)
    on conflict(id) do update set note=excluded.note,status=excluded.status,batch_id=excluded.batch_id,session_id=excluded.session_id,
      audience=excluded.audience,revision=excluded.revision,updated_at=excluded.updated_at,updated_by=excluded.updated_by,
      recorded_at=coalesce(public.observations.recorded_at,excluded.recorded_at)
    returning * into result;
  if existing.status is distinct from 'recorded' then
    delete from public.observation_recipients where observation_id=target_observation;
    foreach child in array selected loop
      insert into public.observation_recipients(academy_id,observation_id,student_id,batch_id) values(target_academy,target_observation,child,target_batch);
    end loop;
  end if;
  insert into public.observation_versions(observation_id,academy_id,revision,note,status,audience,recipient_ids,author_id)
    values(target_observation,target_academy,new_revision,note_text,desired_status,audience_kind,selected,auth.uid());
  return result;
end;
$$;
revoke all on function public.save_observation(uuid,uuid,integer,uuid,uuid,text,uuid[],text,text) from public,anon;
grant execute on function public.save_observation(uuid,uuid,integer,uuid,uuid,text,uuid[],text,text) to authenticated;
insert into coach_private.schema_migrations(version) values('202611120005') on conflict do nothing;
notify pgrst,'reload schema';
commit;
