import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { attendanceDrafts } from '../classes/localDrafts';
import { observationDrafts } from '../observations/localDrafts';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useFeedbackMessage } from '../ui/ActionFeedback';
import { useAuth } from './AuthProvider';

// Ask only when sign-out would delete unsent device work. No draft content is
// displayed here, and a storage read failure takes the cautious warning path.
export function SignOutButton({ disabled = false }: { disabled?: boolean }) {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [, publish] = useFeedbackMessage('error', 'Sign-out needs attention');
  async function finish() {
    setConfirm(false); setBusy(true);
    try { const message = await logout(); if (message) publish(message); }
    finally { setBusy(false); }
  }
  async function check() {
    setBusy(true);
    let hasDraft = true;
    try { const drafts = await Promise.all([attendanceDrafts.read(), observationDrafts.read()]); hasDraft = drafts.some(Boolean); }
    catch { /* Warn before deleting an unreadable draft too. */ }
    setBusy(false);
    if (hasDraft) setConfirm(true); else await finish();
  }
  return <>
    <Pressable accessibilityRole="button" disabled={disabled || busy} style={[s.button, (disabled || busy) && { opacity: 0.5 }]} onPress={() => { void check(); }}><Text style={s.label}>{busy ? 'Signing out…' : 'Sign out'}</Text></Pressable>
    <ConfirmDialog visible={confirm} title="Remove unsent device drafts and sign out?"
      message="Device-only attendance and observation drafts are removed on sign-out. Keep editing to save them to your workspace first. Records already saved in your workspace are kept."
      confirmLabel="Remove drafts and sign out" cancelLabel="Keep editing" onConfirm={() => { void finish(); }} onCancel={() => setConfirm(false)} />
  </>;
}
const s = StyleSheet.create({ button: { backgroundColor: '#EDF1EC', minHeight: 48, padding: 15, borderRadius: 13, alignItems: 'center' }, label: { color: '#22303A', fontSize: 14, fontWeight: '700' } });
