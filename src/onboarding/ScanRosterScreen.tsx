import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {randomUUID} from 'expo-crypto';
import type {Roster,Proficiency} from '../roster/model';
import {proficiencyLabels} from '../roster/model';
import {ConfirmDialog} from '../ui/ConfirmDialog';
import {scanRoster,importRoster} from './service';
import {matches,validateReview,type ReviewStudent} from './model';
function Button({label,onPress,disabled=false,soft=false}:{label:string;onPress:()=>void;disabled?:boolean;soft?:boolean}){return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,soft&&s.soft,disabled&&s.disabled]}><Text style={[s.buttonText,soft&&s.softText]}>{label}</Text></Pressable>;}
export function ScanRosterScreen({academy,roster,initialBatch,onDone,onCancel,onDirtyChange,onBusyChange}:{academy:string;roster:Roster;initialBatch:string|null;onDone:(count:number)=>Promise<void>;onCancel:()=>void;onDirtyChange:(value:boolean)=>void;onBusyChange:(value:boolean)=>void}){
  const [expanded,setExpanded]=useState<string[]>([]);
  const [rows,setRows]=useState<ReviewStudent[]>([]),[warnings,setWarnings]=useState<string[]>([]),[batch,setBatch]=useState(initialBatch);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false),[discard,setDiscard]=useState(false),[uncertain,setUncertain]=useState(false),[completed,setCompleted]=useState(false);
  const lock=useRef(false),request=useRef(randomUUID());
  const selected=rows.filter(row=>row.selected).length;
  useEffect(()=>{onDirtyChange(rows.length>0&&!completed);return()=>onDirtyChange(false);},[rows,completed,onDirtyChange]);
  useEffect(()=>{onBusyChange(busy);return()=>onBusyChange(false);},[busy,onBusyChange]);
  function update(key:string,change:Partial<ReviewStudent>){if(!uncertain&&!busy)setRows(items=>items.map(row=>row.key===key?{...row,...change}:row));setError('');}
  async function pick(camera=false){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{
      // Browser uses the native file chooser; mobile browsers can offer Camera there.
      if(camera&&Platform.OS!=='web'){
        const allowed=await ImagePicker.requestCameraPermissionsAsync();
        if(!allowed.granted)throw new Error('Camera access was declined. Choose an existing photo instead.');
      }
      const options:ImagePicker.ImagePickerOptions={mediaTypes:['images'],quality:0.8,base64:false};
      const image=camera&&Platform.OS!=='web'?await ImagePicker.launchCameraAsync(options):await ImagePicker.launchImageLibraryAsync(options);
      if(image.canceled)return;
      const extracted=await scanRoster(academy,image.assets[0].uri);
      if(!extracted.students.length)throw new Error('No readable students found. Try a clearer photo.');
      setWarnings(extracted.warnings);setRows(extracted.students.map(row=>{const key=randomUUID();return {...row,key,id:key,mode:'new',selected:!!row.name&&!matches(row,roster).length};}));
    }catch(failure){setError(failure instanceof Error?failure.message:'The photo could not be read. Please retry.');}
    finally{lock.current=false;setBusy(false);}
  }
  async function save(){
    if(lock.current)return;
    const invalid=validateReview(rows,roster);if(invalid){setError(invalid);setConfirm(false);return;}
    lock.current=true;setBusy(true);setConfirm(false);setError('');
    try{const ids=await importRoster(academy,batch,request.current,rows);setCompleted(true);setUncertain(false);await onDone(ids.length);}
    catch(failure){setUncertain(true);setError(failure instanceof Error?failure.message:'The import could not be confirmed. Retry the same review.');}
    finally{lock.current=false;setBusy(false);}
  }
  return <View style={s.root}>
    <Text accessibilityRole="header" style={s.heading}>Scan student list</Text>
    <Text style={s.body}>Photograph a register or admission form. Review the readable names and details before anything is saved. Missing details stay blank.</Text>
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!rows.length?<View style={s.card}>
      <Text style={s.title}>A quicker way to get started</Text>
      <Text style={s.body}>Use one clear page, up to 50 students. Printed and readable handwritten lists are supported; recognition can make mistakes.</Text>
      <Text style={s.body}>This sends the selected image to OpenAI for text extraction. We do not save the register image in your photo library or academy Storage. Provider processing policies apply. Only send a register you are permitted to process.</Text>
      {Platform.OS!=='web'&&<Button label="Take register photo" disabled={busy} onPress={()=>{void pick(true);}}/>}
      <Button label={busy?'Reading list…':Platform.OS==='web'?'Take or choose register photo':'Choose register photo'} disabled={busy} onPress={()=>{void pick();}}/>
      <Text style={s.caption}>10 scans per academy per UTC day. Failed AI attempts may use a scan. Scanning must be enabled for your academy; manual entry stays available.</Text>
    </View>:<>
      <View style={s.card}><Text style={s.title}>Review {rows.length} extracted students</Text><Text style={s.body}>{uncertain?'An import may already have saved. Retry this same review to confirm it.':'Nothing has been saved. Correct mistakes, skip unwanted rows, and choose existing students where a name matches.'}</Text>
        {warnings.map((warning,i)=><Text key={i} style={s.warning}>{warning}</Text>)}
        <Text style={s.title}>Add selected students to</Text>
        <Button label={batch===null?'✓ No batch yet':'No batch yet'} soft disabled={busy||uncertain} onPress={()=>setBatch(null)}/>
        {roster.batches.filter(b=>!b.archived_at).map(b=><Button key={b.id} label={`${batch===b.id?'✓ ':''}${b.name}`} soft disabled={busy||uncertain} onPress={()=>setBatch(b.id)}/>)}
      </View>
      {rows.map((row,index)=>{const candidates=matches(row,roster);return <View key={row.key} style={s.card}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`Include scanned student ${index+1}`} accessibilityState={{checked:row.selected,disabled:busy||uncertain}} aria-checked={row.selected} disabled={busy||uncertain} onPress={()=>update(row.key,{selected:!row.selected})} style={s.select}><Text style={s.title}>{row.selected?'✓':'○'} Student {index+1}: {row.name||'Name unreadable'}</Text></Pressable>
        {row.warnings.map((warning,i)=><Text key={i} style={s.warning}>{warning}</Text>)}
        {!!candidates.length&&<Text style={s.warning}>Matching name found. Check the existing profile to avoid duplicates. Archived matches must be reviewed separately.</Text>}
        {candidates.filter(student=>!student.archived_at).map(student=><Button key={student.id} label={`${row.mode==='existing'&&row.id===student.id?'✓ ':''}Use existing ${student.name}${student.age_years===null?'':` · age ${student.age_years}`}`} soft disabled={busy||uncertain} onPress={()=>update(row.key,{mode:'existing',id:student.id,selected:true})}/>)}
        {row.mode==='existing'?<><Text style={s.body}>Existing profile and contacts are retained. Only batch membership is added.</Text><Button label={`Review as new student ${index+1}`} soft disabled={busy||uncertain} onPress={()=>update(row.key,{mode:'new',id:row.key})}/></>:<>
          <Text style={s.body}>{row.age?`${row.age} years old`:'Age not provided'} · {proficiencyLabels[row.proficiency]}</Text>
          {!!(row.guardian||row.email||row.phone)&&<Text style={s.body}>{[row.guardian,row.email,row.phone].filter(Boolean).join(' · ')}</Text>}
          {([['name','Student name'],...(expanded.includes(row.key)?[['age','Age'],['guardian','Guardian name'],['email','Guardian email'],['phone','Guardian phone']]:[])] as ['name'|'age'|'guardian'|'email'|'phone',string][]).map(([field,label])=><View key={field} style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={`${label} row ${index+1}`} value={row[field]} editable={!busy&&!uncertain} onChangeText={value=>update(row.key,{[field]:value})} maxLength={field==='email'?320:field==='phone'?30:field==='age'?3:100} keyboardType={field==='age'?'number-pad':field==='email'?'email-address':field==='phone'?'phone-pad':'default'} autoCorrect={false} autoCapitalize={field==='email'?'none':'words'} style={s.input}/></View>)}
          <Button label={`${expanded.includes(row.key)?'Hide':'Edit'} more details for student ${index+1}`} soft disabled={busy||uncertain} onPress={()=>setExpanded(keys=>keys.includes(row.key)?keys.filter(key=>key!==row.key):[...keys,row.key])}/>
          {expanded.includes(row.key)&&<><Text style={s.label}>Proficiency (only if stated)</Text><View style={s.choices}>{(Object.keys(proficiencyLabels) as Proficiency[]).map(level=><Pressable key={level} accessibilityRole="radio" accessibilityLabel={`Level ${proficiencyLabels[level]} row ${index+1}`} accessibilityState={{selected:row.proficiency===level,disabled:busy||uncertain}} disabled={busy||uncertain} onPress={()=>update(row.key,{proficiency:level})} style={[s.choice,row.proficiency===level&&s.soft]}><Text>{proficiencyLabels[level]}</Text></Pressable>)}</View></>}
        </>}
      </View>;})}
      {uncertain&&<Text style={s.warning}>This review is locked because the save outcome is uncertain. Retry the same import. If you close, check the roster before importing again; matching names cannot be created twice through this importer.</Text>}
      <Button label={busy?'Saving students…':uncertain?'Retry same student import':`Review import (${selected})`} disabled={busy||!selected||completed} onPress={()=>{const invalid=validateReview(rows,roster);if(invalid)setError(invalid);else if(uncertain)void save();else setConfirm(true);}}/>
    </>}
    <Button label={initialBatch?'Back to batch':'Back to student entry'} soft disabled={busy} onPress={()=>rows.length&&!completed?setDiscard(true):onCancel()}/>
    <ConfirmDialog visible={confirm} title={`Import ${selected} students?`} message={`${batch?`Add them to ${roster.batches.find(b=>b.id===batch)?.name}.`:'Save without a batch.'} Existing profiles will not be overwritten. No invitations, fees or messages are sent.`} confirmLabel="Confirm student import" cancelLabel="Keep reviewing" onConfirm={()=>{void save();}} onCancel={()=>setConfirm(false)}/>
    <ConfirmDialog visible={discard} title="Leave this scan review?" message={uncertain?'An import may already have saved. Check the roster before scanning again.':'Unsaved extracted details will be discarded.'} confirmLabel="Leave scan review" cancelLabel="Keep reviewing" onConfirm={onCancel} onCancel={()=>setDiscard(false)}/>
  </View>;
}
const s=StyleSheet.create({root:{gap:18},heading:{fontSize:30,fontWeight:'700',color:'#22303A'},title:{fontSize:17,fontWeight:'700',color:'#22303A'},body:{fontSize:14,lineHeight:22,color:'#5C6B73'},caption:{fontSize:12,lineHeight:20,color:'#5C6B73'},card:{padding:20,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#E3E8E2',gap:16},field:{gap:8},label:{fontSize:14,fontWeight:'600',color:'#22303A'},input:{minHeight:50,borderRadius:12,borderWidth:1,borderColor:'#CED8CC',padding:14,fontSize:16,color:'#22303A'},button:{minHeight:48,padding:14,borderRadius:12,backgroundColor:'#1F6F6B',alignItems:'center'},buttonText:{fontWeight:'700',color:'#fff'},soft:{backgroundColor:'#E7EFEB'},softText:{color:'#1F6F6B'},disabled:{opacity:0.5},warning:{color:'#7A4F16',fontSize:13,lineHeight:21},error:{color:'#A12622',fontSize:14,lineHeight:22},select:{paddingVertical:10},choices:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{padding:12,borderRadius:10,borderWidth:1,borderColor:'#CED8CC'}});
