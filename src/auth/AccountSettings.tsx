import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../ui/Typography';
import { prototypeColors as c } from '../ui/prototypeTheme';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useAuth, safeAuthFailure } from './AuthProvider';
import { supabase } from './client';
import { validateAuth, PASSWORD_WEAK } from './rules';

// Contract C1.1e. M14 and M20 use the exact approved wording.
const PASSWORD_SAVED = 'Your new password was saved. Other devices will need to sign in again.';
const WRONG_CURRENT = 'Your current password was not accepted. Nothing was changed.';

function Row({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text>
    <TextInput accessibilityLabel={label} secureTextEntry autoComplete={label === 'Current password' ? 'current-password' : 'new-password'}
      autoCapitalize="none" autoCorrect={false} value={value} onChangeText={onChange} maxLength={1024} style={s.input} /></View>;
}

export function AccountSettings({ onBack }: { onBack: () => void }) {
  const auth = useAuth();
  const [confirmAll, setConfirmAll] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [done, setDone] = useState('');

  async function everywhere() {
    setConfirmAll(false); setSigningOut(true); setSignOutError('');
    const failed = await auth.logout({ everywhere: true });
    setSigningOut(false);
    if (failed) setSignOutError(failed);
  }

  async function save() {
    if (busy) return;
    setFailure(''); setDone('');
    const email = auth.session?.user.email;
    if (!current) { setFailure('Enter your password.'); return; }
    const invalid = validateAuth('updatePassword', '', next, again);
    if (invalid) { setFailure(invalid); return; }
    if (!supabase || !email) { setFailure('Sign-in is not available right now. Please contact support.'); return; }
    setBusy(true);
    try {
      // D2: the service does not check the current password itself, so the app proves it by signing in first.
      const check = await supabase.auth.signInWithPassword({ email, password: current });
      if (check.error) {
        const code = (check.error as { code?: string }).code;
        if (code === 'invalid_credentials') { setFailure(WRONG_CURRENT); return; }
        throw check.error;
      }
      const result = await supabase.auth.updateUser({ password: next });
      if (result.error) throw result.error;
      setCurrent(''); setNext(''); setAgain('');
      let othersEnded = false;
      try { othersEnded = !(await supabase.auth.signOut({ scope: 'others' })).error; } catch { /* This device stays signed in. */ }
      setDone(othersEnded ? PASSWORD_SAVED : 'Your new password was saved.');
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: string }).code : '';
      setFailure(safeAuthFailure('AUTH_FAILURE', code === 'weak_password' ? PASSWORD_WEAK
        : code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' ? 'Too many attempts. Please wait a little before trying again.'
        : 'This request could not finish. Check your connection and try again.'));
    } finally { setBusy(false); }
  }

  return <View style={s.page}>
    <Text accessibilityRole="header" style={s.heading}>Settings</Text>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.title}>Change password</Text>
      <Row label="Current password" value={current} onChange={setCurrent} />
      <Row label="New password" value={next} onChange={setNext} />
      <Row label="Confirm password" value={again} onChange={setAgain} />
      <Text style={s.hint}>Use at least 15 characters. A few unrelated words work well.</Text>
      {!!failure && <Text style={s.error}>{failure}</Text>}
      {!!done && <Text role="status" style={s.notice}>{done}</Text>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void save(); }} style={[s.button, busy && { opacity: 0.5 }]}><Text style={s.buttonLabel}>{busy ? 'Please wait…' : 'Save password'}</Text></Pressable>
    </View>
    <View style={s.card}>
      <Text style={s.title}>Sign out of all devices</Text>
      <Text style={s.hint}>Use this if a phone is lost or someone else may know your password.</Text>
      {!!signOutError && <Text style={s.error}>{signOutError}</Text>}
      <Pressable accessibilityRole="button" disabled={signingOut} onPress={() => setConfirmAll(true)} style={[s.button, s.soft, signingOut && { opacity: 0.5 }]}><Text style={s.softLabel}>Sign out of all devices</Text></Pressable>
    </View>
    <Pressable accessibilityRole="button" onPress={onBack} style={[s.button, s.soft]}><Text style={s.softLabel}>Back to support</Text></Pressable>
    <ConfirmDialog visible={confirmAll} title="Sign out of all devices?"
      message="You will need to sign in again everywhere. Unsent drafts on this device will be removed."
      confirmLabel="Sign out everywhere" cancelLabel="Cancel" onConfirm={() => { void everywhere(); }} onCancel={() => setConfirmAll(false)} />
  </View>;
}

const s = StyleSheet.create({
  page: { gap: 14 }, heading: { fontSize: 30, lineHeight: 31.5, fontWeight: '700', letterSpacing: -1.2, color: c.white },
  card: { backgroundColor: c.surface, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: c.border, gap: 12 },
  title: { color: c.white, fontSize: 16, fontWeight: '700' }, field: { gap: 6 }, label: { color: c.muted, fontSize: 12, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 11, minHeight: 44, fontSize: 13, color: c.white, backgroundColor: c.raised },
  hint: { color: c.muted, fontSize: 11.5, lineHeight: 17 },
  error: { color: c.rose, backgroundColor: c.raised, padding: 12, borderRadius: 14, lineHeight: 19 },
  notice: { color: c.sky, backgroundColor: c.raised, padding: 12, borderRadius: 14, lineHeight: 19 },
  button: { minHeight: 44, padding: 13, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.white },
  buttonLabel: { color: c.black, fontWeight: '800', fontSize: 13.5 }, soft: { backgroundColor: c.raised }, softLabel: { color: c.white, fontWeight: '800', fontSize: 13.5 },
});
