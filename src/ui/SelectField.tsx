import React,{useState} from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Typography';
import { prototypeColors as c, prototypeFontFamily, prototypeWeight } from './prototypeTheme';
export type SelectOption={value:string;label:string};
export function SelectField({label,value,options,onChange,disabled=false}:{label:string;value:string;options:SelectOption[];onChange:(value:string)=>void;disabled?:boolean}){
 const [open,setOpen]=useState(false);
 return <View style={s.field}><Text style={s.label}>{label}</Text>
  {Platform.OS==='web'?React.createElement('select',{'aria-label':label,value,disabled,onChange:(event:React.ChangeEvent<HTMLSelectElement>)=>onChange(event.target.value),style:{minHeight:44,width:'100%',minWidth:0,border:`1px solid ${c.border}`,borderRadius:12,padding:'10px 11px',fontFamily:prototypeFontFamily,fontSize:13,color:c.white,backgroundColor:c.raised,colorScheme:'dark',opacity:disabled?0.5:1}},options.map(option=>React.createElement('option',{key:option.value,value:option.value},option.label))):<>
   <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,expanded:open}} disabled={disabled} onPress={()=>setOpen(true)} style={s.button}><Text style={s.value}>{options.find(option=>option.value===value)?.label??'Choose an option'}</Text><Text>⌄</Text></Pressable>
   <Modal visible={open&&!disabled} transparent animationType="fade" onRequestClose={()=>setOpen(false)}><View style={s.backdrop}><View accessibilityViewIsModal style={s.panel}><Text accessibilityRole="header" style={s.title}>{label}</Text><ScrollView style={s.choices}>{options.map(option=><Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{selected:option.value===value}} onPress={()=>{onChange(option.value);setOpen(false);}} style={s.option}><Text style={s.value}>{option.value===value?'✓ ':''}{option.label}</Text></Pressable>)}</ScrollView><Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={s.option}><Text style={s.label}>Cancel</Text></Pressable></View></View></Modal>
  </>}
 </View>;
}
const s=StyleSheet.create({field:{gap:7,minWidth:0},label:{fontSize:12,fontWeight:prototypeWeight(750),color:c.muted},button:{minHeight:44,padding:11,borderWidth:1,borderColor:c.border,borderRadius:12,backgroundColor:c.raised,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},value:{fontSize:13,color:c.white,flexShrink:1},backdrop:{flex:1,justifyContent:'flex-end',alignItems:'center',backgroundColor:'#000000bb'},panel:{width:'100%',maxWidth:430,borderTopLeftRadius:26,borderTopRightRadius:26,backgroundColor:'#141417',padding:18,gap:12},title:{fontSize:19,fontWeight:'700',color:c.white},choices:{maxHeight:360},option:{minHeight:44,padding:12,borderBottomWidth:1,borderBottomColor:c.border}});
