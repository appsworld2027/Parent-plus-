import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ImageBackground, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../ui/Typography';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { randomUUID } from 'expo-crypto';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { AuthGate } from '../auth/AuthGate';
import { supabase } from '../auth/client';
import { SignOutButton } from '../auth/SignOutButton';
import { ErrorBoundary } from '../ErrorBoundary';
import { FeedbackProvider } from '../ui/ActionFeedback';
import { WorkspaceSwitcher } from '../ui/WorkspaceSwitcher';
import { FontLicense } from '../ui/FontLicense';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SelectField } from '../ui/SelectField';
import { classValues, localParts } from '../classes/model';
import { appVersion } from '../version';
import { activities, parentVersion, parentColors, parentToday, parentWeek, weekStart, type Child, type CoachLink, type Family, type ParentData, type ParentFeedback } from './model';
import { readFeedbackJourney, clearFeedbackJourney, type FeedbackJourney } from './feedbackJourney';
import { identityFailure } from './identity';
import { createFamily, loadFamily, loadParentData, parentFailure, saveFamilyRecord } from './service';

type Tab='Home'|'Week'|'Together'|'Explore';
type Sheet='child'|'moment'|'todo'|'event'|'connect'|'activity'|'profile'|'consent';
function validBirthDate(value:string,today:string) {
  if(!value)return true;
  const timestamp=Date.parse(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='1900-01-01'&&value<=today&&Number.isFinite(timestamp)&&new Date(timestamp).toISOString().slice(0,10)===value;
}
function Button({title,action,disabled=false,soft=false}:{title:string;action:()=>void;disabled?:boolean;soft?:boolean}) {return <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={[s.button,soft&&s.soft,disabled&&s.disabled]}><Text style={[s.buttonText,soft&&s.ink]}>{title}</Text></Pressable>;}
function Field({label,value,change,kind='text',disabled=false,multiline=false,max=160}:{label:string;value:string;change:(value:string)=>void;kind?:'text'|'date'|'time'|'number';disabled?:boolean;multiline?:boolean;max?:number}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text>{Platform.OS==='web'&&['date','time'].includes(kind)?React.createElement('input',{'aria-label':label,type:kind,value,disabled,onChange:(e:React.ChangeEvent<HTMLInputElement>)=>change(e.target.value),style:{height:48,width:'100%',boxSizing:'border-box',padding:12,borderRadius:15,border:'1px solid #313A45',backgroundColor:'#20262F',color:'#F9FBFC',fontSize:16,colorScheme:'dark'}}):<TextInput accessibilityLabel={label} value={value} onChangeText={change} editable={!disabled} maxLength={max} multiline={multiline} keyboardType={kind==='number'?'number-pad':'default'} autoCorrect={false} autoCapitalize="none" style={[s.input,multiline&&s.multiline]} />}</View>;
}
function Check({title,checked,action,disabled=false}:{title:string;checked:boolean;action:()=>void;disabled?:boolean}) {return <Pressable accessibilityRole="checkbox" accessibilityLabel={title} accessibilityState={{checked,disabled}} aria-checked={checked} disabled={disabled} onPress={action} style={s.check}><Text style={s.text}>{checked?'☑':'☐'} {title}</Text></Pressable>;}

function ParentWorkspace({onExitPreview}:{onExitPreview?:()=>void}) {
  const auth=useAuth(),owner=auth.session?.user.id;
  const [journey,setJourney]=useState<FeedbackJourney|null>(()=>{try{return Platform.OS==='web'&&owner?readFeedbackJourney(globalThis.sessionStorage,owner):null;}catch{return null;}});
  const [focusedFeedback,setFocusedFeedback]=useState('');
  const [family,setFamily]=useState<Family|null>(null),[data,setData]=useState<ParentData|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [tab,setTab]=useState<Tab>('Home'),[selected,setSelected]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [parentName,setParentName]=useState(''),[familyName,setFamilyName]=useState('');
  const [sheet,setSheet]=useState<Sheet|null>(null),[dirty,setDirty]=useState(false),[discard,setDiscard]=useState(false);
  const [name,setName]=useState(''),[detail,setDetail]=useState(''),[date,setDate]=useState(''),[time,setTime]=useState('16:00'),[endTime,setEndTime]=useState('17:00'),[minutes,setMinutes]=useState('0');
  const [color,setColor]=useState<keyof typeof parentColors>('sun'),[idea,setIdea]=useState(activities[0]);
  const [invite,setInvite]=useState(''),[invitePreview,setInvitePreview]=useState<{academy_name:string;student_name:string}|null>(null),[confirmed,setConfirmed]=useState(false);
  const [connectTarget,setConnectTarget]=useState(''),[addingConnectChild,setAddingConnectChild]=useState(false),[savedConnectChild,setSavedConnectChild]=useState(''),[childSaveAttempted,setChildSaveAttempted]=useState(false);
  const connectChildDraft=useRef<{id:string;family_id:string;name:string;born_on:string|null;color:keyof typeof parentColors}|null>(null);
  const [mediaPreview,setMediaPreview]=useState<{id:string;url:string}|null>(null);
  const [connection,setConnection]=useState<CoachLink|null>(null),[photos,setPhotos]=useState(false),[videos,setVideos]=useState(false),[sharing,setSharing]=useState(false);
  const familyId=useRef(randomUUID()),formId=useRef(randomUUID()),lock=useRef(false),generation=useRef(0),alive=useRef(true);
  const children=data?.children.filter(child=>!child.archived_at)??[],child=children.find(value=>value.id===selected)??children[0];
  const connectChild=children.find(value=>value.id===connectTarget);
  const pendingJourney=data?.connectionRequests?.find(request=>request.academy_id===journey?.academy&&request.student_id===journey?.student&&request.status==='pending');
  const pendingForChild=data?.connectionRequests?.filter(request=>request.child_id===child?.id&&request.status==='pending')??[];
  const today=parentToday(family?.timezone??'Asia/Kolkata'),stats=data&&child?parentWeek(data,child.id,today):null;
  const feedback=data?.feedback.filter(row=>row.child_id===child?.id).sort((a,b)=>b.reviewed_at.localeCompare(a.reviewed_at))??[];
  const links=data?.links.filter(row=>row.child_id===child?.id&&row.active)??[];
  const todos=data?.todos.filter(row=>row.child_id===child?.id)??[],moments=data?.moments.filter(row=>row.child_id===child?.id).sort((a,b)=>b.occurred_on.localeCompare(a.occurred_on))??[];
  const events=data?.events.filter(row=>row.child_id===child?.id).sort((a,b)=>a.starts_at.localeCompare(b.starts_at))??[];
  const refresh=useCallback(async(expectedChild?:string)=>{
    if(!owner){setLoading(false);return false;}
    const version=++generation.current;setLoading(true);
    try{const next=await loadFamily(owner);const records=next?await loadParentData(next.id):null;if(version!==generation.current)return;
      if(expectedChild&&!records?.children.some(item=>item.id===expectedChild&&!item.archived_at))throw new Error('Saved child is not available yet');
      setFamily(next);setData(records);
      if(next&&records)setSelected(current=>{
        const active=records.children.filter(item=>!item.archived_at);
        if(active.some(item=>item.id===current))return current;
        try{const saved=JSON.parse(globalThis.sessionStorage.getItem('parentplus.family-child.v1')??'null');if(saved?.owner===owner&&saved.family===next.id&&active.some(item=>item.id===saved.child))return saved.child;}catch{}
        return '';
      });
      setError('');return true;}
    catch(failure){if(version===generation.current)setError(parentFailure(failure));return false;}
    finally{if(version===generation.current)setLoading(false);}
  },[owner]);
  useEffect(()=>{alive.current=true;void refresh();return()=>{alive.current=false;generation.current++;};},[refresh]);
  useEffect(()=>{
    if(Platform.OS!=='web'||!owner||!family||!child)return;
    try{globalThis.sessionStorage.setItem('parentplus.family-child.v1',JSON.stringify({owner,family:family.id,child:child.id}));}catch{}
  },[owner,family?.id,child?.id]);
  useEffect(()=>{
    if(!journey||!data||loading)return;
    const connected=data.links.find(link=>link.active&&link.academy_id===journey.academy&&link.student_id===journey.student);
    if(!connected)return;
    setSelected(connected.child_id);setTab('Home');setFocusedFeedback(journey.handoff);
    setNotice(data.feedback.some(item=>item.id===journey.handoff)?'Your child’s reviewed class update is ready below.':'Coach connected. Refresh to check the latest shared update.');
    setJourney(null);try{clearFeedbackJourney(globalThis.sessionStorage);}catch{}
  },[journey,data,loading]);
  async function run(action:()=>Promise<void>) {
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{await action();}catch(failure){if(alive.current)setError(failure instanceof Error&&/^(Enter |Choose |Review |Use |The end|This invitation|Sign in with|The Parent connection|Child saved)/.test(failure.message)?failure.message:parentFailure(failure));}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  async function refreshedAfterSave(message:string) {setNotice(message);setSheet(null);setDirty(false);if(!await refresh())setError('Saved, but this view could not refresh. Refresh your family records before entering it again.');}
  function open(next:Sheet) {
    if(busy)return;formId.current=randomUUID();setSheet(next);setConnection(null);setDirty(false);setError('');setName('');setDetail('');setDate(next==='child'?'':today);setTime('16:00');setEndTime('17:00');setMinutes('0');setInvite('');setInvitePreview(null);setConfirmed(false);
    setConnectTarget('');setAddingConnectChild(false);setSavedConnectChild('');setChildSaveAttempted(false);connectChildDraft.current=null;
  }
  function change(set:(value:string)=>void,value:string){set(value);setDirty(true);}
  function close(){if(busy)return;if(dirty)setDiscard(true);else setSheet(null);}
  async function saveFamily() {
    if(!owner||!parentName.trim()||!familyName.trim())throw new Error('Enter your name and a family name.');
    const result=await createFamily(owner,familyId.current,parentName,familyName);setFamily(result);await refresh();setNotice('Your private family workspace is ready. Add your first child.');
  }
  async function saveSheet() {
    if(!family||!sheet)return;
    const base={id:formId.current,family_id:family.id,child_id:child?.id};
    if(sheet==='child'){
      if(!name.trim()||name.trim().length>100)throw new Error('Enter a child name, up to 100 characters.');
      if(!validBirthDate(date,today))throw new Error('Choose a valid birth date, or leave it blank.');
      await saveFamilyRecord('family_children',{id:base.id,family_id:family.id,name:name.trim(),born_on:date||null,color});setSelected(base.id);
    }else if(!child)throw new Error('Choose a child first.');
    else if(sheet==='moment'||sheet==='activity'){
      if(!name.trim()||!/^\d{1,4}$/.test(minutes)||Number(minutes)>1440)throw new Error('Enter a memory and minutes between 0 and 1,440.');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today)throw new Error('Choose today or an earlier date for a memory.');
      await saveFamilyRecord('family_moments',{...base,note:name.trim(),minutes:Number(minutes),kind:sheet==='activity'?'together':'memory',occurred_on:date});
    }else if(sheet==='todo'){
      if(!name.trim())throw new Error('Enter a reminder.');await saveFamilyRecord('family_todos',{...base,title:name.trim(),done:false});
    }else if(sheet==='event'){
      if(!name.trim())throw new Error('Enter an event title.');
      const values=classValues({id:base.id,batch:'family-event',startDate:date,startTime:time,endDate:date,endTime,room:detail,status:'scheduled'},family.timezone);
      await saveFamilyRecord('family_events',{...base,title:name.trim(),starts_at:values.starts,ends_at:values.ends,location:detail.trim()});
    }
    await refreshedAfterSave(sheet==='child'?'Child saved to your family.':'Saved to your family.');
  }
  function beginConnectChild() {
    formId.current=randomUUID();connectChildDraft.current=null;setSavedConnectChild('');setChildSaveAttempted(false);
    setName('');setDate('');setColor('sun');setConnectTarget('');setConfirmed(false);setAddingConnectChild(true);setDirty(true);
  }
  async function saveConnectChild() {
    if(!family)return;
    if(!connectChildDraft.current){
      if(!name.trim()||name.trim().length>100)throw new Error('Enter a child name, up to 100 characters.');
      if(!validBirthDate(date,today))throw new Error('Choose a valid birth date, or leave it blank.');
      connectChildDraft.current={id:formId.current,family_id:family.id,name:name.trim(),born_on:date||null,color};
    }
    // Keep the same identity and values if the server saved but its reply was lost.
    const draft=connectChildDraft.current;setChildSaveAttempted(true);
    if(!savedConnectChild){
      try{await saveFamilyRecord('family_children',draft);setSavedConnectChild(draft.id);}
      catch(failure){
        const code=failure&&typeof failure==='object'&&'code'in failure?String(failure.code):'';
        // A definite validation/constraint/permission rejection made no write.
        // Transport failures have no SQL code: retain their exact retry intent.
        if(/^(22|23)/.test(code)||code==='42501'){
          connectChildDraft.current=null;setChildSaveAttempted(false);
          throw new Error('Review the child details and try again. The save was rejected; your invitation is kept.');
        }
        throw failure;
      }
    }
    if(!await refresh(draft.id))throw new Error('Child saved, but profiles could not refresh. Retry loading child profiles to continue.');
    setConnectTarget(draft.id);setAddingConnectChild(false);setSavedConnectChild('');setChildSaveAttempted(false);connectChildDraft.current=null;setConfirmed(false);setDirty(true);
  }
  async function previewInvite() {
    if(!supabase||!invite.trim().match(/^[0-9a-f]{64}$/))throw new Error('Enter the complete invitation code from your coach.');
    const result=await supabase.rpc('preview_parent_link',{invite_code:invite.trim()});if(result.error)throw new Error(identityFailure(result.error));setInvitePreview(result.data);setConfirmed(false);
  }
  async function connect() {
    if(!supabase||!connectChild||addingConnectChild||!confirmed||!invitePreview)return;
    const result=await supabase.rpc('claim_parent_link',{invite_code:invite.trim(),target_child:connectChild.id});if(result.error)throw new Error(identityFailure(result.error));
    setSelected(connectChild.id);
    await refreshedAfterSave('Connection request sent. Feedback stays private until the coach verifies and approves the guardian and child match.');
  }
  function openConsent(link:CoachLink) {
    open('consent');setConnection(link);const permission=data?.permissions.find(value=>value.link_id===link.id);
    setPhotos(permission?.allow_photos??false);setVideos(permission?.allow_videos??false);setSharing(permission?.allow_parent_sharing??false);
  }
  async function saveConsent() {
    if(!supabase||!connection||!confirmed)return;
    const result=await supabase.rpc('parent_media_permission',{target_link:connection.id,photos,videos,sharing});if(result.error)throw result.error;
    await refreshedAfterSave('Your media choices were saved. You can change or withdraw them here.');
  }
  async function previewMedia(id:string) {
    if(!supabase)return;
    const media=await supabase.from('class_media').select('object_path').eq('id',id).maybeSingle();if(media.error)throw media.error;if(!media.data)throw new Error('Unavailable');
    const result=await supabase.storage.from('parentplus-class-media').createSignedUrl(media.data.object_path,60);if(result.error)throw result.error;
    // Open only after the parent explicitly asks. The private URL is not stored.
    if(Platform.OS==='web')setMediaPreview({id,url:result.data.signedUrl});else await Linking.openURL(result.data.signedUrl);
  }
  const feedbackCards=()=><>{pendingForChild.length>0&&<View style={s.card}><Text style={s.cardTitle}>Waiting for coach approval</Text><Text style={s.muted}>A new connection for {child?.name} is waiting for coach approval. Feedback from that connection stays private; updates from approved connections remain available below.</Text><Button title="Check connection approval" soft disabled={busy||loading} action={()=>{void refresh();}} /></View>}{feedback.length?feedback.map(item=><View key={item.id} style={[s.card,item.id===focusedFeedback&&{borderColor:'#2EE6A6',borderWidth:2}]}>{item.id===focusedFeedback&&<Text accessibilityRole="header" style={s.cardTitle}>Your shared class update</Text>}<Text style={s.overline}>{item.snapshot.academy_name} · COACH FEEDBACK</Text><Text style={s.cardTitle}>{item.snapshot.student_name}</Text><Text style={s.text}>{item.snapshot.note}</Text><Text style={s.muted}>Reviewed {localParts(item.reviewed_at,family?.timezone??'Asia/Kolkata').date}</Text>{item.snapshot.media_ids.map((id,index)=><Button key={id} title={`Prepare private class media ${index+1}`} soft disabled={busy} action={()=>{void run(()=>previewMedia(id));}} />)}{mediaPreview&&item.snapshot.media_ids.includes(mediaPreview.id)&&Platform.OS==='web'&&React.createElement('a',{href:mediaPreview.url,target:'_blank',rel:'noopener noreferrer',style:{color:'#3ABEFF'}},'Open private preview (expires in 60 seconds)')}</View>):pendingForChild.length?null:<View style={s.card}><Text style={s.cardTitle}>{links.length?'Your coach is connected':'A place for their little breakthroughs'}</Text><Text style={s.muted}>{links.length?'Reviewed updates will appear here. Check your class media choices in Explore if your coach has included photos or videos.':'Connect your coach with their invitation code. Only feedback reviewed for your child will appear here.'}</Text><Button title={links.length?'Manage coach media choices':'Connect a coach'} soft disabled={!child||busy} action={()=>links.length?setTab('Explore'):open('connect')} /></View>}</>;
  const section=(title:string,action?:()=>void,label='Add')=><View style={s.sectionHead}><Text style={s.sectionTitle}>{title}</Text>{action&&<Pressable accessibilityRole="button" disabled={busy} onPress={action}><Text style={s.link}>{label}</Text></Pressable>}</View>;
  const hour=Number(localParts(new Date().toISOString(),family?.timezone??'Asia/Kolkata').time.slice(0,2));
  const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const title=tab==='Home'?`${greeting}${family?`, ${family.parent_name.split(' ')[0]}`:''}`:tab==='Week'?'Your week':tab==='Together'?'Together time':'Explore';
  return <SafeAreaView style={s.safe}><StatusBar style="light" /><View style={s.shell}>
    <WorkspaceSwitcher current="parent" disabled={busy||dirty||!!sheet} />
    <ImageBackground source={require('../../assets/parent/aurora.jpg')} style={s.header} imageStyle={s.headerArt}>
      <View style={s.brandRow}><Pressable accessibilityRole="button" accessibilityLabel="My family setup" disabled={busy} onPress={()=>open('profile')} style={s.brand}><View style={s.avatar}><Text style={s.avatarText}>{family?.parent_name.slice(0,1).toUpperCase()??'P'}</Text></View><Text style={s.brandText}>Parent Plus</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Refresh family records" disabled={loading||busy} onPress={()=>{void refresh();}} style={s.icon}><Text style={s.iconText}>↻</Text></Pressable></View>
      <Text accessibilityRole="header" style={s.heading}>{title}</Text><Text style={s.subtitle}>{tab==='Home'?new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',timeZone:family?.timezone??'Asia/Kolkata'}):tab==='Together'?`Ideas for you${child?` and ${child.name}`:''}`:tab==='Week'?'A little view of your family’s rhythm':'Tools for your family'}</Text>
    </ImageBackground>
    <ScrollView testID="parent-scroll" keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      {!!error&&<View role="alert" style={s.error}><Text style={s.text}>{error}</Text><Button title="Retry family connection" soft disabled={busy||loading} action={()=>{void refresh();}} /></View>}
      {!!notice&&<View role="status" style={s.notice}><Text style={s.text}>{notice}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dismiss Parent update" onPress={()=>setNotice('')}><Text style={s.link}>Dismiss</Text></Pressable></View>}
      {loading&&!data&&<ActivityIndicator accessibilityLabel="Loading family" color={parentColors.mint} />}
      {data?.identityReady===false&&<View style={s.card}><Text accessibilityRole="alert" style={s.text}>Parent connections are paused until security update014 is installed. Your private family records remain available.</Text></View>}
      {journey&&<View style={s.card}><Text accessibilityRole="header" style={s.cardTitle}>View {journey.name}’s class update</Text><Text style={s.muted}>You are using the same login as Coach. {pendingJourney?'Waiting for Coach approval. No feedback is released until the match is approved.':!family?'Step 1: create your private family below.':!children.length?'Step 2: add your child below.':'Step 3: choose your family child and confirm the Coach connection.'} Only reviewed feedback will be visible.</Text>{!!family&&children.length>0&&journey.code&&!pendingJourney&&data?.identityReady&&<Button title="Connect child and view update" disabled={busy||loading} action={()=>{open('connect');setInvite(journey.code!);}} />}{pendingJourney&&Platform.OS==='web'&&React.createElement('a',{href:'/',style:{color:'#3ABEFF',padding:12}},'Open Coach to approve this connection')}<Button title="Leave feedback setup" soft disabled={busy} action={()=>{try{clearFeedbackJourney(globalThis.sessionStorage);}catch{}setJourney(null);}} /></View>}
      {!family?<View style={s.card}><Text style={s.cardTitle}>Your family, your space</Text><Text style={s.muted}>Start with your name and a family name. Your personal family records stay separate from the Coach workspace.</Text><Field label="Your parent name" value={parentName} change={setParentName} disabled={busy||loading} max={100} /><Field label="Family name" value={familyName} change={setFamilyName} disabled={busy||loading} max={100} /><Button title="Create my family workspace" disabled={busy||loading||!owner||error.includes('not enabled')} action={()=>{void run(saveFamily);}} /></View>:!data?<View style={s.card}><Text style={s.cardTitle}>Load your family records</Text><Text style={s.muted}>Your workspace is connected, but its latest records have not loaded.</Text><Button title="Load saved family records" disabled={busy||loading} action={()=>{void refresh();}} /></View>:<>
        <View accessibilityRole="tablist" style={s.childRow}>{children.map(value=><Pressable accessibilityRole="tab" accessibilityLabel={`Choose child ${value.name}`} accessibilityState={{selected:child?.id===value.id}} key={value.id} disabled={busy} onPress={()=>{setSelected(value.id);setMediaPreview(null);}} style={[s.childChip,child?.id===value.id&&s.childActive]}><View style={[s.face,{backgroundColor:parentColors[value.color]}]}><Text style={s.faceText}>{value.name.slice(0,2)}</Text></View><Text style={[s.text,child?.id===value.id&&s.childSelectedText]}>{value.name}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel="Add a child" disabled={busy} onPress={()=>open('child')} style={s.addChild}><Text style={s.link}>＋ Add child</Text></Pressable></View>
        {!child?<View style={s.card}><Text style={s.cardTitle}>Start with your child</Text><Text style={s.muted}>Add a name, optional birthday and a colour. Then your week and coach updates have a place to belong.</Text><Button title="Add my first child" disabled={busy} action={()=>open('child')} /></View>:<>
          {tab==='Home'&&<>
            <View style={s.band}><Text style={s.bandTitle}>Little things. Real connection.</Text><Text style={s.muted}>A little time together, a moment remembered, a coach’s thoughtful update.</Text><View style={s.metrics}>{[[stats?.minutes??0,'Together mins',parentColors.sun],[stats?.moments??0,'Moments',parentColors.rose],[stats?.todos??0,'Open to-dos',parentColors.sky]].map(([value,label,accent])=><View key={label} style={s.metric}><Text style={[s.metricValue,{color:String(accent)}]}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>)}</View><Text style={s.caption}>This week · from your saved family records</Text></View>
            {section('This week',()=>setTab('Week'),'See week →')}
            <View style={s.weekStrip}>{Array.from({length:7},(_,index)=>{const d=new Date(`${weekStart(today)}T12:00Z`);d.setUTCDate(d.getUTCDate()+index);const day=d.toISOString().slice(0,10);return <View key={day} style={[s.day,day===today&&s.dayActive]}><Text style={s.caption}>{['M','T','W','T','F','S','S'][index]}</Text><Text style={s.text}>{d.getUTCDate()}</Text></View>;})}</View>
            {section('Coming up',()=>open('event'))}{events.filter(value=>value.ends_at>=new Date().toISOString()).slice(0,3).map(value=><View key={value.id} style={s.row}><View style={s.stripe}/><View style={s.grow}><Text style={s.cardTitle}>{value.title}</Text><Text style={s.muted}>{localParts(value.starts_at,family.timezone).date} · {localParts(value.starts_at,family.timezone).time} {value.location?`· ${value.location}`:''}</Text></View></View>)}{!events.some(value=>value.ends_at>=new Date().toISOString())&&<Text style={s.muted}>Nothing planned yet. Add a class, school event or family plan.</Text>}
            {section('Family to-dos',()=>open('todo'))}{!todos.length&&<Text style={s.muted}>A small list for the things you want to remember.</Text>}{todos.map(todo=><Check key={todo.id} title={todo.title} checked={todo.done} disabled={busy} action={()=>{void run(async()=>{await saveFamilyRecord('family_todos',{...todo,done:!todo.done});await refreshedAfterSave('Reminder updated.');});}} />)}
            {section('From coaches',()=>{void refresh();},'Refresh')}{feedbackCards()}
            {section('One easy thing tonight')}<Pressable accessibilityRole="button" onPress={()=>{setIdea(activities[0]);open('activity');setName(activities[0].title);setMinutes(String(activities[0].minutes));}} style={s.card}><Text style={[s.overline,{color:parentColors.sun}]}>{activities[0].minutes} MIN · TOGETHER</Text><Text style={s.cardTitle}>{activities[0].title}</Text><Text style={s.muted}>{activities[0].need} →</Text></Pressable>
          </>}
          {tab==='Week'&&<>{section('Your family plans',()=>open('event'))}{!events.length&&<Text style={s.muted}>No saved plans yet.</Text>}{events.map(value=><View key={value.id} style={s.card}><Text style={s.cardTitle}>{value.title}</Text><Text style={s.muted}>{localParts(value.starts_at,family.timezone).date} · {localParts(value.starts_at,family.timezone).time}–{localParts(value.ends_at,family.timezone).time}</Text><Text style={s.muted}>{value.location}</Text></View>)}{section('Memories and together time',()=>open('moment'))}{!moments.length&&<Text style={s.muted}>Your saved moments will appear here.</Text>}{moments.map(value=><View key={value.id} style={s.card}><Text style={s.cardTitle}>{value.note}</Text><Text style={s.muted}>{value.occurred_on} · {value.minutes} minutes</Text></View>)}</>}
          {tab==='Together'&&<>{section('One small idea at a time')}<Text style={s.muted}>Suggestions to try together. Time counts only when you choose to log it.</Text>{activities.map(activity=><View key={activity.id} style={s.card}><Text style={[s.overline,{color:parentColors[activity.color]}]}>{activity.minutes} MINUTES · {activity.need}</Text><Text style={s.cardTitle}>{activity.title}</Text><Button title={`Try ${activity.title}`} soft disabled={busy} action={()=>{setIdea(activity);open('activity');setName(activity.title);setMinutes(String(activity.minutes));}} /></View>)}</>}
          {tab==='Explore'&&<>{(data.connectionRequests??[]).filter(request=>request.child_id===child.id).map(request=><View key={request.id} style={s.card}><Text style={s.cardTitle}>Connection request: {request.status}</Text><Text style={s.muted}>{request.child_name} · {request.guardian_email}</Text>{request.status==='pending'&&<Button title="Cancel pending connection request" soft disabled={busy} action={()=>{void run(async()=>{const result=await supabase!.rpc('cancel_parent_connection_request',{target_request:request.id});if(result.error)throw result.error;if(journey?.student===request.student_id){try{clearFeedbackJourney(globalThis.sessionStorage);}catch{}setJourney(null);}await refreshedAfterSave('Connection request cancelled. Ask the coach for a fresh invitation if needed.');});}} />}</View>)}{section('Your family tools')}<Button title="Connect a coach" disabled={busy} action={()=>open('connect')} /><Button title="Add a family plan" soft disabled={busy} action={()=>open('event')} /><Button title="Add a reminder" soft disabled={busy} action={()=>open('todo')} /><Button title="Save a family memory" soft disabled={busy} action={()=>open('moment')} />{section('Connected coaches')}{!links.length&&<Text style={s.muted}>Ask your coach for a Parent Plus invitation code.</Text>}{links.map(link=><View key={link.id} style={s.card}><Text style={s.cardTitle}>{link.academy_name}</Text><Text style={s.muted}>Coach’s student record: {link.student_name}</Text><Button title={`Media permissions for ${link.academy_name}`} soft disabled={busy} action={()=>openConsent(link)} /><Button title={`Disconnect ${link.academy_name}`} soft disabled={busy} action={()=>{open('profile');setConnection(link);}} /></View>)}</>}
        </>}
      </>}
      <Text style={s.footer}>Parent v{parentVersion} · build {appVersion} · Asia/Kolkata default</Text>
    </ScrollView>
    <View accessibilityRole="tablist" style={s.nav}>{(['Home','Week'] as Tab[]).map(value=><Pressable key={value} accessibilityRole="tab" accessibilityLabel={`Parent ${value}`} accessibilityState={{selected:tab===value}} disabled={busy} onPress={()=>setTab(value)} style={s.navItem}><Text style={[s.navIcon,tab===value&&s.navSelected]}>{value==='Home'?'⌂':'▥'}</Text><Text style={[s.navText,tab===value&&s.navSelected]}>{value}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel="Log a family moment" disabled={!child||busy} onPress={()=>open('moment')} style={s.capture}><Text style={s.captureText}>＋</Text></Pressable>{(['Together','Explore'] as Tab[]).map(value=><Pressable key={value} accessibilityRole="tab" accessibilityLabel={`Parent ${value}`} accessibilityState={{selected:tab===value}} disabled={busy} onPress={()=>setTab(value)} style={s.navItem}><Text style={[s.navIcon,tab===value&&s.navSelected]}>{value==='Together'?'☼':'▦'}</Text><Text style={[s.navText,tab===value&&s.navSelected]}>{value}</Text></Pressable>)}</View>
    <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={close}><View style={s.backdrop}><View accessibilityViewIsModal style={s.panel}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.panelContent}>
      <View style={s.sectionHead}><Text accessibilityRole="header" style={s.sectionTitle}>{sheet==='child'?'Child details':sheet==='moment'?'Save a little moment':sheet==='todo'?'Family reminder':sheet==='event'?'Add a family plan':sheet==='connect'?'Connect your coach':sheet==='activity'?idea.title:sheet==='consent'?'Class media choices':'My family setup'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close Parent form" disabled={busy} onPress={close}><Text style={s.link}>Close</Text></Pressable></View>
      {!!error&&<Text role="alert" style={s.errorText}>{error}</Text>}
      {sheet==='child'&&<><Field label="Child name" value={name} change={value=>change(setName,value)} disabled={busy} max={100} /><Field label="Birth date (optional)" kind="date" value={date} change={value=>change(setDate,value)} disabled={busy} /><Text style={s.muted}>Choose their colour</Text><View style={s.childRow}>{(Object.keys(parentColors) as (keyof typeof parentColors)[]).map(key=><Pressable accessibilityRole="radio" accessibilityLabel={`Child colour ${key}`} accessibilityState={{checked:color===key}} key={key} onPress={()=>{setColor(key);setDirty(true);}} style={[s.color,{backgroundColor:parentColors[key],borderColor:color===key?'#fff':'transparent'}]} />)}</View></>}
      {(sheet==='moment'||sheet==='activity')&&<>{sheet==='activity'&&<><Text style={s.muted}>You need: {idea.need}</Text><Text style={s.text}>{idea.steps}</Text></>}<Field label="Family moment" value={name} change={value=>change(setName,value)} multiline max={4000} disabled={busy} /><Field label="Moment date" kind="date" value={date} change={value=>change(setDate,value)} disabled={busy} /><Field label="Together minutes" kind="number" value={minutes} change={value=>change(setMinutes,value)} disabled={busy} max={4} /><Text style={s.muted}>For {child?.name}. This is a private family record; your coach cannot see it.</Text></>}
      {sheet==='todo'&&<Field label="Reminder" value={name} change={value=>change(setName,value)} disabled={busy} />}
      {sheet==='event'&&<><Field label="Family plan title" value={name} change={value=>change(setName,value)} disabled={busy} /><Field label="Family plan date" kind="date" value={date} change={value=>change(setDate,value)} disabled={busy} /><Field label="Family plan start time" kind="time" value={time} change={value=>change(setTime,value)} disabled={busy} /><Field label="Family plan end time" kind="time" value={endTime} change={value=>change(setEndTime,value)} disabled={busy} /><Field label="Family plan location" value={detail} change={value=>change(setDetail,value)} disabled={busy} /></>}
      {['child','moment','activity','todo','event'].includes(sheet??'')&&<Button title={busy?'Saving…':sheet==='child'?'Save child':sheet==='activity'?'We did this — save time':'Save family record'} disabled={busy} action={()=>{void run(saveSheet);}} />}
      {sheet==='connect'&&<>
        <Text style={s.text}>Choose the child this invitation is for. If this is a different child, create their private family profile here first. No child is matched automatically.</Text>
        <SelectField label="Child receiving this feedback" value={connectTarget} disabled={busy||addingConnectChild} options={[{value:'',label:'Choose a child — required'},...children.map(item=>({value:item.id,label:item.name}))]} onChange={id=>{setConnectTarget(id);setConfirmed(false);setDirty(true);}} />
        {!addingConnectChild?<Button title="Add a different child" disabled={busy} action={beginConnectChild} />:<View style={s.card}>
          <Text accessibilityRole="header" style={s.cardTitle}>Add a different child</Text>
          <Text style={s.muted}>Enter this child's own details. Your invitation stays here. Saving this profile does not connect a coach or release feedback.</Text>
          <Field label="New child name" value={name} change={value=>change(setName,value)} disabled={busy||childSaveAttempted} max={100} />
          <Field label="New child birth date (optional)" kind="date" value={date} change={value=>change(setDate,value)} disabled={busy||childSaveAttempted} />
          {childSaveAttempted&&<Text style={s.muted}>Retry here if saving is interrupted. The same child record will be reused.</Text>}
          <Button title={savedConnectChild?'Retry loading child profiles':'Save child and continue'} disabled={busy} action={()=>{void run(saveConnectChild);}} />
          <Button title="Use an existing child instead" soft disabled={busy||childSaveAttempted} action={()=>{setAddingConnectChild(false);setConfirmed(false);}} />
        </View>}
        <Text style={s.text}>{connectChild?`Request a match for ${connectChild.name}. `:''}Your verified email, parent name, child name and optional birth date will be shared with the coach for approval. Feedback stays private until that approval.</Text>
        <Field label="Coach invitation code" value={invite} change={value=>{change(setInvite,value);setInvitePreview(null);setConfirmed(false);}} disabled={busy} max={64} />
        <Button title="Review coach invitation" soft disabled={busy||!connectChild||addingConnectChild||data?.identityReady===false} action={()=>{void run(previewInvite);}} />
        {invitePreview&&connectChild&&!addingConnectChild&&<><Text style={s.cardTitle}>{invitePreview.academy_name}</Text><Text style={s.text}>Coach student: {invitePreview.student_name} → Your child: {connectChild.name}</Text><Check title="This is the right coach and child" checked={confirmed} disabled={busy} action={()=>setConfirmed(value=>!value)} /><Button title="Request coach approval" disabled={busy||!confirmed||data?.identityReady===false} action={()=>{void run(connect);}} /></>}
      </>}
      {sheet==='consent'&&connection&&<><Text style={s.text}>{connection.academy_name} · {child?.name}</Text><Text style={s.muted}>Choose what this coach may capture and share for your child. No choice is required to read text feedback. Withdrawing media permission removes current access to affected media and cancels its held feedback; an already-open preview can last up to 60 seconds.</Text><Check title="Allow class photos of my child" checked={photos} disabled={busy} action={()=>{setPhotos(value=>!value);setConfirmed(false);setDirty(true);}} /><Check title="Allow class videos of my child" checked={videos} disabled={busy} action={()=>{setVideos(value=>!value);setConfirmed(false);setDirty(true);}} /><Check title="Allow approved class media to be shared with linked parents" checked={sharing} disabled={busy} action={()=>{setSharing(value=>!value);setConfirmed(false);setDirty(true);}} /><Check title="I am the guardian and confirm these choices" checked={confirmed} disabled={busy} action={()=>setConfirmed(value=>!value)} /><Button title="Save my media choices" disabled={busy||!confirmed} action={()=>{void run(saveConsent);}} /></>}
      {sheet==='profile'&&<><Text style={s.cardTitle}>{family?.name??'Your private family workspace'}</Text><Text style={s.muted}>{family?.parent_name} · {family?.timezone??'Asia/Kolkata'}</Text>{children.map(value=><View key={value.id} style={s.card}><Text style={s.cardTitle}>{value.name}</Text><Text style={s.muted}>{value.born_on?`Birthday: ${value.born_on}`:'Birthday not entered'}</Text><Button title={`Edit child ${value.name}`} soft disabled={busy} action={()=>{open('child');formId.current=value.id;setName(value.name);setDate(value.born_on??'');setColor(value.color);}} /></View>)}<Text style={s.text}>One family owner is supported in this version. Additional caregivers will be supported later.</Text>{connection&&<><Text style={s.text}>Disconnect {connection.academy_name}? Coach feedback access will be removed; your private memories stay in your family.</Text><Check title="Disconnect this coach connection" checked={confirmed} disabled={busy} action={()=>setConfirmed(value=>!value)} /><Button title="Confirm disconnect coach" disabled={busy||!confirmed} action={()=>{void run(async()=>{const result=await supabase!.rpc('disconnect_parent_link',{target_link:connection.id});if(result.error)throw result.error;setConnection(null);await refreshedAfterSave('Coach disconnected. Your family records are kept.');});}} /></>}{onExitPreview?<Button title="Return to Parent sign in" action={onExitPreview} soft />:<SignOutButton />}<FontLicense dark /></>}
    </ScrollView></View></View></Modal>
    <ConfirmDialog visible={discard} title="Discard this family form?" message="Your unsaved entries will be lost. Saved family records are kept." confirmLabel="Discard Parent form" cancelLabel="Keep editing" onCancel={()=>setDiscard(false)} onConfirm={()=>{setDiscard(false);setDirty(false);setSheet(null);}} />
  </View></SafeAreaView>;
}

export default function ParentApp(){
  useEffect(()=>{
    if(Platform.OS!=='web')return;
    const title=document.title,scheme=document.documentElement.style.colorScheme;
    document.title='Parent Plus — Family workspace';document.documentElement.style.colorScheme='dark';
    return()=>{document.title=title;document.documentElement.style.colorScheme=scheme;};
  },[]);
  return <SafeAreaProvider><ErrorBoundary><FeedbackProvider><AuthProvider module="parent"><AuthGate render={exit=> <ParentWorkspace onExitPreview={exit} />} /></AuthProvider></FeedbackProvider></ErrorBoundary></SafeAreaProvider>;}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#060A0E'},shell:{flex:1,width:'100%',maxWidth:540,alignSelf:'center'},header:{padding:22,paddingTop:18,paddingBottom:26,backgroundColor:'#0C1722',overflow:'hidden'},headerArt:{opacity:0.37},brandRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:25},brand:{flexDirection:'row',alignItems:'center',gap:10},brandText:{color:'#F9FBFC',fontSize:18,fontWeight:'700'},avatar:{width:34,height:34,borderRadius:17,backgroundColor:'#2EE6A6',alignItems:'center',justifyContent:'center'},avatarText:{color:'#06251B',fontWeight:'700'},icon:{height:42,width:42,borderRadius:15,backgroundColor:'#172A34',alignItems:'center',justifyContent:'center'},iconText:{fontSize:24,color:'#F9FBFC'},heading:{fontSize:31,lineHeight:37,fontWeight:'800',letterSpacing:-1,color:'#F9FBFC'},subtitle:{fontSize:13,lineHeight:21,color:'#BDC9D2',marginTop:6},content:{padding:18,paddingBottom:35,gap:14},card:{padding:18,borderRadius:22,backgroundColor:'#151A20',borderWidth:1,borderColor:'#313A45',gap:12},cardTitle:{fontSize:17,fontWeight:'700',color:'#F9FBFC'},text:{fontSize:14,lineHeight:22,color:'#F9FBFC'},muted:{fontSize:13,lineHeight:21,color:'#A9B3BF'},caption:{fontSize:11,lineHeight:18,color:'#A9B3BF'},overline:{fontSize:10,fontWeight:'700',letterSpacing:0.9,color:'#2EE6A6'},childRow:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},childChip:{flexDirection:'row',gap:7,alignItems:'center',padding:7,paddingRight:12,borderRadius:30,borderWidth:1,borderColor:'#313A45',backgroundColor:'#151A20'},childActive:{borderColor:'#FFF',backgroundColor:'#FFF'},childSelectedText:{color:'#000',fontWeight:'700'},face:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center'},faceText:{fontSize:11,fontWeight:'700',color:'#101A21'},addChild:{minHeight:44,justifyContent:'center',padding:8},link:{fontSize:13,fontWeight:'600',color:'#3ABEFF'},band:{padding:18,gap:12,borderRadius:22,backgroundColor:'#15251F',borderWidth:1,borderColor:'#2A4B3E'},bandTitle:{color:'#D4FFE9',fontSize:18,fontWeight:'700'},metrics:{flexDirection:'row',gap:10,justifyContent:'space-between'},metric:{flex:1,gap:5},metricValue:{fontSize:29,fontWeight:'800'},metricLabel:{color:'#C1D0CB',fontSize:11},sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,marginTop:8},sectionTitle:{color:'#F9FBFC',fontWeight:'700',fontSize:18,flexShrink:1},weekStrip:{flexDirection:'row',gap:5},day:{flex:1,paddingVertical:12,borderRadius:15,backgroundColor:'#151A20',alignItems:'center',gap:5},dayActive:{backgroundColor:'#1B352C',borderWidth:1,borderColor:'#2EE6A6'},row:{flexDirection:'row',padding:16,borderRadius:18,backgroundColor:'#151A20',gap:12,alignItems:'center'},stripe:{width:4,alignSelf:'stretch',borderRadius:5,backgroundColor:'#3ABEFF'},grow:{flex:1,gap:5},button:{minHeight:48,padding:14,borderRadius:15,backgroundColor:'#2EE6A6',alignItems:'center',justifyContent:'center'},soft:{backgroundColor:'#20262F'},buttonText:{fontSize:14,fontWeight:'700',color:'#06251B'},ink:{color:'#F9FBFC'},disabled:{opacity:0.45},field:{gap:8},label:{color:'#DCE3E8',fontSize:13,fontWeight:'600'},input:{minHeight:48,padding:13,fontSize:16,color:'#F9FBFC',backgroundColor:'#20262F',borderWidth:1,borderColor:'#313A45',borderRadius:15},multiline:{minHeight:120,textAlignVertical:'top'},check:{minHeight:46,paddingVertical:10},color:{height:40,width:40,borderRadius:20,borderWidth:3},footer:{fontSize:10,color:'#7E8797',textAlign:'center',marginTop:12},nav:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingVertical:10,paddingHorizontal:8,marginHorizontal:12,marginBottom:8,borderWidth:1,borderRadius:28,borderColor:'#253A4D',backgroundColor:'#0F1D2B'},navItem:{flex:1,alignItems:'center',minHeight:48,gap:4,justifyContent:'center'},navText:{fontSize:10,fontWeight:'600',color:'#A9B3BF'},navIcon:{fontSize:22,color:'#A9B3BF'},navSelected:{color:'#2EE6A6'},capture:{height:58,width:58,borderRadius:29,marginHorizontal:6,backgroundColor:'#E5F8F7',borderWidth:5,borderTopColor:'#3ABEFF',borderRightColor:'#2EE6A6',borderBottomColor:'#FF5D8F',borderLeftColor:'#A27BFF',alignItems:'center',justifyContent:'center'},captureText:{fontSize:30,color:'#0C151C'},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#000B'},panel:{width:'100%',maxWidth:540,alignSelf:'center',maxHeight:'91%',backgroundColor:'#10151B',borderTopLeftRadius:26,borderTopRightRadius:26,borderWidth:1,borderColor:'#313A45'},panelContent:{padding:22,gap:17,paddingBottom:40},error:{padding:16,gap:12,borderRadius:16,backgroundColor:'#47222F',borderWidth:1,borderColor:'#A74366'},errorText:{fontSize:14,lineHeight:22,color:'#FFC0D4'},notice:{padding:15,borderRadius:16,backgroundColor:'#13382D',gap:8}});
