import { prototypeColors as c, prototypeWeight } from '../ui/prototypeTheme';
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
  return <View style={s.stack}>
    {context&&!error&&<View style={s.stats}>
      <Pressable accessibilityRole="button" accessibilityLabel="View today's active classes" onPress={onOpen} style={[s.stat,s.statMint]}><Text style={s.statValue}>{classes.filter(session=>session.status!=='cancelled').length}</Text><Text style={s.statLabel}>Classes today</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="View today's cancelled classes" onPress={onOpen} style={[s.stat,s.statSky]}><Text style={s.statValue}>{classes.filter(session=>session.status==='cancelled').length}</Text><Text style={s.statLabel}>Cancelled</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="View saved attendance" onPress={onOpen} style={[s.stat,s.statSun]}><Text style={s.statValue}>{classes.filter(session=>session.status!=='cancelled'&&session.attendance_revision>0).length}</Text><Text style={s.statLabel}>Attendance saves</Text></Pressable>
    </View>}
    <View style={s.card}><Text style={s.title}>Today’s classes</Text>
      {!!error ? <Text style={s.body}>{error}</Text> : context ? <>
        <Text style={s.body}>{date} · {academy.timezone}</Text>
        <Text style={s.caption}>{classes.filter(session => session.status !== 'cancelled').length} classes · {classes.filter(session => session.status === 'cancelled').length} cancelled</Text>
        <Text style={s.caption}>{classes.filter(session => session.status !== 'cancelled' && session.attendance_revision > 0).length} classes have an attendance save.</Text>
        {classes.filter(session=>session.status!=='cancelled').map(session=><View key={session.id} style={s.session}><Text style={s.time}>{localParts(session.starts_at,academy.timezone).time}</Text><View style={s.stripe}/><View style={s.sessionBody}><Text style={s.sessionName}>{context.batches.find(batch=>batch.id===session.batch_id)?.name??'Class'}</Text><Text style={s.caption}>{session.room||'Location not set'} · {session.attendance_revision>0?'Attendance saved':'Attendance to record'}</Text>{onOpenSession&&<Pressable accessibilityRole="button" accessibilityLabel={`Open attendance for ${context.batches.find(batch=>batch.id===session.batch_id)?.name??'Class'} at ${localParts(session.starts_at,academy.timezone).time}`} onPress={()=>onOpenSession(session.id)} style={s.smallButton}><Text style={s.smallButtonText}>{session.attendance_revision>0?'Open attendance':'Start class'}</Text></Pressable>}</View></View>)}
      </> : <Text style={s.body}>Loading today’s classes…</Text>}
      <Pressable accessibilityRole="button" onPress={onOpen} style={s.button}><Text style={s.buttonText}>Open classes and attendance</Text></Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  stack:{gap:12},stats:{flexDirection:'row',gap:8},stat:{flex:1,minWidth:0,borderRadius:14,paddingTop:9,paddingHorizontal:10,paddingBottom:10,gap:2},statMint:{backgroundColor:'#AEDEC6'},statSky:{backgroundColor:'#AFD5F0'},statSun:{backgroundColor:'#F2D58A'},statValue:{fontSize:19,lineHeight:20.9,fontWeight:'700',letterSpacing:-0.6,color:c.black},statLabel:{fontSize:10.5,fontWeight:prototypeWeight(750),color:c.black},
  session:{flexDirection:'row',gap:11,paddingVertical:11,borderTopWidth:1,borderTopColor:c.border},time:{width:58,fontSize:12,fontWeight:'400',color:c.muted},stripe:{width:4,alignSelf:'stretch',borderRadius:4,backgroundColor:c.sky},sessionBody:{flex:1,gap:4},sessionName:{fontSize:13.5,fontWeight:'700',color:c.text},
  card:{padding:14,gap:10,borderWidth:1,borderColor:c.border,borderRadius:18,backgroundColor:c.surface},title:{fontSize:15.5,fontWeight:'700',letterSpacing:-0.2,color:c.text},body:{fontSize:12.5,lineHeight:19,color:c.muted},caption:{fontSize:11.5,lineHeight:17,color:c.muted},
  button:{paddingVertical:13,paddingHorizontal:16,minHeight:44,borderRadius:14,backgroundColor:c.white,alignItems:'center'},buttonText:{color:c.black,fontSize:13.5,fontWeight:'800'},smallButton:{paddingVertical:8,paddingHorizontal:11,minHeight:44,alignSelf:'flex-start',justifyContent:'center',borderRadius:11,backgroundColor:c.white},smallButtonText:{color:c.black,fontSize:11.5,fontWeight:'800'},
});
