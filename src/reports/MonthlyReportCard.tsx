import React, { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { supabase } from '../auth/client';
import { wallTime } from '../classes/model';
import { whatsappLink } from '../observations/whatsapp';
import { monthKey, monthLabel, monthlyReport, previousMonth, type Report } from './monthlyReport';

// Monthly progress report for one child (M2-23). Built only from attendance and recorded observations the coach already saved.
// Facts are read for the chosen month only (range queries, paged) so long histories are never silently cut off.
// Only notes written for this ONE student are used: a note for a whole batch can mention other children and never goes into one family's report.
async function loadFacts(academy: string, student: string, month: string, timezone: string) {
  if (!supabase) throw new Error('Client unavailable');
  const [y, m] = month.split('-').map(Number);
  const start = wallTime(`${month}-01`, '00:00', timezone), end = wallTime(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`, '00:00', timezone);
  const paged = async <T,>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) => {
    const all: T[] = [];
    for (let o = 0; ; o += 500) { const r = await build(o, o + 499); if (r.error) throw r.error; all.push(...(r.data ?? [])); if ((r.data?.length ?? 0) < 500) return all; }
  };
  const sessions = await paged<{ id: string; starts_at: string; status: string }>((f, t) => supabase!.from('class_sessions').select('id,starts_at,status').eq('academy_id', academy).gte('starts_at', start).lt('starts_at', end).order('starts_at').range(f, t));
  const live = new Map(sessions.filter(x => x.status !== 'cancelled').map(x => [x.id, x.starts_at]));
  const marks: { status: string; starts_at: string }[] = []; const ids = [...live.keys()];
  for (let i = 0; i < ids.length; i += 100) {
    const rows = await paged<{ session_id: string; status: string }>((f, t) => supabase!.from('attendance').select('session_id,status').eq('academy_id', academy).eq('student_id', student).in('session_id', ids.slice(i, i + 100)).order('session_id').range(f, t));
    for (const r of rows) marks.push({ status: r.status, starts_at: live.get(r.session_id)! });
  }
  const obs = await paged<{ id: string; note: string; recorded_at: string | null; audience: string }>((f, t) => supabase!.from('observations').select('id,note,recorded_at,audience').eq('academy_id', academy).eq('status', 'recorded').eq('audience', 'student').gte('recorded_at', start).lt('recorded_at', end).order('id').range(f, t));
  const notes: { recorded_at: string; note: string }[] = [];
  for (let i = 0; i < obs.length; i += 100) {
    const chunk = obs.slice(i, i + 100);
    const rec = await paged<{ observation_id: string; student_id: string }>((f, t) => supabase!.from('observation_recipients').select('observation_id,student_id').eq('academy_id', academy).in('observation_id', chunk.map(o => o.id)).order('observation_id').range(f, t));
    for (const o of chunk) { const mine = rec.filter(r => r.observation_id === o.id); if (o.recorded_at && mine.length === 1 && mine[0].student_id === student) notes.push({ recorded_at: o.recorded_at, note: o.note }); }
  }
  return { marks, notes };
}
export function MonthlyReportCard({ academy, academyName, timezone, student, name, phone, disabled }: { academy: string; academyName: string; timezone: string; student: string; name: string; phone?: string | null; disabled: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [view, setView] = useState<{ month: string; student: string; report: Report } | null>(null);
  const current = useRef(student); current.current = student;
  const thisMonth = monthKey(new Date().toISOString(), timezone);
  async function prepare(month: string) {
    if (busy || disabled) return; setBusy(true); setError(''); setView(null);
    try { const f = await loadFacts(academy, student, month, timezone); if (current.current !== student) return; setView({ month, student, report: monthlyReport(academyName, name, month, timezone, f.marks, f.notes) }); }
    catch { setError('The report could not be prepared. Check the connection and try again.'); }
    finally { if (current.current === student) setBusy(false); }
  }
  const link = view && view.student === student && phone ? whatsappLink(phone, view.report.text) : null;
  return <View style={s.card}><Text style={s.title}>Monthly progress report</Text>
    <Text style={s.body}>A short summary of {name}'s attendance and your recorded notes. Only notes you wrote for this child alone are included; nothing is sent until you choose to share it. Read the text before sharing.</Text>
    <View style={s.row}>{[thisMonth, previousMonth(thisMonth)].map(m => <Pressable key={m} accessibilityRole="button" accessibilityLabel={`Prepare ${monthLabel(m)} report`} disabled={busy || disabled} onPress={() => { void prepare(m); }} style={s.btn}><Text style={s.btnText}>{monthLabel(m)}</Text></Pressable>)}</View>
    {!!error && <Text accessibilityRole="alert" style={s.err}>{error}</Text>}
    {view && <><Text style={s.report} selectable>{view.report.text}</Text>
      {view.report.empty && <Text style={s.body}>There is nothing to share for this month yet.</Text>}
      {!view.report.empty && (link ? <Pressable accessibilityRole="button" accessibilityLabel="Share report on WhatsApp" onPress={() => { void Linking.openURL(link); }} style={s.btn}><Text style={s.btnText}>Share on WhatsApp</Text></Pressable> : <Text style={s.body}>Add a guardian phone number with country code (for example +91…) to share on WhatsApp. You can also copy the text above.</Text>)}</>}
  </View>;
}
const s = StyleSheet.create({ card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 10 }, title: { fontSize: 16, fontWeight: '800', color: c.text }, body: { fontSize: 13, color: c.muted ?? c.text },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, btn: { borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 }, btnText: { fontWeight: '800', color: c.text }, err: { color: c.rose ?? '#b00', fontSize: 13 }, report: { fontSize: 13, color: c.text } });
