import type { Enrolment, Student } from '../roster/model';

export const ABSENCE_STREAK = 3;
export type PatternSession = { id: string; batch_id: string; starts_at: string; status: string };
export type PatternMark = { session_id: string; student_id: string; status: string };
export type PatternAlert = { studentId: string; name: string; batchId: string; streak: number };

// Leading run of 'absent' among the latest marked, non-cancelled, past classes of a batch. Late counts as attending;
// an unmarked class ends the run (never alert on missing data). Alert at >= 3. One alert per child+batch.
export function attendanceAlerts(sessions: PatternSession[], marks: PatternMark[], students: Student[], enrolments: Enrolment[], today: string, now: Date): PatternAlert[] {
  const byStudent = new Map(students.filter(s => !s.archived_at).map(s => [s.id, s]));
  const mark = new Map(marks.map(m => [`${m.session_id}|${m.student_id}`, m.status]));
  const past = sessions.filter(x => x.status !== 'cancelled' && Date.parse(x.starts_at) <= now.getTime())
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
  const out: PatternAlert[] = []; const seen = new Set<string>();
  for (const e of enrolments) {
    const student = byStudent.get(e.student_id);
    if (!student || e.starts_on > today || (e.ends_on && e.ends_on < today)) continue;
    const key = `${e.student_id}|${e.batch_id}`; if (seen.has(key)) continue; seen.add(key);
    let streak = 0;
    for (const x of past.filter(p => p.batch_id === e.batch_id)) {
      if (mark.get(`${x.id}|${e.student_id}`) !== 'absent') break;
      streak++;
    }
    if (streak >= ABSENCE_STREAK) out.push({ studentId: e.student_id, name: student.name, batchId: e.batch_id, streak });
  }
  return out.sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));
}
export const alertLine = (a: PatternAlert, batch: string) => `${a.name} · ${batch} · absent ${a.streak} classes in a row`;
export const checkInMessage = (academy: string, a: PatternAlert, batch: string) =>
  `${academy}\nHi, we have missed ${a.name} in the last ${a.streak} ${batch} classes. Is everything okay? Please let us know if we can help.\n\n— Your coach`;
