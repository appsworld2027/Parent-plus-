import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../auth/client';
import type { DocumentKind, ProviderValues, ProviderView } from './model';
import { splitSports } from './model';

const bucket = 'provider-documents';
export type PickedFile = { name: string; mime: string; size: number; read: () => Promise<Uint8Array> };
export type ReviewItem = { user_id: string; name: string; phone: string; bio: string; sports: string[]; experience: number | null; submitted_at: string | null;
  documents: { kind: DocumentKind; path: string; file_name: string }[] };
function client() { if (!supabase) throw new Error('Client unavailable'); return supabase; }
async function rpc<T>(name: string, args?: object): Promise<T> { const result = await client().rpc(name, args); if (result.error) throw result.error; return result.data as T; }

export const loadProfile = () => rpc<ProviderView>('get_my_provider_profile');
export const saveProfile = (v: ProviderValues) => rpc<ProviderView>('save_provider_profile', { p_name: v.name.trim(), p_phone: v.phone.trim(), p_bio: v.bio.trim(), p_sports: splitSports(v.sports), p_experience: Number(v.experience) });
export const submitProfile = () => rpc<ProviderView>('submit_provider_profile');
export const loadReviewQueue = () => rpc<ReviewItem[]>('list_provider_review_queue');
export const decide = (user: string, decision: 'approve' | 'reject', reason: string | null, submittedAt: string | null) => rpc<null>('decide_provider_profile', { p_user: user, p_decision: decision, p_reason: reason, p_submitted_at: submittedAt });

export async function pickDocument(): Promise<PickedFile | null> {
  if (Platform.OS === 'web') return new Promise(resolve => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,application/pdf';
    input.onchange = () => { const file = input.files?.[0]; resolve(file ? { name: file.name, mime: file.type, size: file.size, read: async () => new Uint8Array(await file.arrayBuffer()) } : null); };
    input.oncancel = () => resolve(null); input.click();
  });
  const picked = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'application/pdf'], copyToCacheDirectory: true });
  const asset = picked.canceled ? null : picked.assets[0];
  return asset ? { name: asset.name, mime: asset.mimeType ?? '', size: asset.size ?? 0, read: async () => new Uint8Array(await (await fetch(asset.uri)).arrayBuffer()) } : null;
}
export async function uploadDocument(kind: DocumentKind, file: PickedFile): Promise<ProviderView> {
  const session = (await client().auth.getSession()).data.session;
  if (!session) throw new Error('Signed out');
  const path = `${session.user.id}/${kind}/${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]/g, '_')}`;
  const stored = await client().storage.from(bucket).upload(path, await file.read(), { contentType: file.mime, upsert: false });
  if (stored.error) throw stored.error;
  return rpc<ProviderView>('register_provider_document', { p_kind: kind, p_path: path, p_file_name: file.name.slice(0, 200), p_mime: file.mime, p_size: file.size });
}
// Private, short-lived (5 minutes) link; never a public URL.
export async function signedDocumentUrl(path: string) {
  const signed = await client().storage.from(bucket).createSignedUrl(path, 300);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}
export type VerifiedProvider = { user_id: string; name: string; decided_at: string | null; submitted_at: string | null };
export const loadVerifiedProviders = () => rpc<VerifiedProvider[]>('list_verified_providers');
