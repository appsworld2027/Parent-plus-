import type { Marks } from './model';

// Smart attendance defaults (M2-09, SD-01..08). A SUGGESTION only: children who attended at least 3 of their last 5 recorded
// classes in this batch (and were not absent last time) are suggested "present". Everyone else stays blank for the coach.
export const HISTORY = 5, MIN_ATTENDED = 3;
export type HistoryMark = { session_id: string; student_id: string; status: string };
// `sessionsNewestFirst` = ids of the batch's recent past, non-cancelled classes that have saved attendance.
export function suggestedMarks(sessionsNewestFirst: string[], marks: HistoryMark[], studentIds: string[], current: Marks): Marks {
  const recent = sessionsNewestFirst.slice(0, HISTORY);
  const by = new Map(marks.map(m => [`${m.session_id}|${m.student_id}`, m.status]));
  const out: Marks = {};
  for (const id of studentIds) {
    if (current[id]) continue;
    const history = recent.map(s => by.get(`${s}|${id}`));
    const attended = history.filter(h => h === 'present' || h === 'late').length;
    if (attended >= MIN_ATTENDED && history[0] !== 'absent' && history[0] !== undefined) out[id] = 'present';
  }
  return out;
}
export const fillLabel = (n: number) => `Fill usual attendance (${n})`;
