import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export function ConfirmDialog({ visible, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, busy = false }: {
  visible: boolean; title: string; message: string; confirmLabel: string; cancelLabel: string;
  onConfirm: () => void; onCancel: () => void; busy?: boolean;
}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={s.backdrop}><View accessibilityViewIsModal accessibilityRole="alert" style={s.card}>
      <Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.message}>{message}</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onConfirm} style={[s.button, busy && { opacity: 0.5 }]}>
        <Text style={s.primary}>{busy ? 'Please wait…' : confirmLabel}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={[s.button, s.secondary]}><Text style={s.cancel}>{cancelLabel}</Text></Pressable>
    </View></View>
  </Modal>;
}
const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#22303A88' },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 22, padding: 22, gap: 16 },
  title: { fontSize: 21, fontWeight: '700', color: '#22303A' }, message: { fontSize: 14, lineHeight: 23, color: '#5C6B73' },
  button: { minHeight: 48, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F6F6B' },
  primary: { color: '#fff', fontSize: 14, fontWeight: '700' }, secondary: { backgroundColor: '#EDF1EC' }, cancel: { color: '#22303A', fontSize: 14, fontWeight: '700' },
});
