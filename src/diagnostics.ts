import { diagnosticBuild } from './version';
import type { StorageDriver } from './auth/storage';

export type ErrorCode = 'CONTROLLED_FAILURE' | 'SCREEN_FAILURE' | 'REPORT_SHARE_FAILED'
  | 'AUTH_FAILURE' | 'SESSION_FAILURE' | 'ACADEMY_FAILURE' | 'AUTH_CALLBACK_FAILURE' | 'ROSTER_FAILURE' | 'CLASS_FAILURE' | 'OBSERVATION_FAILURE';
export type Diagnostic = Readonly<{
  reference: string;
  timestamp: string;
  code: ErrorCode;
  action: 'diagnostic-check' | 'screen-render' | 'share-report' | 'auth-request' | 'session-restore' | 'academy-request' | 'email-link' | 'roster-request' | 'class-request' | 'observation-request';
  build: string;
}>;

const allowedActions = {
  CONTROLLED_FAILURE: 'diagnostic-check',
  SCREEN_FAILURE: 'screen-render',
  REPORT_SHARE_FAILED: 'share-report',
  AUTH_FAILURE: 'auth-request',
  SESSION_FAILURE: 'session-restore',
  ACADEMY_FAILURE: 'academy-request',
  AUTH_CALLBACK_FAILURE: 'email-link',
  ROSTER_FAILURE: 'roster-request',
  CLASS_FAILURE: 'class-request',
  OBSERVATION_FAILURE: 'observation-request',
} as const;

const storageKey = 'parentplus.coach.diagnostics.v1';
const retentionMs = 14 * 24 * 60 * 60 * 1000;

// Stored data is untrusted input. Rebuild allowed fields rather than forwarding a
// stored object into reports: this also discards unknown/private fields and codes.
function restoreEvents(raw: string | null, now: Date): Diagnostic[] {
  if (!raw || raw.length > 50_000) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): Diagnostic[] => {
    if (!item || typeof item !== 'object') return [];
    const { code, reference, timestamp, build } = item;
    if (typeof code !== 'string' || !Object.hasOwn(allowedActions, code)
      || typeof reference !== 'string' || !/^PP-[A-Z0-9]{1,12}-[A-Z0-9]{1,12}$/.test(reference)
      || typeof build !== 'string' || !/^[0-9]+\.[0-9]+\.[0-9]+\+[a-zA-Z0-9-]{1,40}$/.test(build)
      || typeof timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp)) return [];
    const age = now.getTime() - Date.parse(timestamp);
    if (!Number.isFinite(age) || age < 0 || age > retentionMs) return [];
    return [Object.freeze({ code: code as ErrorCode, reference, timestamp, build,
      action: allowedActions[code as ErrorCode] })];
  });
}

// Only enumerated metadata is recorded. Writes are best-effort: storage failure
// must not cause a second app failure. This does not capture native crash stacks.
export function createDiagnostics(limit = 30, now = () => new Date()) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid diagnostic capacity');
  let records: Diagnostic[] = [];
  let sequence = 0;
  let epoch = 0;
  let storage: StorageDriver | null = null;
  let restoration: Promise<void> = Promise.resolve();
  let writes: Promise<void> = Promise.resolve();
  let status: 'memory-only' | 'loading' | 'saved-on-device' | 'storage-unavailable' = 'memory-only';
  const session = Math.random().toString(36).slice(2, 8) || '0';

  function persist() {
    if (!storage) return;
    const generation = epoch;
    writes = writes.then(async () => {
      await restoration;
      // Clear/sign-out invalidates queued writes and in-flight restoration.
      if (generation !== epoch) return;
      try {
        if (records.length) await storage!.setItem(storageKey, JSON.stringify(records));
        else await storage!.removeItem(storageKey);
        status = 'saved-on-device';
      } catch { status = 'storage-unavailable'; }
    });
  }

  return {
    connect(driver: StorageDriver): Promise<void> {
      if (storage) return restoration;
      storage = driver; status = 'loading';
      const generation = epoch;
      restoration = (async () => {
        try {
          const raw = await driver.getItem(storageKey);
          const restored = restoreEvents(raw, now());
          if (generation === epoch) {
            const combined = [...restored, ...records];
            records = combined.filter((event, index) => combined.findIndex(x => x.reference === event.reference) === index).slice(-limit);
          }
          status = 'saved-on-device';
        } catch { status = 'storage-unavailable'; }
      })();
      // Persist only validated, bounded events, including errors recorded at boot.
      persist();
      return restoration;
    },
    ready: () => restoration,
    flush: () => writes,
    storageStatus: () => status,
    record(code: ErrorCode): Diagnostic {
      if (!Object.hasOwn(allowedActions, code)) throw new Error('Unsupported diagnostic code');
      const event = Object.freeze({ reference: `PP-${session}-${(++sequence).toString(36)}`.toUpperCase(),
        timestamp: now().toISOString(), code, action: allowedActions[code], build: diagnosticBuild });
      records = [...records, event].slice(-limit);
      persist();
      return event;
    },
    list: () => [...records],
    clear: () => { epoch++; records = []; persist(); },
    export: () => JSON.stringify({ application: 'Parent Plus Coach', build: diagnosticBuild,
      localStorage: status, events: records }, null, 2),
  };
}

export const diagnostics = createDiagnostics();
