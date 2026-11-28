import type { Marks } from './model';

// Attendance suggestions from parent quick signals (M2-10, SA-01..). A SUGGESTION only: the coach taps to fill and still saves.
// Dropped off -> present, Running late -> late, Missing today -> absent. Children the coach already marked are never changed.
export type SignalRow = { student_id: string; kind: string; changed_at: string };
const MAP: Record<string, 'present' | 'late' | 'absent'> = { dropped_off: 'present', running_late: 'late', missing_today: 'absent' };
export function marksFromSignals(signals: SignalRow[], eligibleStudentIds: string[], current: Marks): Marks {
  const eligible = new Set(eligibleStudentIds);
  const newest = new Map<string, SignalRow>();
  for (const s of signals) { const seen = newest.get(s.student_id); if (!seen || s.changed_at > seen.changed_at) newest.set(s.student_id, s); }
  const out: Marks = {};
  for (const [id, s] of newest) { if (!eligible.has(id) || current[id] || !MAP[s.kind]) continue; out[id] = MAP[s.kind]; }
  return out;
}
export const signalFillLabel = (n: number) => `Apply parent signals (${n})`;
export const signalHint = (marks: Marks) => {
  const c = { present: 0, late: 0, absent: 0 }; for (const v of Object.values(marks)) c[v as keyof typeof c]++;
  const parts = [c.absent && `${c.absent} missing`, c.late && `${c.late} running late`, c.present && `${c.present} dropped off`].filter(Boolean);
  return `Parents told you: ${parts.join(', ')}. Nothing is saved until you tap Save.`;
};
