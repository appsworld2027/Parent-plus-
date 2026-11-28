// Rules for docs/product/class-reminders (CR-01..03, 05).
import { describe, expect, it } from 'vitest';
import { canRemindClass, classReminder } from '../src/classes/classReminder';

const now = new Date('2026-11-28T04:00:00Z'), tz = 'Asia/Kolkata';
const cls = (extra = {}): any => ({ id: 'c', batch_id: 'b', starts_at: '2026-11-28T10:30:00.000Z', ends_at: '2026-11-28T11:30:00.000Z', room: 'Room 1', status: 'scheduled', attendance_revision: 0, ...extra });
describe('class reminders', () => {
  it('CR-01/03 only upcoming scheduled classes', () => {
    expect(canRemindClass(cls(), now)).toBe(true); expect(canRemindClass(cls({ status: 'cancelled' }), now)).toBe(false);
    expect(canRemindClass(cls({ status: 'completed' }), now)).toBe(false); expect(canRemindClass(cls({ starts_at: '2026-11-28T03:00:00Z' }), now)).toBe(false);
  });
  it('CR-02 today, tomorrow and dated wording', () => {
    expect(classReminder('Clay', cls(), tz, now)).toBe('Reminder: Clay class today at 16:00 (Room 1). See you there!');
    expect(classReminder('Clay', cls({ starts_at: '2026-11-29T10:30:00.000Z' }), tz, now)).toContain('tomorrow at 16:00');
    expect(classReminder('Clay', cls({ starts_at: '2026-12-03T10:30:00.000Z' }), tz, now)).toContain('Thu 3 Dec at 16:00');
  });
  it('CR-05 no empty brackets without a room', () => expect(classReminder('Clay', cls({ room: '' }), tz, now)).toBe('Reminder: Clay class today at 16:00. See you there!'));
});
