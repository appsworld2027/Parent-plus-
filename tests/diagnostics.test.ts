import { describe, expect, it } from 'vitest';
import { createDiagnostics } from '../src/diagnostics';

describe('privacy-safe error reports', () => {
  it('keeps a bounded buffer with distinct references', () => {
    const log = createDiagnostics(2);
    const first = log.record('CONTROLLED_FAILURE');
    log.record('SCREEN_FAILURE');
    const last = log.record('REPORT_SHARE_FAILED');
    expect(log.list()).toHaveLength(2);
    expect(log.list().map(x => x.reference)).not.toContain(first.reference);
    expect(new Set(log.list().map(x => x.reference)).size).toBe(2);
    expect(last.action).toBe('share-report');
  });
  it('bounds a capacity-one buffer', () => {
    const log = createDiagnostics(1);
    log.record('SCREEN_FAILURE'); log.record('CONTROLLED_FAILURE');
    expect(log.list()).toHaveLength(1);
  });
  it('does not accept arbitrary messages or private fields', () => {
    const log = createDiagnostics();
    expect(() => log.record('password=secret' as never)).toThrow('Unsupported diagnostic code');
    log.record('CONTROLLED_FAILURE');
    const event = JSON.parse(log.export()).events[0];
    expect(Object.keys(event).sort()).toEqual(['action', 'build', 'code', 'reference', 'timestamp']);
    expect(log.export()).not.toContain('password');
  });
  it('clears reports and protects internal records from caller mutation', () => {
    const log = createDiagnostics();
    log.record('SCREEN_FAILURE');
    const copy = log.list(); copy.pop();
    expect(log.list()).toHaveLength(1);
    log.clear(); expect(JSON.parse(log.export()).events).toEqual([]);
  });
  it('captures UTC timestamps and rejects invalid capacity', () => {
    const log = createDiagnostics(3, () => new Date('2026-11-11T10:00:00Z'));
    expect(log.record('SCREEN_FAILURE').timestamp).toBe('2026-11-11T10:00:00.000Z');
    expect(() => createDiagnostics(0)).toThrow();
  });
});

describe('device-persisted diagnostics', () => {
  const now = () => new Date('2026-11-12T04:00:00.000Z');
  function memory() {
    const values = new Map<string, string>();
    return { values, driver: {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => { values.set(key, value); },
      removeItem: async (key: string) => { values.delete(key); },
    } };
  }
  it('restores safe errors across restarts and keeps the bounded limit', async () => {
    const { driver } = memory();
    const original = createDiagnostics(2, now);
    await original.connect(driver);
    original.record('AUTH_FAILURE'); original.record('ROSTER_FAILURE');
    await original.flush();
    const reopened = createDiagnostics(2, now);
    await reopened.connect(driver);
    expect(reopened.list().map(x => x.code)).toEqual(['AUTH_FAILURE', 'ROSTER_FAILURE']);
    reopened.record('SCREEN_FAILURE'); await reopened.flush();
    const again = createDiagnostics(2, now); await again.connect(driver);
    expect(again.list().map(x => x.code)).toEqual(['ROSTER_FAILURE', 'SCREEN_FAILURE']);
  });
  it('strips extra fields and discards expired, future or unsupported records', async () => {
    const { driver, values } = memory();
    const valid = { reference: 'PP-RESTORE-1', code: 'AUTH_FAILURE', timestamp: now().toISOString(), build: '0.2.1+local', password: 'PRIVATE', action: 'raw private response' };
    values.set('parentplus.coach.diagnostics.v1', JSON.stringify([valid,
      { ...valid, reference: 'PP-RESTORE-2', timestamp: '2026-10-01T00:00:00.000Z' },
      { ...valid, reference: 'PP-RESTORE-3', timestamp: '2099-01-01T00:00:00.000Z' },
      { ...valid, reference: 'PP-RESTORE-4', code: 'raw-password-message' }]));
    const log = createDiagnostics(30, now); await log.connect(driver); await log.flush();
    expect(log.list()).toHaveLength(1);
    expect(log.list()[0].action).toBe('auth-request');
    expect(log.export()).not.toContain('PRIVATE');
    expect([...values.values()].join('')).not.toContain('PRIVATE');
  });
  it('merges startup errors recorded before restoration finishes', async () => {
    const { driver } = memory();
    const old = createDiagnostics(30, now); await old.connect(driver);
    old.record('AUTH_FAILURE'); await old.flush();
    const next = createDiagnostics(30, now);
    next.record('SESSION_FAILURE');
    await next.connect(driver); await next.flush();
    expect(next.list().map(x => x.code)).toEqual(['AUTH_FAILURE', 'SESSION_FAILURE']);
  });
  it('clear during restoration cannot resurrect signed-out reports', async () => {
    const old = createDiagnostics(30, now); old.record('AUTH_FAILURE');
    let release!: (value: string) => void;
    let persisted: string | null = null;
    const log = createDiagnostics(30, now);
    const connecting = log.connect({
      getItem: () => new Promise<string>(resolve => { release = resolve; }),
      setItem: async (_key, value) => { persisted = value; },
      removeItem: async () => { persisted = null; },
    });
    log.clear();
    release(JSON.stringify(old.list()));
    await connecting; await log.flush();
    expect(log.list()).toEqual([]); expect(persisted).toBeNull();
  });
  it('unavailable storage never throws from record or prevents report export', async () => {
    const log = createDiagnostics(30, now);
    await log.connect({ getItem: async () => { throw new Error('device unavailable'); },
      setItem: async () => { throw new Error('full'); }, removeItem: async () => { throw new Error('full'); } });
    expect(() => log.record('ROSTER_FAILURE')).not.toThrow();
    await log.flush();
    expect(log.storageStatus()).toBe('storage-unavailable');
    expect(log.export()).toContain('ROSTER_FAILURE');
    expect(log.export()).not.toContain('device unavailable');
  });
  it('corrupt JSON is discarded instead of being exported', async () => {
    const { driver, values } = memory();
    values.set('parentplus.coach.diagnostics.v1', 'raw secret, invalid JSON');
    const log = createDiagnostics(30, now); await log.connect(driver); await log.flush();
    expect(log.list()).toEqual([]); expect(log.export()).not.toContain('raw secret');
    expect(values.size).toBe(0);
  });
});

it('records Parent attendance failures as metadata without accepting private payloads',()=>{
 const log=createDiagnostics();
 expect(log.record('PARENT_ATTENDANCE_FAILURE' as never).action).toBe('parent-attendance-request');
 expect(Object.keys(log.list()[0]).sort()).toEqual(['action','build','code','reference','timestamp']);
});
