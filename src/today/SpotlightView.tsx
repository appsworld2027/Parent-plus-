import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { PrototypeIcon } from '../ui/PrototypeIcon';
import { noteLabel, type Spotlight as SpotlightData } from './spotlight';

// "Spotlight today": up to 3 children from today's classes who have gone longest without a recorded note (M2-18).
export function SpotlightView({ data, onOpen }: { data: SpotlightData; onOpen: () => void }) {
  if (!data.candidates) return null;
  return <View testID="spotlight-section" style={s.card}>
    <Text accessibilityRole="header" style={s.title}>Spotlight today</Text>
    {data.everyoneNotedToday ? <Text style={s.muted}>Everyone in today's classes has a note today</Text>
      : data.rows.map(row => <Pressable key={row.id} testID="spotlight-row" accessibilityRole="button" accessibilityLabel={`Write a note for ${row.name}`} onPress={onOpen} style={s.row}>
        <View style={s.icon}><PrototypeIcon name="star" size={18} strokeWidth={2.2} color={c.sun} /></View>
        <View style={s.text}><Text style={s.name}>{row.name}</Text><Text style={s.muted}>{row.classes.join(', ')} · {noteLabel(row.daysAgo)}</Text></View>
        <PrototypeIcon name="chev" size={18} strokeWidth={2.2} color={c.muted} />
      </Pressable>)}
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 8 },
  title: { fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2, color: c.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 14.5, fontWeight: '700', color: c.text },
  muted: { fontSize: 12.5, lineHeight: 19, color: c.muted },
  error: { fontSize: 12.5, lineHeight: 19, color: c.rose },
});
