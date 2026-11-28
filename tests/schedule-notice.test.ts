// Rules for docs/product/schedule-changes SN-01..05, 08, 09.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { changeNotice, holidayNotices, noticeSummary } from '../src/classes/scheduleNotice';

const tz = 'Asia/Kolkata', now = new Date('2026-11-28T00:00:00Z');
const cls = (extra = {}): any => ({ id: 'c', batch_id: 'b1', starts_at: '2026-11-30T10:30:00.000Z', ends_at: '2026-11-30T11:30:00.000Z', room: 'R', status: 'scheduled', attendance_revision: 0, ...extra });
const draft = (extra = {}): any => ({ id: 'c', batch: 'b1', startDate: '2026-11-30', startTime: '16:00', endDate: '2026-11-30', endTime: '17:00', room: 'R', status: 'scheduled', ...extra }) as never;
describe('family notices for schedule changes', () => {
  it('SN-01 cancel', () => expect(changeNotice(cls(), draft({ status: 'cancelled' }), 'Clay', '2026-11-30T10:30:00.000Z', tz, now)?.message).toBe('Class update: Clay on Mon 30 Nov at 16:00 is cancelled.'));
  it('SN-02 restore', () => expect(changeNotice(cls({ status: 'cancelled' }), draft(), 'Clay', '2026-11-30T10:30:00.000Z', tz, now)?.message).toBe('Class update: Clay on Mon 30 Nov at 16:00 is on again.'));
  it('SN-03 move', () => expect(changeNotice(cls(), draft({ startTime: '17:00' }), 'Clay', '2026-11-30T11:30:00.000Z', tz, now)?.message).toBe('Class update: Clay moved from Mon 30 Nov at 16:00 to Mon 30 Nov at 17:00.'));
  it('SN-05 note appended, capped at 200', () => {
    expect(changeNotice(cls(), draft({ status: 'cancelled' }), 'Clay', cls().starts_at, tz, now, 'Diwali')?.message).toMatch(/cancelled\. Diwali$/);
    expect(changeNotice(cls(), draft({ status: 'cancelled' }), 'Clay', cls().starts_at, tz, now, 'x'.repeat(900))!.message.length).toBeLessThan(500);
  });
  it('SN-08 past classes send nothing', () => expect(changeNotice(cls({ starts_at: '2026-11-20T10:30:00.000Z' }), draft({ status: 'cancelled' }), 'Clay', '2026-11-20T10:30:00.000Z', tz, now)).toBeNull());
  it('SN-09 new class or no relevant change sends nothing', () => {
    expect(changeNotice(undefined, draft(), 'Clay', cls().starts_at, tz, now)).toBeNull();
    expect(changeNotice(cls(), draft({ room: 'Room 2' }), 'Clay', cls().starts_at, tz, now)).toBeNull();
  });
  it('SN-04 holiday: one notice per batch, skips past classes', () => {
    const list = [cls(), cls({ id: 'd', starts_at: '2026-11-30T12:00:00.000Z' }), cls({ id: 'e', batch_id: 'b2' }), cls({ id: 'f', starts_at: '2026-11-20T10:00:00.000Z' })];
    const n = holidayNotices(list, { b1: 'Clay', b2: 'Art' }, tz, now, 'Diwali');
    expect(n).toHaveLength(2); expect(n[0]).toEqual({ batchId: 'b1', message: 'Holiday: no Clay class on Mon 30 Nov. Diwali' });
    expect(n[1].message).toContain('Art');
  });
  it('SN-07 summary wording', () => { expect(noticeSummary(1, 0)).toBe('Families of 1 batch notified.'); expect(noticeSummary(2, 0)).toBe('Families of 2 batches notified.'); expect(noticeSummary(1, 1)).toBe('1 family notice could not be sent.'); expect(noticeSummary(0, 0)).toBe(''); });
});
