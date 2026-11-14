import { supabase } from '../auth/client';
import { diagnostics } from '../diagnostics';
import type { BatchDraft, Roster, StudentDraft } from './model';
import { parseFee } from './model';

export function rosterFailure(error: unknown, fallback: string) {
  const code = typeof error === 'object' && error && 'code' in error ? error.code : '';
  const message = ['42703', '42883', 'PGRST202', 'PGRST204'].includes(String(code))
    ? 'The student-management database update is needed. Your coding partner has the setup script.' : fallback;
  let reference = 'unavailable';
  try { reference = diagnostics.record('ROSTER_FAILURE').reference; } catch { /* Preserve the original recovery path. */ }
  return `${message} Reference: ${reference}`;
}
// All four reads must succeed before a load is accepted. These are parallel API
// requests, not one database snapshot; filters do not replace server ownership rules.
export async function loadRoster(academy: string): Promise<Roster> {
  if (!supabase) throw new Error('Client unavailable');
  async function rows(table: string, columns: string, primary = false) {
    const all: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      let query = supabase!.from(table).select(columns).eq('academy_id', academy).order('id').range(offset, offset + 499);
      if (primary) query = query.eq('is_primary', true);
      const result = await query;
      if (result.error) throw result.error;
      all.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < 500) return all;
    }
  }
  const [students, contacts, batches, enrolments] = await Promise.all([
    rows('students','id,name,age_years,archived_at,proficiency_level').catch(error => {if(['42703','PGRST204'].includes(String(error?.code)))return rows('students','id,name,age_years,archived_at');throw error;}), rows('student_contacts','student_id,name,email,phone',true),
    rows('batches','id,name,room,monthly_fee_paise,archived_at'), rows('enrolments','student_id,batch_id,starts_on,ends_on'),
  ]);
  return { students, contacts, batches, enrolments } as Roster;
}
// Migration 002 is required: one trusted transaction saves the student, primary
// contact and added enrolments. Do not replace this with three independent writes.
export async function saveStudent(academy: string, draft: StudentDraft) {
  if (!supabase) throw new Error('Client unavailable');
  const result = await supabase.rpc('save_student_profile', {
    target_academy: academy, target_student: draft.id, student_name: draft.name.trim(),
    age_years: draft.age ? Number(draft.age) : null, guardian_name: draft.guardian.trim(),
    guardian_email: draft.email.trim(), guardian_phone: draft.phone.trim(), batch_ids: [...new Set(draft.batches)], student_level: draft.proficiency ?? 'unassessed',
  });
  if (result.error) throw result.error;
}
// Batch writes use ordinary table privileges/RLS; unlike the multi-record student
// save, one upsert is enough. Amounts cross the API boundary as integer paise.
export async function saveBatch(academy: string, draft: BatchDraft) {
  if (!supabase) throw new Error('Client unavailable');
  const amount = parseFee(draft.fee);
  if (amount === null) throw new Error('Invalid fee');
  const result = await supabase.from('batches').upsert({ id: draft.id, academy_id: academy, name: draft.name.trim(), room: draft.room.trim(), monthly_fee_paise: amount }, { onConflict: 'id' });
  if (result.error) throw result.error;
}
// Archive retains attendance/financial history; it is not account/privacy deletion.
export async function archiveStudent(id: string) {
  if (!supabase) throw new Error('Client unavailable');
  const result = await supabase.rpc('archive_student', { target_student: id });
  if (result.error) throw result.error;
}

export async function addBatchStudents(academy: string, batch: string, students: string[]) {
  if (!supabase) throw new Error('Client unavailable');
  const result = await supabase.rpc('add_batch_students', { target_academy: academy, target_batch: batch, student_ids: [...new Set(students)] });
  if (result.error) throw result.error;
}
