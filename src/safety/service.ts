import { supabase } from '../auth/client';
export async function loadSafetyNote(student: string): Promise<string> {
  if (!supabase) throw new Error('Unavailable');
  const r = await supabase.from('student_safety_notes').select('note').eq('student_id', student).limit(1);
  if (r.error) throw r.error;
  return (r.data?.[0] as { note: string } | undefined)?.note ?? '';
}
// Blank text clears the note (database rule).
export async function saveSafetyNote(student: string, note: string) {
  if (!supabase) throw new Error('Unavailable');
  const r = await supabase.rpc('save_student_safety_note', { target_student: student, note_text: note });
  if (r.error) throw r.error;
}
