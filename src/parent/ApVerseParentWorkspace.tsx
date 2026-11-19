import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,TextInput,View} from 'react-native';
import {randomUUID} from 'expo-crypto';
import {Text} from '../ui/Typography';
import {useAuth} from '../auth/AuthProvider';
import {supabase} from '../auth/client';
import {SignOutButton} from '../auth/SignOutButton';
import {loadApVerseChildren,type ApParentProfileRpcClient,type ApVerseChildProfile} from './apverseParentProfile';
import {runApVerseChildCreation,type ApChildCreationRpcClient} from './apverseChildCreation';

type Pending={ownerId:string;name:string;requestId:string;priorIntentId:string|null};

export function ApVerseParentWorkspace({onExitPreview}:{onExitPreview?:()=>void}){
 const owner=useAuth().session?.user.id;
 const [children,setChildren]=useState<ApVerseChildProfile[]|null>(null),[selected,setSelected]=useState('');
 const [name,setName]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const generation=useRef(0),pending=useRef<Pending|null>(null);
 const refresh=useCallback(async()=>{
  const request=++generation.current;
  if(!owner||!supabase){setChildren(null);setSelected('');setLoading(false);setError('Your account could not be verified. Sign in again.');return false;}
  setLoading(true);setError('');
  try{
   const rows=await loadApVerseChildren(supabase as unknown as ApParentProfileRpcClient,owner);
   if(request!==generation.current)return false;
   setChildren(rows);setSelected(current=>rows.some(child=>child.id===current)?current:rows[0]?.id??'');return true;
  }catch{
   if(request===generation.current){setChildren(null);setSelected('');setError('Children could not be loaded. Retry to check your APVerse profiles.');}
   return false;
  }finally{if(request===generation.current)setLoading(false);}
 },[owner]);
 useEffect(()=>{setChildren(null);setSelected('');setName('');setError('');setNotice('');void refresh();return()=>{generation.current++;};},[refresh]);

 async function createChild(){
  if(busy||!owner||!supabase)return;
  const clean=name.trim();
  if(!clean||Array.from(clean).length>120){setError('Enter a child name up to 120 characters.');return;}
  setBusy(true);setError('');setNotice('');
  const client=supabase as unknown as ApChildCreationRpcClient;
  try{
   const status=await runApVerseChildCreation(client,{operation:'status',expectedOwnerId:owner});
   if(!status.ok||status.operation!=='status')throw new Error(status.ok?'Unable to confirm the earlier profile request.':status.error);
   if(status.current&&!status.current.acknowledged){
    const ack=await runApVerseChildCreation(client,{operation:'ack',expectedOwnerId:owner,intentId:status.current.intentId});
    if(!ack.ok||ack.operation!=='ack')throw new Error(ack.ok?'Unable to confirm the earlier profile request.':ack.error);
    pending.current=null;
    if(await refresh())setNotice('Earlier child creation recovered.');
    return;
   }
   const retry=pending.current?.ownerId===owner&&pending.current.name===clean?pending.current:null;
   const operation=retry??{ownerId:owner,name:clean,requestId:randomUUID(),priorIntentId:status.current?.intentId??null};
   pending.current=operation;
   const begun=await runApVerseChildCreation(client,{operation:'begin',expectedOwnerId:owner,displayName:clean,priorIntentId:operation.priorIntentId,requestId:operation.requestId});
   if(!begun.ok||begun.operation!=='begin')throw new Error(begun.ok?'Unable to confirm child creation.':begun.error);
   if(!begun.current.acknowledged){
    const ack=await runApVerseChildCreation(client,{operation:'ack',expectedOwnerId:owner,intentId:begun.current.intentId});
    if(!ack.ok||ack.operation!=='ack')throw new Error(ack.ok?'Unable to confirm child creation.':ack.error);
   }
   pending.current=null;setName('');
   if(await refresh())setNotice('Child profile saved.');
  }catch(failure){
   if(generation.current>0)setError(failure instanceof Error?failure.message:'Unable to confirm the child profile. Refresh before trying again.');
  }finally{setBusy(false);}
 }

 const selectedChild=children?.find(child=>child.id===selected);
 return <View style={s.safe}><View style={s.shell}>
  <View style={s.header}><Text style={s.brand}>✦ Parent Plus</Text><Text accessibilityRole="header" style={s.title}>Your children</Text><Text style={s.subtitle}>Manage your child profiles and choose who you want to view.</Text></View>
  <View style={s.content}>
   {loading&&<ActivityIndicator accessibilityLabel="Loading children" color="#2EE6A6"/>}
   {!!error&&<View accessibilityRole="alert" style={s.error}><Text style={s.errorText}>{error}</Text><Button title="Refresh children" disabled={busy||loading} action={()=>{void refresh();}}/></View>}
   {!loading&&!error&&children?.length===0&&<View style={s.card}><Text style={s.cardTitle}>No children yet.</Text><Text style={s.text}>Create a child profile to begin using your Parent workspace.</Text></View>}
   {!loading&&!error&&!!children?.length&&<View accessibilityRole="tablist" style={s.card}>{children.map(child=><Pressable key={child.id} accessibilityRole="tab" accessibilityLabel={`Choose child ${child.name}`} accessibilityState={{selected:selected===child.id}} onPress={()=>setSelected(child.id)} style={[s.child,selected===child.id&&s.childSelected]}><Text style={s.text}>{child.name}</Text></Pressable>)}</View>}
   {!!selectedChild&&<View style={s.card}><Text style={s.cardTitle}>{selectedChild.name}</Text><Text style={s.text}>Selected child profile</Text></View>}
   {!error&&<View style={s.card}><Text style={s.cardTitle}>Add a child</Text><TextInput accessibilityLabel="Child name" value={name} onChangeText={setName} editable={!busy} maxLength={120} autoCapitalize="words" autoCorrect={false} style={s.input}/><Button title={busy?'Saving…':'Create child'} disabled={busy||loading} action={()=>{void createChild();}} /></View>}
   {!!notice&&<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
   {onExitPreview?<Button title="Return to Parent sign in" soft action={onExitPreview}/>:<SignOutButton/>}
  </View>
 </View></View>;
}

function Button({title,action,disabled=false,soft=false}:{title:string;action:()=>void;disabled?:boolean;soft?:boolean}){
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={[s.button,soft&&s.soft,disabled&&s.disabled]}><Text style={[s.buttonText,soft&&s.buttonSoftText]}>{title}</Text></Pressable>;
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#060A0E'},shell:{flex:1,width:'100%',maxWidth:540,alignSelf:'center'},header:{padding:22,paddingTop:24,paddingBottom:26,backgroundColor:'#0C1722',gap:12},brand:{color:'#F9FBFC',fontSize:16,fontWeight:'700'},title:{color:'#F9FBFC',fontSize:30,fontWeight:'800'},subtitle:{color:'#BDC9D2',fontSize:14,lineHeight:22},content:{padding:18,paddingBottom:32,gap:14},card:{padding:18,borderRadius:22,backgroundColor:'#151A20',borderWidth:1,borderColor:'#313A45',gap:12},cardTitle:{color:'#F9FBFC',fontSize:17,fontWeight:'700'},text:{color:'#DCE3E8',fontSize:14,lineHeight:22},child:{padding:12,borderWidth:1,borderColor:'#313A45',borderRadius:14},childSelected:{borderColor:'#2EE6A6'},input:{minHeight:48,padding:13,fontSize:16,color:'#F9FBFC',backgroundColor:'#20262F',borderWidth:1,borderColor:'#647180',borderRadius:15},button:{minHeight:48,padding:14,borderRadius:15,backgroundColor:'#2EE6A6',alignItems:'center',justifyContent:'center'},buttonText:{fontSize:14,fontWeight:'700',color:'#06251B'},soft:{backgroundColor:'#20262F'},buttonSoftText:{color:'#F9FBFC'},disabled:{opacity:0.45},error:{padding:16,gap:12,borderRadius:16,backgroundColor:'#47222F',borderWidth:1,borderColor:'#A74366'},errorText:{color:'#FFC0D4',fontSize:14,lineHeight:22},notice:{color:'#D4FFE9',fontSize:14,lineHeight:22}});
