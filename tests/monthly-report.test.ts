// M2-23 MR-01..08
import { describe, expect, it } from 'vitest';
import { monthlyReport, previousMonth } from '../src/reports/monthlyReport';

const tz = 'Asia/Kolkata';
const marks = [{ status: 'present', starts_at: '2026-11-03T12:00:00Z' }, { status: 'late', starts_at: '2026-11-10T12:00:00Z' }, { status: 'absent', starts_at: '2026-11-17T12:00:00Z' }, { status: 'present', starts_at: '2026-10-27T12:00:00Z' }];
describe('monthly report', () => {
  it('MR-01 counts attended, late and missed for the month only', () => { const r = monthlyReport('Fictional Academy', 'Asha', '2026-11', tz, marks, []); expect([r.held, r.attended, r.late, r.absent]).toEqual([3, 2, 1, 1]); });
  it('MR-02 text names academy, month and child', () => { const t = monthlyReport('Fictional Academy', 'Asha', '2026-11', tz, marks, []).text; expect(t).toContain('Fictional Academy — November 2026 progress for Asha'); expect(t).toContain('attended 2 of 3 (1 late), missed 1'); });
  it('MR-03 includes up to 3 newest coach notes of that month', () => {
    const notes = [1, 2, 3, 4].map(d => ({ recorded_at: `2026-11-0${d}T08:00:00Z`, note: `Note ${d}` })).concat([{ recorded_at: '2026-10-30T08:00:00Z', note: 'Old' }]);
    expect(monthlyReport('A', 'B', '2026-11', tz, [], notes).notes).toEqual(['Note 4', 'Note 3', 'Note 2']);
  });
  it('MR-04 empty month is flagged and says so honestly', () => { const r = monthlyReport('A', 'B', '2026-09', tz, marks, []); expect(r.empty).toBe(true); expect(r.text).toContain('Nothing was recorded this month.'); });
  it('MR-05 month boundary uses the academy timezone', () => expect(monthlyReport('A', 'B', '2026-12', tz, [{ status: 'present', starts_at: '2026-11-30T19:00:00Z' }], []).held).toBe(1));
  it('MR-06 blank notes are skipped and long ones trimmed', () => { const r = monthlyReport('A', 'B', '2026-11', tz, [], [{ recorded_at: '2026-11-02T00:00:00Z', note: '   ' }, { recorded_at: '2026-11-03T00:00:00Z', note: 'x'.repeat(500) }]); expect(r.notes).toEqual(['x'.repeat(300)]); });
  it('MR-07 previousMonth wraps the year', () => { expect(previousMonth('2026-01')).toBe('2025-12'); expect(previousMonth('2026-11')).toBe('2026-10'); });
  it('MR-08 no attendance means no class line', () => expect(monthlyReport('A', 'B', '2026-11', tz, [], [{ recorded_at: '2026-11-02T00:00:00Z', note: 'Good' }]).text).not.toContain('Classes:'));
});
