import { supabase } from '../auth/client';
import { diagnostics } from '../diagnostics';
import type { ClassContext, ClassDraft, ClassSession, Marks } from './model';
import { classValues, dayRange, fingerprint } from './model';

export function classFailure(error: unknown, fallback: string) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const text = ['42703', '42883', 'PGRST202', 'PGRST204'].includes(code) ? 'The classes database update is needed. Your coding partner has the setup script.'
    : code === '40001' ? 'The saved class, roster or attendance changed. Reopen the class and review before saving.'
    : code === '23505' ? 'A class already exists for this batch and start time. Refresh the list before retrying.' : fallback;
  let reference = 'unavailable';
  try { reference = diagnostics.record('CLASS_FAILURE').reference; } catch { /* Keep the recovery path usable. */ }
  return `${text} Reference: ${reference}`;
}
export async function loadClasses(academy: string, date: string, timezone: string): Promise<ClassContext> {
  if (!supabase) throw new Error('Client unavailable');
  const range = dayRange(date, timezone);
  const results = await Promise.all([
    supabase.from('class_sessions').select('id,batch_id,starts_at,ends_at,room,status,attendance_revision').eq('academy_id', academy).gte('starts_at', range.start).lt('starts_at', range.end).order('starts_at'),
    supabase.from('batches').select('id,name,room,monthly_fee_paise,archived_at').eq('academy_id', academy).order('name'),
    supabase.from('students').select('id,name,age_years,archived_at').eq('academy_id', academy).order('name'),
    supabase.from('enrolments').select('student_id,batch_id,starts_on,ends_on').eq('academy_id', academy),
  ]);
  for (const result of results) if (result.error) throw result.error;
  return { sessions: results[0].data ?? [], batches: results[1].data ?? [], students: results[2].data ?? [], enrolments: results[3].data ?? [] } as ClassContext;
}
export async function saveClass(academy: string, draft: ClassDraft, timezone: string) {
  if (!supabase) throw new Error('Client unavailable');
  const { starts, ends } = classValues(draft, timezone);
  const result = await supabase.rpc('save_class_session', { target_academy: academy, target_session: draft.id, target_batch: draft.batch,
    begins_at: starts, finishes_at: ends, class_room: draft.room.trim(), class_status: draft.status });
  if (result.error) throw result.error;
}
export async function loadAttendance(academy: string, id: string): Promise<{ session: ClassSession; marks: Marks }> {
  if (!supabase) throw new Error('Client unavailable');
  const [session, attendance] = await Promise.all([
    supabase.from('class_sessions').select('id,batch_id,starts_at,ends_at,room,status,attendance_revision').eq('academy_id', academy).eq('id', id).single(),
    supabase.from('attendance').select('student_id,status').eq('academy_id', academy).eq('session_id', id),
  ]);
  if (session.error) throw session.error; if (attendance.error) throw attendance.error;
  return { session: session.data as ClassSession, marks: Object.fromEntries((attendance.data ?? []).map(row => [row.student_id, row.status])) };
}
export async function saveAttendance(session: ClassSession, marks: Marks): Promise<number> {
  if (!supabase) throw new Error('Client unavailable');
  const result = await supabase.rpc('save_class_attendance_checked', { target_session: session.id, expected_revision: session.attendance_revision, expected_context: fingerprint(session),
    marks: Object.entries(marks).map(([student_id, status]) => ({ student_id, status })) });
  if (result.error) throw result.error;
  return result.data as number;
}
