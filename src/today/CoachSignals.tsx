import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { supabase } from '../auth/client';
import { localParts } from '../classes/model';

const labels: Record<string, string> = { running_late: 'Running late', missing_today: 'Missing today', dropped_off: 'Dropped off' };
type Row = { id: string; student_id: string; kind: string; changed_at: string };

// Signals parents sent for today's classes, newest first (QS-07). Shows nothing when there are none (QS-08).
export function CoachSignals({ academyId, timezone }: { academyId: string; timezone: string }) {
  const [rows, setRows] = useState<(Row & { name: string })[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) return;
      try {
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const sig = await supabase.from('parent_signals').select('id,student_id,kind,changed_at').eq('academy_id', academyId).gte('changed_at', since).order('changed_at', { ascending: false }).limit(100);
        if (sig.error) throw sig.error;
        const list = (sig.data ?? []) as Row[];
        const names = list.length ? await supabase.from('students').select('id,name').eq('academy_id', academyId).in('id', list.map(r => r.student_id)) : { data: [], error: null };
        if (names.error) throw names.error;
        const byId = new Map((names.data ?? []).map((s: { id: string; name: string }) => [s.id, s.name]));
        const today = localParts(new Date().toISOString(), timezone).date;
        if (active) setRows(list.filter(r => localParts(r.changed_at, timezone).date === today).map(r => ({ ...r, name: byId.get(r.student_id) ?? 'Student' })));
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; };
  }, [academyId, timezone]);
  if (failed || !rows.length) return null;
  return <View style={s.card} accessibilityLiveRegion="polite">
    <Text style={s.title}>From parents today</Text>
    {rows.map(r => <Text key={r.id} style={s.line}>{r.name} · {labels[r.kind] ?? r.kind} · {localParts(r.changed_at, timezone).time.slice(0, 5)}</Text>)}
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  title: { color: c.text, fontWeight: '700', marginBottom: 6 },
  line: { color: c.text, marginTop: 2 },
});
