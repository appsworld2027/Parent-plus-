-- APPLIED to parentplus-dev on 2026-11-28; verified RLS on, anon/parent cannot read or write directly.
-- Candidate (M2-24). A linked parent reacts once to reviewed feedback for their own child; the coach sees counts.
create table if not exists public.feedback_reactions (
  handoff_id uuid not null references public.parent_feedback_handoffs(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id),
  academy_id uuid not null references public.academies(id),
  reaction text not null check (reaction in ('thanks','helpful','will_try')),
  reacted_at timestamptz not null default now(),
  primary key (handoff_id, parent_user_id)
);
alter table public.feedback_reactions enable row level security;
revoke all on public.feedback_reactions from public, anon, authenticated;
grant select on public.feedback_reactions to authenticated;
drop policy if exists reactions_read on public.feedback_reactions;
create policy reactions_read on public.feedback_reactions for select to authenticated
  using (parent_user_id = auth.uid() or coach_private.owns_academy(academy_id));

-- Only a parent who can currently read that reviewed feedback (active link, state available) may react. Re-tapping replaces.
create or replace function public.react_to_feedback(target_handoff uuid, reaction_kind text)
returns void language plpgsql security definer set search_path = '' as $$
declare a uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not coach_private.parent_can_read_handoff(target_handoff) then raise exception 'Not available' using errcode = '42501'; end if;
  select academy_id into a from public.parent_feedback_handoffs where id = target_handoff;
  insert into public.feedback_reactions(handoff_id, parent_user_id, academy_id, reaction) values (target_handoff, auth.uid(), a, reaction_kind)
  on conflict (handoff_id, parent_user_id) do update set reaction = excluded.reaction, reacted_at = now();
end $$;
create or replace function public.remove_feedback_reaction(target_handoff uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.feedback_reactions where handoff_id = target_handoff and parent_user_id = auth.uid()
$$;
revoke all on function public.react_to_feedback(uuid, text), public.remove_feedback_reaction(uuid) from public, anon;
grant execute on function public.react_to_feedback(uuid, text), public.remove_feedback_reaction(uuid) to authenticated;
