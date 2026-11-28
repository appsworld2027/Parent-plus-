import type { Enrolment, Student } from '../roster/model';

export type SpotlightPick = { id: string; name: string; days: number | null };
export const SPOTLIGHT_LIMIT = 3;
// Spotlight (SP-01..07): children in today's non-cancelled classes, least recently observed first; those already observed today are skipped.
export function spotlight(students: Student[], enrolments: Enrolment[], todayBatches: string[], observed: Record<string, string>,
  today: string, now: Date, dayOf: (iso: string) => string): SpotlightPick[] {
  const batches = new Set(todayBatches);
  const inClass = new Set(enrolments.filter(e => batches.has(e.batch_id) && e.starts_on <= today && (!e.ends_on || e.ends_on >= today)).map(e => e.student_id));
  const picks: SpotlightPick[] = [];
  for (const s of students) {
    if (s.archived_at || !inClass.has(s.id)) continue;
    const last = observed[s.id];
    if (last && dayOf(last) === today) continue;
    picks.push({ id: s.id, name: s.name, days: last ? Math.max(1, Math.floor((now.getTime() - Date.parse(last)) / 86_400_000)) : null });
  }
  return picks.sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity) || a.name.localeCompare(b.name)).slice(0, SPOTLIGHT_LIMIT);
}
export const spotlightLine = (p: SpotlightPick) => `${p.name} · ${p.days === null ? 'no recorded observation yet' : `last observed ${p.days} ${p.days === 1 ? 'day' : 'days'} ago`}`;
