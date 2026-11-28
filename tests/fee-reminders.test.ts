// Rules for docs/product/fee-reminders (FRM-01..04).
import { describe, expect, it } from 'vitest';
import { canRemind, daysOverdue, reminder } from '../src/fees/reminder';

const inv = (extra = {}): any => ({ student_name: 'Ria', billing_month: '2026-10-01', due_on: '2026-11-20', balance_paise: 250000, voided_at: null, ...extra });
describe('fee reminder ladder', () => {
  it('FRM-01 friendly within 7 days', () => { const r = reminder('Acme', inv(), '2026-11-25')!; expect(r.level).toBe(1); expect(r.text).toContain('gentle reminder'); expect(r.text).toContain('₹2,500'); expect(r.text).toContain('Ria'); expect(r.text).toContain('please ignore'); });
  it('FRM-02 polite at 8-21 days', () => { const r = reminder('Acme', inv(), '2026-12-01')!; expect(r.level).toBe(2); expect(r.text).toContain('2026-11-20'); });
  it('FRM-03 kind but clear at 22+ days, no threats', () => { const r = reminder('Acme', inv(), '2026-12-20')!; expect(r.level).toBe(3); expect(r.text).toContain('talk about it'); expect(r.text.toLowerCase()).not.toMatch(/penalty|legal|stop|suspend/); });
  it('FRM-04 none when paid, voided, not due, or due today', () => {
    expect(reminder('A', inv({ balance_paise: 0 }), '2026-12-01')).toBeNull();
    expect(reminder('A', inv({ voided_at: 'x' }), '2026-12-01')).toBeNull();
    expect(canRemind(inv({ due_on: '2026-12-05' }), '2026-12-01')).toBe(false);
    expect(canRemind(inv({ due_on: '2026-12-01' }), '2026-12-01')).toBe(false);
  });
  it('day counting', () => expect(daysOverdue('2026-11-20', '2026-11-27')).toBe(7));
});
