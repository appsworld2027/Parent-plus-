// Pure rules for docs/product/attendance-patterns (AP-01..07, 09). Fictional data only.
import { describe, expect, it } from 'vitest';
import { attendanceAlerts, alertLine } from '../src/today/attendancePatterns';

const now = new Date('2026-11-27T12:00:00Z'), today = '2026-11-27';
const student = (id: string, archived = false) => ({ id, name: id, age_years: 8, archived_at: archived ? '2026-01-01T00:00:00Z' : null });
const enrol = (s: string, extra = {}) => ({ student_id: s, batch_id: 'b', starts_on: '2026-01-01', ends_on: null, ...extra });
const cls = (n: number, status = 'completed', batch = 'b') => ({ id: `c${n}`, batch_id: batch, starts_at: `2026-11-${String(n).padStart(2, '0')}T10:00:00Z`, status });
const m = (n: number, s: string, st: string) => ({ session_id: `c${n}`, student_id: s, status: st });
const run = (sessions: ReturnType<typeof cls>[], marks: ReturnType<typeof m>[], students = [student('a')], enrolments = [enrol('a')]) =>
  attendanceAlerts(sessions, marks, students, enrolments, today, now);

describe('attendance patterns', () => {
  const sess = [cls(10), cls(12), cls(14), cls(16)];
  it('AP-01 three absences in a row alert, with wording', () => {
    const r = run(sess, [m(12, 'a', 'absent'), m(14, 'a', 'absent'), m(16, 'a', 'absent'), m(10, 'a', 'present')]);
    expect(r).toEqual([{ studentId: 'a', name: 'a', batchId: 'b', streak: 3 }]);
    expect(alertLine(r[0], 'Clay')).toBe('a · Clay · absent 3 classes in a row');
  });
  it('AP-02 two absences do not alert', () => expect(run(sess, [m(14, 'a', 'absent'), m(16, 'a', 'absent'), m(12, 'a', 'present')])).toEqual([]));
  it('AP-03 counts only the leading run (4 absences then present)', () =>
    expect(run(sess, sess.map(x => m(Number(x.id.slice(1)), 'a', 'absent')))[0].streak).toBe(4));
  it('AP-04 latest present or late breaks it', () => {
    expect(run(sess, [m(10, 'a', 'absent'), m(12, 'a', 'absent'), m(14, 'a', 'absent'), m(16, 'a', 'present')])).toEqual([]);
    expect(run(sess, [m(10, 'a', 'absent'), m(12, 'a', 'absent'), m(14, 'a', 'absent'), m(16, 'a', 'late')])).toEqual([]);
  });
  it('AP-05 an unmarked class ends the streak', () => expect(run(sess, [m(10, 'a', 'absent'), m(14, 'a', 'absent'), m(16, 'a', 'absent')])).toEqual([]));
  it('AP-06 cancelled and future classes are ignored', () => {
    const s = [cls(10), cls(12), cls(14), cls(16, 'cancelled'), cls(28)];
    expect(run(s, [m(10, 'a', 'absent'), m(12, 'a', 'absent'), m(14, 'a', 'absent'), m(28, 'a', 'present')])[0].streak).toBe(3);
  });
  it('AP-07 archived child, ended or not-yet-started enrolment are excluded', () => {
    const marks = [m(12, 'a', 'absent'), m(14, 'a', 'absent'), m(16, 'a', 'absent')];
    expect(run(sess, marks, [student('a', true)])).toEqual([]);
    expect(run(sess, marks, [student('a')], [enrol('a', { ends_on: '2026-06-30' })])).toEqual([]);
    expect(run(sess, marks, [student('a')], [enrol('a', { starts_on: '2027-01-01' })])).toEqual([]);
  });
  it('AP-09 longest streak first, then name; other batches do not mix', () => {
    const s = [...sess, cls(18, 'completed', 'x')];
    const marks = ['a', 'z', 'm'].flatMap(id => [12, 14, 16].map(n => m(n, id, 'absent'))).concat([m(10, 'z', 'absent')]);
    const r = run(s, marks, [student('a'), student('z'), student('m')], [enrol('a'), enrol('z'), enrol('m')]);
    expect(r.map(x => `${x.name}${x.streak}`)).toEqual(['z4', 'a3', 'm3']);
  });
});
