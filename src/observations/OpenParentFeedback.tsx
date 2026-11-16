import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../auth/client';
import { saveFeedbackJourney } from '../parent/feedbackJourney';

export function OpenParentFeedback({academy,student,name,handoff,disabled,onWorking,acquire}:{academy:string;student:string;name:string;handoff:string;disabled:boolean;onWorking:(busy:boolean)=>void;acquire:()=>boolean}) {
  const {session}=useAuth();const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
  if(Platform.OS!=='web')return null;
  async function open(){
    if(lock.current||disabled||!session||!supabase||!acquire())return;lock.current=true;setBusy(true);onWorking(true);setError('');
    try{
      const result=await supabase.from('parent_coach_links').select('id,active,parent_user_id,child_id').eq('academy_id',academy).eq('student_id',student).eq('active',true);
      if(result.error)throw result.error;
      const links=result.data??[],own=links.find(link=>link.parent_user_id===session.user.id);
      if(links.length&&!own){setError('This student is connected to another parent account. That parent must sign in to view the update.');return;}
      let code:string|undefined;
      if(!own){
        const invitation=await supabase.rpc('issue_parent_link_invite',{target_academy:academy,target_student:student});
        if(invitation.error)throw invitation.error;
        if(typeof invitation.data!=='string'||!/^[0-9a-f]{64}$/.test(invitation.data))throw new Error('Invitation unavailable');
        code=invitation.data;
      }
      saveFeedbackJourney(globalThis.sessionStorage,{owner:session.user.id,academy,student,name,handoff,code,child:own?.child_id,expires:Date.now()+48*60*60*1000});
      globalThis.location.assign('/parent');
    }catch{setError('Could not open the Parent flow. Your approved feedback is saved. Retry, or use the student profile’s Parent invitation.');}
    finally{lock.current=false;setBusy(false);onWorking(false);}
  }
  return <View style={s.wrap}><Pressable accessibilityRole="button" disabled={disabled||busy} onPress={()=>{void open();}} style={[s.button,(disabled||busy)&&{opacity:0.5}]}><Text style={s.label}>{busy?'Opening Parent…':`Open ${name}’s update in Parent`}</Text></Pressable><Text style={s.body}>Use this login for both roles. Choose or create your family child and confirm the connection; existing connections open directly.</Text>{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}</View>;
}
const s=StyleSheet.create({wrap:{gap:8},button:{minHeight:48,padding:14,borderRadius:12,backgroundColor:'#1F6F6B'},label:{color:'#fff',fontWeight:'700'},body:{color:'#53676B',fontSize:13,lineHeight:20},error:{color:'#8E3434'}});
