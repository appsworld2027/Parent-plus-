// Pure rules for coach-private safety/health notes (M2-43). Mirrors the database check (1..500 characters after trimming).
export const SAFETY_NOTE_MAX = 500;
export type NoteCheck = { ok: true; text: string } | { ok: false; message: string };
export function checkSafetyNote(input: string): NoteCheck {
  const text = input.trim();
  if (text.length > SAFETY_NOTE_MAX) return { ok: false, message: `Keep the note to ${SAFETY_NOTE_MAX} characters or fewer (now ${text.length}).` };
  return { ok: true, text };
}
export const safetyNoteCounter = (input: string) => `${input.trim().length}/${SAFETY_NOTE_MAX}`;
export function safetyFailure(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  if (code === '42501') return 'You cannot change this note. Check you are signed in to the right academy.';
  return 'The safety note could not be saved. Your text is kept; try again.';
}
