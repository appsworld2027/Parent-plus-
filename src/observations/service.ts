import { supabase } from '../auth/client';
import { diagnostics } from '../diagnostics';
import type { Observation, ObservationContext, ObservationDraft, ObservationVersion } from './model';

const columns = 'id,academy_id,batch_id,session_id,note,status,audience,revision,author_id,created_at,updated_at,recorded_at';
export function observationFailure(error: unknown, fallback: string) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = ['42703', '42883', 'PGRST202', 'PGRST204'].includes(code)
    ? 'The observations database update is needed. Your coding partner has the setup script.'
    : code === 'DEVICE_DRAFT_FAILURE' ? 'Device draft could not be saved. Your text is still on this screen. Keep it open and retry.'
    : code === '40001' ? 'This observation changed on the server. Reopen and compare before saving; your device draft is retained.'
    : code === '22023' ? 'Review the selected students and class. Recorded recipients cannot be changed. Your text remains available.' : fallback;
  let reference = 'unavailable';
  try { reference = diagnostics.record('OBSERVATION_FAILURE').reference; } catch { /* Preserve the original recovery path. */ }
  return `${message} Reference: ${reference}`;
}
export async function loadObservationContext(academy: string): Promise<ObservationContext> {
  if (!supabase) throw new Error('Client unavailable');
  // PostgREST caps one response. Page roster tables so a batch snapshot cannot
  // silently omit students just because the academy has more than one page.
  async function rosterRows(table: 'batches' | 'students' | 'enrolments', fields: string) {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const page = await supabase!.from(table).select(fields).eq('academy_id', academy).order('id').range(offset, offset + 499);
      if (page.error) throw page.error;
      rows.push(...(page.data ?? []));
      if ((page.data?.length ?? 0) < 500) return rows;
    }
  }
  const [batches, students, enrolments, sessions] = await Promise.all([
    rosterRows('batches', 'id,name,room,monthly_fee_paise,archived_at'),
    rosterRows('students', 'id,name,age_years,archived_at'),
    rosterRows('enrolments', 'student_id,batch_id,starts_on,ends_on'),
    supabase.from('class_sessions').select('id,batch_id,starts_at,ends_at,room,status,attendance_revision').eq('academy_id', academy).order('starts_at', { ascending: false }).order('id').limit(100),
  ]);
  if (sessions.error) throw sessions.error;
  return { batches, students, enrolments, sessions: sessions.data ?? [] } as ObservationContext;
}
export async function listObservations(academy: string, cursor?: Pick<Observation, 'id' | 'created_at'>): Promise<{ observations: Observation[]; more: boolean }> {
  if (!supabase) throw new Error('Client unavailable');
  let query = supabase.from('observations').select(columns).eq('academy_id', academy)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(30);
  if (cursor) {
    // Both cursor fields are validated server values; never concatenate form text
    // into a PostgREST filter. The UUID tie-breaker avoids skipping equal timestamps.
    if (!/^[0-9a-f-]{36}$/.test(cursor.id) || !Number.isFinite(Date.parse(cursor.created_at)) || !/^[0-9T:.+Z-]+$/.test(cursor.created_at)) throw new Error('Invalid history cursor');
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }
  const result = await query;
  if (result.error) throw result.error;
  const observations = (result.data ?? []) as Observation[];
  return { observations, more: observations.length === 30 };
}
export async function getObservation(academy: string, id: string): Promise<{ observation: Observation | null; recipients: string[]; versions: ObservationVersion[] }> {
  if (!supabase) throw new Error('Client unavailable');
  const [value, recipients, versions] = await Promise.all([
    supabase.from('observations').select(columns).eq('academy_id', academy).eq('id', id).maybeSingle(),
    supabase.from('observation_recipients').select('student_id').eq('academy_id', academy).eq('observation_id', id),
    supabase.from('observation_versions').select('revision,note,status,saved_at').eq('academy_id', academy).eq('observation_id', id).order('revision', { ascending: false }).limit(5),
  ]);
  for (const result of [value, recipients, versions]) if (result.error) throw result.error;
  return { observation: value.data as Observation | null, recipients: (recipients.data ?? []).map(row => row.student_id), versions: (versions.data ?? []) as ObservationVersion[] };
}
export async function saveObservation(academy: string, draft: ObservationDraft, status: Observation['status']): Promise<Observation> {
  if (!supabase) throw new Error('Client unavailable');
  const result = await supabase.rpc('save_observation', { target_academy: academy, target_observation: draft.id,
    expected_revision: draft.revision, target_batch: draft.batch, target_session: draft.session || null,
    audience_kind: draft.audience, recipient_ids: draft.recipients, note_text: draft.note, desired_status: status }).single();
  if (result.error) throw result.error;
  const value = result.data as Observation;
  if (!value || value.id !== draft.id || !Number.isInteger(value.revision) || value.status !== status) throw new Error('Observation result not confirmed');
  return value;
}
