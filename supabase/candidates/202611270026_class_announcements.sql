-- CANDIDATE ONLY (M2-50 class announcements). Validated on a disposable in-memory database; NOT applied to any hosted project.
create table if not exists public.batch_announcements (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id),
  batch_id uuid not null,
  body text not null check (char_length(body) between 1 and 500),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (batch_id, academy_id) references public.batches(id, academy_id)
);
create index if not exists batch_announcements_batch_idx on public.batch_announcements(batch_id, created_at desc);
alter table public.batch_announcements enable row level security;
revoke all on public.batch_announcements from public, anon, authenticated;
grant select on public.batch_announcements to authenticated;
drop policy if exists announcements_read on public.batch_announcements;
create policy announcements_read on public.batch_announcements for select to authenticated using (coach_private.owns_academy(academy_id));

create or replace function public.post_batch_announcement(target_batch uuid, message text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare b record; clean text := btrim(coalesce(message, '')); new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select id, academy_id into b from public.batches where id = target_batch and archived_at is null and coach_private.owns_academy(academy_id);
  if b.id is null then raise exception 'Not available' using errcode = '42501'; end if;
  if char_length(clean) not between 1 and 500 then raise exception 'Message must be 1 to 500 characters' using errcode = '22023'; end if;
  insert into public.batch_announcements(academy_id, batch_id, body, created_by) values (b.academy_id, b.id, clean, auth.uid()) returning id into new_id;
  return new_id;
end $$;

-- Only actively linked parents of children enrolled in the batch; last 7 days; newest first (CA-06/07/09).
create or replace function public.get_parent_announcements()
returns table(id uuid, child_id uuid, batch_name text, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, l.child_id, b.name, a.body, a.created_at
    from public.parent_coach_links l
    join public.enrolments e on e.academy_id = l.academy_id and e.student_id = l.student_id
    join public.batch_announcements a on a.batch_id = e.batch_id and a.academy_id = e.academy_id
    join public.batches b on b.id = a.batch_id and b.academy_id = a.academy_id
   where l.active and l.parent_user_id = auth.uid() and a.created_at > now() - interval '7 days'
   order by a.created_at desc
$$;
revoke all on function public.post_batch_announcement(uuid,text), public.get_parent_announcements() from public, anon;
grant execute on function public.post_batch_announcement(uuid,text), public.get_parent_announcements() to authenticated;
