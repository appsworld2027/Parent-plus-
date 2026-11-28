-- APPLIED to parentplus-dev on 2026-11-28. Independent review fix: the coach must not read parent_user_id.
-- Parents read only their own reaction rows; the coach gets handoff, reaction and time through a function.
drop policy if exists reactions_read on public.feedback_reactions;
create policy reactions_read on public.feedback_reactions for select to authenticated using (parent_user_id = auth.uid());
create or replace function public.get_coach_feedback_reactions(since timestamptz)
returns table(handoff_id uuid, reaction text, reacted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.handoff_id, r.reaction, r.reacted_at from public.feedback_reactions r
   where coach_private.owns_academy(r.academy_id) and r.reacted_at >= since
   order by r.reacted_at desc limit 500
$$;
revoke all on function public.get_coach_feedback_reactions(timestamptz) from public, anon;
grant execute on function public.get_coach_feedback_reactions(timestamptz) to authenticated;
