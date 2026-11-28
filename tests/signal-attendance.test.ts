import { describe, expect, it } from 'vitest';
import { marksFromSignals, signalFillLabel, signalHint } from '../src/classes/signalSuggestions';
const sig = (student_id: string, kind: string, changed_at = '2026-11-28T08:00:00Z') => ({ student_id, kind, changed_at });
describe('attendance suggestions from parent signals (M2-10)', () => {
  it('SA-01 each signal maps to one mark', () => {
    expect(marksFromSignals([sig('a', 'dropped_off'), sig('b', 'running_late'), sig('c', 'missing_today')], ['a', 'b', 'c'], {})).toEqual({ a: 'present', b: 'late', c: 'absent' });
  });
  it('SA-02 never overrides a mark the coach already set', () => {
    expect(marksFromSignals([sig('a', 'missing_today')], ['a'], { a: 'present' })).toEqual({});
  });
  it('SA-03 children not eligible for this class are ignored', () => { expect(marksFromSignals([sig('x', 'dropped_off')], ['a'], {})).toEqual({}); });
  it('SA-04 the newest signal per child wins', () => {
    expect(marksFromSignals([sig('a', 'running_late', '2026-11-28T08:00:00Z'), sig('a', 'missing_today', '2026-11-28T09:00:00Z')], ['a'], {})).toEqual({ a: 'absent' });
  });
  it('SA-05 unknown kinds and an empty list suggest nothing', () => {
    expect(marksFromSignals([sig('a', 'chat_message')], ['a'], {})).toEqual({}); expect(marksFromSignals([], ['a'], {})).toEqual({});
  });
  it('SA-06 wording states what parents said and that nothing is saved yet', () => {
    expect(signalFillLabel(2)).toBe('Apply parent signals (2)');
    expect(signalHint({ a: 'absent', b: 'absent', c: 'late', d: 'present' })).toBe('Parents told you: 2 missing, 1 running late, 1 dropped off. Nothing is saved until you tap Save.');
  });
});
