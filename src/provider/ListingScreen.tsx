import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { useFeedbackMessage } from '../ui/ActionFeedback';
import { approvalDate } from './model';
import { LISTING_FIELDS, loadAdminListings, loadListing, publishListing, saveListing, sameListing, unpublishListing, validateListing, type AdminListing, type ListingValues, type ListingView } from './listing';

const empty: ListingValues = { title: '', description: '', sport: '', age_group: '', location: '', price_note: '' };
function Button({ label, onPress, disabled, secondary }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[s.button, secondary && s.secondary, disabled && s.disabled]}>
    <Text style={[s.buttonLabel, secondary && s.secondaryLabel]}>{label}</Text></Pressable>;
}
function AllListings() {
  const [rows, setRows] = useState<AdminListing[] | null>(null), [error, setError] = useState('');
  useEffect(() => { loadAdminListings().then(setRows).catch(() => setError('The listings could not load. Try again.')); }, []);
  return <View style={s.card}><Text accessibilityRole="header" style={s.title}>All listings</Text>
    {!!error && <Text style={s.error}>{error}</Text>}{rows?.length === 0 && <Text style={s.hint}>No listings are published yet.</Text>}
    {rows?.map(r => <View key={r.user_id} testID="admin-listing" style={s.item}><Text style={s.strong}>{r.title}</Text><Text style={s.hint}>{r.owner_name} · {r.sport} · {r.age_group}</Text>
      <Text style={s.hint}>{r.location} · {r.price_note}</Text><Text style={s.body}>{r.description}</Text></View>)}
  </View>;
}
export function ListingScreen({ onOpenProfile }: { onOpenProfile: () => void }) {
  const [view, setView] = useState<ListingView | null>(null), [values, setValues] = useState<ListingValues>(empty), [errors, setErrors] = useState<Partial<Record<keyof ListingValues, string>>>({});
  const [loadError, setLoadError] = useState(''), [missing, setMissing] = useState(''), [busy, setBusy] = useState(false), lock = useRef(false);
  const [, publish] = useFeedbackMessage('success', 'Listing');
  const apply = useCallback((next: ListingView) => { setView(next); setValues(next.listing); }, []);
  useEffect(() => { let alive = true; loadListing().then(next => { if (alive) apply(next); }).catch(() => { if (alive) setLoadError('Your listing could not load. Check your connection and reopen this tab.'); }); return () => { alive = false; }; }, [apply]);
  if (!view) return <View style={s.card}><Text accessibilityRole="header" style={s.title}>Provider listing</Text><Text style={s.hint}>{loadError || 'Loading your listing…'}</Text></View>;
  async function guarded(work: () => Promise<void>, failure: string) {
    if (lock.current) return; lock.current = true; setBusy(true);
    try { await work(); } catch { publish(failure, { kind: 'error', title: 'Listing needs attention' }); } finally { lock.current = false; setBusy(false); }
  }
  const published = view.status === 'published';
  const saveNow = () => { const found = validateListing(values); setErrors(found); if (Object.keys(found).length) return;
    void guarded(async () => { apply(await saveListing(values)); setMissing(''); publish(published ? 'Changes saved.' : 'Draft saved.', { kind: 'success', title: 'Listing saved' }); }, 'Your listing was not saved. Try again.'); };
  const publishNow = () => { const found = validateListing(values), names = LISTING_FIELDS.filter(f => found[f.key]).map(f => f.short);
    if (names.length) { setMissing(`Before publishing, complete: ${names.join(', ')}.`); return; }
    if (!sameListing(values, view.listing)) { setMissing('Save your draft first, then publish.'); return; } setMissing('');
    void guarded(async () => { apply(await publishListing()); publish('Listing published privately.', { kind: 'success', title: 'Published' }); }, 'Your listing was not published. Try again.'); };
  const unpublishNow = () => void guarded(async () => { apply(await unpublishListing()); publish('Listing moved back to draft.', { kind: 'success', title: 'Unpublished' }); }, 'Your listing was not changed. Try again.');
  return <View style={{ gap: 16 }}>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.title}>Provider listing</Text>
      {!view.eligible ? <>
        <Text style={s.strong}>Get verified first</Text><Text style={s.hint}>You can describe what you offer once your profile is verified.</Text>
        <Button label="Go to Profile" onPress={onOpenProfile} />
      </> : <>
        <Text testID="listing-status" style={s.status}>{published ? 'Published' : 'Draft'}</Text>
        {published && !!view.published_at && <Text style={s.hint}>{`Published on ${approvalDate(view.published_at)}`}</Text>}
        {published && <Text style={s.hint}>Not publicly visible. Only you and admins can see it.</Text>}
        {LISTING_FIELDS.map(f => <View key={f.key} style={s.field}><Text style={s.label}>{f.label}</Text>
          <TextInput accessibilityLabel={f.label} multiline={f.multiline} value={values[f.key]} maxLength={f.key === 'description' ? 1000 : 120} onChangeText={t => setValues(cur => ({ ...cur, [f.key]: t }))} style={s.input} />
          {!!errors[f.key] && <Text style={s.error}>{errors[f.key]}</Text>}</View>)}
        <Button label={published ? 'Save changes' : 'Save draft'} disabled={busy} onPress={saveNow} />
        {published ? <Button label="Unpublish" secondary disabled={busy} onPress={unpublishNow} /> : <Button label="Publish" disabled={busy} onPress={publishNow} />}
        {!!missing && <Text testID="publish-missing" style={s.error}>{missing}</Text>}
      </>}
    </View>
    {view.is_admin && <AllListings />}
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: 18, padding: 18, gap: 12, borderWidth: 1, borderColor: c.border }, title: { fontSize: 18, fontWeight: '700', color: c.text },
  status: { fontSize: 15, fontWeight: '700', color: c.sky }, field: { gap: 6 }, label: { fontSize: 12.5, fontWeight: '600', color: c.muted }, hint: { fontSize: 12.5, lineHeight: 18, color: c.muted },
  strong: { fontSize: 14, fontWeight: '700', color: c.text }, body: { fontSize: 13.5, lineHeight: 19, color: c.text }, error: { fontSize: 12.5, color: c.rose }, item: { gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border },
  input: { backgroundColor: c.raised, borderRadius: 12, borderWidth: 1, borderColor: c.outline, color: c.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  button: { backgroundColor: c.sun, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }, secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.outline },
  disabled: { opacity: 0.5 }, buttonLabel: { fontSize: 14.5, fontWeight: '700', color: c.black }, secondaryLabel: { color: c.text },
});
