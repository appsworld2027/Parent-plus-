import { eligibleStudents, localParts } from '../classes/model';
import type { ClassContext } from '../classes/model';

export type SpotlightRow = { id: string; name: string; classes: string[]; lastNote: string | null; daysAgo: number | null };
export type Spotlight = { rows: SpotlightRow[]; candidates: number; everyoneNotedToday: boolean };

// Whole calendar days between two YYYY-MM-DD dates.
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}
export function noteLabel(daysAgo: number | null) {
  if (daysAgo === null) return 'No note yet';
  if (daysAgo <= 0) return 'Last note today';
  return daysAgo === 1 ? 'Last note 1 day ago' : `Last note ${daysAgo} days ago`;
}
// Candidates: non-archived children with an active enrolment in a class that is on today's schedule and not cancelled; one entry per child.
export function spotlightCandidates(context: ClassContext, timezone: string) {
  const found = new Map<string, { id: string; name: string; classes: string[] }>();
  for (const session of context.sessions) {
    if (session.status === 'cancelled') continue;
    const className = context.batches.find(b => b.id === session.batch_id)?.name ?? 'Class';
    for (const student of eligibleStudents(context, session, timezone)) {
      const entry = found.get(student.id) ?? { id: student.id, name: student.name, classes: [] };
      if (!entry.classes.includes(className)) entry.classes.push(className);
      found.set(student.id, entry);
    }
  }
  return [...found.values()];
}
// Never-noted first, then the longest since the last recorded note; ties by name. Up to `limit` rows.
export function pickSpotlight(candidates: { id: string; name: string; classes: string[] }[], lastNotes: Map<string, string>, timezone: string, now: Date = new Date(), limit = 3): Spotlight {
  const today = localParts(now.toISOString(), timezone).date;
  const all: SpotlightRow[] = candidates.map(c => {
    const last = lastNotes.get(c.id) ?? null;
    return { ...c, lastNote: last, daysAgo: last ? daysBetween(localParts(last, timezone).date, today) : null };
  });
  const everyoneNotedToday = all.length > 0 && all.every(r => r.daysAgo !== null && r.daysAgo <= 0);
  const ranked = [...all].sort((a, b) => (a.lastNote === null ? -1 : 0) - (b.lastNote === null ? -1 : 0)
    || (a.lastNote ?? '').localeCompare(b.lastNote ?? '') || a.name.localeCompare(b.name));
  return { rows: everyoneNotedToday ? [] : ranked.slice(0, limit), candidates: all.length, everyoneNotedToday };
}
