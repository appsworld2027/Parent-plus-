import type { StorageDriver } from '../auth/storage';
import type { DeviceObservation } from './model';

const key = 'parentplus.coach.observation-draft.v1';
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value);
export function parseDeviceObservation(raw: string | null): DeviceObservation | null {
  if (!raw) return null;
  if (raw.length > 150_000) throw new Error('Invalid observation device draft');
  const value = JSON.parse(raw);
  const draft = value?.draft;
  if (value?.version !== 1 || !identifier(value.owner) || !identifier(value.academy)
    || typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt))
    || !draft || !identifier(draft.id) || (draft.batch !== '' && !identifier(draft.batch))
    || (draft.session !== '' && !identifier(draft.session)) || !['student', 'batch'].includes(draft.audience)
    || !['draft', 'recorded'].includes(draft.status) || !Number.isInteger(draft.revision) || draft.revision < 0
    || typeof draft.note !== 'string' || draft.note.length > 10_000 || !Array.isArray(draft.recipients)
    || draft.recipients.length > 500 || draft.recipients.some((id: unknown) => !identifier(id))
    || new Set(draft.recipients).size !== draft.recipients.length
    || (draft.audience === 'student' && draft.recipients.length > 1)) throw new Error('Invalid observation device draft');
  // Whitelist fields. The private note is encrypted by the native driver and is
  // never included in diagnostics. Browser development uses sessionStorage.
  return { version: 1, owner: value.owner, academy: value.academy, savedAt: value.savedAt,
    draft: { id: draft.id, batch: draft.batch, session: draft.session, audience: draft.audience,
      recipients: [...draft.recipients], note: draft.note, revision: draft.revision, status: draft.status } };
}

// Epochs invalidate scheduled/in-flight writers at sign-out. Conditional cleanup
// cannot erase a newer edit if an older server request finishes after reopening.
export function createObservationDrafts(storage: StorageDriver) {
  let queue: Promise<unknown> = Promise.resolve();
  let epoch = 0;
  let latestWrite = 0;
  function serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation); queue = result.catch(() => undefined); return result;
  }
  return {
    token: () => epoch,
    read: () => serial(async () => parseDeviceObservation(await storage.getItem(key))),
    save: (snapshot: DeviceObservation, token: number) => {
      const write = ++latestWrite;
      return serial(async () => {
      if (token !== epoch) throw new Error('Observation writer expired');
      if (write !== latestWrite) return 'superseded' as const;
      const clean = parseDeviceObservation(JSON.stringify(snapshot));
      if (!clean) throw new Error('Invalid observation device draft');
      await storage.setItem(key, JSON.stringify(clean));
      return 'saved' as const;
      });
    },
    clear: (snapshot?: DeviceObservation) => {
      if (!snapshot) epoch++;
      return serial(async () => {
        if (!snapshot) { await storage.removeItem(key); return; }
        const current = parseDeviceObservation(await storage.getItem(key));
        if (JSON.stringify(current) === JSON.stringify(snapshot)) await storage.removeItem(key);
      });
    },
  };
}
