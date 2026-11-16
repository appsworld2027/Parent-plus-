import { supabase } from '../auth/client';
import { classMediaType, type ClassMedia, type MediaConsent, type MediaKind } from './model';
export const classMediaBucket = 'parentplus-class-media';
export async function loadClassMedia(academy: string, session: string | null) {
  if (!supabase) throw new Error('Unavailable');
  const consents: MediaConsent[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await supabase.from('coach_media_consents').select('student_id,guardian_name,evidence_note,allow_photos,allow_videos,allow_parent_sharing,recorded_at').eq('academy_id', academy).order('student_id').range(offset, offset + 499);
    if (page.error) throw page.error;
    consents.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < 500) break;
  }
  const result = session ? await supabase.from('class_media').select('id,session_id,subject_ids,kind,object_path,content_type,byte_size,state,created_at').eq('academy_id', academy).eq('session_id', session).eq('state', 'ready').order('created_at') : { data: [], error: null };
  if (result.error) throw result.error;
  return { consents, media: (result.data ?? []) as ClassMedia[] };
}
export async function recordMediaConsent(academy: string, child: string, guardian: string, evidence: string, photos: boolean, videos: boolean, sharing: boolean) {
  if (!supabase) throw new Error('Unavailable');
  const result = await supabase.rpc('record_coach_media_consent', { target_academy: academy, target_student: child, guardian_name: guardian.trim(), evidence_note: evidence.trim(), allow_photos: photos, allow_videos: videos, allow_parent_sharing: sharing });
  if (result.error) throw result.error;
}
export type PendingClassMedia = { id: string; uri: string; subjects: string[]; kind: MediaKind };
export async function uploadClassMedia(academy: string, session: string, pending: PendingClassMedia) {
  if (!supabase) throw new Error('Unavailable');
  const response = await fetch(pending.uri);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const type = classMediaType(bytes, pending.kind);
  const prepared = await supabase.rpc('prepare_class_media', { target_academy: academy, target_session: session, target_media: pending.id, subjects: pending.subjects, media_kind: pending.kind, mime: type.mime, size_bytes: bytes.length });
  if (prepared.error) throw prepared.error;
  const path = prepared.data;
  if (typeof path !== 'string' || !path.startsWith(`${academy}/${session}/${pending.id}.`)) throw new Error('Media path not confirmed');
  const upload = await supabase.storage.from(classMediaBucket).upload(path, bytes, { contentType: type.mime, upsert: false });
  // A lost upload/finish response can leave the immutable object in place.
  // Reuse the same media identity and let the trusted finalizer verify it.
  if (upload.error && !['409','Duplicate'].includes(String(upload.error.statusCode))) throw upload.error;
  const finished = await supabase.rpc('finish_class_media', { target_academy: academy, target_media: pending.id });
  if (finished.error) throw finished.error;
}
export function mediaSetupError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  return ['42P01','PGRST205','PGRST202'].includes(code) ? 'Class media and Parent handoff are not enabled for this workspace yet. Existing feedback and WhatsApp remain available.' : 'This action could not be confirmed. Keep your review and retry. Check guardian permission for everyone pictured.';
}
