import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Typography';
import { prototypeColors as c } from './prototypeTheme';
import { usePrototypeModalStyle } from './PrototypeFrame';

export function ConfirmDialog({ visible, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, busy = false, variant='coach' }: {
  visible: boolean; title: string; message: string; confirmLabel: string; cancelLabel: string;
  onConfirm: () => void; onCancel: () => void; busy?: boolean;variant?:'coach'|'parent';
}) {
  const frame=usePrototypeModalStyle();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={[s.backdrop,frame]}><View accessibilityViewIsModal accessibilityRole="alert" style={[s.card,variant==='parent'&&s.parent]}>
      <View style={s.grab}/>
      <Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.message}>{message}</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onConfirm} style={[s.button, busy && { opacity: 0.5 }]}>
        <Text style={s.primary}>{busy ? 'Please wait…' : confirmLabel}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={[s.button, s.secondary]}><Text style={s.cancel}>{cancelLabel}</Text></Pressable>
    </View></View>
  </Modal>;
}
const s = StyleSheet.create({
  backdrop:{flex:1,justifyContent:'flex-end',alignItems:'center',backgroundColor:'#000000bb'},
  card:{width:'100%',maxWidth:430,backgroundColor:'#141417',borderTopLeftRadius:26,borderTopRightRadius:26,paddingHorizontal:18,paddingTop:10,paddingBottom:26,gap:12,borderWidth:1,borderColor:'#2c2c33'},
  parent:{backgroundColor:'#122130',borderTopLeftRadius:29,borderTopRightRadius:29},grab:{width:40,height:4,borderRadius:2,backgroundColor:'#2e2e35',alignSelf:'center',marginBottom:4},
  title:{fontSize:19,fontWeight:'700',letterSpacing:-.4,color:c.white},message:{fontSize:12.5,lineHeight:18.75,color:c.muted},
  button:{minHeight:44,padding:13,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:c.white},
  primary:{color:c.black,fontSize:13.5,fontWeight:'800'},secondary:{backgroundColor:c.raised},cancel:{color:c.white,fontSize:13.5,fontWeight:'800'},
});
