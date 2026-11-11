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
export async function loadRoster(academy: string): Promise<Roster> {
  if (!supabase) throw new Error('Client unavailable');
  const results = await Promise.all([
    supabase.from('students').select('id,name,age_years,archived_at').eq('academy_id', academy).order('name'),
    supabase.from('student_contacts').select('student_id,name,email,phone').eq('academy_id', academy).eq('is_primary', true),
    supabase.from('batches').select('id,name,room,monthly_fee_paise,archived_at').eq('academy_id', academy).order('name'),
    supabase.from('enrolments').select('student_id,batch_id,starts_on,ends_on').eq('academy_id', academy),
  ]);
  for (const result of results) if (result.error) throw result.error;
  return { students: results[0].data ?? [], contacts: results[1].data ?? [], batches: results[2].data ?? [], enrolments: results[3].data ?? [] } as Roster;
}
export async function saveStudent(academy: string, draft: StudentDraft) {
  if (!supabase) throw new Error('Client unavailable');
  const result = await supabase.rpc('save_student', {
    target_academy: academy, target_student: draft.id, student_name: draft.name.trim(),
    age_years: draft.age ? Number(draft.age) : null, guardian_name: draft.guardian.trim(),
    guardian_email: draft.email.trim(), guardian_phone: draft.phone.trim(), batch_ids: [...new Set(draft.batches)],
  });
  if (result.error) throw result.error;
}
export async function saveBatch(academy: string, draft: BatchDraft) {
  if (!supabase) throw new Error('Client unavailable');
  const amount = parseFee(draft.fee);
  if (amount === null) throw new Error('Invalid fee');
  const result = await supabase.from('batches').upsert({ id: draft.id, academy_id: academy, name: draft.name.trim(), room: draft.room.trim(), monthly_fee_paise: amount }, { onConflict: 'id' });
  if (result.error) throw result.error;
}
export async function archiveStudent(id: string) {
  if (!supabase) throw new Error('Client unavailable');
  const result = await supabase.rpc('archive_student', { target_student: id });
  if (result.error) throw result.error;
}
