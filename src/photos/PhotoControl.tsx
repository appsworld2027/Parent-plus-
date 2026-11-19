import { prototypeColors as c } from '../ui/prototypeTheme';
import React,{useEffect,useRef,useState} from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Typography';
import * as ImagePicker from 'expo-image-picker';
import {loadPhoto,removePhoto,savePhoto,type CoachPhoto,type PhotoKind} from './service';
import {useFeedbackMessage} from '../ui/ActionFeedback';
export function PhotoControl({academy,kind,id,exists,disabled=false,locked=false,beforeUpload,onWorking}:{academy:string;kind:PhotoKind;id:string;exists:boolean;disabled?:boolean;locked?:boolean;beforeUpload?:()=>Promise<void>;onWorking:(busy:boolean)=>void}) {
  const [photo,setPhoto]=useState<CoachPhoto|null>(null),[busy,setBusy]=useState(false),[unavailable,setUnavailable]=useState(false);
  const alive=useRef(true),lock=useRef(false),generation=useRef(0);
  const [loading,setLoading]=useState(exists);
  const [,publish]=useFeedbackMessage('error','Photo needs attention');
  useEffect(()=>{alive.current=true;const version=++generation.current;setPhoto(null);setUnavailable(false);setLoading(exists);if(exists)void loadPhoto(academy,kind,id).then(value=>{if(alive.current&&generation.current===version)setPhoto(value);}).catch(()=>{if(alive.current&&generation.current===version)setUnavailable(true);}).finally(()=>{if(alive.current&&generation.current===version)setLoading(false);});return()=>{alive.current=false;};},[academy,kind,id,exists]);
  async function change(remove=false) {
    if(lock.current||disabled||locked||loading)return;
    lock.current=true;setBusy(true);onWorking(true);
    try {
      if(remove&&photo){await removePhoto(academy,kind,id,photo);setPhoto(null);publish('Photo removed.',{kind:'success',title:'Photo updated'});return;}
      const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,quality:0.7});
      if(picked.canceled)return;
      await beforeUpload?.();
      const saved=await savePhoto(academy,kind,id,picked.assets[0].uri,photo);
      if(alive.current){generation.current++;setLoading(false);setPhoto(saved);setUnavailable(false);publish('Photo saved privately.',{kind:'success',title:'Photo saved'});}
    }catch(error){
      const code=error&&typeof error==='object'&&'code'in error?String(error.code):'';
      publish(['PGRST205','42P01','PGRST202'].includes(code)?'The private-photo database update is needed.':error instanceof Error&&/^(Choose a|Enter a|Complete the|Write an|Use up to)/.test(error.message)?error.message:code==='40001'?'The photo changed on another screen. Reopen this record before replacing it.':'The photo could not be confirmed. Reopen this record and retry; your text is retained.');
    }finally{lock.current=false;if(alive.current)setBusy(false);onWorking(false);}
  }
  return <View style={s.box}>
    <Text style={s.title}>{kind==='student'?'Student photo':'Observation photo'}</Text>
    {photo&&<Image accessibilityLabel={kind==='student'?'Student profile photo':'Private observation photo'} source={{uri:photo.url}} style={kind==='student'?s.avatar:s.photo} onError={()=>setUnavailable(true)} />}
    {!photo&&<Text style={s.hint}>{locked?'No photo was attached.':'Optional · JPEG, PNG or WebP · up to 5 MB'}</Text>}
    {unavailable&&<Text style={s.hint}>Photo preview unavailable. Reopen this record to refresh access.</Text>}
    {!locked&&<Pressable accessibilityRole="button" disabled={disabled||busy||loading} onPress={()=>{void change();}} style={s.button}><Text style={s.label}>{busy?'Saving photo…':!exists?`Save ${kind==='student'?'student':'draft'} and add photo`:photo?'Replace photo':'Add photo'}</Text></Pressable>}
    {photo&&!locked&&<Pressable accessibilityRole="button" disabled={disabled||busy||loading} onPress={()=>{void change(true);}} style={s.button}><Text style={s.label}>Remove photo</Text></Pressable>}
    {locked&&photo&&<Text style={s.hint}>Recorded photo is fixed with this observation.</Text>}
  </View>;
}
const s = StyleSheet.create({box:{gap:10},title:{fontSize:13,fontWeight:'700',color:c.text},hint:{fontSize:11.5,lineHeight:17,color:c.muted},avatar:{width:96,height:96,borderRadius:48},photo:{width:'100%',height:220,borderRadius:14},button:{minHeight:44,paddingVertical:13,paddingHorizontal:16,borderRadius:14,backgroundColor:c.raised,alignItems:'center'},label:{color:c.text,fontSize:13.5,fontWeight:'800'}});
