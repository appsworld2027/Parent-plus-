import { prototypeColors as c } from '../ui/prototypeTheme';
import { OpenParentFeedback } from './OpenParentFeedback';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import { randomUUID } from 'expo-crypto';
import { loadRoster } from '../roster/service';
import { supabase } from '../auth/client';
import { canUseMedia, type ClassMedia, type MediaConsent } from '../class-media/model';
import { loadClassMedia, mediaSetupError } from '../class-media/service';
import { getObservation } from './service';

type Review = { revision: number; note: string; recipients: {id:string;name:string}[]; media: ClassMedia[]; consents: MediaConsent[] };
type Handoff = { id: string; student_id: string; state: 'awaiting_parent_link' | 'available_to_parent' | 'cancelled'; observation_revision: number };
type Request = { id: string; revision: number; students: string[]; media: string[] };
function Button({title,action,disabled=false}:{title:string;action:()=>void;disabled?:boolean}) {return <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={[s.button,disabled&&s.disabled]}><Text style={s.label}>{title}</Text></Pressable>;}
function Check({title,checked,action,disabled=false}:{title:string;checked:boolean;action:()=>void;disabled?:boolean}) {return <Pressable accessibilityRole="checkbox" accessibilityLabel={title} accessibilityState={{checked,disabled}} aria-checked={checked} disabled={disabled} onPress={action} style={s.check}><Text style={s.label}>{checked?'☑':'☐'} {title}</Text></Pressable>;}

// Save reviewed snapshots; verified links and fresh consent control Parent access.
export function ParentModuleReview({academy,observation,revision,disabled,onWorking}:{academy:string;observation:string;revision:number;disabled:boolean;onWorking:(busy:boolean)=>void}) {
  const [review,setReview]=useState<Review|null>(null),[students,setStudents]=useState<string[]>([]),[media,setMedia]=useState<string[]>([]);
  const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[saved,setSaved]=useState(false);
  const [opening,setOpening]=useState(false);
  const shortcutLock=useRef(false);
  const [approvedIds,setApprovedIds]=useState<string[]>([]);
  const [handoffs,setHandoffs]=useState<Handoff[]>([]),[error,setError]=useState('');
  const generation=useRef(0),lock=useRef(false),request=useRef<Request|null>(null);
  useLayoutEffect(()=>{generation.current++;setReview(null);setBusy(false);setError('');setConfirmed(false);setSaved(false);setHandoffs([]);setApprovedIds([]);setUncertain(false);request.current=null;return()=>{generation.current++;};},[observation,revision,disabled]);
  async function readHandoffs() {
    if(!supabase)throw new Error('Unavailable');
    const result=await supabase.from('parent_feedback_handoffs').select('id,student_id,state,observation_revision').eq('academy_id',academy).eq('observation_id',observation).order('reviewed_at',{ascending:false}).limit(500);
    if(result.error)throw result.error;
    setHandoffs((result.data??[]) as Handoff[]);
  }
  async function prepare() {
    if(lock.current||shortcutLock.current||disabled)return;lock.current=true;setBusy(true);setError('');const version=++generation.current;
    try{
      const detail=await getObservation(academy,observation);
      if(!detail.observation||detail.observation.status!=='recorded'||detail.observation.revision!==revision)throw new Error('Reopen the latest saved feedback.');
      const data=await loadClassMedia(academy,detail.observation.session_id);
      if(version!==generation.current)return;
      await readHandoffs();
      const roster=await loadRoster(academy);
      if(version!==generation.current)return;
      setReview({revision:detail.observation.revision,note:detail.observation.note,recipients:detail.recipients.map(id=>({id,name:roster.students.find(row=>row.id===id)?.name??'Student'})),media:data.media,consents:data.consents});
      setStudents(detail.recipients);setMedia([]);setConfirmed(false);setSaved(false);setUncertain(false);request.current=null;
    }catch(failure){if(version===generation.current)setError(mediaSetupError(failure));}
    finally{lock.current=false;if(version===generation.current)setBusy(false);}
  }
  async function approve() {
    if(lock.current||shortcutLock.current||disabled||!review||(!uncertain&&(!confirmed||!students.length))||!supabase)return;
    const payload=request.current??{id:randomUUID(),revision:review.revision,students:[...students],media:[...media]};
    request.current=payload;lock.current=true;setBusy(true);onWorking(true);setError('');
    let keepLocked=false;
    try{
      const result=await supabase.rpc('queue_parent_feedback',{target_academy:academy,target_observation:observation,expected_revision:payload.revision,target_request:payload.id,selected_students:payload.students,selected_media:payload.media});
      if(result.error)throw result.error;
      if(!Array.isArray(result.data)||result.data.length!==payload.students.length||result.data.some((id:unknown)=>typeof id!=='string'))throw new Error('Approval result not confirmed');
      setApprovedIds(result.data);setSaved(true);setUncertain(false);request.current=null;
      try{await readHandoffs();}catch{setError('Approval saved. Reopen the review to refresh its queue status; do not approve it again.');}
    }catch(failure){
      const code=failure&&typeof failure==='object'&&'code'in failure?String(failure.code):'';
      if(['42501','22023','40001','PGRST202','PGRST205','42P01'].includes(code)){request.current=null;setUncertain(false);}else {setUncertain(true);keepLocked=true;}
      setError(mediaSetupError(failure));
    }finally{lock.current=false;setBusy(false);onWorking(keepLocked);}
  }
  async function cancel(id:string) {
    if(lock.current||shortcutLock.current||disabled||!supabase)return;lock.current=true;setBusy(true);onWorking(true);setError('');
    try{const result=await supabase.rpc('cancel_parent_feedback',{target_academy:academy,target_handoff:id});if(result.error)throw result.error;await readHandoffs();}
    catch(failure){setError(mediaSetupError(failure));}
    finally{lock.current=false;setBusy(false);onWorking(false);}
  }
  const frozen=busy||opening||disabled||uncertain||saved;
  const awaiting=approvedIds.length>0&&approvedIds.every(id=>handoffs.some(item=>item.id===id&&item.state==='awaiting_parent_link'));
  return <View style={s.card}>
    <Text style={s.title}>Share to Parent</Text>
    <Text style={s.body}>Keep a reviewed copy for each selected child, with optional consented class media. After approval, connected parents can read it in their separate workspace. Unconnected copies are held for a verified invitation. No WhatsApp or device notification is sent automatically.</Text>
    <Button title="Review and share to Parent" disabled={disabled||busy||opening||uncertain} action={()=>{void prepare();}} />
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {review&&!disabled&&<>
      <Text style={s.label}>Saved feedback · revision {review.revision}</Text><Text selectable style={s.body}>{review.note}</Text>
      <Text style={s.label}>Who should receive this?</Text>
      {review.recipients.map(child=><Check key={child.id} title={`Parent handoff for ${child.name}`} checked={students.includes(child.id)} disabled={frozen} action={()=>{setStudents(values=>values.includes(child.id)?values.filter(id=>id!==child.id):[...values,child.id]);setMedia([]);setConfirmed(false);}} />)}
      <Text style={s.label}>Optional class photos and videos</Text>
      <Text style={s.body}>Capture/upload from Schedule → class attendance → Class photos, videos and consent. Link that class to this feedback. Only attach media suitable for every selected parent; otherwise prepare separate reviews.</Text>
      {!review.media.length&&<Text style={s.body}>No linked class media. A complete text-only handoff can still be saved.</Text>}
      {review.media.map((item,index)=>{
        const allowed=students.length>0&&students.every(id=>item.subject_ids.includes(id))&&canUseMedia(review.consents,item.subject_ids,item.kind,true);
        return <View key={item.id}><Check title={`Include class ${item.kind} ${index+1}`} checked={media.includes(item.id)} disabled={frozen||!allowed} action={()=>{setMedia(values=>values.includes(item.id)?values.filter(id=>id!==item.id):[...values,item.id]);setConfirmed(false);}} />{!allowed&&<Text style={s.body}>Everyone pictured needs current sharing permission, and each recipient must appear.</Text>}</View>;
      })}
      <Check title="I reviewed the feedback, recipients and media for parents" checked={confirmed} disabled={frozen} action={()=>setConfirmed(value=>!value)} />
      {!saved&&<Button title={uncertain?'Retry same Parent approval':'Share approved feedback to Parent'} disabled={busy||opening||disabled||(!uncertain&&(!confirmed||!students.length))} action={()=>{void approve();}} />}
      {saved&&<Text accessibilityRole="header" style={s.title}>{awaiting?'Reviewed and saved — awaiting parent connection':'Shared — check each child’s status below'}</Text>}
      {uncertain&&<Text style={s.body}>Outcome unknown. Your exact approval is locked on this screen for retry. Keep it open; after a reload check the held records before approving again.</Text>}
      <Text style={s.label}>Held feedback and review history</Text>
      {handoffs.map(item=><View key={item.id} style={s.item}><Text style={s.body}>{review.recipients.find(child=>child.id===item.student_id)?.name??'Student'} · revision {item.observation_revision} · {item.state==='cancelled'?'Cancelled — retained in history':item.state==='available_to_parent'?'Available in the Parent workspace':'Awaiting verified parent connection'}</Text>{item.state!=='cancelled'&&<OpenParentFeedback academy={academy} student={item.student_id} name={review.recipients.find(child=>child.id===item.student_id)?.name??'Student'} handoff={item.id} acquire={()=>{if(shortcutLock.current||lock.current)return false;shortcutLock.current=true;return true;}} disabled={busy||opening||disabled||uncertain} onWorking={value=>{shortcutLock.current=value;setOpening(value);onWorking(value);}} />}{item.state!=='cancelled'&&<Button title={`Cancel Parent handoff for ${review.recipients.find(child=>child.id===item.student_id)?.name??'Student'}`} disabled={busy||opening||disabled||uncertain} action={()=>{void cancel(item.id);}} />}</View>)}
    </>}
  </View>;
}
const s = StyleSheet.create({card:{padding:12,gap:14,borderRadius:18,backgroundColor:c.surface,borderWidth:1,borderColor:c.border},title:{fontSize:15.5,fontWeight:'700',letterSpacing:-0.2,color:c.text},body:{fontSize:13,lineHeight:20,color:c.muted},label:{fontSize:13,fontWeight:'700',color:c.text},button:{paddingVertical:13,paddingHorizontal:16,minHeight:44,borderRadius:14,backgroundColor:c.raised,alignItems:'center'},check:{minHeight:44,justifyContent:'center'},disabled:{opacity:0.45},error:{color:c.rose,fontSize:13,lineHeight:20},item:{gap:8,paddingTop:12,borderTopWidth:1,borderColor:c.border}});
