import React,{useEffect,useRef,useState} from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../ui/Typography';
import * as ImagePicker from 'expo-image-picker';
import {randomUUID} from 'expo-crypto';
import type {Batch,BatchDraft,Roster,Proficiency} from '../roster/model';
import {parseFee,proficiencyLabels} from '../roster/model';
import {saveBatch} from '../roster/service';
import {ConfirmDialog} from '../ui/ConfirmDialog';
import {SelectField} from '../ui/SelectField';
import {scanRoster,importRoster} from './service';
import {matches,validateReview,namesFromLines,needsManualNameSelection,type ReviewStudent,type ScanStudent} from './model';
export type SavedRosterImport={ids:string[];batchId:string|null;batchName:string};
function Button({label,onPress,disabled=false,soft=false}:{label:string;onPress:()=>void;disabled?:boolean;soft?:boolean}){return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,soft&&s.soft,disabled&&s.disabled]}><Text style={[s.buttonText,soft&&s.softText]}>{label}</Text></Pressable>;}
function Field({label,value,onChange,disabled=false,numeric=false,max=100}:{label:string;value:string;onChange:(text:string)=>void;disabled?:boolean;numeric?:boolean;max?:number}){return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} editable={!disabled} maxLength={max} onChangeText={onChange} autoCorrect={false} autoCapitalize={/email/i.test(label)?'none':'words'} keyboardType={numeric?'number-pad':/email/i.test(label)?'email-address':/phone/i.test(label)?'phone-pad':'default'} style={s.input}/></View>;}
export function ScanRosterScreen({academy,roster,initialBatch,onSaved,onOpenBatch,onOpenStudent,onCancel,onDirtyChange,onBusyChange,onViewChange}:{academy:string;roster:Roster;initialBatch:string|null;onSaved:(result:SavedRosterImport)=>Promise<boolean>;onOpenBatch:(id:string)=>void;onOpenStudent:(id:string)=>void;onCancel:()=>void;onDirtyChange:(value:boolean)=>void;onBusyChange:(value:boolean)=>void;onViewChange:()=>void}){
 const [needsNameSelection,setNeedsNameSelection]=useState(false);
 const [rawLines,setRawLines]=useState<string[]>([]),[showRaw,setShowRaw]=useState(false),[expanded,setExpanded]=useState<string[]>([]);
 const [rows,setRows]=useState<ReviewStudent[]>([]),[warnings,setWarnings]=useState<string[]>([]),[batch,setBatch]=useState(initialBatch);
 const [localBatches,setLocalBatches]=useState<Batch[]>([]),[batchForm,setBatchForm]=useState<BatchDraft|null>(null),[batchNotice,setBatchNotice]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false),[discard,setDiscard]=useState(false),[uncertain,setUncertain]=useState(false);
 const [saved,setSaved]=useState<SavedRosterImport|null>(null),[refreshed,setRefreshed]=useState(false);
 const lock=useRef(false),request=useRef(randomUUID());
 const available=[...new Map([...localBatches,...roster.batches].filter(b=>!b.archived_at).map(b=>[b.id,b])).values()];
 const selected=rows.filter(row=>row.selected).length,hasReview=!!(rows.length||rawLines.length),batchName=available.find(b=>b.id===batch)?.name??'No batch yet';
 useEffect(()=>{onDirtyChange(!saved&&(hasReview||!!batchForm));return()=>onDirtyChange(false);},[hasReview,batchForm,saved,onDirtyChange]);
 useEffect(()=>{onBusyChange(busy);return()=>onBusyChange(false);},[busy,onBusyChange]);
 function update(key:string,change:Partial<ReviewStudent>){if(uncertain||busy||saved)return;setRows(items=>items.map(row=>row.key===key?{...row,...change}:row));setError('');}
 function review(students:ScanStudent[],sourceWarnings:string[],manualSelection=false){
  setRows(students.map(row=>{const key=randomUUID();return {...row,key,id:key,mode:'new',selected:!manualSelection&&!!row.name&&!matches(row,roster).length};}));setWarnings(sourceWarnings);setNeedsNameSelection(manualSelection);setExpanded([]);setShowRaw(false);setError('');onViewChange();
 }
 async function pick(camera=false){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   if(camera&&Platform.OS!=='web'){const allowed=await ImagePicker.requestCameraPermissionsAsync();if(!allowed.granted)throw new Error('Camera access was declined. Choose an existing photo instead.');}
   const options:ImagePicker.ImagePickerOptions={mediaTypes:['images'],quality:0.8,base64:false};
   const image=camera&&Platform.OS!=='web'?await ImagePicker.launchCameraAsync(options):await ImagePicker.launchImageLibraryAsync(options);if(image.canceled)return;
   const result=await scanRoster(academy,image.assets[0].uri);if(!result.students.length&&!result.rawLines.length)throw new Error('No readable students found. Try a clearer photo.');
   setRawLines(result.rawLines);
   const candidates=result.students.length?result.students:namesFromLines(result.rawLines);
   review(candidates,result.students.length?result.warnings:[...result.warnings,'These names were populated from readable lines. Check that headings or guardian names are not included. Add any missing details before saving.'],!result.students.length&&needsManualNameSelection(result.rawLines));
   if(!candidates.length)setShowRaw(true);
  }catch(failure){setError(failure instanceof Error?failure.message:'The photo could not be read. Please retry.');}
  finally{lock.current=false;setBusy(false);}
 }
 async function createBatch(){
  if(!batchForm||lock.current)return;const fee=parseFee(batchForm.fee||'0');
  if(!batchForm.name.trim()||batchForm.name.trim().length>100||fee===null){setError('Enter a batch name and a valid monthly fee, or leave the fee as zero.');return;}
  lock.current=true;setBusy(true);setError('');
  try{await saveBatch(academy,{...batchForm,fee:batchForm.fee||'0'});setLocalBatches(current=>[...current.filter(b=>b.id!==batchForm.id),{id:batchForm.id,name:batchForm.name.trim(),room:batchForm.room.trim(),monthly_fee_paise:fee,archived_at:null}]);setBatch(batchForm.id);setBatchNotice(`${batchForm.name.trim()} created and selected. ${hasReview?'Your student review is retained.':'Now photograph your student list.'}`);setBatchForm(null);}
  catch{setError('Creating the batch could not be confirmed. Your entries are retained; retry safely.');}
  finally{lock.current=false;setBusy(false);}
 }
 async function refreshSaved(result:SavedRosterImport){
  try{setRefreshed(await onSaved(result));}catch{setRefreshed(false);}
 }
 async function save(){
  if(lock.current||saved)return;const invalid=validateReview(rows,roster);if(invalid){setError(invalid);setConfirm(false);return;}
  lock.current=true;setBusy(true);setConfirm(false);setError('');let completed:SavedRosterImport|null=null;
  try{const ids=await importRoster(academy,batch,request.current,rows);completed={ids,batchId:batch,batchName};setSaved(completed);setUncertain(false);onViewChange();}
  catch(failure){setUncertain(true);setError(failure instanceof Error?failure.message:'The import could not be confirmed. Retry the same review.');}
  if(completed)await refreshSaved(completed);
  lock.current=false;setBusy(false);
 }
 async function retryRefresh(){if(!saved||lock.current)return;lock.current=true;setBusy(true);await refreshSaved(saved);lock.current=false;setBusy(false);}
 if(saved)return <View style={s.root}>
  <View style={s.success}><Text style={s.kicker}>YOUR REAL ROSTER IS READY</Text><Text accessibilityRole="header" style={s.heading}>{saved.ids.length} students saved</Text><Text style={s.body}>{saved.batchId?`Added to ${saved.batchName}.`:'Saved in your academy without a batch.'} You can now open their profiles, record attendance and track fees.</Text></View>
  {!refreshed&&<View style={s.card}><Text style={s.warning}>{busy?'Refreshing your saved profiles…':'The students were saved, but the latest profiles could not be loaded. Refresh them below; do not import the same photo again.'}</Text>{!busy&&<Button label="Refresh saved profiles" onPress={()=>{void retryRefresh();}}/>}</View>}
  {saved.batchId&&<Button label={`View batch ${saved.batchName}`} disabled={busy||!refreshed} onPress={()=>onOpenBatch(saved.batchId!)}/>}
  <Text style={s.title}>Saved student profiles</Text>
  {saved.ids.map(id=>{const name=roster.students.find(student=>student.id===id)?.name??rows.find(row=>row.id===id)?.name??'Saved student';return <Button key={id} label={`Open saved profile for ${name}`} soft disabled={busy||!refreshed} onPress={()=>onOpenStudent(id)}/>;})}
  <Button label="Back to students" soft disabled={busy} onPress={onCancel}/>
 </View>;
 return <View style={s.root}>
  <Text style={s.kicker}>BATCH → PHOTO → REVIEW → SAVE</Text><Text accessibilityRole="header" style={s.heading}>{hasReview?'Review your students':'Set up your students'}</Text>
  <Text style={s.body}>{hasReview?'Your student list is ready to review. Check details and batch before saving.':'Start with a teaching batch, then bring your own student names into the app from a register photo.'}</Text>
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  <View style={[s.card,hasReview&&s.compactBatch]}>
   {!hasReview&&<Text style={s.title}>1. Choose or create your batch</Text>}
   <SelectField label="Batch for these students" value={batch??''} options={[{value:'',label:'No batch yet — assign later'},...available.map(b=>({value:b.id,label:b.name}))]} disabled={busy||uncertain||!!batchForm} onChange={id=>{setBatch(id||null);setBatchNotice('');}}/>
   {!batchForm?<Pressable accessibilityRole="button" accessibilityLabel="Create a new batch" disabled={busy||uncertain} onPress={()=>{setBatchForm({id:randomUUID(),name:'',room:'',fee:'0'});setBatchNotice('');}} style={s.createLink}><Text style={s.hint}>+ Create a new batch</Text></Pressable>:<View style={s.batchForm}>
    <Field label="New batch name" value={batchForm.name} disabled={busy} onChange={name=>setBatchForm(value=>value?{...value,name}:value)}/>
    <Field label="Monthly batch fee (₹)" value={batchForm.fee} disabled={busy} onChange={fee=>setBatchForm(value=>value?{...value,fee}:value)} max={12}/>
    <Field label="Batch room or location" value={batchForm.room} disabled={busy} onChange={room=>setBatchForm(value=>value?{...value,room}:value)}/>
    <Text style={s.caption}>You can leave the fee at zero and set it later. Creating a batch does not save students or collect money.</Text>
    <Button label={busy?'Creating batch…':'Create batch and continue'} disabled={busy} onPress={()=>{void createBatch();}}/>
    <Button label="Cancel batch creation" soft disabled={busy} onPress={()=>setBatchForm(null)}/>
   </View>}
   {!!batchNotice&&<Text style={s.hint}>{batchNotice}</Text>}
  </View>
  {!hasReview?<View style={s.card}>
   <Text style={s.title}>2. Photograph your student register</Text><Text style={s.body}>One clear page, up to 50 students. The recognised list will appear automatically for review. Names, age and guardian details are copied only when readable; missing fields stay blank.</Text>
   <Text style={s.caption}>The selected image is sent to Google Cloud Vision. It is not saved as a profile photo or into academy Storage. Recognition can make mistakes.</Text>
   {Platform.OS!=='web'&&<Button label="Take register photo" disabled={busy||!!batchForm} onPress={()=>{void pick(true);}}/>}
   <Button label={busy?'Reading your register…':Platform.OS==='web'?'Take or choose register photo':'Choose register photo'} disabled={busy||!!batchForm} onPress={()=>{void pick();}}/>
   <Text style={s.caption}>Manual entry is available through Back to student entry. Scan limits: 10 per academy/day and 900 shared attempts/month.</Text>
  </View>:<>
   <View style={s.reviewTitle}><Text accessibilityRole="header" style={s.title}>Review {rows.length} recognised students</Text><Text style={s.body}>{uncertain?'An import may already have saved. Retry this same review to confirm it.':`${selected} selected · ${batchName}. Nothing is saved until you confirm.`}</Text></View>
   {needsNameSelection?<Text style={s.warning}>Unlabelled details were found. Review and select the correct student names; other fields were not guessed.</Text>:<Text style={s.caption}>Check each name and add any missing details. Possible existing matches need your selection.</Text>}
   {warnings.filter(w=>/first 50|first 200|multiple table/i.test(w)).map((w,i)=><Text key={i} style={s.warning}>{w}</Text>)}
   {!rows.length&&<View style={s.card}><Text style={s.warning}>No student rows could be assigned safely. The recognised text is available below. Use a clearer register photo or return to manual student entry.</Text><Button label="Try a clearer register photo" soft disabled={busy} onPress={()=>{void pick();}}/></View>}
   {rows.map((row,index)=>{const candidates=matches(row,roster);return <View key={row.key} style={s.card}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={`Include scanned student ${index+1}`} accessibilityState={{checked:row.selected,disabled:busy||uncertain}} aria-checked={row.selected} disabled={busy||uncertain} onPress={()=>update(row.key,{selected:!row.selected})} style={s.select}><Text style={s.title}>{row.selected?'✓':'○'} Student {index+1}</Text></Pressable>
    {row.warnings.filter(w=>!w.startsWith('Names-only interpretation')).map((warning,i)=><Text key={i} style={s.warning}>{warning}</Text>)}
    {!!candidates.length&&<Text style={s.warning}>Matching name found. Link the existing student to preserve their profile, or correct this name.</Text>}
    {candidates.filter(student=>!student.archived_at).map(student=><Button key={student.id} label={`${row.mode==='existing'&&row.id===student.id?'✓ ':''}Use existing ${student.name}${student.age_years===null?'':` · age ${student.age_years}`}`} soft disabled={busy||uncertain} onPress={()=>update(row.key,{mode:'existing',id:student.id,selected:true})}/>)}
    {row.mode==='existing'?<><Text style={s.body}>Existing details are retained; only batch membership is added.</Text><Button label={`Review as new student ${index+1}`} soft disabled={busy||uncertain} onPress={()=>update(row.key,{mode:'new',id:row.key})}/></>:<>
     <Field label={`Student name row ${index+1}`} value={row.name} disabled={busy||uncertain} onChange={name=>update(row.key,{name})}/>
     <View style={s.row}><View style={s.age}><Field label={`Age row ${index+1}`} value={row.age} numeric max={3} disabled={busy||uncertain} onChange={age=>update(row.key,{age})}/></View><View style={s.level}><SelectField label={`Proficiency row ${index+1}`} value={row.proficiency} options={Object.entries(proficiencyLabels).map(([value,label])=>({value,label}))} disabled={busy||uncertain} onChange={proficiency=>update(row.key,{proficiency:proficiency as Proficiency})}/></View></View>
     {!!(row.guardian||row.phone||row.email)&&<Text style={s.body}>{[row.guardian,row.phone,row.email].filter(Boolean).join(' · ')}</Text>}
     <Button label={`${expanded.includes(row.key)?'Hide':'Edit'} more details for student ${index+1}`} soft disabled={busy||uncertain} onPress={()=>setExpanded(keys=>keys.includes(row.key)?keys.filter(key=>key!==row.key):[...keys,row.key])}/>
     {expanded.includes(row.key)&&(['guardian','email','phone'] as const).map(field=><Field key={field} label={`${field==='guardian'?'Guardian name':field==='email'?'Guardian email':'Guardian phone'} row ${index+1}`} value={row[field]} disabled={busy||uncertain} max={field==='email'?320:field==='phone'?30:100} onChange={value=>update(row.key,{[field]:value})}/>)}
    </>}
   </View>;})}
   {!!rawLines.length&&<View style={s.card}><Button label={showRaw?'Hide recognised text':'Show recognised text'} soft disabled={busy} onPress={()=>setShowRaw(value=>!value)}/>{showRaw&&<>{warnings.map((w,i)=><Text key={i} style={s.warning}>{w}</Text>)}<Text selectable style={s.body}>{rawLines.join('\n')}</Text></>}</View>}
   {uncertain&&<Text style={s.warning}>This review is locked until the save is confirmed. Retry the same import; no second OCR scan is needed.</Text>}
   <Button label={busy?'Saving students…':uncertain?'Retry same student import':`Review import (${selected})`} disabled={busy||!selected||!!batchForm} onPress={()=>{const invalid=validateReview(rows,roster);if(invalid)setError(invalid);else if(uncertain)void save();else setConfirm(true);}}/>
  </>}
  <Button label={initialBatch?'Back to batch':'Back to student entry'} soft disabled={busy} onPress={()=>hasReview||batchForm?setDiscard(true):onCancel()}/>
  <ConfirmDialog visible={confirm} title={`Save ${selected} students?`} message={`${batch?`Add them to ${batchName}.`:'Save without a batch.'} Their profiles and batch roster will be available after saving. Existing profiles are preserved.`} confirmLabel="Confirm student import" cancelLabel="Keep reviewing" onConfirm={()=>{void save();}} onCancel={()=>setConfirm(false)}/>
  <ConfirmDialog visible={discard} title="Leave this student setup?" message={uncertain?'An import may already have saved. Check the roster before importing again.':'Unsaved student review edits will be discarded. A batch you already created stays in your academy.'} confirmLabel="Leave scan review" cancelLabel="Keep reviewing" onConfirm={onCancel} onCancel={()=>setDiscard(false)}/>
 </View>;
}
const s=StyleSheet.create({root:{gap:18},heading:{fontSize:28,lineHeight:34,fontWeight:'700',color:'#22303A'},kicker:{fontSize:10,letterSpacing:1.2,fontWeight:'700',color:'#1F6F6B'},title:{fontSize:18,fontWeight:'700',color:'#22303A'},body:{fontSize:14,lineHeight:22,color:'#5C6B73'},caption:{fontSize:12,lineHeight:19,color:'#63746D'},hint:{color:'#1F6F6B',fontSize:14,lineHeight:21},card:{padding:18,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#E3E8E2',gap:14},compactBatch:{padding:14,gap:6},createLink:{minHeight:36,justifyContent:'center'},batchForm:{gap:14,paddingTop:10},reviewTitle:{gap:8},row:{flexDirection:'row',gap:12},age:{width:80},level:{flex:1,minWidth:0},field:{gap:8},label:{fontSize:14,fontWeight:'600',color:'#22303A'},input:{minHeight:48,borderRadius:12,borderWidth:1,borderColor:'#CED8CC',padding:13,fontSize:16,color:'#22303A'},button:{minHeight:48,padding:14,borderRadius:12,backgroundColor:'#1F6F6B',alignItems:'center'},buttonText:{fontWeight:'700',color:'#fff'},soft:{backgroundColor:'#E7EFEB'},softText:{color:'#1F6F6B'},disabled:{opacity:0.5},warning:{color:'#7A4F16',fontSize:13,lineHeight:20},error:{color:'#A12622',fontSize:14,lineHeight:22},select:{paddingVertical:5},success:{gap:14,padding:22,borderRadius:22,backgroundColor:'#E5F0EC',borderWidth:1,borderColor:'#C7DFD6'}});
