import React,{useEffect,useState} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import {loadRoster} from '../roster/service';
export function CoachSetupCard({academy,onStart}:{academy:string;onStart:()=>void}){
 const [counts,setCounts]=useState<{students:number;batches:number}|null>(null);
 useEffect(()=>{let active=true;void loadRoster(academy).then(roster=>{if(active)setCounts({students:roster.students.filter(s=>!s.archived_at).length,batches:roster.batches.filter(b=>!b.archived_at).length});}).catch(()=>undefined);return()=>{active=false;};},[academy]);
 return <View style={s.card}><Text style={s.kicker}>START WITH YOUR OWN STUDENTS</Text><Text accessibilityRole="header" style={s.title}>{counts?.students?'Your academy, taking shape':'Set up your first teaching batch'}</Text><Text style={s.body}>Create or choose a batch, photograph your register, then review and save your student list.</Text>
 {counts&&<View style={s.figures}><Text style={s.figure}>{counts.students} students</Text><Text style={s.figure}>{counts.batches} batches</Text></View>}
 <Pressable accessibilityRole="button" onPress={onStart} style={s.button}><Text style={s.buttonText}>Create batch and scan students</Text></Pressable><Text style={s.hint}>Have students already? Add another batch or import more students here.</Text></View>;
}
const s=StyleSheet.create({card:{backgroundColor:'#E5F0EC',borderRadius:22,padding:22,gap:14,borderWidth:1,borderColor:'#C7DFD6'},kicker:{fontSize:10,fontWeight:'700',letterSpacing:1.2,color:'#1F6F6B'},title:{fontSize:24,lineHeight:30,fontWeight:'700',color:'#22303A'},body:{fontSize:14,lineHeight:22,color:'#50655C'},figures:{flexDirection:'row',gap:22},figure:{fontSize:18,fontWeight:'700',color:'#1F6F6B'},button:{minHeight:50,padding:15,backgroundColor:'#1F6F6B',borderRadius:14,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'700',fontSize:15},hint:{fontSize:12,lineHeight:19,color:'#50655C'}});
