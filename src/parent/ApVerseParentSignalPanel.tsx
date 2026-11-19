import React,{useRef,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,View} from 'react-native';
import {randomUUID} from 'expo-crypto';
import {Text} from '../ui/Typography';
import {SelectField} from '../ui/SelectField';
import {appSessionStorage,supabase} from '../auth/client';
import {sendApVerseParentSignal,checkApVerseParentSignal,type ApParentSignalType,type ApParentSignalReason} from './apverseParentSignals';
import {createApVerseParentSignalPendingStore,type ApVerseParentSignalPending} from './apverseParentSignalPending';
import type {ApVerseAttendanceSession} from './apverseAttendance';

const pendingStore=createApVerseParentSignalPendingStore(appSessionStorage);
const signalOptions:[ApParentSignalType,string][]=[['running_late','Running late'],['missing_today','Absent today'],['dropped_off','Parent reports child dropped off'],['picked_up','Parent reports child picked up']];
const reasonOptions:[ApParentSignalReason,string][]=[['unwell','Unwell'],['travelling','Travelling'],['other','Other']];
const signalLabel=(type:ApParentSignalType)=>signalOptions.find(([value])=>value===type)?.[1]??'Parent report';
const signalInput=(operation:ApVerseParentSignalPending)=>({ownerId:operation.ownerId,requestId:operation.requestId,payload:operation.payload});

type Props={owner:string;child:string;row:ApVerseAttendanceSession|null;pending:ApVerseParentSignalPending|null;onPending:(pending:ApVerseParentSignalPending)=>void;onPendingRemoved:(pending:ApVerseParentSignalPending)=>void;onConfirmed:()=>void};

export function ApVerseParentSignalPanel({owner,child,row,pending,onPending,onPendingRemoved,onConfirmed}:Props){
 const [open,setOpen]=useState(false),[type,setType]=useState<ApParentSignalType>('running_late'),[reason,setReason]=useState<ApParentSignalReason>('unwell');
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[retryable,setRetryable]=useState(false),[blocked,setBlocked]=useState(false);
 const busyRef=useRef(false);
 if(!row?.can_signal&&!pending)return null;

 async function finishKnown(operation:ApVerseParentSignalPending){
  try{await pendingStore.remove(operation.ownerId,operation.payload.child_id,operation.payload.session_id,operation.requestId);onPendingRemoved(operation);setNotice('Report saved for Coach. It does not change attendance or verify a handover.');setRetryable(false);onConfirmed();}
  catch{setError('The report is confirmed, but this device could not clear its recovery record. Check the report status again before retrying.');setRetryable(false);}
 }
 async function transmit(operation:ApVerseParentSignalPending){
  const client=supabase as unknown as Parameters<typeof sendApVerseParentSignal>[0];
  const result=await sendApVerseParentSignal(client,signalInput(operation));
  if(result.ok&&'receipt' in result){await finishKnown(operation);return;}
  setRetryable(false);setBlocked(result.kind==='conflict');
  setError(result.kind==='forbidden'?'Your signed-in account changed. Sign in with the same Parent account to recover this report.':result.kind==='conflict'?'This saved request conflicts with another report. We kept it and will not send a replacement.':'We could not confirm whether the report was saved. Check its status before trying again.');
 }
 async function beginSend(){
  if(busyRef.current||!row?.can_signal||!supabase)return;
  busyRef.current=true;setBusy(true);setNotice('');setError('');setBlocked(false);
  try{
   const operation=await pendingStore.save({ownerId:owner,requestId:randomUUID(),payload:{operation:'send_parent_signal',child_id:child,workspace_id:row.workspace_id,session_id:row.session_id,expected_session_version:row.session_version,type,reason:type==='missing_today'?reason:null}});
   onPending(operation);setOpen(false);await transmit(operation);
  }catch{setError('This device could not securely save the retry details, so no report was sent. Retry after the storage issue is resolved.');}
  finally{busyRef.current=false;setBusy(false);}
 }
 async function checkStatus(){
  if(!pending||busyRef.current||!supabase)return;
  busyRef.current=true;setBusy(true);setNotice('');setError('');setBlocked(false);
  try{
   const result=await checkApVerseParentSignal(supabase as unknown as Parameters<typeof checkApVerseParentSignal>[0],signalInput(pending));
   if(!result.ok){setBlocked(result.kind==='conflict');setError(result.kind==='forbidden'?'Sign in with the same Parent account to recover this report.':result.kind==='conflict'?'The saved request conflicts with another report. We kept it and will not send a replacement.':'We could not check the report status. Keep this screen and try again.');return;}
   if('state' in result&&result.state==='known'){await finishKnown(pending);return;}
   setRetryable(true);setNotice('No saved report was found. You can retry the exact same request safely.');
  }catch{setError('We could not check the report status. Keep this screen and try again.');}
  finally{busyRef.current=false;setBusy(false);}
 }
 async function retry(){
  if(!pending||!retryable||blocked||busyRef.current)return;
  busyRef.current=true;setBusy(true);setError('');setNotice('');
  try{await transmit(pending);}
  catch{setError('We could not confirm whether the report was saved. Check its status before trying again.');}
  finally{busyRef.current=false;setBusy(false);}
 }
 return <View style={s.card}>
  {!!row&&<Text style={s.text}>{row.own_latest_signal?`Latest report: ${signalLabel(row.own_latest_signal.type)} · ${new Date(row.own_latest_signal.created_at).toLocaleString()}`:'No report sent for this class yet.'}</Text>}
  {pending?<>
   <Text style={s.text}>An earlier “{signalLabel(pending.payload.type)}” report from {new Date(pending.createdAt).toLocaleString()} needs confirmation. Its original request is saved on this device.</Text>
   <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void checkStatus();}} style={s.button}><Text style={s.text}>Check report status</Text></Pressable>
   {retryable&&!blocked&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void retry();}} style={s.button}><Text style={s.text}>Retry the same report</Text></Pressable>}
  </>:<>
   {!open?<Pressable accessibilityRole="button" disabled={busy||!row?.can_signal} onPress={()=>{setOpen(true);setError('');setNotice('');}} style={s.button}><Text style={s.text}>Send an update to Coach</Text></Pressable>:<>
    <Text style={s.text}>This is a Parent report. It does not change attendance or verify a child’s arrival or pickup.</Text>
    <SelectField label="Parent report" value={type} options={signalOptions.map(([value,label])=>({value,label}))} disabled={busy} onChange={value=>setType(value as ApParentSignalType)}/>
    {type==='missing_today'&&<SelectField label="Reason for absence" value={reason} options={reasonOptions.map(([value,label])=>({value,label}))} disabled={busy} onChange={value=>setReason(value as ApParentSignalReason)}/>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void beginSend();}} style={s.button}><Text style={s.text}>Send Parent report</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={()=>setOpen(false)} style={s.button}><Text style={s.text}>Cancel report</Text></Pressable>
   </>}
  </>}
  {busy&&<ActivityIndicator accessibilityLabel="Processing Parent report" color="#2EE6A6"/>}
  {!!notice&&<Text style={s.text}>{notice}</Text>}
  {!!error&&<Text accessibilityRole="alert" style={s.text}>{error}</Text>}
 </View>;
}

const s=StyleSheet.create({card:{padding:14,gap:10,borderRadius:16,backgroundColor:'#20262F',borderWidth:1,borderColor:'#45515E'},text:{color:'#DCE3E8',fontSize:14,lineHeight:21},button:{minHeight:46,padding:11,borderRadius:12,backgroundColor:'#151A20',alignItems:'center',justifyContent:'center'}});
