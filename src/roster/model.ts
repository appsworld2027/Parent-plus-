export type Proficiency = 'unassessed' | 'new' | 'beginner' | 'intermediate' | 'advanced';
export const proficiencyLabels: Record<Proficiency,string> = {unassessed:'Not assessed',new:'New learner',beginner:'Beginner',intermediate:'Intermediate',advanced:'Advanced'};
export type Student = { id: string; name: string; age_years: number | null; archived_at: string | null; proficiency_level?: Proficiency };
export type Contact = { student_id: string; name: string; email: string | null; phone: string | null };
export type Batch = { id: string; name: string; room: string; monthly_fee_paise: number; archived_at: string | null };
export type Enrolment = { id?: string; student_id: string; batch_id: string; starts_on: string; ends_on: string | null };
export type Roster = { students: Student[]; contacts: Contact[]; batches: Batch[]; enrolments: Enrolment[] };
export type StudentDraft = { id: string; name: string; age: string; guardian: string; email: string; phone: string; batches: string[]; proficiency?: Proficiency };
export type BatchDraft = { id: string; name: string; room: string; fee: string };

// Parse decimal text directly into paise. Floating-point rupees (parseFloat * 100)
// can round incorrectly; API/database amounts use integers. No currency conversion.
export function parseFee(rupees: string): number | null {
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(rupees.trim())) return null;
  const [whole, fraction = ''] = rupees.trim().split('.');
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(value) && value <= 100000000000 ? value : null;
}
// A teaching batch needs no billing setup. Keep financial input parsing strict.
export function parseBatchFee(value: string): number | null { return parseFee(value.trim() || '0'); }
// UX guard over the currently loaded academy roster. Database uniqueness and
// concurrent writers require a separate server-side policy; names are not IDs.
export function validateBatch(draft: BatchDraft, batches: Batch[]): string | null {
  if (!draft.name.trim() || draft.name.trim().length > 100) return 'Enter a batch name, up to 100 characters.';
  if (parseBatchFee(draft.fee) === null) return 'Enter a monthly fee in rupees, with up to two decimal places.';
  const normalized = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
  const previous = batches.find(batch => batch.id === draft.id);
  if (previous?.archived_at) return 'Archived batches are read only.';
  // Existing legacy duplicates must not block unrelated edits. Only creating
  // or renaming a batch can introduce a new duplicate in this client flow.
  if (previous && normalized(previous.name) === normalized(draft.name)) return null;
  const duplicate = batches.find(batch => batch.id !== draft.id && normalized(batch.name) === normalized(draft.name));
  if (duplicate) return duplicate.archived_at
    ? 'An archived batch with this name already exists. Load all saved batches to review it or choose a different name.'
    : 'A batch with this name already exists. Open the existing batch or choose a different name.';
  return null;
}
export function validateStudent(draft: StudentDraft): string | null {
  if (draft.proficiency && !Object.hasOwn(proficiencyLabels,draft.proficiency)) return 'Choose a valid proficiency level.';
  if (!draft.name.trim() || draft.name.trim().length > 100) return 'Enter a student name, up to 100 characters.';
  if (draft.age && (!/^\d{1,3}$/.test(draft.age) || Number(draft.age) > 120)) return 'Enter a whole-number age between 0 and 120, or leave it blank.';
  if ((draft.email.trim() || draft.phone.trim()) && !draft.guardian.trim()) return 'Enter the guardian name with their contact details.';
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return 'Check the guardian email address.';
  if (draft.guardian.length > 100 || draft.email.length > 320 || draft.phone.length > 30) return 'Shorten the guardian contact details.';
  if (draft.batches.length > 50) return 'Choose no more than 50 batches.';
  return null;
}
export function formatFee(paise: number) { return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; }

export function batchStudents(roster: Roster, batch: string, day: string) {
  const ids = new Set(roster.enrolments.filter(e => e.batch_id === batch && e.starts_on <= day && (!e.ends_on || e.ends_on >= day)).map(e => e.student_id));
  return roster.students.filter(student => !student.archived_at && ids.has(student.id));
}
