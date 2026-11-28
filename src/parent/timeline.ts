// Groups reviewed feedback into months in the family's own timezone, newest first (CT-01..03, 05..07).
export type TimelineItem = { reviewed_at: string };
const fmt = (tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
export function timelineGroups<T extends TimelineItem>(items: T[], timezone: string | undefined | null) {
  const tz = timezone || 'Asia/Kolkata';
  const groups = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => Date.parse(b.reviewed_at) - Date.parse(a.reviewed_at))) {
    const key = fmt(tz).format(new Date(item.reviewed_at)).slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups].map(([key, rows]) => ({ key, label: new Date(`${key}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }), items: rows }));
}
export const timelineCount = (n: number) => `${n} ${n === 1 ? 'update' : 'updates'} from your coaches`;
