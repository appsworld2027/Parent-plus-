export const announcementLimit = 500;
// Pure rule (CA-03/04) so it is unit-testable: returns an error note, or null when the text can be posted.
export function announcementProblem(text: string): string | null {
  const t = text.trim();
  if (!t) return 'Write a message first.';
  if (t.length > announcementLimit) return `Keep it under ${announcementLimit} characters.`;
  return null;
}
