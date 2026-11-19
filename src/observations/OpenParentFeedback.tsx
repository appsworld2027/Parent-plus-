import { prototypeColors as c } from '../ui/prototypeTheme';
import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../auth/client';
import { identityFailure } from '../parent/identity';
import { saveFeedbackJourney } from '../parent/feedbackJourney';

export function OpenParentFeedback({academy,student,name,handoff,disabled,onWorking,acquire}:{academy:string;student:string;name:string;handoff:string;disabled:boolean;onWorking:(busy:boolean)=>void;acquire:()=>boolean}) {
  const {session}=useAuth();const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
  if(Platform.OS!=='web')return null;
  async function open(){
    if(lock.current||disabled||!session||!supabase||!acquire())return;lock.current=true;setBusy(true);onWorking(true);setError('');
    try{
      const requests=await supabase.rpc('get_parent_connection_requests');if(requests.error)throw requests.error;
      const pending=requests.data?.find((row:{academy_id:string;student_id:string;status:string})=>row.academy_id===academy&&row.student_id===student&&row.status==='pending');
      const result=await supabase.from('parent_coach_links').select('id,active,parent_user_id,child_id').eq('academy_id',academy).eq('student_id',student).eq('active',true);
      if(result.error)throw result.error;
      const links=result.data??[],own=links.find(link=>link.parent_user_id===session.user.id);
      if(links.length&&!own){setError('This student is connected to another parent account. That parent must sign in to view the update.');return;}
      let code:string|undefined;
      if(!own&&!pending){
        const invitation=await supabase.rpc('issue_parent_link_invite',{target_academy:academy,target_student:student,guardian_email:session.user.email});
        if(invitation.error)throw invitation.error;
        if(typeof invitation.data!=='string'||!/^[0-9a-f]{64}$/.test(invitation.data))throw new Error('Invitation unavailable');
        code=invitation.data;
      }
      saveFeedbackJourney(globalThis.sessionStorage,{owner:session.user.id,academy,student,name,handoff,code,child:own?.child_id??pending?.child_id,expires:Date.now()+48*60*60*1000});
      globalThis.location.assign('/parent');
    }catch(failure){setError(identityFailure(failure));}
    finally{lock.current=false;setBusy(false);onWorking(false);}
  }
  return <View style={s.wrap}><Pressable accessibilityRole="button" disabled={disabled||busy} onPress={()=>{void open();}} style={[s.button,(disabled||busy)&&{opacity:0.5}]}><Text style={s.label}>{busy?'Opening Parent…':`Open ${name}’s update in Parent`}</Text></Pressable><Text style={s.body}>For same-login testing, the invitation is restricted to your verified login email. Choose your family child, request the connection, then approve the match from Coach Today. Existing approved connections open directly.</Text>{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}</View>;
}
const s = StyleSheet.create({wrap:{gap:8},button:{minHeight:44,paddingVertical:13,paddingHorizontal:16,borderRadius:14,backgroundColor:c.white,alignItems:'center'},label:{color:c.black,fontSize:13.5,fontWeight:'800'},body:{color:c.muted,fontSize:13,lineHeight:20},error:{color:c.rose,fontSize:13,lineHeight:20}});
