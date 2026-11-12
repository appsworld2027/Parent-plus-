import type { StorageDriver } from '../auth/storage';
import type { AttendanceDraft, Mark } from './model';

const key = 'parentplus.coach.attendance-draft.v1';
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value);
export function parseAttendanceDraft(raw: string | null): AttendanceDraft | null {
  if (!raw || raw.length > 100_000) return null;
  try {
    const value = JSON.parse(raw);
    if (value.version !== 1 || !identifier(value.owner) || !identifier(value.academy) || !identifier(value.session)
      || typeof value.fingerprint !== 'string' || !/^[a-zA-Z0-9|: .+\-TZ]{1,300}$/.test(value.fingerprint)
      || !Number.isInteger(value.revision) || value.revision < 0 || typeof value.savedAt !== 'string'
      || !Number.isFinite(Date.parse(value.savedAt)) || !value.marks || typeof value.marks !== 'object' || Array.isArray(value.marks)) return null;
    const entries = Object.entries(value.marks);
    if (entries.length > 500 || entries.some(([id, mark]) => !identifier(id) || (typeof mark !== 'string' || !['present', 'late', 'absent'].includes(mark)))) return null;
    // Rebuild fields; do not retain student names or arbitrary stored properties.
    return { version: 1, owner: value.owner, academy: value.academy, session: value.session,
      fingerprint: value.fingerprint, revision: value.revision, savedAt: value.savedAt, marks: Object.fromEntries(entries) as Record<string, Mark> };
  } catch { return null; }
}

// One active attendance draft per device. The UI offers to resume/discard it
// before another class replaces it. Serialize read/check/delete as one operation.
export function createAttendanceDrafts(storage: StorageDriver) {
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation); queue = result.catch(() => undefined); return result;
  }
  return {
    read: () => serial(async () => parseAttendanceDraft(await storage.getItem(key))),
    save: (draft: AttendanceDraft) => serial(async () => {
      const clean = parseAttendanceDraft(JSON.stringify(draft));
      if (!clean) throw new Error('Invalid attendance draft');
      await storage.setItem(key, JSON.stringify(clean));
    }),
    clear: (scope?: { owner: string; academy: string; session: string }) => serial(async () => {
      const current = parseAttendanceDraft(await storage.getItem(key));
      if (!scope || (current?.owner === scope.owner && current.academy === scope.academy && current.session === scope.session)) await storage.removeItem(key);
    }),
  };
}
