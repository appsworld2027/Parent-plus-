export type Student = { id: string; name: string; age_years: number | null; archived_at: string | null };
export type Contact = { student_id: string; name: string; email: string | null; phone: string | null };
export type Batch = { id: string; name: string; room: string; monthly_fee_paise: number; archived_at: string | null };
export type Enrolment = { student_id: string; batch_id: string; starts_on: string; ends_on: string | null };
export type Roster = { students: Student[]; contacts: Contact[]; batches: Batch[]; enrolments: Enrolment[] };
export type StudentDraft = { id: string; name: string; age: string; guardian: string; email: string; phone: string; batches: string[] };
export type BatchDraft = { id: string; name: string; room: string; fee: string };

// Parse decimal text directly into paise. Floating-point rupees (parseFloat * 100)
// can round incorrectly; API/database amounts use integers. No currency conversion.
export function parseFee(rupees: string): number | null {
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(rupees.trim())) return null;
  const [whole, fraction = ''] = rupees.trim().split('.');
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(value) && value <= 100000000000 ? value : null;
}
export function validateStudent(draft: StudentDraft): string | null {
  if (!draft.name.trim() || draft.name.trim().length > 100) return 'Enter a student name, up to 100 characters.';
  if (draft.age && (!/^\d{1,3}$/.test(draft.age) || Number(draft.age) > 120)) return 'Enter a whole-number age between 0 and 120, or leave it blank.';
  if ((draft.email.trim() || draft.phone.trim()) && !draft.guardian.trim()) return 'Enter the guardian name with their contact details.';
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return 'Check the guardian email address.';
  if (draft.guardian.length > 100 || draft.email.length > 320 || draft.phone.length > 30) return 'Shorten the guardian contact details.';
  if (draft.batches.length > 50) return 'Choose no more than 50 batches.';
  return null;
}
export function formatFee(paise: number) { return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; }
