import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { Batch, BatchDraft, Roster, Student, StudentDraft } from './model';
import { formatFee, parseFee, validateStudent } from './model';
import { archiveStudent, loadRoster, rosterFailure, saveBatch, saveStudent } from './service';
import { ConfirmDialog } from '../ui/ConfirmDialog';

function Button({ label, onPress, soft = false, disabled = false }: { label: string; onPress: () => void; soft?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[s.button, soft && s.soft, disabled && { opacity: 0.5 }]}><Text style={[s.buttonText, soft && s.softText]}>{label}</Text></Pressable>;
}
function Field({ label, value, onChange, disabled, kind = 'text', max = 100 }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; kind?: 'text' | 'email' | 'phone' | 'number' | 'money'; max?: number }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
    editable={!disabled} maxLength={max} autoCorrect={false} autoCapitalize={kind === 'email' ? 'none' : 'words'}
    keyboardType={kind === 'email' ? 'email-address' : kind === 'phone' ? 'phone-pad' : kind === 'number' ? 'number-pad' : kind === 'money' ? 'decimal-pad' : 'default'} style={s.input} /></View>;
}

export function RosterScreen({ academy, onDirtyChange, onBusyChange, onViewChange }: { academy: string; onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void; onViewChange: () => void }) {
  const [tab, setTab] = useState<'students' | 'batches'>('students');
  const [data, setData] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [studentDraft, setStudentDraft] = useState<StudentDraft | null>(null);
  const [batchDraft, setBatchDraft] = useState<BatchDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Student | null>(null);
  // Ignore stale responses after another reload or unmount. This avoids restoring
  // old roster data over a newer save; it does not cancel the network requests.
  const loadVersion = useRef(0);

  const reload = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true); setError('');
    try { const result = await loadRoster(academy); if (loadVersion.current === version) setData(result); }
    catch (failure) { if (loadVersion.current === version) setError(rosterFailure(failure, 'Your roster could not be loaded. Check the connection and retry.')); }
    finally { if (loadVersion.current === version) setLoading(false); }
  }, [academy]);
  useEffect(() => { void reload(); return () => { loadVersion.current++; }; }, [reload]);
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
  useEffect(onViewChange, [studentDraft?.id, batchDraft?.id, tab, onViewChange]);

  const batches = data?.batches.filter(b => !b.archived_at) ?? [];
  const existingEnrolments = (student: string) => data?.enrolments.filter(e => e.student_id === student).map(e => e.batch_id) ?? [];
  function editStudent(student?: Student) {
    if (!data) return;
    const contact = data.contacts.find(c => c.student_id === student?.id);
    // Allocate an ID once per opened form, not on each Save press. A lost-response
    // retry must address the same student so the server can avoid duplicates.
    setStudentDraft({ id: student?.id ?? randomUUID(), name: student?.name ?? '', age: student?.age_years?.toString() ?? '',
      guardian: contact?.name ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '', batches: student ? existingEnrolments(student.id) : [] });
    setDirty(false); setError(''); setNotice(''); setArchiveTarget(null);
  }
  function editBatch(batch?: Batch) {
    setBatchDraft({ id: batch?.id ?? randomUUID(), name: batch?.name ?? '', room: batch?.room ?? '', fee: batch ? (batch.monthly_fee_paise / 100).toFixed(2) : '' });
    setDirty(false); setError(''); setNotice(''); setArchiveTarget(null);
  }
  function close() { setStudentDraft(null); setBatchDraft(null); setDirty(false); setDiscard(false); setError(''); }
  function back() { Keyboard.dismiss(); if (dirty) setDiscard(true); else close(); }
  function updateStudent(field: keyof StudentDraft, value: string | string[]) {
    setStudentDraft(current => current ? { ...current, [field]: value } : current); setDirty(true);
  }
  function updateBatch(field: keyof BatchDraft, value: string) {
    setBatchDraft(current => current ? { ...current, [field]: value } : current); setDirty(true);
  }
  // Close only after the write succeeds. On failure keep the same draft/UUID so
  // Retry is safe. Drafts are in memory; full offline/durable drafts are not built.
  async function save() {
    if (busy) return;
    const invalid = studentDraft ? validateStudent(studentDraft) : batchDraft
      ? !batchDraft.name.trim() ? 'Enter a batch name.' : parseFee(batchDraft.fee) === null ? 'Enter a monthly fee in rupees, with up to two decimal places.' : null : 'Open a record first.';
    if (invalid) { setError(invalid); onViewChange(); return; }
    setBusy(true); setError('');
    try {
      if (studentDraft) await saveStudent(academy, studentDraft);
      else if (batchDraft) await saveBatch(academy, batchDraft);
      close(); setNotice(studentDraft ? 'Student saved.' : 'Batch saved.');
      await reload();
    } catch (failure) { setError(rosterFailure(failure, 'The save could not be confirmed. Your entries are still here. Retry safely.')); onViewChange(); }
    finally { setBusy(false); }
  }
  async function confirmArchive() {
    if (!archiveTarget || busy) return;
    setBusy(true); setError('');
    try { await archiveStudent(archiveTarget.id); setArchiveTarget(null); setNotice('Student archived. Their history has been retained.'); await reload(); }
    catch (failure) { setError(rosterFailure(failure, 'Archiving could not be confirmed. Retry safely.')); }
    finally { setBusy(false); }
  }

  const heading = studentDraft ? (data?.students.some(x => x.id === studentDraft.id) ? 'Edit student' : 'Add a student')
    : batchDraft ? (data?.batches.some(x => x.id === batchDraft.id) ? 'Edit batch' : 'Create a batch') : tab === 'students' ? 'Your students' : 'Your batches';
  const list = data?.students.filter(student => (!!student.archived_at === showArchived) && student.name.toLowerCase().includes(search.toLowerCase())
    && (batchFilter === 'all' || data.enrolments.some(e => e.student_id === student.id && e.batch_id === batchFilter))) ?? [];
  return <View style={s.root}>
    <Text style={s.kicker}>THE PEOPLE BEHIND YOUR TEACHING</Text><Text accessibilityRole="header" style={s.heading}>{heading}</Text>
    {/* Keep native and web status semantics compatible; see ANDROID-001. */}
    {!!notice && <Text role="status" accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <ConfirmDialog visible={discard} title="Discard your unsaved changes?" message="Keep editing to retain this form, or discard it to go back."
      confirmLabel="Discard changes" cancelLabel="Keep editing" onConfirm={close} onCancel={() => setDiscard(false)} />
    {studentDraft ? <View style={s.card}>
      <Field label="Student name" value={studentDraft.name} onChange={value => updateStudent('name', value)} disabled={busy} />
      <Field label="Age (optional)" kind="number" max={3} value={studentDraft.age} onChange={value => updateStudent('age', value)} disabled={busy} />
      <Text style={s.title}>Guardian contact</Text><Text style={s.body}>Optional contact details. This does not create a parent account or send an invitation.</Text>
      <Field label="Guardian name" value={studentDraft.guardian} onChange={value => updateStudent('guardian', value)} disabled={busy} />
      <Field label="Guardian email" kind="email" max={320} value={studentDraft.email} onChange={value => updateStudent('email', value)} disabled={busy} />
      <Field label="Guardian phone" kind="phone" max={30} value={studentDraft.phone} onChange={value => updateStudent('phone', value)} disabled={busy} />
      <Text style={s.title}>Batches</Text><Text style={s.body}>Choose batches to add. Existing enrolments are retained; moving or ending an enrolment comes in a later module.</Text>
      {!batches.length && <Text style={s.body}>Create a batch first, or save this student without a batch.</Text>}
      {batches.map(batch => {
        const enrolled = existingEnrolments(studentDraft.id).includes(batch.id);
        const selected = studentDraft.batches.includes(batch.id);
        return <Pressable key={batch.id} accessibilityRole="checkbox" accessibilityLabel={batch.name} aria-checked={selected} accessibilityState={{ checked: selected, disabled: busy || enrolled }} disabled={busy || enrolled}
          onPress={() => updateStudent('batches', selected ? studentDraft.batches.filter(id => id !== batch.id) : [...studentDraft.batches, batch.id])} style={[s.check, selected && s.selected]}>
          <Text style={s.label}>{selected ? '[✓]' : '[ ]'} {batch.name}</Text>{enrolled && <Text style={s.caption}>Already enrolled</Text>}
        </Pressable>;
      })}
      <Button label={busy ? 'Saving…' : 'Save student'} disabled={busy} onPress={() => { void save(); }} />
      <Button label="Back to students" soft disabled={busy} onPress={back} />
    </View> : batchDraft ? <View style={s.card}>
      <Field label="Batch name" value={batchDraft.name} disabled={busy} onChange={value => updateBatch('name', value)} />
      <Field label="Room or location" value={batchDraft.room} disabled={busy} onChange={value => updateBatch('room', value)} />
      <Field label="Monthly fee (₹)" kind="money" max={12} value={batchDraft.fee} disabled={busy} onChange={value => updateBatch('fee', value)} />
      <Text style={s.body}>This sets a default fee. It does not issue an invoice or collect money.</Text>
      <Button label={busy ? 'Saving…' : 'Save batch'} disabled={busy} onPress={() => { void save(); }} />
      <Button label="Back to batches" soft disabled={busy} onPress={back} />
    </View> : <>
      <View style={s.tabs}><Button label="Students" soft={tab !== 'students'} disabled={busy} onPress={() => { setTab('students'); setError(''); }} />
        <Button label="Batches" soft={tab !== 'batches'} disabled={busy} onPress={() => { setTab('batches'); setError(''); }} /></View>
      {loading && <ActivityIndicator accessibilityLabel="Loading roster" color="#1F6F6B" />}
      <Button label="Refresh roster" soft disabled={loading || busy} onPress={() => { void reload(); }} />
      {tab === 'students' ? <>
        <Button label="Add a student" disabled={!data || loading || busy} onPress={() => editStudent()} />
        {data && <><Field label="Search students" value={search} disabled={busy} onChange={setSearch} />
          <View style={s.chips}>{[{ id: 'all', name: 'All batches' }, ...batches].map(b => <Pressable key={b.id} accessibilityRole="button" onPress={() => setBatchFilter(b.id)} style={[s.chip, batchFilter === b.id && s.selected]}><Text style={s.label}>{b.name}</Text></Pressable>)}</View>
          <Button label={showArchived ? 'Show active students' : 'Show archived students'} soft onPress={() => setShowArchived(x => !x)} />
          {!list.length && <Text style={s.body}>{search || batchFilter !== 'all' ? 'No students match these filters.' : showArchived ? 'No archived students.' : 'No students yet. Add your first student.'}</Text>}
          {list.map(student => <View key={student.id} style={s.card}>
            <Text style={s.title}>{student.name}</Text><Text style={s.body}>{student.age_years === null ? 'Age not provided' : `Age ${student.age_years}`}{student.archived_at ? ' · Archived' : ''}</Text>
            <Text style={s.body}>{data.enrolments.filter(e => e.student_id === student.id).map(e => data.batches.find(b => b.id === e.batch_id)?.name).filter(Boolean).join(' · ') || 'No batches yet'}</Text>
            {data.contacts.find(c => c.student_id === student.id) && <Text style={s.body}>Guardian: {data.contacts.find(c => c.student_id === student.id)?.name}</Text>}
            {!student.archived_at && <><Button label={`Edit ${student.name}`} soft onPress={() => editStudent(student)} />
              <Button label={`Archive ${student.name}`} soft onPress={() => setArchiveTarget(student)} disabled={busy} /></>}
          </View>)}
        </>}
      </> : <>
        <Button label="Create a batch" disabled={!data || loading || busy} onPress={() => editBatch()} />
        {data && !batches.length && <Text style={s.body}>No batches yet. Create your first teaching group.</Text>}
        {batches.map(batch => <View key={batch.id} style={s.card}><Text style={s.title}>{batch.name}</Text>
          <Text style={s.body}>{batch.room || 'Location not set'} · {formatFee(batch.monthly_fee_paise)}/month</Text>
          <Text style={s.body}>{data?.enrolments.filter(e => e.batch_id === batch.id && data.students.some(st => st.id === e.student_id && !st.archived_at)).length ?? 0} active students</Text>
          <Button label={`Edit ${batch.name}`} soft onPress={() => editBatch(batch)} />
        </View>)}
      </>}
      <ConfirmDialog visible={archiveTarget !== null} title={`Archive ${archiveTarget?.name ?? 'student'}?`}
        message="The student leaves the active list. Their attendance, observations, and fee records are retained."
        confirmLabel="Confirm archive" cancelLabel="Cancel archive" busy={busy} onConfirm={() => { void confirmArchive(); }} onCancel={() => setArchiveTarget(null)} />
    </>}
  </View>;
}

const s = StyleSheet.create({
  root: { gap: 16 }, kicker: { color: '#1F6F6B', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  heading: { fontSize: 32, lineHeight: 39, fontWeight: '700', letterSpacing: -1, color: '#22303A' },
  title: { fontSize: 17, fontWeight: '700', color: '#22303A' }, body: { fontSize: 13, lineHeight: 21, color: '#5C6B73' },
  card: { padding: 18, gap: 14, borderRadius: 18, borderWidth: 1, borderColor: '#E3E8E2', backgroundColor: '#fff' },
  tabs: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { padding: 12, borderRadius: 22, backgroundColor: '#fff', borderColor: '#CED8CC', borderWidth: 1 },
  field: { gap: 7 }, label: { color: '#22303A', fontWeight: '600', fontSize: 13 },
  input: { padding: 13, minHeight: 48, borderWidth: 1, borderColor: '#CED8CC', borderRadius: 12, fontSize: 16, color: '#22303A', backgroundColor: '#FAFBF8' },
  button: { padding: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1F6F6B' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' }, soft: { backgroundColor: '#EDF1EC' }, softText: { color: '#22303A' },
  error: { padding: 14, borderRadius: 12, color: '#8D2635', backgroundColor: '#FCE8EB', lineHeight: 22 },
  notice: { padding: 14, borderRadius: 12, color: '#1F6F6B', backgroundColor: '#DCEDEA', lineHeight: 22 },
  check: { padding: 14, minHeight: 48, borderWidth: 1, borderColor: '#CED8CC', borderRadius: 12, gap: 5 },
  selected: { backgroundColor: '#DCEDEA', borderColor: '#1F6F6B' }, caption: { color: '#5C6B73', fontSize: 11 },
});
