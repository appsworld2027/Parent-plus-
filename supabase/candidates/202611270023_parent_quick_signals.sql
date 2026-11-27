-- CANDIDATE ONLY (M2-06 parent quick signals). Validated on a disposable in-memory database; NOT applied to any hosted project.
create table if not exists public.parent_signals (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id),
  session_id uuid not null,
  student_id uuid not null,
  parent_user_id uuid not null references auth.users(id),
  kind text not null check (kind in ('running_late','missing_today','dropped_off')),
  sent_at timestamptz not null default now(),
  changed_at timestamptz not null default now(),
  foreign key (session_id, academy_id) references public.class_sessions(id, academy_id),
  foreign key (student_id, academy_id) references public.students(id, academy_id),
  unique (session_id, student_id)
);
alter table public.parent_signals enable row level security;
revoke all on public.parent_signals from public, anon, authenticated;
grant select on public.parent_signals to authenticated;
drop policy if exists signals_read on public.parent_signals;
create policy signals_read on public.parent_signals for select to authenticated
  using (coach_private.owns_academy(academy_id) or parent_user_id = auth.uid());

-- One signal per child per class; sending again replaces it. Only the actively linked parent, only for a
-- scheduled class today (India time) of a batch the child is enrolled in.
create or replace function public.send_parent_signal(target_session uuid, target_student uuid, signal text)
returns void language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select cs.id, cs.academy_id into s from public.class_sessions cs
    join public.enrolments e on e.batch_id = cs.batch_id and e.academy_id = cs.academy_id and e.student_id = target_student
    join public.parent_coach_links l on l.academy_id = cs.academy_id and l.student_id = target_student and l.active and l.parent_user_id = auth.uid()
   where cs.id = target_session and cs.status = 'scheduled'
     and (cs.starts_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date;
  if s.id is null then raise exception 'Not available' using errcode = '42501'; end if;
  insert into public.parent_signals(academy_id, session_id, student_id, parent_user_id, kind)
    values (s.academy_id, target_session, target_student, auth.uid(), signal)
  on conflict (session_id, student_id) do update set kind = excluded.kind, changed_at = now()
    where public.parent_signals.parent_user_id = auth.uid();
end $$;
create or replace function public.withdraw_parent_signal(target_session uuid, target_student uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.parent_signals where session_id = target_session and student_id = target_student and parent_user_id = auth.uid()
$$;
revoke all on function public.send_parent_signal(uuid,uuid,text), public.withdraw_parent_signal(uuid,uuid) from public, anon;
grant execute on function public.send_parent_signal(uuid,uuid,text), public.withdraw_parent_signal(uuid,uuid) to authenticated;

-- Parent-readable view of today's classes for their linked children, with any signal already sent (QS-01/02/04).
create or replace function public.get_parent_today_signals()
returns table(session_id uuid, student_id uuid, child_id uuid, batch_name text, starts_at timestamptz, kind text, changed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select cs.id, l.student_id, l.child_id, b.name, cs.starts_at, ps.kind, ps.changed_at
    from public.parent_coach_links l
    join public.enrolments e on e.academy_id = l.academy_id and e.student_id = l.student_id
    join public.class_sessions cs on cs.batch_id = e.batch_id and cs.academy_id = e.academy_id
    join public.batches b on b.id = cs.batch_id and b.academy_id = cs.academy_id
    left join public.parent_signals ps on ps.session_id = cs.id and ps.student_id = l.student_id
   where l.active and l.parent_user_id = auth.uid() and cs.status = 'scheduled'
     and (cs.starts_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date
   order by cs.starts_at
$$;
revoke all on function public.get_parent_today_signals() from public, anon;
grant execute on function public.get_parent_today_signals() to authenticated;
