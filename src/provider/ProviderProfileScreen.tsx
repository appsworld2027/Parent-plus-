import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { useFeedbackMessage } from '../ui/ActionFeedback';
import { approvalDate, missingForSubmit, statusLabel, toValues, validateDocument, validateProfile, type DocumentKind, type ProviderErrors, type ProviderValues, type ProviderView } from './model';
import { decide, loadProfile, loadReviewQueue, pickDocument, saveProfile, signedDocumentUrl, submitProfile, uploadDocument, type ReviewItem } from './service';

// Contract C1.2. Fields lock while Pending or Verified; every status change happens in the database, never here.
const empty: ProviderValues = { name: '', phone: '', bio: '', sports: '', experience: '' };
const LABELS: Record<keyof ProviderValues, string> = { name: 'Full name', phone: 'Phone number', bio: 'About you', sports: 'Sports you coach', experience: 'Years of experience' };
const kindLabel: Record<DocumentKind, string> = { photo_id: 'photo ID', qualification: 'qualification' };

function Button({ label, onPress, disabled, secondary }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[s.button, secondary && s.secondary, disabled && s.disabled]}>
    <Text style={[s.buttonLabel, secondary && s.secondaryLabel]}>{label}</Text></Pressable>;
}

function ReviewQueue() {
  const [items, setItems] = useState<ReviewItem[] | null>(null), [error, setError] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null), [reason, setReason] = useState(''), [reasonError, setReasonError] = useState(''), [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { try { setItems(await loadReviewQueue()); setError(''); } catch { setError('The review queue could not load. Try again.'); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function act(item: ReviewItem, decision: 'approve' | 'reject') {
    if (busy) return;
    if (decision === 'reject' && !reason.trim()) { setReasonError('Give a reason for the rejection.'); return; }
    setBusy(true); setReasonError('');
    try { await decide(item.user_id, decision, decision === 'reject' ? reason.trim() : null); setRejecting(null); setReason(''); await refresh(); }
    catch { setError('The decision was not saved. Refresh and try again.'); } finally { setBusy(false); }
  }
  async function open(path: string) { try { await Linking.openURL(await signedDocumentUrl(path)); } catch { setError('The document link could not be created. Try again.'); } }
  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.title}>Review queue</Text>
    {!!error && <Text style={s.error}>{error}</Text>}
    {items?.length === 0 && <Text style={s.hint}>No profiles are waiting for review.</Text>}
    {items?.map(item => <View key={item.user_id} testID="review-item" style={s.item}>
      <Text style={s.strong}>{item.name}</Text><Text style={s.hint}>{item.phone}</Text><Text style={s.hint}>{item.sports.join(', ')} · {item.experience} years</Text><Text style={s.body}>{item.bio}</Text>
      {item.documents.map(d => <View key={d.kind} style={s.docRow}><Text style={s.hint}>{kindLabel[d.kind]}: {d.file_name}</Text>
        <Button label={`Open ${kindLabel[d.kind]}`} secondary onPress={() => { void open(d.path); }} /></View>)}
      <Button label="Approve" disabled={busy} onPress={() => { void act(item, 'approve'); }} />
      {rejecting === item.user_id
        ? <><Text style={s.label}>Reason for rejection</Text>
          <TextInput accessibilityLabel="Reason for rejection" value={reason} onChangeText={setReason} maxLength={500} multiline style={s.input} />
          {!!reasonError && <Text style={s.error}>{reasonError}</Text>}
          <Button label="Confirm rejection" disabled={busy} onPress={() => { void act(item, 'reject'); }} /></>
        : <Button label="Reject" secondary disabled={busy} onPress={() => { setRejecting(item.user_id); setReason(''); setReasonError(''); }} />}
    </View>)}
  </View>;
}

export function ProviderProfileScreen() {
  const [view, setView] = useState<ProviderView | null>(null), [values, setValues] = useState<ProviderValues>(empty), [errors, setErrors] = useState<ProviderErrors>({});
  const [loadError, setLoadError] = useState(''), [docError, setDocError] = useState(''), [missing, setMissing] = useState(''), [busy, setBusy] = useState(false);
  const [, publish] = useFeedbackMessage('success', 'Profile');
  const lock = useRef(false);
  const apply = useCallback((next: ProviderView) => { setView(next); setValues(toValues(next)); }, []);
  useEffect(() => { let alive = true; loadProfile().then(next => { if (alive) apply(next); }).catch(() => { if (alive) setLoadError('Your profile could not load. Check your connection and reopen this tab.'); }); return () => { alive = false; }; }, [apply]);
  if (!view) return <View style={s.card}><Text accessibilityRole="header" style={s.title}>Provider profile</Text><Text style={s.hint}>{loadError || 'Loading your profile…'}</Text></View>;
  const locked = view.status === 'pending' || view.status === 'verified';
  async function guarded(work: () => Promise<void>, failure: string) {
    if (lock.current) return; lock.current = true; setBusy(true);
    try { await work(); } catch { publish(failure, { kind: 'error', title: 'Profile needs attention' }); } finally { lock.current = false; setBusy(false); }
  }
  const save = () => { const found = validateProfile(values); setErrors(found); if (Object.keys(found).length) return;
    void guarded(async () => { apply(await saveProfile(values)); setMissing(''); publish('Profile saved.', { kind: 'success', title: 'Profile saved' }); }, 'Your profile was not saved. Try again.'); };
  async function attach(kind: DocumentKind) {
    setDocError('');
    const file = await pickDocument(); if (!file) return;
    const refused = validateDocument(file); if (refused) { setDocError(refused); return; }
    if (!view!.profile.name) { setDocError('Save your profile before adding documents.'); return; }
    void guarded(async () => { apply(await uploadDocument(kind, file)); setMissing(''); }, 'The document was not saved. Try again.');
  }
  const submit = () => { const items = missingForSubmit(view, values); if (items.length) { setMissing(`To submit: ${items.join('; ')}.`); return; } setMissing('');
    void guarded(async () => { apply(await submitProfile()); publish('Submitted for review.', { kind: 'success', title: 'Submitted' }); }, 'Your profile was not submitted. Try again.'); };
  const input = (key: keyof ProviderValues, multiline = false) => <View style={s.field}><Text style={s.label}>{LABELS[key]}</Text>
    <TextInput accessibilityLabel={LABELS[key]} accessibilityState={{ disabled: locked }} editable={!locked} multiline={multiline} value={values[key]} maxLength={key === 'bio' ? 1000 : 120}
      keyboardType={key === 'phone' || key === 'experience' ? 'number-pad' : 'default'} onChangeText={text => setValues(current => ({ ...current, [key]: text }))} style={[s.input, locked && s.inputLocked]} />
    {!!errors[key] && <Text style={s.error}>{errors[key]}</Text>}</View>;
  const doc = (kind: DocumentKind) => { const found = view.documents.find(d => d.kind === kind); return <View style={s.docRow}>
    <Text style={s.hint}>{kind === 'photo_id' ? 'Photo ID' : 'Qualification'}: {found ? '' : 'not attached'}</Text>{found && <Text style={s.strong}>{found.file_name}</Text>}
    {!locked && <Button label={`Attach ${kindLabel[kind]}`} secondary disabled={busy} onPress={() => { void attach(kind); }} />}</View>; };
  return <View style={{ gap: 16 }}>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.title}>Provider profile</Text>
      <Text testID="provider-status" style={s.status}>{statusLabel[view.status]}</Text>
      {view.status === 'verified' && !!view.decided_at && <Text style={s.hint}>{`Verified on ${approvalDate(view.decided_at)}`}</Text>}
      {view.status === 'pending' && <Text style={s.hint}>An admin is reviewing your profile. You cannot edit it until they decide.</Text>}
      {view.status === 'rejected' && <><Text style={s.hint}>Your profile was not approved. Reason:</Text><Text style={s.error}>{view.reason}</Text><Text style={s.hint}>Update your profile or documents, then submit again.</Text></>}
      {(['name', 'phone', 'bio', 'sports', 'experience'] as const).map(key => <React.Fragment key={key}>{input(key, key === 'bio')}</React.Fragment>)}
      {!locked && <Button label="Save profile" disabled={busy} onPress={save} />}
    </View>
    <View style={s.card}>
      <Text style={s.title}>Documents</Text><Text style={s.hint}>One photo ID and one qualification. JPG, PNG or PDF, up to 5 MB each. Only you and a reviewer can see them.</Text>
      {doc('photo_id')}{doc('qualification')}
      {!!docError && <Text style={s.error}>{docError}</Text>}
      {!locked && <Button label="Submit for review" disabled={busy} onPress={submit} />}
      {!!missing && <Text testID="submit-missing" style={s.error}>{missing}</Text>}
    </View>
    {view.is_admin && <ReviewQueue />}
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: 18, padding: 18, gap: 12, borderWidth: 1, borderColor: c.border }, title: { fontSize: 18, fontWeight: '700', color: c.text },
  status: { fontSize: 15, fontWeight: '700', color: c.sky }, field: { gap: 6 }, label: { fontSize: 12.5, fontWeight: '600', color: c.muted }, hint: { fontSize: 12.5, lineHeight: 18, color: c.muted },
  strong: { fontSize: 14, fontWeight: '700', color: c.text }, body: { fontSize: 13.5, lineHeight: 19, color: c.text }, error: { fontSize: 12.5, color: c.rose },
  input: { backgroundColor: c.raised, borderRadius: 12, borderWidth: 1, borderColor: c.outline, color: c.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }, inputLocked: { opacity: 0.6 },
  button: { backgroundColor: c.sun, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }, secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.outline },
  disabled: { opacity: 0.5 }, buttonLabel: { fontSize: 14.5, fontWeight: '700', color: c.black }, secondaryLabel: { color: c.text }, docRow: { gap: 6 }, item: { gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border },
});
