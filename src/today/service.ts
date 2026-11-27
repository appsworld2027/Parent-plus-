import { supabase } from '../auth/client';
import { diagnostics } from '../diagnostics';
import type { Student } from '../roster/model';
import type { Enrolment } from '../roster/model';
import type { Observation } from '../observations/model';
import type { Recipient } from '../observations/model';
import type { Invoice } from '../fees/model';
import { loadOverdueInvoices } from '../fees/service';

export type NeedsYouData = {
  students: Student[];
  enrolments: Enrolment[];
  observations: Observation[];
  recipients: Recipient[];
  invoices: Invoice[];
  // A part that failed while the rest loaded; its data above is empty and must not be read as "nothing to do".
  feedbackFailed: boolean;
  feesFailed: boolean;
};

export async function loadNeedsYouData(academyId: string, today: string): Promise<NeedsYouData> {
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

  async function loadFeedback() {
    // Only select what the count needs: id, status, recorded_at with status = recorded and recorded_at >= now - 7 days
    // Paged to avoid PostgREST 1000-row cap (same pattern as roster/service.ts)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentRecordedObservations: Pick<Observation, 'id' | 'status' | 'recorded_at'>[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await supabase!
        .from('observations')
        .select('id,status,recorded_at')
        .eq('academy_id', academyId)
        .eq('status', 'recorded')
        .gte('recorded_at', sevenDaysAgo)
        .order('id')
        .range(offset, offset + 499);
      if (result.error) throw result.error;
      recentRecordedObservations.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < 500) break;
    }

    // Recipients only for those observation ids
    const observationIds = recentRecordedObservations.map(o => o.id);
    let recipients: Recipient[] = [];
    if (observationIds.length > 0) {
      // Fetch in chunks of 100 ids to keep URL size reasonable (~3.7 KB vs ~18.5 KB for 500)
      for (let i = 0; i < observationIds.length; i += 100) {
        const chunk = observationIds.slice(i, i + 100);
        const result = await supabase!
          .from('observation_recipients')
          .select('observation_id,student_id')
          .eq('academy_id', academyId)
          .in('observation_id', chunk);
        if (result.error) throw result.error;
        recipients.push(...(result.data ?? []));
      }
    }
    return { observations: recentRecordedObservations as Observation[], recipients };
  }

  // The three parts load together. One failing part still lets the others show; the card fails as a whole
  // only when the roster is missing or both feedback and fees failed.
  const [base, feedback, fees] = await Promise.allSettled([
    Promise.all([rows('students', 'id,name,age_years,archived_at'), rows('enrolments', 'id,student_id,batch_id,starts_on,ends_on')]),
    loadFeedback(),
    loadOverdueInvoices(academyId, today),
  ]);
  if (base.status === 'rejected') throw base.reason;
  if (feedback.status === 'rejected' && fees.status === 'rejected') throw feedback.reason;
  const [students, enrolments] = base.value;
  return {
    students: students as Student[], enrolments: enrolments as Enrolment[],
    observations: feedback.status === 'fulfilled' ? feedback.value.observations : [],
    recipients: feedback.status === 'fulfilled' ? feedback.value.recipients : [],
    invoices: fees.status === 'fulfilled' ? fees.value : [],
    feedbackFailed: feedback.status === 'rejected', feesFailed: fees.status === 'rejected',
  };
}
