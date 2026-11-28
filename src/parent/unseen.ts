// Unseen coach updates for one child (NB-01..07): announcements (incl. schedule changes and holidays) and reviewed feedback
// newer than the last "Mark as read", limited to the last 7 days so old history never nags.
export type Stamped = { at: string };
const WEEK = 7 * 86_400_000;
export function unseenCount(stamps: string[], lastSeen: string | null, now: Date): number {
  return stamps.filter(at => Date.parse(at) >= now.getTime() - WEEK && (!lastSeen || at > lastSeen)).length;
}
export const unseenLine = (n: number) => `${n} new ${n === 1 ? 'update' : 'updates'} from your coach`;
const key = (childId: string) => `parentplus.parent.seen.v1.${childId}`;
// Persists on this device only; any storage failure just means the banner may show again (never an error).
export function readSeen(childId: string): string | null { try { return globalThis.localStorage?.getItem(key(childId)) ?? null; } catch { return null; } }
export function writeSeen(childId: string, iso: string) { try { globalThis.localStorage?.setItem(key(childId), iso); } catch { /* ignore */ } }
