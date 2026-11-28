import { localParts } from '../classes/model';

export type WrapSession = { id: string; starts_at: string; status: string; attendance_revision: number };
export type WrapUp = { classesNeedingAttendance: number; feedbackDrafts: number };
// End-of-day queue (EQ-01..06): today's started, non-cancelled classes with no attendance saved, plus feedback drafts.
export function wrapUp(sessions: WrapSession[], draftCount: number, timezone: string, now: Date): WrapUp {
  const today = localParts(now.toISOString(), timezone).date;
  const classes = sessions.filter(s => s.status !== 'cancelled' && s.attendance_revision === 0 && Date.parse(s.starts_at) <= now.getTime()
    && localParts(s.starts_at, timezone).date === today).length;
  return { classesNeedingAttendance: classes, feedbackDrafts: draftCount };
}
export const classesLine = (n: number) => `${n} ${n === 1 ? 'class needs' : 'classes need'} attendance`;
export const draftsLine = (n: number) => `${n} feedback ${n === 1 ? 'draft' : 'drafts'} to finish`;
