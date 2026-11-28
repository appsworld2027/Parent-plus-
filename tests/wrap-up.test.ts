// Rules for docs/product/end-of-day-queue (EQ-01,02,04 and wording).
import { describe, expect, it } from 'vitest';
import { classesLine, draftsLine, wrapUp } from '../src/today/wrapUp';

const now = new Date('2026-11-28T12:00:00Z'), tz = 'Asia/Kolkata';
const c = (at: string, status = 'scheduled', rev = 0) => ({ id: at + status + rev, starts_at: at, status, attendance_revision: rev });
describe('end-of-day queue', () => {
  it('EQ-01 counts started, unmarked classes today', () => expect(wrapUp([c('2026-11-28T04:30:00Z'), c('2026-11-28T06:30:00Z')], 0, tz, now).classesNeedingAttendance).toBe(2));
  it('EQ-04 ignores cancelled, future, other-day, attendance-saved', () => {
    expect(wrapUp([c('2026-11-28T04:30:00Z', 'cancelled'), c('2026-11-28T14:00:00Z'), c('2026-11-27T04:30:00Z'), c('2026-11-28T04:30:00Z', 'scheduled', 1)], 0, tz, now).classesNeedingAttendance).toBe(0);
  });
  it('EQ-02 passes draft count through; wording', () => {
    expect(wrapUp([], 4, tz, now).feedbackDrafts).toBe(4);
    expect(classesLine(1)).toBe('1 class needs attendance'); expect(classesLine(2)).toBe('2 classes need attendance');
    expect(draftsLine(1)).toBe('1 feedback draft to finish'); expect(draftsLine(3)).toBe('3 feedback drafts to finish');
  });
  it('timezone decides "today": 23:00 UTC on the 27th is 28th in India', () => expect(wrapUp([c('2026-11-27T23:00:00Z')], 0, tz, now).classesNeedingAttendance).toBe(1));
});
