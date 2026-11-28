import type { ClassDraft, ClassSession } from './model';
import { localParts } from './model';

export type Notice = { batchId: string; message: string };
export const NOTE_LIMIT = 200;
const day = (iso: string, tz: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz });
const when = (iso: string, tz: string) => `${day(iso, tz)} at ${localParts(iso, tz).time}`;
const tail = (note: string) => { const n = note.trim().slice(0, NOTE_LIMIT); return n ? ` ${n}` : ''; };
// Only classes that have not started are worth telling families about (SN-08).
export const upcoming = (iso: string, now: Date) => Date.parse(iso) > now.getTime();

// One family notice per schedule change the coach makes (SN-01..07). New classes and edits that change nothing a family needs send nothing.
export function changeNotice(before: ClassSession | undefined, after: ClassDraft, batchName: string, startsAt: string, tz: string, now: Date, note = ''): Notice | null {
  if (!before || !upcoming(before.starts_at, now) && !upcoming(startsAt, now)) return null;
  if (before.status === 'scheduled' && after.status === 'cancelled') return { batchId: before.batch_id, message: `Class update: ${batchName} on ${when(before.starts_at, tz)} is cancelled.${tail(note)}` };
  if (before.status === 'cancelled' && after.status === 'scheduled') return { batchId: before.batch_id, message: `Class update: ${batchName} on ${when(startsAt, tz)} is on again.` };
  if (before.status === 'scheduled' && after.status === 'scheduled' && Date.parse(before.starts_at) !== Date.parse(startsAt))
    return { batchId: before.batch_id, message: `Class update: ${batchName} moved from ${when(before.starts_at, tz)} to ${when(startsAt, tz)}.${tail(note)}` };
  return null;
}
// A holiday sends one notice per affected batch, not one per class.
export function holidayNotices(sessions: ClassSession[], names: Record<string, string>, tz: string, now: Date, note = ''): Notice[] {
  const byBatch = new Map<string, ClassSession[]>();
  for (const s of sessions.filter(x => upcoming(x.starts_at, now))) byBatch.set(s.batch_id, [...(byBatch.get(s.batch_id) ?? []), s]);
  return [...byBatch].map(([batchId, list]) => {
    const days = [...new Set(list.map(s => day(s.starts_at, tz)))].join(', ');
    return { batchId, message: `Holiday: no ${names[batchId] ?? 'class'} class on ${days}.${tail(note)}` };
  });
}
export const noticeSummary = (sent: number, failed: number) => failed ? `${failed} family ${failed === 1 ? 'notice' : 'notices'} could not be sent.` : sent ? `Families of ${sent} ${sent === 1 ? 'batch' : 'batches'} notified.` : '';
