import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { supabase } from '../auth/client';
import { countsText, reactionSummary, type ReactionRow } from '../parent/reactions';

// "Parents reacted" on Today: counts for notes reviewed in the last 7 days. No parent names. Hidden when none or on failure (PR-05/11).
export function CoachReactions({ academyId, rows: preset }: { academyId: string; rows?: ReactionRow[] }) {
  const [rows, setRows] = useState<ReactionRow[]>(preset ?? []);
  useEffect(() => {
    if (preset || !supabase) return; let active = true;
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    supabase.rpc('get_coach_feedback_reactions', { since })
      .then(r => { if (active && !r.error) setRows((r.data ?? []) as ReactionRow[]); });
    return () => { active = false; };
  }, [academyId, preset]);
  const summary = reactionSummary(rows);
  if (!summary.length) return null;
  const total = summary.reduce((n, e) => n + Object.values(e.counts).reduce((a, b) => a + b, 0), 0);
  return <View style={s.card}>
    <Text style={s.title}>Parents reacted to your feedback ({total})</Text>
    {summary.slice(0, 5).map(e => <Text key={e.handoff} style={s.line}>{countsText(e.counts)}</Text>)}
  </View>;
}
const s = StyleSheet.create({ card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12 }, title: { color: c.text, fontWeight: '700', marginBottom: 6 }, line: { color: c.text, marginTop: 2 } });
