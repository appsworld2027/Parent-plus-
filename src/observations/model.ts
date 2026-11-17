import type { Batch, Enrolment, Student } from '../roster/model';
import type { ClassSession } from '../classes/model';
import { localParts } from '../classes/model';

export type Audience = 'student' | 'batch';
export type Observation = { id: string; academy_id: string; batch_id: string; session_id: string | null;
  note: string; status: 'draft' | 'recorded'; audience: Audience; revision: number; author_id: string;
  created_at: string; updated_at: string; recorded_at: string | null };
export type Recipient = { observation_id: string; student_id: string };
export type ObservationDraft = { id: string; batch: string; session: string; audience: Audience;
  recipients: string[]; note: string; revision: number; status: Observation['status'] };
export type DeviceObservation = { version: 1; owner: string; academy: string; savedAt: string; draft: ObservationDraft };
export type ObservationContext = { batches: Batch[]; students: Student[]; enrolments: Enrolment[]; sessions: ClassSession[] };
export type ObservationVersion = { revision: number; note: string; status: Observation['status']; saved_at: string };

export function eligibleRecipients(context: ObservationContext, batch: string, session: string, timezone: string) {
  const linked = context.sessions.find(value => value.id === session);
  // An older linked class outside the recent-class picker must not fall back to
  // today's enrolments. Existing selections remain visible for server validation.
  if (session && !linked) return [];
  const date = localParts(linked?.starts_at ?? new Date().toISOString(), timezone).date;
  const ids = new Set(context.enrolments.filter(enrolment => enrolment.batch_id === batch
    && enrolment.starts_on <= date && (!enrolment.ends_on || enrolment.ends_on >= date)).map(e => e.student_id));
  return context.students.filter(student => !student.archived_at && ids.has(student.id));
}
export function validateObservation(draft: ObservationDraft, record = false): string | null {
  if (!draft.batch) return 'Choose a batch before saving to your workspace.';
  if (draft.note.length > 10_000) return 'Use up to 10,000 characters.';
  if (record && !draft.note.trim()) return 'Write an observation before recording it.';
  if (draft.recipients.length > 500 || new Set(draft.recipients).size !== draft.recipients.length) return 'Review the selected students (up to 500).';
  if (draft.audience === 'student' && draft.recipients.length > 1) return 'An individual observation must have only one student.';
  if (record && !draft.recipients.length) return 'Choose at least one student before recording.';
  return null;
}
export function sameAudience(left: ObservationDraft, right: ObservationDraft) {
  return left.batch === right.batch && left.session === right.session && left.audience === right.audience
    && [...left.recipients].sort().join(',') === [...right.recipients].sort().join(',');
}
export function sameObservation(left: ObservationDraft, right: ObservationDraft) {
  return sameAudience(left, right) && left.note === right.note && left.status === right.status;
}
export function fromObservation(value: Observation, recipients: string[]): ObservationDraft {
  return { id: value.id, batch: value.batch_id, session: value.session_id ?? '', audience: value.audience,
    recipients: [...recipients], note: value.note, revision: value.revision, status: value.status };
}
