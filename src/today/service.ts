import { supabase } from '../auth/client';
import { diagnostics } from '../diagnostics';
import type { Student } from '../roster/model';
import type { Enrolment } from '../roster/model';
import type { Observation } from '../observations/model';
import type { Recipient } from '../observations/model';

export type NeedsYouData = {
  students: Student[];
  enrolments: Enrolment[];
  observations: Observation[];
  recipients: Recipient[];
};

export async function loadNeedsYouData(academyId: string): Promise<NeedsYouData> {
  if (!supabase) throw new Error('Client unavailable');

  // Paged loading for students and enrolments (like roster/service.ts)
  async function rows(table: string, columns: string): Promise<unknown[]> {
    const all: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await supabase!
        .from(table)
        .select(columns)
        .eq('academy_id', academyId)
        .order('id')
        .range(offset, offset + 499);
      if (result.error) throw result.error;
      all.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < 500) return all;
    }
  }

  // Only select what the count needs: id, status, recorded_at with status = recorded and recorded_at >= now - 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const observationsResult = await supabase!
    .from('observations')
    .select('id,status,recorded_at')
    .eq('academy_id', academyId)
    .eq('status', 'recorded')
    .gte('recorded_at', sevenDaysAgo);
  if (observationsResult.error) throw observationsResult.error;
  const recentRecordedObservations = (observationsResult.data ?? []) as Pick<Observation, 'id' | 'status' | 'recorded_at'>[];

  // Recipients only for those observation ids
  const observationIds = recentRecordedObservations.map(o => o.id);
  let recipients: Recipient[] = [];
  if (observationIds.length > 0) {
    // Fetch in chunks if many observation ids
    for (let i = 0; i < observationIds.length; i += 500) {
      const chunk = observationIds.slice(i, i + 500);
      const result = await supabase!
        .from('observation_recipients')
        .select('observation_id,student_id')
        .eq('academy_id', academyId)
        .in('observation_id', chunk);
      if (result.error) throw result.error;
      recipients.push(...(result.data ?? []));
    }
  }

  // Students and enrolments through paged loading
  const [students, enrolments] = await Promise.all([
    rows('students', 'id,name,age_years,archived_at'),
    rows('enrolments', 'id,student_id,batch_id,starts_on,ends_on'),
  ]);

  return { students: students as Student[], enrolments: enrolments as Enrolment[], observations: recentRecordedObservations as Observation[], recipients };
}
