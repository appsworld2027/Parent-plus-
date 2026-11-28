import { supabase } from '../auth/client';
import { loadClasses } from '../classes/service';
import { pickSpotlight, spotlightCandidates, type Spotlight } from './spotlight';

// Last recorded note per child (drafts never count). Paged to stay under the row cap.
export async function loadLastNotes(academy: string, studentIds: Set<string>): Promise<Map<string, string>> {
  if (!supabase) throw new Error('Client unavailable');
  const recorded = new Map<string, string>();
  for (let offset = 0; ; offset += 500) {
    const result = await supabase.from('observations').select('id,recorded_at').eq('academy_id', academy).eq('status', 'recorded').order('id').range(offset, offset + 499);
    if (result.error) throw result.error;
    for (const row of (result.data ?? []) as { id: string; recorded_at: string | null }[]) if (row.recorded_at) recorded.set(row.id, row.recorded_at);
    if ((result.data?.length ?? 0) < 500) break;
  }
  const ids = [...recorded.keys()], last = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    for (let offset = 0; ; offset += 500) {
      const result = await supabase.from('observation_recipients').select('observation_id,student_id').eq('academy_id', academy).in('observation_id', chunk).order('observation_id').range(offset, offset + 499);
      if (result.error) throw result.error;
      for (const row of (result.data ?? []) as { observation_id: string; student_id: string }[]) {
        const at = recorded.get(row.observation_id);
        if (at && studentIds.has(row.student_id) && (!last.has(row.student_id) || at > last.get(row.student_id)!)) last.set(row.student_id, at);
      }
      if ((result.data?.length ?? 0) < 500) break;
    }
  }
  return last;
}
export async function loadSpotlight(academy: string, date: string, timezone: string): Promise<Spotlight> {
  const context = await loadClasses(academy, date, timezone);
  const candidates = spotlightCandidates(context, timezone);
  if (!candidates.length) return { rows: [], candidates: 0, everyoneNotedToday: false };
  const notes = await loadLastNotes(academy, new Set(candidates.map(c => c.id)));
  return pickSpotlight(candidates, notes, timezone);
}
