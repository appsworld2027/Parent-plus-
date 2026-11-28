import type { ClassSession } from './model';
import { localParts } from './model';

// One-tap reminder for an upcoming class (CR-01..05). Sent through the batch announcement so linked parents see it.
export const canRemindClass = (s: ClassSession, now: Date) => s.status === 'scheduled' && Date.parse(s.starts_at) > now.getTime();
export function classReminder(batch: string, s: ClassSession, tz: string, now: Date): string {
  const a = localParts(s.starts_at, tz), today = localParts(now.toISOString(), tz).date;
  const tomorrow = localParts(new Date(now.getTime() + 86_400_000).toISOString(), tz).date;
  const day = a.date === today ? 'today' : a.date === tomorrow ? 'tomorrow' : new Date(s.starts_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz });
  return `Reminder: ${batch} class ${day} at ${a.time}${s.room ? ` (${s.room})` : ''}. See you there!`;
}
