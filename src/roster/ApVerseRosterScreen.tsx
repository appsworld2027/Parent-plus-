import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Text } from '../ui/Typography';
import { useFeedbackMessage } from '../ui/ActionFeedback';
import { enrollConnectedChild, loadConnectedCoachRoster } from './apverseClient';
import type { ApVerseRoster } from './apverseService';

function Button({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.button, secondary && s.buttonSecondary, disabled && s.disabled]}>
    <Text style={[s.buttonText, secondary && s.buttonTextSecondary]}>{label}</Text>
  </Pressable>;
}

export function ApVerseRosterScreen({ workspace, onDirtyChange, onBusyChange, onViewChange }: { workspace: string; onDirtyChange: (value: boolean) => void; onBusyChange: (value: boolean) => void; onViewChange: () => void }) {
  const [data, setData] = useState<ApVerseRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'students' | 'batches'>('students');
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [retryRequest, setRetryRequest] = useState<{ id: string; batch: string; child: string } | null>(null);
  const [error, setError] = useFeedbackMessage('error', 'Roster needs attention');
  const [notice, setNotice] = useFeedbackMessage('success', 'Enrollment saved');
  const revision = useRef(0);

  const reload = useCallback(async () => {
    const current = ++revision.current;
    setLoading(true); setError('');
    try {
      const result = await loadConnectedCoachRoster(workspace);
      if (revision.current === current) setData(result);
    } catch {
      if (revision.current === current) { setData(null); setError('Your connected students and groups could not be loaded. Check your connection and retry.'); }
    } finally { if (revision.current === current) setLoading(false); }
  }, [workspace, setError]);
  useEffect(() => { void reload(); return () => { revision.current += 1; }; }, [reload]);
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
  useEffect(() => { onDirtyChange(false); return () => onDirtyChange(false); }, [onDirtyChange]);
  useEffect(onViewChange, [tab, selectedBatch, selectedChild, onViewChange]);

  const batch = data?.batches.find(value => value.id === selectedBatch) ?? null;
  const batchMembers = useMemo(() => data?.students.flatMap(student => {
    const enrollment = student.enrollments.find(value => value.batchId === selectedBatch);
    return enrollment ? [{ student, enrollment }] : [];
  }) ?? [], [data, selectedBatch]);
  const availableChildren = useMemo(() => data?.students.filter(student => !student.enrollments.some(value => value.batchId === selectedBatch)) ?? [], [data, selectedBatch]);
  const chosenChild = data?.students.find(student => student.id === selectedChild) ?? null;

  async function saveEnrollment() {
    if (!selectedBatch || !selectedChild || busy) return;
    const child = data?.students.find(value => value.id === selectedChild);
    if (!child || child.enrollments.some(value => value.batchId === selectedBatch)) {
      setError('This child is already listed in the selected group. Refresh the roster before trying again.');
      return;
    }
    const request = retryRequest?.batch === selectedBatch && retryRequest.child === selectedChild
      ? retryRequest : { id: randomUUID(), batch: selectedBatch, child: selectedChild };
    setRetryRequest(request); setBusy(true); setError(''); setNotice('');
    try {
      await enrollConnectedChild(workspace, selectedBatch, selectedChild, request.id);
      setRetryRequest(null); setSelectedChild(null); setNotice('Child added to the group.');
      await reload();
    } catch {
      setError('The change could not be confirmed. Your selection is kept; retry safely.');
    } finally { setBusy(false); }
  }

  return <View style={s.root}>
    <Text style={s.kicker}>YOUR CONNECTED WORKSPACE</Text>
    <Text accessibilityRole="header" style={s.title}>{batch ? batch.name : tab === 'students' ? 'Connected students' : 'Your groups'}</Text>
    <Text style={s.body}>{batch ? `${batch.courseName} · ${batchMembers.length} enrolled` : 'Family members appear here after a parent connects their child to your workspace.'}</Text>
    {!!notice && <Text style={s.notice}>{notice}</Text>}
    {!!error && <Text style={s.error}>{error}</Text>}
    {batch && <Button label="Back to groups" secondary onPress={() => { setSelectedBatch(null); setSelectedChild(null); setRetryRequest(null); }} />}
    {!batch && <View style={s.tabs}>
      <Button label="Students" secondary={tab !== 'students'} onPress={() => setTab('students')} />
      <Button label="Groups" secondary={tab !== 'batches'} onPress={() => setTab('batches')} />
    </View>}
    {loading ? <View style={s.loading}><ActivityIndicator /><Text style={s.body}>Loading your connected workspace…</Text></View>
      : !data ? <Button label="Retry loading" onPress={() => { void reload(); }} />
      : batch ? <>
        {batchMembers.length === 0 && <Text style={s.empty}>No connected children are enrolled in this group yet.</Text>}
        {batchMembers.map(({ student, enrollment }) => <View key={enrollment.id} style={s.row}>
          <Text style={s.name}>{student.name}</Text><Text style={s.meta}>Enrollment: {enrollment.status}</Text>
        </View>)}
        {data.canManageEnrollments && <View style={s.card}>
          <Text style={s.section}>Add a connected child</Text>
          <Text style={s.meta}>Only children already connected by their family can be enrolled.</Text>
          {availableChildren.length === 0 ? <Text style={s.empty}>There are no other connected children available.</Text> : availableChildren.map(student => <Pressable key={student.id} accessibilityRole="button" accessibilityState={{ selected: selectedChild === student.id, disabled: busy }} onPress={() => setSelectedChild(student.id)} style={[s.choice, selectedChild === student.id && s.choiceSelected]}>
            <Text style={s.name}>{student.name}</Text><Text style={s.meta}>{selectedChild === student.id ? 'Selected' : 'Choose this child'}</Text>
          </Pressable>)}
          {!!chosenChild && <Button label={busy ? 'Adding child…' : `Add ${chosenChild.name}`} disabled={busy} onPress={() => { void saveEnrollment(); }} />}
          {!!retryRequest && !!selectedChild && <Text style={s.meta}>Retry will reuse the same safe request.</Text>}
        </View>}
        {!data.canManageEnrollments && <Text style={s.meta}>You can view children in groups assigned to you. A workspace owner or admin manages enrollment.</Text>}
      </>
      : tab === 'students' ? data.students.length === 0 ? <Text style={s.empty}>No family-connected children are available yet.</Text> : data.students.map(student => <View key={student.id} style={s.row}>
        <Text style={s.name}>{student.name}</Text>
        <Text style={s.meta}>{student.enrollments.length ? student.enrollments.map(value => `${value.batchName} · ${value.status}`).join('\n') : 'Not enrolled in a group yet'}</Text>
      </View>)
      : data.batches.length === 0 ? <Text style={s.empty}>No groups have been set up in this workspace yet.</Text> : data.batches.map(value => {
        const count = data.students.filter(student => student.enrollments.some(enrollment => enrollment.batchId === value.id)).length;
        return <Pressable key={value.id} accessibilityRole="button" accessibilityLabel={`Open ${value.name}`} onPress={() => setSelectedBatch(value.id)} style={s.row}>
          <Text style={s.name}>{value.name}</Text><Text style={s.meta}>{value.courseName} · {count} enrolled</Text>
        </Pressable>;
      })}
    {data && !loading && <Button label="Refresh roster" secondary onPress={() => { void reload(); }} disabled={busy} />}
  </View>;
}

const s = StyleSheet.create({
  root: { gap: 14, paddingTop: 8 }, kicker: { color: '#1F6F6B', fontSize: 11, fontWeight: '700', letterSpacing: 1.1 }, title: { color: '#22303A', fontSize: 28, lineHeight: 34, fontWeight: '700' }, body: { color: '#50655C', fontSize: 14, lineHeight: 22 },
  tabs: { flexDirection: 'row', gap: 10 }, button: { backgroundColor: '#1F6F6B', borderRadius: 12, minHeight: 46, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }, buttonSecondary: { backgroundColor: '#E5F0EC' }, buttonText: { color: '#FFF', fontSize: 14, fontWeight: '700' }, buttonTextSecondary: { color: '#1F6F6B' }, disabled: { opacity: 0.55 }, loading: { minHeight: 100, gap: 12, alignItems: 'center', justifyContent: 'center' },
  row: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E3E8E2', padding: 16, gap: 6 }, name: { color: '#22303A', fontSize: 17, fontWeight: '700' }, meta: { color: '#60736A', fontSize: 13, lineHeight: 19 }, empty: { color: '#60736A', fontSize: 14, lineHeight: 22, padding: 18, backgroundColor: '#F7F9F6', borderRadius: 14 },
  card: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: '#F2F6F2' }, section: { color: '#22303A', fontSize: 18, fontWeight: '700' }, choice: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E3E8E2', gap: 4 }, choiceSelected: { borderColor: '#1F6F6B', borderWidth: 2 }, error: { color: '#9A3428', backgroundColor: '#FFF0EC', padding: 12, borderRadius: 12 }, notice: { color: '#175D4E', backgroundColor: '#E5F0EC', padding: 12, borderRadius: 12 },
});
