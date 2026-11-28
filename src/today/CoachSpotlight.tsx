import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { supabase } from '../auth/client';
import { dayRange, localParts } from '../classes/model';
import type { Enrolment, Student } from '../roster/model';
import { spotlight, spotlightLine, type SpotlightPick } from './spotlight';

// Spotlight rotation (M2-18): who to observe today. Reads only; hides when empty or on failure.
export function CoachSpotlight({ academyId, timezone, onObserve }: { academyId: string; timezone: string; onObserve?: () => void }) {
  const [picks, setPicks] = useState<SpotlightPick[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) return;
      try {
        const now = new Date(); const today = localParts(now.toISOString(), timezone).date; const range = dayRange(today, timezone);
        const sess = await supabase.from('class_sessions').select('batch_id,status').eq('academy_id', academyId).gte('starts_at', range.start).lt('starts_at', range.end).limit(200);
        if (sess.error) throw sess.error;
        const batches = [...new Set((sess.data ?? []).filter(x => x.status !== 'cancelled').map(x => x.batch_id as string))];
        if (!batches.length) { if (active) setPicks([]); return; }
        const paged = async (table: string, columns: string) => {
          const all: unknown[] = [];
          for (let offset = 0; ; offset += 500) {
            const r = await supabase!.from(table).select(columns).eq('academy_id', academyId).order('id').range(offset, offset + 499);
            if (r.error) throw r.error; all.push(...(r.data ?? [])); if ((r.data?.length ?? 0) < 500) return all;
          }
        };
        const since = new Date(now.getTime() - 90 * 86_400_000).toISOString();
        const obs = await supabase.from('observations').select('id,recorded_at').eq('academy_id', academyId).eq('status', 'recorded').gte('recorded_at', since).limit(1000);
        if (obs.error) throw obs.error;
        const when = new Map((obs.data ?? []).map(o => [o.id as string, o.recorded_at as string]));
        const observed: Record<string, string> = {};
        const ids = [...when.keys()];
        for (let i = 0; i < ids.length; i += 100) {
          const r = await supabase.from('observation_recipients').select('observation_id,student_id').eq('academy_id', academyId).in('observation_id', ids.slice(i, i + 100));
          if (r.error) throw r.error;
          for (const row of r.data ?? []) { const at = when.get(row.observation_id as string)!; if (!observed[row.student_id as string] || at > observed[row.student_id as string]) observed[row.student_id as string] = at; }
        }
        const [students, enrolments] = await Promise.all([paged('students', 'id,name,age_years,archived_at'), paged('enrolments', 'id,student_id,batch_id,starts_on,ends_on')]);
        if (active) setPicks(spotlight(students as Student[], enrolments as Enrolment[], batches, observed, today, now, iso => localParts(iso, timezone).date));
      } catch { if (active) setPicks([]); }
    })();
    return () => { active = false; };
  }, [academyId, timezone]);
  if (!picks.length) return null;
  return <View style={s.card} accessibilityLiveRegion="polite">
    <Text style={s.title}>Spotlight today</Text>
    {picks.map(p => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Write an observation about ${p.name}`} disabled={!onObserve} onPress={onObserve}><Text style={s.line}>{spotlightLine(p)}</Text></Pressable>)}
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  title: { color: c.text, fontWeight: '700', marginBottom: 6 },
  line: { color: c.text, marginTop: 2 },
});
