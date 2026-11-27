import { supabase } from '../auth/client';
export { announcementsForChild } from './announcements';

export type SignalKind = 'running_late' | 'missing_today' | 'dropped_off';
export const signalLabels: Record<SignalKind, string> = { running_late: 'Running late', missing_today: 'Missing today', dropped_off: 'Dropped off' };
export type TodaySignal = { session_id: string; student_id: string; child_id: string; batch_name: string; starts_at: string; kind: SignalKind | null; changed_at: string | null };

export async function loadTodaySignals(): Promise<TodaySignal[]> {
  if (!supabase) throw new Error('Unavailable');
  const result = await supabase.rpc('get_parent_today_signals');
  if (result.error) throw result.error;
  return (result.data ?? []) as TodaySignal[];
}
// Sending the same signal twice is safe: the database keeps one row per child per class (QS-09).
export async function sendSignal(row: Pick<TodaySignal, 'session_id' | 'student_id'>, kind: SignalKind) {
  if (!supabase) throw new Error('Unavailable');
  const result = await supabase.rpc('send_parent_signal', { target_session: row.session_id, target_student: row.student_id, signal: kind });
  if (result.error) throw result.error;
}
export async function withdrawSignal(row: Pick<TodaySignal, 'session_id' | 'student_id'>) {
  if (!supabase) throw new Error('Unavailable');
  const result = await supabase.rpc('withdraw_parent_signal', { target_session: row.session_id, target_student: row.student_id });
  if (result.error) throw result.error;
}
// Pure view rules so they can be unit-tested: which signal rows belong on a child's card.
export function signalsForChild(rows: TodaySignal[], childId: string) { return rows.filter(r => r.child_id === childId); }

import type { Announcement } from './announcements';
export type { Announcement } from './announcements';
export async function loadAnnouncements(): Promise<Announcement[]> {
  if (!supabase) throw new Error('Unavailable');
  const result = await supabase.rpc('get_parent_announcements');
  if (result.error) throw result.error;
  return (result.data ?? []) as Announcement[];
}
