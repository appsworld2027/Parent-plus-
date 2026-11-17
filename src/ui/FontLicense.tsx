import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './Typography';
import license from '../../assets/fonts/OFL.json';
export function FontLicense({dark=false}:{dark?:boolean}) {
  const [open,setOpen]=useState(false);
  return <View style={{gap:10}}><Pressable accessibilityRole="button" accessibilityLabel="Bricolage font licence" onPress={()=>setOpen(value=>!value)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:dark?'#3ABEFF':'#1F6F6B',fontSize:13}}>Typography · Bricolage Grotesque · OFL 1.1 {open?'⌃':'⌄'}</Text></Pressable>{open&&<Text selectable style={{fontSize:11,lineHeight:17,color:dark?'#A9B3BF':'#5C6B73'}}>{license.text}</Text>}</View>;
}
