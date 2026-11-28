import type { ClassDraft, ClassSession } from './model';
import { localParts } from './model';

// Holiday = cancel every still-scheduled class of the day that has no attendance saved yet (SC-04/05).
export const holidayTargets = (sessions: ClassSession[]) => sessions.filter(s => s.status === 'scheduled' && s.attendance_revision === 0);
export const canRestore = (s: ClassSession) => s.status === 'cancelled';
export function withStatus(s: ClassSession, status: ClassSession['status'], timezone: string): ClassDraft {
  const a = localParts(s.starts_at, timezone), b = localParts(s.ends_at, timezone);
  return { id: s.id, batch: s.batch_id, startDate: a.date, startTime: a.time, endDate: b.date, endTime: b.time, room: s.room, status };
}
export const holidayMessage = (n: number) => n === 0 ? 'No scheduled classes to cancel on this date.' : `Cancel ${n} ${n === 1 ? 'class' : 'classes'} for a holiday? Families are not messaged automatically.`;
