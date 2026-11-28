import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { supabase } from '../auth/client';
import { localParts } from '../classes/model';
import type { Enrolment, Student } from '../roster/model';
import { whatsappLink, whatsappNumber } from '../observations/whatsapp';
import { alertLine, attendanceAlerts, checkInMessage, type PatternAlert, type PatternMark, type PatternSession } from './attendancePatterns';

const WINDOW_DAYS = 45;
// Drop-out watch (AP-01..10). Reads only; hides itself when there is nothing to show or anything fails (AP-08, AP-10).
export function CoachAttendanceAlerts({ academyId, timezone, academyName = 'Your academy' }: { academyId: string; timezone: string; academyName?: string }) {
  const [rows, setRows] = useState<(PatternAlert & { batch: string; phone: string | null })[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) return;
      try {
        const now = new Date(); const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000).toISOString();
        const paged = async (table: string, columns: string) => {
          const all: unknown[] = [];
          for (let offset = 0; ; offset += 500) {
            const r = await supabase!.from(table).select(columns).eq('academy_id', academyId).order('id').range(offset, offset + 499);
            if (r.error) throw r.error; all.push(...(r.data ?? [])); if ((r.data?.length ?? 0) < 500) return all;
          }
        };
        const sess = await supabase.from('class_sessions').select('id,batch_id,starts_at,status').eq('academy_id', academyId).gte('starts_at', since).lte('starts_at', now.toISOString()).order('starts_at', { ascending: false }).limit(1000);
        if (sess.error) throw sess.error;
        const sessions = (sess.data ?? []) as PatternSession[];
        if (!sessions.length) { if (active) setRows([]); return; }
        const marks: PatternMark[] = [];
        for (let i = 0; i < sessions.length; i += 100) {
          const m = await supabase.from('attendance').select('session_id,student_id,status').eq('academy_id', academyId).in('session_id', sessions.slice(i, i + 100).map(x => x.id));
          if (m.error) throw m.error; marks.push(...((m.data ?? []) as PatternMark[]));
        }
        const [students, enrolments, batches] = await Promise.all([paged('students', 'id,name,age_years,archived_at'), paged('enrolments', 'id,student_id,batch_id,starts_on,ends_on'), paged('batches', 'id,name')]);
        const today = localParts(now.toISOString(), timezone).date;
        const names = new Map((batches as { id: string; name: string }[]).map(b => [b.id, b.name]));
        const alerts = attendanceAlerts(sessions, marks, students as Student[], enrolments as Enrolment[], today, now);
        // Phone numbers only for the alerted children; a missing or invalid number simply means no WhatsApp button (AP-13).
        const phones = new Map<string, string>();
        if (alerts.length) {
          const cs = await supabase.from('student_contacts').select('student_id,phone').eq('academy_id', academyId).in('student_id', alerts.map(a => a.studentId));
          if (!cs.error) for (const row of (cs.data ?? []) as { student_id: string; phone: string | null }[]) if (row.phone && whatsappNumber(row.phone) && !phones.has(row.student_id)) phones.set(row.student_id, row.phone);
        }
        if (active) setRows(alerts.map(a => ({ ...a, batch: names.get(a.batchId) ?? 'Batch', phone: phones.get(a.studentId) ?? null })));
      } catch { if (active) setRows([]); }
    })();
    return () => { active = false; };
  }, [academyId, timezone]);
  if (!rows.length) return null;
  return <View style={s.card} accessibilityLiveRegion="polite">
    <Text style={s.title}>Attendance alerts</Text>
    {rows.map(r => <View key={`${r.studentId}-${r.batchId}`}>
      <Text style={s.line}>{alertLine(r, r.batch)}</Text>
      {r.phone ? <Pressable accessibilityRole="button" accessibilityLabel={`Message parent of ${r.name} on WhatsApp`} onPress={() => { const link = whatsappLink(r.phone!, checkInMessage(academyName, r, r.batch)); if (link) void Linking.openURL(link); }}><Text style={s.action}>Message parent on WhatsApp</Text></Pressable>
        : <Text style={s.muted}>No phone number on file — add one in Students to message the parent.</Text>}
    </View>)}
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  title: { color: c.text, fontWeight: '700', marginBottom: 6 },
  line: { color: c.text, marginTop: 6 },
  action: { color: c.text, textDecorationLine: 'underline', marginTop: 2 },
  muted: { color: c.dim, marginTop: 2 },
});
