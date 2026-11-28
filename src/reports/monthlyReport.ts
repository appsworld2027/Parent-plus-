// Monthly progress report for one child (M2-23, MR-01..08), built from facts the coach already recorded. Shared by WhatsApp or copied.
export type ReportMark = { status: string; starts_at: string };
export type ReportNote = { recorded_at: string; note: string };
export const monthKey = (iso: string, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' }).format(new Date(iso)).slice(0, 7);
export const previousMonth = (month: string) => { const [y, m] = month.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
export const monthLabel = (month: string) => new Date(`${month}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export type Report = { held: number; attended: number; late: number; absent: number; notes: string[]; text: string; empty: boolean };
export function monthlyReport(academy: string, student: string, month: string, tz: string, marks: ReportMark[], notes: ReportNote[]): Report {
  const m = marks.filter(x => monthKey(x.starts_at, tz) === month && ['present', 'late', 'absent'].includes(x.status));
  const held = m.length, late = m.filter(x => x.status === 'late').length, absent = m.filter(x => x.status === 'absent').length, attended = m.filter(x => x.status === 'present' || x.status === 'late').length;
  const picked = notes.filter(n => n.note.trim() && monthKey(n.recorded_at, tz) === month).sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at)).slice(0, 3).map(n => n.note.trim().slice(0, 300));
  const empty = !held && !picked.length;
  const lines = [`${academy} — ${monthLabel(month)} progress for ${student}`];
  if (held) lines.push(`Classes: attended ${attended} of ${held}${late ? ` (${late} late)` : ''}${absent ? `, missed ${absent}` : ''}.`);
  if (picked.length) lines.push('', 'From the coach:', ...picked.map(n => `• ${n}`));
  if (empty) lines.push('Nothing was recorded this month.');
  lines.push('', '— Your coach');
  return { held, attended, late, absent, notes: picked, text: lines.join('\n'), empty };
}
