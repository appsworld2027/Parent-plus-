// Fixed-date Indian national holidays (M2-07, HC-01..05). Lunar festivals (Diwali, Holi, Eid...) move every year and are NOT listed:
// the coach still marks those with the holiday button. Names only appear as a prompt; nothing is cancelled automatically.
const FIXED: Record<string, string> = { '01-26': 'Republic Day', '08-15': 'Independence Day', '10-02': 'Gandhi Jayanti', '12-25': 'Christmas Day', '04-14': 'Ambedkar Jayanti', '05-01': 'Labour Day' };
export const nationalHoliday = (date: string): string | null => /^\d{4}-\d{2}-\d{2}$/.test(date) ? FIXED[date.slice(5)] ?? null : null;
export function upcomingHolidays(from: string, days: number): { date: string; name: string }[] {
  const out: { date: string; name: string }[] = [];
  const start = Date.parse(`${from}T12:00:00Z`);
  for (let i = 0; i <= days; i++) { const d = new Date(start + i * 86_400_000).toISOString().slice(0, 10); const name = nationalHoliday(d); if (name) out.push({ date: d, name }); }
  return out;
}
export const holidayHint = (name: string) => `${name} is a national holiday. Tap "Mark this day as a holiday" if your classes are off.`;
