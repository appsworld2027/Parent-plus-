import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { supabase } from '../auth/client';
import { whatsappLink } from '../observations/whatsapp';
import { monthKey, monthLabel, monthlyReport, previousMonth, type Report } from './monthlyReport';

// Monthly progress report for one child (M2-23). Built only from attendance and recorded observations the coach already saved.
async function loadFacts(academy: string, student: string) {
  if (!supabase) throw new Error('Client unavailable');
  const att = await supabase.from('attendance').select('session_id,status').eq('academy_id', academy).eq('student_id', student).limit(500);
  if (att.error) throw att.error;
  const ids = (att.data ?? []).map(a => a.session_id as string); const status = new Map((att.data ?? []).map(a => [a.session_id as string, a.status as string]));
  const marks: { status: string; starts_at: string }[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const s = await supabase.from('class_sessions').select('id,starts_at,status').eq('academy_id', academy).in('id', ids.slice(i, i + 100));
    if (s.error) throw s.error;
    for (const row of (s.data ?? []) as { id: string; starts_at: string; status: string }[]) if (row.status !== 'cancelled') marks.push({ status: status.get(row.id)!, starts_at: row.starts_at });
  }
  const rec = await supabase.from('observation_recipients').select('observation_id').eq('academy_id', academy).eq('student_id', student).limit(500);
  if (rec.error) throw rec.error;
  const obsIds = (rec.data ?? []).map(r => r.observation_id as string); const notes: { recorded_at: string; note: string }[] = [];
  for (let i = 0; i < obsIds.length; i += 100) {
    const o = await supabase.from('observations').select('id,note,recorded_at,status').eq('academy_id', academy).eq('status', 'recorded').in('id', obsIds.slice(i, i + 100));
    if (o.error) throw o.error;
    for (const row of (o.data ?? []) as { note: string; recorded_at: string | null }[]) if (row.recorded_at) notes.push({ recorded_at: row.recorded_at, note: row.note });
  }
  return { marks, notes };
}
export function MonthlyReportCard({ academy, academyName, timezone, student, name, phone, disabled }: { academy: string; academyName: string; timezone: string; student: string; name: string; phone?: string | null; disabled: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [view, setView] = useState<{ month: string; report: Report } | null>(null);
  const thisMonth = monthKey(new Date().toISOString(), timezone);
  async function prepare(month: string) {
    if (busy || disabled) return; setBusy(true); setError(''); setView(null);
    try { const f = await loadFacts(academy, student); setView({ month, report: monthlyReport(academyName, name, month, timezone, f.marks, f.notes) }); }
    catch { setError('The report could not be prepared. Check the connection and try again.'); }
    finally { setBusy(false); }
  }
  const link = view && phone ? whatsappLink(phone, view.report.text) : null;
  return <View style={s.card}><Text style={s.title}>Monthly progress report</Text>
    <Text style={s.body}>A short summary of {name}'s attendance and your recorded notes. Nothing is sent until you choose to share it.</Text>
    <View style={s.row}>{[thisMonth, previousMonth(thisMonth)].map(m => <Pressable key={m} accessibilityRole="button" accessibilityLabel={`Prepare ${monthLabel(m)} report`} disabled={busy || disabled} onPress={() => { void prepare(m); }} style={s.btn}><Text style={s.btnText}>{monthLabel(m)}</Text></Pressable>)}</View>
    {!!error && <Text accessibilityRole="alert" style={s.err}>{error}</Text>}
    {view && <><Text style={s.report} selectable>{view.report.text}</Text>
      {view.report.empty && <Text style={s.body}>There is nothing to share for this month yet.</Text>}
      {!view.report.empty && (link ? <Pressable accessibilityRole="button" accessibilityLabel="Share report on WhatsApp" onPress={() => { void Linking.openURL(link); }} style={s.btn}><Text style={s.btnText}>Share on WhatsApp</Text></Pressable> : <Text style={s.body}>Add a guardian phone number with country code (for example +91…) to share on WhatsApp. You can also copy the text above.</Text>)}</>}
  </View>;
}
const s = StyleSheet.create({ card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 10 }, title: { fontSize: 16, fontWeight: '800', color: c.text }, body: { fontSize: 13, color: c.muted ?? c.text },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, btn: { borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 }, btnText: { fontWeight: '800', color: c.text }, err: { color: c.rose ?? '#b00', fontSize: 13 }, report: { fontSize: 13, color: c.text } });
