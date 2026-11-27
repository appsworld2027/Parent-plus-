// Contract C1.2 (PV-02, PV-05, PV-06). Pure rules shared by the screen and unit tests; the database enforces the same limits.
export type ProviderStatus = 'draft' | 'pending' | 'verified' | 'rejected';
export type ProviderValues = { name: string; phone: string; bio: string; sports: string; experience: string };
export type ProviderErrors = Partial<Record<keyof ProviderValues, string>>;
export type ProviderView = { status: ProviderStatus; reason: string | null; decided_at: string | null; is_admin: boolean;
  profile: { name: string; phone: string; bio: string; sports: string[]; experience: number | null }; documents: { kind: DocumentKind; file_name: string }[] };
export type DocumentKind = 'photo_id' | 'qualification';
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export const splitSports = (text: string) => text.split(',').map(part => part.trim()).filter(Boolean);
export function validateProfile(v: ProviderValues): ProviderErrors {
  const errors: ProviderErrors = {};
  if (!v.name.trim()) errors.name = 'Enter your full name.';
  if (!/^\d{10}$/.test(v.phone.trim())) errors.phone = 'Enter a phone number with 10 digits.';
  if (v.bio.trim().length < 20) errors.bio = 'Write at least 20 characters about yourself.';
  if (splitSports(v.sports).length === 0) errors.sports = 'Add at least one sport.';
  if (!/^\d{1,2}$/.test(v.experience.trim()) || Number(v.experience) > 60) errors.experience = 'Enter years of experience as a whole number.';
  return errors;
}
export function validateDocument(file: { mime: string; size: number }): string {
  if (!ALLOWED_TYPES.includes(file.mime)) return 'Use a JPG, PNG or PDF file.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'This file is larger than 5 MB.';
  return '';
}
export const toValues = (view: ProviderView): ProviderValues => ({ name: view.profile.name, phone: view.profile.phone, bio: view.profile.bio,
  sports: view.profile.sports.join(', '), experience: view.profile.experience === null ? '' : String(view.profile.experience) });
export function missingForSubmit(view: ProviderView, current: ProviderValues): string[] {
  const saved = toValues(view), items: string[] = [];
  if (Object.keys(validateProfile(saved)).length) items.push('complete your profile');
  else if ((Object.keys(saved) as (keyof ProviderValues)[]).some(key => saved[key] !== current[key])) items.push('save your profile changes');
  if (!view.documents.some(d => d.kind === 'photo_id')) items.push('add your photo ID');
  if (!view.documents.some(d => d.kind === 'qualification')) items.push('add your qualification');
  return items;
}
export const statusLabel: Record<ProviderStatus, string> = { draft: 'Not submitted', pending: 'Pending review', verified: 'Verified', rejected: 'Rejected' };
export const approvalDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
