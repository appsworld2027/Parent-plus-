import React, { useLayoutEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../ui/Typography';
import { loadRoster } from '../roster/service';
import { SelectField } from '../ui/SelectField';
import { getObservation } from './service';
import { feedbackMessage, whatsappLink } from './whatsapp';

type Parent = { id: string; student: string; guardian: string; phone: string };
type Prepared = { parents: Parent[]; note: string; batch: string };

// Prepare from the saved record's fixed recipients, never today's batch roster.
// WhatsApp opens only through a separate explicit coach click after preview.
export function WhatsAppReview({ academy, academyName, observation, revision, disabled }: {
  academy: string; academyName: string; observation: string; revision: number; disabled: boolean;
}) {
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [selected, setSelected] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useLayoutEffect(() => {
    generation.current++; setPrepared(null); setConfirmed(false); setError(''); setBusy(false);
    return () => { generation.current++; };
  }, [observation, revision, disabled]);
  function choose(id: string, data = prepared) {
    if (!data) return;
    const parent = data.parents.find(value => value.id === id);
    if (!parent) return;
    setSelected(id); setPhone(parent.phone); setConfirmed(false);
    setMessage(feedbackMessage(academyName, parent.student, data.batch, data.note));
  }
  async function prepare() {
    if (busy || disabled) return;
    const version = ++generation.current;
    setBusy(true); setError(''); setPrepared(null);
    try {
      const [detail, roster] = await Promise.all([getObservation(academy, observation), loadRoster(academy)]);
      if (version !== generation.current) return;
      if (!detail.observation || detail.observation.status !== 'recorded' || detail.observation.revision !== revision) {
        setError('Reopen the latest saved feedback before preparing a parent message.'); return;
      }
      const parents = detail.recipients.map(id => {
        const contact = roster.contacts.find(value => value.student_id === id);
        return { id, student: roster.students.find(value => value.id === id)?.name ?? 'Student', guardian: contact?.name ?? 'Guardian not entered', phone: contact?.phone ?? '' };
      });
      if (!parents.length) { setError('This saved feedback has no students.'); return; }
      const data = { parents, note: detail.observation.note, batch: roster.batches.find(value => value.id === detail.observation?.batch_id)?.name ?? '' };
      setPrepared(data); choose(parents[0].id, data);
    } catch { if (version === generation.current) setError('The saved feedback and guardian details could not be loaded. Retry preparing the message.'); }
    finally { if (version === generation.current) setBusy(false); }
  }
  const link = !disabled && confirmed ? whatsappLink(phone, message) : null;
  return <View style={s.card}>
    <Text style={s.title}>Share feedback with parents</Text>
    <Text style={s.body}>Review one parent and message at a time. You press Send inside WhatsApp. Opening WhatsApp does not confirm delivery.</Text>
    <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={() => { void prepare(); }} style={[s.button, (disabled || busy) && s.disabled]}><Text style={s.buttonText}>{busy ? 'Preparing preview…' : 'Review WhatsApp message'}</Text></Pressable>
    {disabled && <Text style={s.body}>Save your latest feedback changes before preparing a message.</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {prepared && !disabled && <>
      <SelectField label="Parent for this feedback" value={selected} onChange={id => choose(id)} options={prepared.parents.map(parent => ({ value: parent.id, label: `${parent.student} — ${parent.guardian}` }))} />
      <Text style={s.body}>Saved guardian number: {prepared.parents.find(parent => parent.id === selected)?.phone || 'Not entered'}. Enter the full number with country code, such as +91 for India. Changes here apply only to this message.</Text>
      <TextInput accessibilityLabel="WhatsApp parent number with country code" value={phone} onChangeText={value => { setPhone(value); setConfirmed(false); }} keyboardType="phone-pad" maxLength={30} style={s.input} />
      {!whatsappLink(phone, message) && <Text style={s.body}>Check the international phone number and enter a message of up to 10,000 characters.</Text>}
      <Text style={s.label}>Message preview — you can edit this copy</Text>
      <TextInput accessibilityLabel="Parent feedback message preview" multiline value={message} onChangeText={value => { setMessage(value); setConfirmed(false); }} maxLength={10000} style={[s.input, s.message]} />
      <Text style={s.body}>Text only. Private photos are not included. For batch feedback, check that this message is suitable for this parent and contains no other child’s private details.</Text>
      <Pressable accessibilityRole="checkbox" accessibilityLabel="I checked the parent number and message" accessibilityState={{ checked: confirmed }} aria-checked={confirmed} onPress={() => setConfirmed(value => !value)} style={s.check}><Text style={s.label}>{confirmed ? '☑' : '☐'} I checked the parent number and message</Text></Pressable>
      {link ? Platform.OS === 'web' ? React.createElement('a', { href: link, target: '_blank', rel: 'noopener noreferrer', style: { color: '#fff', backgroundColor: '#1F6F6B', padding: 15, borderRadius: 12, textAlign: 'center', textDecoration: 'none', fontWeight: 600 } }, 'Open WhatsApp to review and send') : <Pressable accessibilityRole="button" style={s.button} onPress={() => { void Linking.openURL(link).catch(() => setError('WhatsApp could not open. Your message remains here to copy or retry.')); }}><Text style={s.buttonText}>Open WhatsApp to review and send</Text></Pressable> : <Text style={s.body}>Check the parent and message above to enable WhatsApp.</Text>}
    </>}
  </View>;
}
const s = StyleSheet.create({ card: { gap: 14, padding: 18, borderRadius: 16, backgroundColor: '#EDF6F1' }, title: { fontSize: 20, fontWeight: '700', color: '#22303A' }, body: { fontSize: 14, lineHeight: 21, color: '#53676B' }, label: { fontSize: 14, fontWeight: '600', color: '#22303A' }, input: { minHeight: 48, padding: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#CED8CC', borderRadius: 12, fontSize: 16 }, message: { minHeight: 170, textAlignVertical: 'top' }, check: { minHeight: 48, justifyContent: 'center' }, button: { minHeight: 48, padding: 15, borderRadius: 12, backgroundColor: '#1F6F6B', alignItems: 'center' }, buttonText: { color: '#fff', fontWeight: '600' }, disabled: { opacity: 0.5 }, error: { color: '#8E3434' } });
