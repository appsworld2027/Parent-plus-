import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import type { Academy } from '../auth/AuthProvider';
import type { ClassContext } from './model';
import { localParts } from './model';
import { classFailure, loadClasses } from './service';
import { useFeedbackMessage } from '../ui/ActionFeedback';

// These figures are queried from actual dated sessions. A failed query is an
// error state, never a fabricated zero. Attendance revision means a save exists,
// not that every later roster change has been reconciled.
export function TodayClasses({ academy, onOpen, onOpenSession }: { academy: Academy; onOpen: () => void; onOpenSession?: (id:string) => void }) {
  const [context, setContext] = useState<ClassContext | null>(null);
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
    void loadClasses(academy.id, date, academy.timezone).then(value => { if (active) setContext(value); })
      .catch(failure => { if (active) setError(classFailure(failure, 'Today’s classes could not be loaded. Open Schedule to retry.')); });
    return () => { active = false; };
  }, [academy.id, academy.timezone, date]);
  const classes = context?.sessions ?? [];
  return <View style={s.card}><Text style={s.title}>Today’s classes</Text>
    {!!error ? <Text style={s.body}>{error}</Text> : context ? <>
      <Text style={s.body}>{date} · {academy.timezone}</Text>
      <Text style={s.body}>{classes.filter(session => session.status !== 'cancelled').length} classes · {classes.filter(session => session.status === 'cancelled').length} cancelled</Text>
      <Text style={s.body}>{classes.filter(session => session.status !== 'cancelled' && session.attendance_revision > 0).length} classes have an attendance save.</Text>
      {classes.filter(session=>session.status!=='cancelled').map(session=><View key={session.id} style={s.session}><Text style={s.time}>{localParts(session.starts_at,academy.timezone).time}</Text><View style={s.sessionBody}><Text style={s.sessionName}>{context.batches.find(batch=>batch.id===session.batch_id)?.name??'Class'}</Text><Text style={s.body}>{session.room||'Location not set'} · {session.attendance_revision>0?'Attendance saved':'Attendance to record'}</Text>{onOpenSession&&<Pressable accessibilityRole="button" accessibilityLabel={`Open attendance for ${context.batches.find(batch=>batch.id===session.batch_id)?.name??'Class'} at ${localParts(session.starts_at,academy.timezone).time}`} onPress={()=>onOpenSession(session.id)} style={s.button}><Text style={s.buttonText}>{session.attendance_revision>0?'Open attendance':'Start class'}</Text></Pressable>}</View></View>)}
    </> : <Text style={s.body}>Loading today’s classes…</Text>}
    <Pressable accessibilityRole="button" onPress={onOpen} style={s.button}><Text style={s.buttonText}>Open classes and attendance</Text></Pressable>
  </View>;
}
const s = StyleSheet.create({ session:{flexDirection:'row',gap:12,paddingVertical:12,borderTopWidth:1,borderTopColor:'#E3E8E2'},time:{fontSize:14,fontWeight:'700',color:'#1F6F6B'},sessionBody:{flex:1,gap:4},sessionName:{fontSize:16,fontWeight:'700',color:'#22303A'}, card: { padding: 18, gap: 12, borderWidth: 1, borderColor: '#E3E8E2', borderRadius: 18, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', color: '#22303A' }, body: { fontSize: 14, lineHeight: 22, color: '#5C6B73' },
  button: { padding: 14, minHeight: 48, borderRadius: 12, backgroundColor: '#1F6F6B', alignItems: 'center' }, buttonText: { color: '#fff', fontWeight: '700' } });
