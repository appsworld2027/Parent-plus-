import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { supabase } from '../auth/client';
import { REACTIONS, reactionLabel, type ReactionKind } from './reactions';

type Api = { load: (handoff: string) => Promise<string | null>; react: (handoff: string, kind: ReactionKind) => Promise<void>; remove: (handoff: string) => Promise<void> };
const api: Api = {
  async load(handoff) {
    if (!supabase) throw new Error('Unavailable');
    const r = await supabase.from('feedback_reactions').select('reaction').eq('handoff_id', handoff).limit(1);
    if (r.error) throw r.error; return (r.data?.[0] as { reaction: string } | undefined)?.reaction ?? null;
  },
  async react(handoff, kind) { const r = await supabase!.rpc('react_to_feedback', { target_handoff: handoff, reaction_kind: kind }); if (r.error) throw r.error; },
  async remove(handoff) { const r = await supabase!.rpc('remove_feedback_reaction', { target_handoff: handoff }); if (r.error) throw r.error; },
};
// One reaction per reviewed note. Tapping another replaces it; tapping Undo removes it. A failed tap is not marked as sent (PR-06).
export function FeedbackReactions({ handoffId, client = api }: { handoffId: string; client?: Api }) {
  const [current, setCurrent] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { let active = true; client.load(handoffId).then(v => { if (active) setCurrent(v); }).catch(() => undefined); return () => { active = false; }; }, [handoffId, client]);
  async function tap(kind: ReactionKind) {
    setBusy(true); setError('');
    try { await client.react(handoffId, kind); setCurrent(kind); } catch { setError('Your reaction could not be sent. Please try again.'); } finally { setBusy(false); }
  }
  async function undo() {
    setBusy(true); setError('');
    try { await client.remove(handoffId); setCurrent(null); } catch { setError('Your reaction could not be removed. Please try again.'); } finally { setBusy(false); }
  }
  return <View style={s.wrap}>
    {current ? <Text accessibilityLiveRegion="polite" style={s.sent}>{reactionLabel(current)} · sent to coach</Text> : <Text style={s.hint}>Let your coach know:</Text>}
    <View style={s.row}>
      {REACTIONS.map(r => <Pressable key={r.kind} accessibilityRole="button" accessibilityLabel={r.label} accessibilityState={{ disabled: busy, selected: current === r.kind }} disabled={busy} onPress={() => { void tap(r.kind); }} style={[s.chip, current === r.kind && s.chipOn, busy && { opacity: 0.6 }]}><Text style={s.chipText}>{r.label}</Text></Pressable>)}
      {!!current && <Pressable accessibilityRole="button" accessibilityLabel="Undo reaction" disabled={busy} onPress={() => { void undo(); }} style={s.chip}><Text style={s.chipText}>Undo</Text></Pressable>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}
const s = StyleSheet.create({
  wrap: { marginTop: 8 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { borderWidth: 1, borderColor: '#999', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 }, chipOn: { borderWidth: 2 },
  chipText: { fontWeight: '600' }, hint: { opacity: 0.7 }, sent: { fontWeight: '700' }, error: { color: '#B3261E', marginTop: 6 },
});
