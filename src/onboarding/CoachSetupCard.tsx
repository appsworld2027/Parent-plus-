import { prototypeColors as c } from '../ui/prototypeTheme';
import React,{useEffect,useState} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import {loadRoster} from '../roster/service';
export function CoachSetupCard({academy,apVerse=false,onStart}:{academy:string;apVerse?:boolean;onStart:()=>void}){
 const [counts,setCounts]=useState<{students:number;batches:number}|null>(null);
 useEffect(()=>{if(apVerse)return;let active=true;void loadRoster(academy).then(roster=>{if(active)setCounts({students:roster.students.filter(s=>!s.archived_at).length,batches:roster.batches.filter(b=>!b.archived_at).length});}).catch(()=>undefined);return()=>{active=false;};},[academy,apVerse]);
 if(apVerse)return <View style={s.card}><Text style={s.kicker}>YOUR CONNECTED WORKSPACE</Text><Text accessibilityRole="header" style={s.title}>Students and groups</Text><Text style={s.body}>Parents manage their child’s profile and connect them to your workspace. You can then view connected children and enroll them in a group.</Text><Pressable accessibilityRole="button" onPress={onStart} style={s.button}><Text style={s.buttonText}>View students and groups</Text></Pressable><Text style={s.hint}>Group setup and student profile editing are managed outside this roster.</Text></View>;
 return <View style={s.card}><Text style={s.kicker}>START WITH YOUR OWN STUDENTS</Text><Text accessibilityRole="header" style={s.title}>{counts?.students?'Your academy, taking shape':'Set up your first teaching batch'}</Text><Text style={s.body}>Create or choose a batch, photograph your register, then review and save your student list.</Text>
 {counts&&<View style={s.figures}><Text style={s.figure}>{counts.students} students</Text><Text style={s.figure}>{counts.batches} batches</Text></View>}
 <Pressable accessibilityRole="button" onPress={onStart} style={s.button}><Text style={s.buttonText}>Create batch and scan students</Text></Pressable><Text style={s.hint}>Have students already? Add another batch or import more students here.</Text></View>;
}
const s = StyleSheet.create({card:{backgroundColor:c.surface,borderRadius:18,padding:14,gap:12,borderWidth:1,borderColor:c.border},kicker:{fontSize:10,fontWeight:'800',letterSpacing:1.2,color:c.sky},title:{fontSize:19,lineHeight:24,fontWeight:'700',letterSpacing:-0.4,color:c.text},body:{fontSize:13,lineHeight:20,color:c.muted},figures:{flexDirection:'row',gap:16},figure:{fontSize:19,fontWeight:'700',letterSpacing:-0.6,color:c.sky},button:{minHeight:44,paddingVertical:13,paddingHorizontal:16,backgroundColor:c.white,borderRadius:14,alignItems:'center'},buttonText:{color:c.black,fontWeight:'800',fontSize:13.5},hint:{fontSize:11.5,lineHeight:17,color:c.muted}});
