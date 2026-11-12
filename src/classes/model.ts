import type { Batch, Enrolment, Student } from '../roster/model';

export type Mark = 'present' | 'late' | 'absent';
export type Marks = Record<string, Mark>;
export type ClassSession = { id: string; batch_id: string; starts_at: string; ends_at: string; room: string;
  status: 'scheduled' | 'completed' | 'cancelled'; attendance_revision: number };
export type ClassDraft = { id: string; batch: string; startDate: string; startTime: string; endDate: string; endTime: string;
  room: string; status: ClassSession['status'] };
export type ClassContext = { sessions: ClassSession[]; batches: Batch[]; students: Student[]; enrolments: Enrolment[] };
export type AttendanceDraft = { version: 1; owner: string; academy: string; session: string; fingerprint: string;
  revision: number; marks: Marks; savedAt: string };

export function localParts(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

// Native Date parsing uses the phone timezone. Explicitly resolve academy wall
// time instead, rejecting DST gaps and ambiguous repeated times rather than guessing.
export function wallTime(date: string, time: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Enter dates as YYYY-MM-DD and times as HH:MM.');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  if (year < 2000 || year > 2100 || new Date(naive).toISOString().slice(0, 10) !== date) throw new Error('Enter a valid date between 2000 and 2100.');
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const instant = naive + hours * 3_600_000;
    const local = localParts(new Date(instant).toISOString(), timezone);
    offsets.add(Date.parse(`${local.date}T${local.time}:00Z`) - instant);
  }
  const candidates = [...offsets].map(offset => new Date(naive - offset).toISOString()).filter(iso => {
    const local = localParts(iso, timezone); return local.date === date && local.time === time;
  });
  if (candidates.length !== 1) throw new Error(candidates.length ? 'This time repeats during a clock change. Choose another time.' : 'This time is skipped during a clock change. Choose another time.');
  return candidates[0];
}
export function dayRange(date: string, timezone: string) {
  const start = wallTime(date, '00:00', timezone);
  const next = new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  return { start, end: wallTime(next, '00:00', timezone) };
}
export function classValues(draft: ClassDraft, timezone: string) {
  if (!draft.batch) throw new Error('Choose a batch.');
  if (draft.room.trim().length > 100) throw new Error('Use up to 100 characters for the location.');
  const starts = wallTime(draft.startDate, draft.startTime, timezone);
  const ends = wallTime(draft.endDate, draft.endTime, timezone);
  if (Date.parse(ends) <= Date.parse(starts)) throw new Error('Class end must be after its start.');
  return { starts, ends };
}
export function fingerprint(session: ClassSession) { return [session.batch_id, session.starts_at, session.ends_at, session.status].join('|'); }
export function eligibleStudents(context: ClassContext, session: ClassSession, timezone: string) {
  const date = localParts(session.starts_at, timezone).date;
  const ids = new Set(context.enrolments.filter(e => e.batch_id === session.batch_id && e.starts_on <= date && (!e.ends_on || e.ends_on >= date)).map(e => e.student_id));
  return context.students.filter(s => !s.archived_at && ids.has(s.id));
}
export function sameMarks(local: Marks, saved: Marks) {
  return Object.keys(local).length > 0 && Object.entries(local).every(([id, mark]) => saved[id] === mark);
}
