import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Academy } from '../auth/AuthProvider';
import type { ClassSession } from './model';
import { localParts } from './model';
import { classFailure, loadClasses } from './service';
import { useFeedbackMessage } from '../ui/ActionFeedback';

// These figures are queried from actual dated sessions. A failed query is an
// error state, never a fabricated zero. Attendance revision means a save exists,
// not that every later roster change has been reconciled.
export function TodayClasses({ academy, onOpen }: { academy: Academy; onOpen: () => void }) {
  const [sessions, setSessions] = useState<ClassSession[] | null>(null);
  const [error, setError] = useFeedbackMessage('error', 'Today’s classes need attention');
  const [date, setDate] = useState(() => localParts(new Date().toISOString(), academy.timezone).date);
  useEffect(() => {
    const refreshDate = () => setDate(localParts(new Date().toISOString(), academy.timezone).date);
    refreshDate();
    const timer = setInterval(refreshDate, 60_000);
    return () => clearInterval(timer);
  }, [academy.timezone]);
  useEffect(() => {
    let active = true;
    void loadClasses(academy.id, date, academy.timezone).then(value => { if (active) setSessions(value.sessions); })
      .catch(failure => { if (active) setError(classFailure(failure, 'Today’s classes could not be loaded. Open Schedule to retry.')); });
    return () => { active = false; };
  }, [academy.id, academy.timezone, date]);
  return <View style={s.card}><Text style={s.title}>Today’s classes</Text>
    {!!error ? <Text style={s.body}>{error}</Text> : sessions ? <>
      <Text style={s.body}>{date} · {academy.timezone}</Text>
      <Text style={s.body}>{sessions.filter(session => session.status !== 'cancelled').length} classes · {sessions.filter(session => session.status === 'cancelled').length} cancelled</Text>
      <Text style={s.body}>{sessions.filter(session => session.status !== 'cancelled' && session.attendance_revision > 0).length} classes have an attendance save.</Text>
    </> : <Text style={s.body}>Loading today’s classes…</Text>}
    <Pressable accessibilityRole="button" onPress={onOpen} style={s.button}><Text style={s.buttonText}>Open classes and attendance</Text></Pressable>
  </View>;
}
const s = StyleSheet.create({ card: { padding: 18, gap: 12, borderWidth: 1, borderColor: '#E3E8E2', borderRadius: 18, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', color: '#22303A' }, body: { fontSize: 14, lineHeight: 22, color: '#5C6B73' },
  button: { padding: 14, minHeight: 48, borderRadius: 12, backgroundColor: '#1F6F6B', alignItems: 'center' }, buttonText: { color: '#fff', fontWeight: '700' } });
