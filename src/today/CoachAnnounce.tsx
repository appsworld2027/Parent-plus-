import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { supabase } from '../auth/client';

export const announcementLimit = 500;
// Pure rule (CA-03/04) so it is unit-testable: returns an error note, or null when the text can be posted.
export function announcementProblem(text: string): string | null {
  const t = text.trim();
  if (!t) return 'Write a message first.';
  if (t.length > announcementLimit) return `Keep it under ${announcementLimit} characters.`;
  return null;
}
type Batch = { id: string; name: string };

// One announcement to one batch's linked families (CA-01..05).
export function CoachAnnounce({ academyId }: { academyId: string }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batch, setBatch] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) return;
      const r = await supabase.from('batches').select('id,name').eq('academy_id', academyId).is('archived_at', null).order('name').limit(50);
      if (active && !r.error) { const list = (r.data ?? []) as Batch[]; setBatches(list); setBatch(list[0]?.id ?? null); }
    })();
    return () => { active = false; };
  }, [academyId]);
  if (!batches.length) return null;
  async function post() {
    const problem = announcementProblem(text);
    if (problem) { setNote(problem); return; }
    if (!supabase || !batch || busy) return;
    setBusy(true); setNote(null);
    try {
      const r = await supabase.rpc('post_batch_announcement', { target_batch: batch, message: text.trim() });
      if (r.error) throw r.error;
      setNote(`Posted to ${batches.find(b => b.id === batch)?.name ?? 'batch'}.`); setText('');
    } catch { setNote('Could not post. Your text is kept — try again.'); }
    setBusy(false);
  }
  return <View style={s.card}>
    <Text style={s.title}>Announce to a batch</Text>
    <View style={s.row}>{batches.map(b => <Pressable key={b.id} accessibilityRole="button" accessibilityLabel={`Batch ${b.name}`} accessibilityState={{ selected: batch === b.id }} onPress={() => setBatch(b.id)} style={[s.chip, batch === b.id && s.chipOn]}><Text style={s.chipText}>{b.name}</Text></Pressable>)}</View>
    <TextInput accessibilityLabel="Announcement message" value={text} onChangeText={setText} multiline maxLength={announcementLimit + 50} placeholder="One message for every family in this batch" style={s.input} />
    <Pressable accessibilityRole="button" accessibilityLabel="Post announcement" disabled={busy} onPress={() => { void post(); }} style={[s.post, busy && { opacity: 0.6 }]}><Text style={s.postText}>Post</Text></Pressable>
    {note ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.note}>{note}</Text> : null}
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  title: { color: c.text, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.dim },
  chipOn: { borderColor: c.text },
  chipText: { color: c.text },
  input: { color: c.text, borderWidth: 1, borderColor: c.dim, borderRadius: 12, padding: 10, minHeight: 64 },
  post: { marginTop: 10, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: c.text },
  postText: { color: c.text, fontWeight: '700' },
  note: { color: c.text, marginTop: 8 },
});
