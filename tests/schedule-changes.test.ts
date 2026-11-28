// Rules for docs/product/schedule-changes (SC-01,03,05,06).
import { describe, expect, it } from 'vitest';
import { canRestore, holidayMessage, holidayTargets, withStatus } from '../src/classes/holiday';

const s = (id: string, status: string, rev = 0) => ({ id, batch_id: 'b', starts_at: '2026-11-28T10:30:00.000Z', ends_at: '2026-11-28T11:30:00.000Z', room: 'R1', status, attendance_revision: rev }) as never;
describe('schedule changes', () => {
  it('SC-01/03 only cancelled classes can be restored', () => { expect(canRestore(s('a', 'cancelled'))).toBe(true); expect(canRestore(s('a', 'scheduled'))).toBe(false); expect(canRestore(s('a', 'completed'))).toBe(false); });
  it('SC-05 holiday skips cancelled, completed and attendance-saved classes', () => {
    expect(holidayTargets([s('a', 'scheduled'), s('b', 'cancelled'), s('c', 'scheduled', 2), s('d', 'completed')]).map(x => x.id)).toEqual(['a']);
  });
  it('SC-06 wording for none, one, many', () => {
    expect(holidayMessage(0)).toMatch(/No scheduled classes/); expect(holidayMessage(1)).toMatch(/Cancel 1 class for/); expect(holidayMessage(3)).toMatch(/Cancel 3 classes for/);
  });
  it('restore draft keeps the class times in the academy zone', () => {
    expect(withStatus(s('a', 'cancelled'), 'scheduled', 'Asia/Kolkata')).toEqual({ id: 'a', batch: 'b', startDate: '2026-11-28', startTime: '16:00', endDate: '2026-11-28', endTime: '17:00', room: 'R1', status: 'scheduled' });
  });
});
