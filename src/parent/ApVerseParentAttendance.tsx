import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,TextInput,View} from 'react-native';
import {Text} from '../ui/Typography';
import {supabase} from '../auth/client';
import {loadApVerseAttendanceDay,type ApAttendanceCursor,type ApVerseDayQuery} from './apverseAttendance';
import {mondayOf,type AttendanceSession} from './attendance';

type AttendanceState={day:string;rows:AttendanceSession[];next:ApAttendanceCursor|null;loading:boolean;error:string};
const initialDay=()=>{const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;};
const statusLabel=(status:AttendanceSession['attendance_status'])=>status==='make_up'?'make-up session':status;

export function ApVerseParentAttendance({owner,child}:{owner:string;child:string}){
 const [day,setDay]=useState(initialDay),[revision,setRevision]=useState(0);
 const [state,setState]=useState<AttendanceState>({day:'',rows:[],next:null,loading:false,error:''});
 const generation=useRef(0),busy=useRef(false);
 useEffect(()=>{
  const request=++generation.current;
  busy.current=true;setState({day,rows:[],next:null,loading:true,error:''});
  try{mondayOf(day);}catch{busy.current=false;setState({day,rows:[],next:null,loading:false,error:'Enter a valid class date as YYYY-MM-DD.'});return()=>{generation.current++;};}
  const query:ApVerseDayQuery={ownerId:owner,childId:child,day};
  void loadApVerseAttendanceDay(supabase as unknown as Parameters<typeof loadApVerseAttendanceDay>[0],query)
   .then(page=>{if(request===generation.current)setState({day,rows:page.rows,next:page.next,loading:false,error:''});})
   .catch(()=>{if(request===generation.current)setState({day,rows:[],next:null,loading:false,error:'Attendance could not be loaded. Retry to check the latest records.'});})
   .finally(()=>{if(request===generation.current)busy.current=false;});
  return()=>{generation.current++;};
 },[owner,child,day,revision]);

 async function loadMore(){
  if(!state.next||busy.current||state.day!==day)return;
  const request=generation.current;busy.current=true;setState(current=>({...current,loading:true,error:''}));
  try{
   const page=await loadApVerseAttendanceDay(supabase as unknown as Parameters<typeof loadApVerseAttendanceDay>[0],{ownerId:owner,childId:child,day,after:state.next});
   if(request===generation.current)setState(current=>({...current,rows:[...current.rows,...page.rows],next:page.next,loading:false,error:''}));
  }catch{if(request===generation.current)setState(current=>({...current,loading:false,error:'More attendance could not be loaded. Retry or refresh.'}));}
  finally{if(request===generation.current)busy.current=false;}
 }
 const visible=state.day===day?state.rows:[];
 return <View style={s.card}>
  <Text accessibilityRole="header" style={s.title}>Class attendance</Text>
  <Text style={s.text}>Choose a date using each academy’s local calendar. Class times are shown in UTC.</Text>
  <TextInput accessibilityLabel="Attendance class date" value={day} onChangeText={value=>{if(value!==day){generation.current++;setDay(value);}}} maxLength={10} autoCapitalize="none" style={s.input}/>
  <Pressable accessibilityRole="button" onPress={()=>setRevision(value=>value+1)} style={s.button}><Text style={s.text}>Refresh attendance</Text></Pressable>
  {state.loading&&<ActivityIndicator accessibilityLabel="Loading attendance" color="#2EE6A6"/>}
  {!!state.error&&<Text accessibilityRole="alert" style={s.text}>{state.error}</Text>}
  {!state.loading&&!state.error&&state.day===day&&!visible.length&&<Text style={s.text}>No shared classes for this date.</Text>}
  {visible.map(row=><View key={row.session_id} style={s.row}>
   <Text style={s.title}>{row.workspace_name} · {row.batch_name}</Text>
   <Text style={s.text}>{new Date(row.starts_at).toISOString().slice(0,16).replace('T',' ')} UTC · {row.session_status}</Text>
   <Text style={s.text}>{row.attendance_status===null?'Attendance not recorded':`Coach recorded: ${statusLabel(row.attendance_status)}`}</Text>
  </View>)}
  {!!state.next&&state.day===day&&<Pressable accessibilityRole="button" disabled={state.loading} onPress={()=>{void loadMore();}} style={s.button}><Text style={s.text}>Load more attendance</Text></Pressable>}
 </View>;
}

const s=StyleSheet.create({card:{padding:18,gap:12,borderRadius:22,backgroundColor:'#151A20',borderWidth:1,borderColor:'#313A45'},title:{color:'#F9FBFC',fontWeight:'700',fontSize:17},text:{color:'#DCE3E8',fontSize:14,lineHeight:22},input:{minHeight:48,padding:12,borderWidth:1,borderColor:'#647180',borderRadius:15,color:'#F9FBFC',backgroundColor:'#20262F',fontSize:16},button:{minHeight:48,padding:12,borderRadius:15,backgroundColor:'#20262F',alignItems:'center',justifyContent:'center'},row:{gap:6,borderTopWidth:1,borderColor:'#313A45',paddingTop:12}});
