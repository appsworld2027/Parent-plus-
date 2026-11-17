import { photoType } from '../photos/model';
export type MediaKind = 'photo' | 'video';
export type MediaConsent = { student_id: string; guardian_name: string; evidence_note: string; allow_photos: boolean; allow_videos: boolean; allow_parent_sharing: boolean; recorded_at: string };
export type ClassMedia = { id: string; session_id: string; subject_ids: string[]; kind: MediaKind; object_path: string; content_type: string; byte_size: number; state: 'prepared' | 'ready'; created_at: string };
export function canUseMedia(consents: MediaConsent[], subjects: string[], kind: MediaKind, sharing = false) {
  return subjects.length > 0 && new Set(subjects).size === subjects.length && subjects.every(id => {
    const consent = consents.find(value => value.student_id === id);
    return !!consent && (kind === 'photo' ? consent.allow_photos : consent.allow_videos) && (!sharing || consent.allow_parent_sharing);
  });
}
export function classMediaType(bytes: Uint8Array, kind: MediaKind): { mime: string; extension: string } {
  if (kind === 'photo') return photoType(bytes);
  if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new Error('Choose a video up to 25 MB.');
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (text(4, 8) === 'ftyp' && ['isom','iso2','mp41','mp42','avc1','M4V ','qt  '].includes(text(8, 12))) return text(8, 12) === 'qt  ' ? { mime: 'video/quicktime', extension: 'mov' } : { mime: 'video/mp4', extension: 'mp4' };
  if ([0x1a,0x45,0xdf,0xa3].every((value,index) => bytes[index] === value)) return { mime: 'video/webm', extension: 'webm' };
  throw new Error('Choose an MP4, MOV or WebM video.');
}
