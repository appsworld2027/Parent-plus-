-- APPLIED to parentplus-dev on 2026-11-28; verified RLS on, anon/parent cannot read or write directly.
-- Candidate (M2-43). Coach-private safety/health note per student (allergy, injury, inhaler...). Never readable by parents.
create table if not exists public.student_safety_notes (
  student_id uuid primary key,
  academy_id uuid not null references public.academies(id),
  note text not null check (char_length(btrim(note)) between 1 and 500),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  foreign key (student_id, academy_id) references public.students(id, academy_id)
);
alter table public.student_safety_notes enable row level security;
revoke all on public.student_safety_notes from public, anon, authenticated;
grant select on public.student_safety_notes to authenticated;
drop policy if exists safety_notes_coach_read on public.student_safety_notes;
create policy safety_notes_coach_read on public.student_safety_notes for select to authenticated
  using (coach_private.owns_academy(academy_id));

-- Save or clear (blank text clears). Academy owner only; the student must belong to that academy.
create or replace function public.save_student_safety_note(target_student uuid, note_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare a uuid; t text := btrim(coalesce(note_text, ''));
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select academy_id into a from public.students where id = target_student;
  if a is null or not coach_private.owns_academy(a) then raise exception 'Not available' using errcode = '42501'; end if;
  if t = '' then delete from public.student_safety_notes where student_id = target_student; return; end if;
  if char_length(t) > 500 then raise exception 'Note is too long' using errcode = '22023'; end if;
  insert into public.student_safety_notes(student_id, academy_id, note, updated_by) values (target_student, a, t, auth.uid())
  on conflict (student_id) do update set note = excluded.note, updated_by = auth.uid(), updated_at = now();
end $$;
revoke all on function public.save_student_safety_note(uuid, text) from public, anon;
grant execute on function public.save_student_safety_note(uuid, text) to authenticated;
