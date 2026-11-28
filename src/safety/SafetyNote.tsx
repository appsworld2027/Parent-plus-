import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { checkSafetyNote, safetyFailure, safetyNoteCounter, SAFETY_NOTE_MAX } from './rules';
import { loadSafetyNote, saveSafetyNote } from './service';

// Coach-only card on the student profile. Parents never see it: the table is coach-readable only (M2-43).
export function SafetyNote({ studentId, readOnly = false, load = loadSafetyNote, save = saveSafetyNote }: { studentId: string; readOnly?: boolean; load?: typeof loadSafetyNote; save?: typeof saveSafetyNote }) {
  const [saved, setSaved] = useState(''); const [text, setText] = useState(''); const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true; setState('loading'); setMessage('');
    load(studentId).then(v => { if (active) { setSaved(v); setText(v); setState('ready'); } }).catch(() => { if (active) setState('failed'); });
    return () => { active = false; };
  }, [studentId, load]);
  async function onSave() {
    const check = checkSafetyNote(text);
    if (!check.ok) { setMessage(check.message); return; }
    setBusy(true); setMessage('');
    try { await save(studentId, check.text); setSaved(check.text); setText(check.text); setMessage(check.text ? 'Safety note saved. Only you can see it.' : 'Safety note cleared.'); }
    catch (e) { setMessage(safetyFailure(e)); } finally { setBusy(false); }
  }
  return <View style={s.card}>
    <Text style={s.title}>Safety and health note</Text>
    <Text style={s.hint}>Private to you. Parents never see this.</Text>
    {state === 'loading' && <Text style={s.hint}>Checking…</Text>}
    {state === 'failed' && <Text accessibilityRole="alert" style={s.error}>The safety note could not load. Reference: safety-load. Try again later; do not assume there is no note.</Text>}
    {state === 'ready' && (readOnly ? <Text style={s.note}>{saved || 'No safety note.'}</Text> : <>
      <TextInput accessibilityLabel="Safety and health note" value={text} onChangeText={t => { setText(t); setMessage(''); }} multiline maxLength={SAFETY_NOTE_MAX + 50}
        placeholder="e.g. Peanut allergy. Inhaler in blue bag." style={s.input} editable={!busy} />
      <Text style={s.hint}>{safetyNoteCounter(text)}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || text.trim() === saved }} disabled={busy || text.trim() === saved} onPress={onSave} style={[s.button, (busy || text.trim() === saved) && { opacity: 0.5 }]}>
        <Text style={s.buttonText}>{text.trim() ? 'Save safety note' : saved ? 'Clear safety note' : 'Save safety note'}</Text></Pressable>
    </>)}
    {!!message && <Text accessibilityLiveRegion="polite" style={message.includes('could not') || message.includes('Keep the') || message.includes('cannot') ? s.error : s.ok}>{message}</Text>}
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  title: { color: c.text, fontWeight: '700' }, hint: { color: c.text, opacity: 0.7, marginTop: 2 },
  note: { color: c.text, marginTop: 8 }, error: { color: '#B3261E', marginTop: 8 }, ok: { color: c.text, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 10, padding: 10, minHeight: 80, marginTop: 8, color: c.text },
  button: { backgroundColor: c.text, borderRadius: 12, padding: 12, marginTop: 8, alignItems: 'center' }, buttonText: { color: c.surface, fontWeight: '700' },
});
