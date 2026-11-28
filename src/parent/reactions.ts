// Parent reactions on reviewed coach feedback (M2-24). Three fixed taps; no free text.
export const REACTIONS = [
  { kind: 'thanks', label: 'Thank you' }, { kind: 'helpful', label: 'Helpful' }, { kind: 'will_try', label: 'We will try this' },
] as const;
export type ReactionKind = typeof REACTIONS[number]['kind'];
export const reactionLabel = (kind: string) => REACTIONS.find(r => r.kind === kind)?.label ?? kind;
export type ReactionRow = { handoff_id: string; reaction: string; reacted_at: string };
// Coach side: counts per reaction for each reviewed note, newest activity first. Unknown kinds are ignored.
export function reactionSummary(rows: ReactionRow[]) {
  const byHandoff = new Map<string, { handoff: string; counts: Record<ReactionKind, number>; latest: string }>();
  for (const r of rows) {
    if (!REACTIONS.some(x => x.kind === r.reaction)) continue;
    const e = byHandoff.get(r.handoff_id) ?? { handoff: r.handoff_id, counts: { thanks: 0, helpful: 0, will_try: 0 }, latest: r.reacted_at };
    e.counts[r.reaction as ReactionKind]++; if (r.reacted_at > e.latest) e.latest = r.reacted_at; byHandoff.set(r.handoff_id, e);
  }
  return [...byHandoff.values()].sort((a, b) => b.latest.localeCompare(a.latest));
}
export const countsText = (counts: Record<ReactionKind, number>) =>
  REACTIONS.filter(r => counts[r.kind] > 0).map(r => `${r.label} ×${counts[r.kind]}`).join(' · ');
