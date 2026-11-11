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
