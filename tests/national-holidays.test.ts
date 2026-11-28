// M2-07 HC-01..05
import { describe, expect, it } from 'vitest';
import { holidayHint, nationalHoliday, upcomingHolidays } from '../src/classes/nationalHolidays';

describe('national holidays', () => {
  it('HC-01 knows fixed-date holidays in any year', () => { expect(nationalHoliday('2026-08-15')).toBe('Independence Day'); expect(nationalHoliday('2027-01-26')).toBe('Republic Day'); });
  it('HC-02 ordinary days and bad input have no holiday', () => { expect(nationalHoliday('2026-08-16')).toBeNull(); expect(nationalHoliday('garbage')).toBeNull(); });
  it('HC-03 lists upcoming holidays in a window, in order', () => expect(upcomingHolidays('2026-09-30', 90).map(h => h.date)).toEqual(['2026-10-02', '2026-12-25']));
  it('HC-04 window includes the start day itself', () => expect(upcomingHolidays('2026-12-25', 0)).toEqual([{ date: '2026-12-25', name: 'Christmas Day' }]));
  it('HC-05 hint never cancels anything, only prompts', () => expect(holidayHint('Gandhi Jayanti')).toContain('Tap "Mark this day as a holiday"'));
});
