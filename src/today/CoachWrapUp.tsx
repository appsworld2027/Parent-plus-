import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { supabase } from '../auth/client';
import { dayRange, localParts } from '../classes/model';
import { classesLine, draftsLine, wrapUp, type WrapSession, type WrapUp } from './wrapUp';

// End-of-day review queue (M2-17). Reads only; hides when empty or on any failure.
export function CoachWrapUp({ academyId, timezone, onSchedule, onFeedback }: { academyId: string; timezone: string; onSchedule: () => void; onFeedback: () => void }) {
  const [queue, setQueue] = useState<WrapUp | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) return;
      try {
        const now = new Date(); const range = dayRange(localParts(now.toISOString(), timezone).date, timezone);
        const [sess, drafts] = await Promise.all([
          supabase.from('class_sessions').select('id,starts_at,status,attendance_revision').eq('academy_id', academyId).gte('starts_at', range.start).lt('starts_at', range.end).limit(200),
          supabase.from('observations').select('id').eq('academy_id', academyId).eq('status', 'draft').limit(100),
        ]);
        if (sess.error) throw sess.error; if (drafts.error) throw drafts.error;
        if (active) setQueue(wrapUp((sess.data ?? []) as WrapSession[], (drafts.data ?? []).length, timezone, now));
      } catch { if (active) setQueue(null); }
    })();
    return () => { active = false; };
  }, [academyId, timezone]);
  if (!queue || (!queue.classesNeedingAttendance && !queue.feedbackDrafts)) return null;
  return <View style={s.card} accessibilityLiveRegion="polite">
    <Text style={s.title}>Wrap up today</Text>
    {queue.classesNeedingAttendance > 0 && <Pressable accessibilityRole="button" accessibilityLabel={classesLine(queue.classesNeedingAttendance)} onPress={onSchedule}><Text style={s.line}>{classesLine(queue.classesNeedingAttendance)}</Text></Pressable>}
    {queue.feedbackDrafts > 0 && <Pressable accessibilityRole="button" accessibilityLabel={draftsLine(queue.feedbackDrafts)} onPress={onFeedback}><Text style={s.line}>{draftsLine(queue.feedbackDrafts)}</Text></Pressable>}
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  title: { color: c.text, fontWeight: '700', marginBottom: 6 },
  line: { color: c.text, marginTop: 6, textDecorationLine: 'underline' },
});
