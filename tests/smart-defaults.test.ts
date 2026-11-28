// M2-09 SD-01..08
import { describe, expect, it } from 'vitest';
import { suggestedMarks } from '../src/classes/smartDefaults';

const s = ['s5', 's4', 's3', 's2', 's1'];
const mk = (id: string, ...status: string[]) => status.map((st, i) => ({ session_id: s[i], student_id: id, status: st }));
describe('smart attendance defaults', () => {
  it('SD-01 suggests present for a regular attender', () => expect(suggestedMarks(s, mk('a', 'present', 'present', 'late', 'absent', 'present'), ['a'], {})).toEqual({ a: 'present' }));
  it('SD-02 no suggestion when absent last time', () => expect(suggestedMarks(s, mk('a', 'absent', 'present', 'present', 'present', 'present'), ['a'], {})).toEqual({}));
  it('SD-03 no suggestion below 3 attended', () => expect(suggestedMarks(s, mk('a', 'present', 'present', 'absent', 'absent', 'absent'), ['a'], {})).toEqual({}));
  it('SD-04 new child with no history stays blank', () => expect(suggestedMarks(s, [], ['a'], {})).toEqual({}));
  it('SD-05 never overrides marks the coach already made', () => expect(suggestedMarks(s, mk('a', 'present', 'present', 'present'), ['a'], { a: 'absent' })).toEqual({}));
  it('SD-06 only the last 5 classes count', () => expect(suggestedMarks([...s, 's0'], [...mk('a', 'present', 'absent', 'absent', 'absent', 'absent'), { session_id: 's0', student_id: 'a', status: 'present' }], ['a'], {})).toEqual({}));
  it('SD-07 no classes means no suggestions', () => expect(suggestedMarks([], [], ['a', 'b'], {})).toEqual({}));
  it('SD-08 a missing mark last time (unmarked) is not suggested', () => expect(suggestedMarks(s, mk('a').concat([{ session_id: 's4', student_id: 'a', status: 'present' }, { session_id: 's3', student_id: 'a', status: 'present' }, { session_id: 's2', student_id: 'a', status: 'present' }]), ['a'], {})).toEqual({}));
});
