import { prototypeColors as c, prototypeFontFamily, prototypeWeight } from '../ui/prototypeTheme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../ui/Typography';
import { randomUUID } from 'expo-crypto';
import type { Academy } from '../auth/AuthProvider';
import { ClassMediaPanel } from '../class-media/ClassMediaPanel';
import { SelectField } from '../ui/SelectField';
import { saveBatch } from '../roster/service';
import type { BatchDraft } from '../roster/model';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { changeNotice, holidayNotices, noticeSummary, NOTE_LIMIT, type Notice } from './scheduleNotice';
import { supabase } from '../auth/client';
import { canRemindClass, classReminder } from './classReminder';
import { canRestore, holidayMessage, holidayTargets, withStatus } from './holiday';
import { useFeedbackMessage } from '../ui/ActionFeedback';
import { attendanceDrafts } from './localDrafts';
import type { AttendanceDraft, ClassContext, ClassDraft, ClassSession, Mark, Marks } from './model';
import { classValues, completeMarks, eligibleStudents, fingerprint, localParts, sameMarks } from './model';
import { classFailure, loadAttendance, loadClasses, saveAttendance, saveClass } from './service';

function Button({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.button, disabled && s.disabled]}><Text style={s.buttonText}>{title}</Text></Pressable>;
}
function Field({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (text: string) => void; disabled?: boolean }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text>{Platform.OS === 'web' && /date|time/.test(label.toLowerCase()) ? React.createElement('input', { type: /date/i.test(label) ? 'date' : 'time', 'aria-label': label, value, disabled, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value), style: { minHeight:44,width:'100%',boxSizing:'border-box',border:`1px solid ${c.border}`,borderRadius:12,padding:'10px 11px',fontSize:13,fontFamily:`${prototypeFontFamily}, system-ui, -apple-system, sans-serif`,backgroundColor:c.raised,color:c.text,colorScheme:'dark' } }) : <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} autoCapitalize="none" autoCorrect={false} maxLength={100} style={s.input} />}</View>;
}
type Active = { session: ClassSession; marks: Marks; saved: Marks; local: boolean };

// Form state stays here; model/service/draft modules own conversion, API access
// and device persistence. One active device draft prevents silent replacement.
export function ClassesScreen({ academy, owner, initialBatch, initialSession, onWriteFeedback, startWithCreate = false, onDirtyChange, onBusyChange, onViewChange }: {
  academy: Academy; owner: string; initialBatch?: string; initialSession?: string; onWriteFeedback?: (session:ClassSession,students:string[])=>void; startWithCreate?: boolean; onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void; onViewChange: () => void;
}) {
  const today = localParts(new Date().toISOString(), academy.timezone).date;
  const [date, setDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [context, setContext] = useState<ClassContext | null>(null);
  const [draft, setDraft] = useState<ClassDraft | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [batchDraft, setBatchDraft] = useState<BatchDraft | null>(null);
  const launch = useRef(startWithCreate);
  const sessionLaunch=useRef(initialSession);
  const saving = useRef(false);
  const [active, setActive] = useState<Active | null>(null);
  const [deviceDraft, setDeviceDraft] = useState<AttendanceDraft | null>(null);
  const [conflict, setConflict] = useState<AttendanceDraft | null>(null);
  const [replaceWith, setReplaceWith] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const [discardStored, setDiscardStored] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [holidayAsk, setHolidayAsk] = useState(false);
  const [familyNote, setFamilyNote] = useState('');
  const [unsent, setUnsent] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useFeedbackMessage('info', 'Update');
  const [error, setError] = useFeedbackMessage('error', 'Action needs attention');
  const generation = useRef(0);
  const scope = (session: string) => ({ owner, academy: academy.id, session });

  // Tells linked families through the existing batch announcement (SN-01..09). Returns the notices that failed.
  async function sendNotices(list: Notice[]): Promise<Notice[]> {
    const failed: Notice[] = [];
    for (const n of list) {
      try { const r = await supabase!.rpc('post_batch_announcement', { target_batch: n.batchId, message: n.message }); if (r.error) throw r.error; }
      catch { failed.push(n); }
    }
    setUnsent(failed); return failed;
  }
  async function remind(s: ClassSession) {
    if (saving.current) return; saving.current = true; setBusy(true); setError(''); setNotice('');
    const failed = await sendNotices([{ batchId: s.batch_id, message: classReminder(batchNames()[s.batch_id] ?? 'Class', s, academy.timezone, new Date()) }]);
    if (failed.length) setError('The reminder could not be sent. Use "Send notice to families" to retry.'); else setNotice('Families notified.', { kind: 'success', title: 'Reminder sent' });
    saving.current = false; setBusy(false);
  }
  const batchNames = () => Object.fromEntries((context?.batches ?? []).map(b => [b.id, b.name]));
  async function setStatus(sessions: ClassSession[], status: ClassSession['status'], done: string, holiday = false) {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(''); setNotice('');
    const saved: ClassSession[] = []; let failure: unknown = null;
    try { for (const s of sessions) { await saveClass(academy.id, withStatus(s, status, academy.timezone), academy.timezone); saved.push(s); } }
    catch (e) { failure = e; }
    const now = new Date(); const names = batchNames();
    const notices = holiday ? holidayNotices(saved, names, academy.timezone, now, familyNote)
      : saved.flatMap(s => { const n = changeNotice(s, withStatus(s, status, academy.timezone), names[s.batch_id] ?? 'Class', s.starts_at, academy.timezone, now, familyNote); return n ? [n] : []; });
    const failed = await sendNotices(notices);
    const told = noticeSummary(notices.length - failed.length, failed.length);
    if (failure) setError(classFailure(failure, 'The schedule change could not be saved. Refresh and retry.') + (saved.length ? ` ${saved.length} of ${sessions.length} were saved. ${told}` : ''));
    else { setNotice(`${done} ${told}`.trim(), { kind: failed.length ? 'info' : 'success', title: 'Schedule updated' }); setFamilyNote(''); }
    saving.current = false; setBusy(false); await reload();
  }
  const reload = useCallback(async () => {
    const version = ++generation.current; setLoading(true); setError('');
    try {
      const data = await loadClasses(academy.id, selectedDate, academy.timezone);
      if (version !== generation.current) return false;
      setContext(data);
      let complete = true;
      try {
        const local = await attendanceDrafts.read();
        if (version === generation.current) setDeviceDraft(local?.owner === owner && local.academy === academy.id ? local : null);
      } catch { complete = false; if (version === generation.current) setError(classFailure(null, 'Saved device drafts could not be read. Online classes are still available.')); }
      return complete && version === generation.current;
    } catch (failure) { if (version === generation.current) setError(classFailure(failure, 'Classes could not be loaded. Check the connection and refresh.')); return false; }
    finally { if (version === generation.current) setLoading(false); }
  }, [academy.id, academy.timezone, owner, selectedDate]);
  useEffect(() => { void reload(); return () => { generation.current++; }; }, [reload]);
  useEffect(() => {
    if (context && launch.current) { launch.current = false; edit(); }
    if (context && sessionLaunch.current) {const id=sessionLaunch.current;sessionLaunch.current=undefined;void openAttendance({id});}
  }, [context]);
  useEffect(() => { onDirtyChange(dirty || !!batchDraft); return () => onDirtyChange(false); }, [dirty, batchDraft, onDirtyChange]);
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
  useEffect(onViewChange, [draft?.id, active?.session.id, onViewChange]);

  function close() { setBatchDraft(null); setDraft(null); setActive(null); setConflict(null); setDirty(false); setDiscard(false); setError(''); onViewChange(); }
  function back() { if (dirty || batchDraft) setDiscard(true); else { close(); void reload(); } }
  function edit(session?: ClassSession) {
    const start = session ? localParts(session.starts_at, academy.timezone) : { date: selectedDate, time: '16:00' };
    const end = session ? localParts(session.ends_at, academy.timezone) : { date: selectedDate, time: '17:00' };
    setDraft({ id: session?.id ?? randomUUID(), batch: session?.batch_id ?? initialBatch ?? (context?.batches.filter(b => !b.archived_at).length === 1 ? context.batches.find(b => !b.archived_at)!.id : ''), startDate: start.date, startTime: start.time,
      endDate: end.date, endTime: end.time, room: session?.room ?? context?.batches.find(b => b.id === (initialBatch ?? (context.batches.filter(b => !b.archived_at).length === 1 ? context.batches.find(b => !b.archived_at)!.id : '')))?.room ?? '', status: session?.status ?? 'scheduled' });
    setAdvanced(!!session); setBatchDraft(null); setDirty(false); setNotice(''); setError('');
  }
  function update(field: keyof ClassDraft, value: string) { setDraft(current => current ? { ...current, [field]: value } : current); setDirty(true); }
  async function createTeachingBatch() {
    if (!batchDraft || saving.current) return;
    if (!batchDraft.name.trim() || batchDraft.name.trim().length > 100) { setError('Enter a batch name, up to 100 characters.'); return; }
    saving.current = true; setBusy(true); setError('');
    try {
      await saveBatch(academy.id, batchDraft);
      const created = { id: batchDraft.id, name: batchDraft.name.trim(), room: batchDraft.room.trim(), monthly_fee_paise: 0, archived_at: null };
      setContext(value => value ? { ...value, batches: [...value.batches.filter(b => b.id !== created.id), created] } : value);
      setDraft(value => value ? { ...value, batch: created.id, room: value.room || created.room } : value);
      setDirty(true); setBatchDraft(null); setNotice('Batch created and selected. Choose the class time and save.');
    } catch { setError('The batch save could not be confirmed. Keep your entries and retry.'); }
    finally { saving.current = false; setBusy(false); }
  }
  async function saveSession() {
    if (!draft || busy || saving.current) return;
    try { classValues(draft, academy.timezone); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Check class details.'); onViewChange(); return; }
    saving.current = true; setBusy(true); setError(''); setNotice('');
    try { await saveClass(academy.id, draft, academy.timezone); const nextDate = draft.startDate; close();
      const before = context?.sessions.find(s => s.id === draft.id); const notices = changeNotice(before, draft, batchNames()[draft.batch] ?? 'Class', classValues(draft, academy.timezone).starts, academy.timezone, new Date(), familyNote);
      const failed = notices ? await sendNotices([notices]) : []; const told = notices ? noticeSummary(1 - failed.length, failed.length) : '';
      setNotice(`Class saved. ${draft.startDate} ${draft.startTime} – ${draft.endDate} ${draft.endTime} (${academy.timezone}). ${told}`.trim(), { kind: 'success', title: 'Class saved' }); setFamilyNote(''); setDate(nextDate); setSelectedDate(nextDate); await reload(); }
    catch (failure) { setError(classFailure(failure, 'The class save could not be confirmed. Keep your entries and retry. Once attendance is recorded, class times are protected.')); onViewChange(); }
    finally { saving.current = false; setBusy(false); }
  }
  function visibleMarks(session: ClassSession, marks: Marks, data = context) {
    const ids = new Set(data ? eligibleStudents(data, session, academy.timezone).map(s => s.id) : []);
    return Object.fromEntries(Object.entries(marks).filter(([id]) => ids.has(id))) as Marks;
  }
  async function openAttendance(session: Pick<ClassSession, 'id'>, discardOther = false) {
    if (busy || !context) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const stored = await attendanceDrafts.read();
      let local = stored?.owner === owner && stored.academy === academy.id ? stored : null;
      if (local && local.session !== session.id) {
        if (!discardOther) { setDeviceDraft(local); setReplaceWith(session.id); return; }
        await attendanceDrafts.clear(scope(local.session)); local = null; setDeviceDraft(null);
      }
      const loaded = await loadAttendance(academy.id, session.id);
      if (loaded.session.status === 'cancelled') throw new Error('Cancelled class');
      const latest = await loadClasses(academy.id, localParts(loaded.session.starts_at, academy.timezone).date, academy.timezone);
      setContext(latest);
      const saved = visibleMarks(loaded.session, loaded.marks, latest);
      const value: Active = { session: loaded.session, marks: saved, saved, local: false };
      if (local) {
        const marks = visibleMarks(loaded.session, local.marks, latest);
        if (fingerprint(loaded.session) === local.fingerprint && completeMarks(marks, latest, loaded.session, academy.timezone) && sameMarks(marks, saved)) {
          await attendanceDrafts.clear(scope(session.id)); setDeviceDraft(null); setNotice('Your earlier attendance save is already recorded on the server.', { kind: 'success', title: 'Attendance confirmed' });
        } else if (fingerprint(loaded.session) !== local.fingerprint || local.revision !== loaded.session.attendance_revision) {
          setConflict(local);
        } else { value.marks = marks; value.local = true; setNotice('Unsent attendance draft restored from this device. Review and save to your class.'); }
      }
      setActive(value); setDirty(false);
    } catch (failure) { setError(classFailure(failure, 'Attendance could not be opened. Check the connection and class status. Your device draft is retained.')); }
    finally { setBusy(false); }
  }
  async function resumeDraft() {
    if (!deviceDraft || busy) return;
    await openAttendance({ id: deviceDraft.session });
  }
  async function changeMarks(marks: Marks) {
    if (!active || busy) return;
    setActive({ ...active, marks, local: true }); setDirty(true); setBusy(true); setError(''); setNotice('');
    const local: AttendanceDraft = { version: 1, ...scope(active.session.id), fingerprint: fingerprint(active.session),
      revision: active.session.attendance_revision, marks, savedAt: new Date().toISOString() };
    try {
      await attendanceDrafts.save(local); setDeviceDraft(local); setDirty(false);
      setNotice('Draft saved on this device. Not yet saved to your class.', { title: 'Device draft saved — not sent to class' });
    } catch { setError(classFailure(null, 'Your changes are only in memory because device storage failed. Keep this screen open and save online.')); }
    finally { setBusy(false); }
  }
  async function finishSaved(value: Active, revision: number) {
    setActive({ ...value, session: { ...value.session, attendance_revision: revision }, saved: value.marks, local: false });
    const count = (mark: Mark) => Object.values(value.marks).filter(saved => saved === mark).length;
    setDirty(false); setNotice(`Attendance saved to your class. Present: ${count('present')} · Late: ${count('late')} · Absent: ${count('absent')}.`, { kind: 'success', title: 'Attendance saved to class' });
    // A cleanup failure must not misrepresent a confirmed server save as failed.
    try { await attendanceDrafts.clear(scope(value.session.id)); setDeviceDraft(null); }
    catch { setNotice('Attendance saved to your class. The old device draft could not be cleared; it will be compared when reopened.', { title: 'Attendance saved; device cleanup needs attention' }); }
  }
  async function submitAttendance() {
    if (!active || !context || busy) return;
    if (!completeMarks(active.marks, context, active.session, academy.timezone)) { setError('Mark each enrolled student before saving (up to 500 students).'); onViewChange(); return; }
    setBusy(true); setError(''); setNotice('');
    try { const revision = await saveAttendance(active.session, active.marks); await finishSaved(active, revision); }
    catch (failure) {
      const code = failure && typeof failure === 'object' && 'code' in failure ? String(failure.code ?? '') : '';
      // An explicit server rejection is not an uncertain network outcome. It must
      // not become "saved" just because an older subset already has equal marks.
      if (code) { setError(classFailure(failure, 'Attendance was rejected. Your entries remain on this screen; reopen the class to review.')); onViewChange(); return; }
      // Read-only reconciliation handles a server commit whose response was lost.
      // Never automatically overwrite a newer revision with a stale local draft.
      try {
        const current = await loadAttendance(academy.id, active.session.id);
        const latest = await loadClasses(academy.id, localParts(current.session.starts_at, academy.timezone).date, academy.timezone);
        if (current.session.attendance_revision > active.session.attendance_revision && fingerprint(current.session) === fingerprint(active.session) && completeMarks(active.marks, latest, current.session, academy.timezone) && sameMarks(active.marks, current.marks)) await finishSaved({ ...active, session: current.session }, current.session.attendance_revision);
        else setError(classFailure(failure, 'Attendance was not confirmed. Your entries remain on this screen. Reopen saved attendance before retrying.'));
      } catch { setError(classFailure(failure, 'Attendance was not confirmed. Your entries remain on this screen. Reconnect and reopen saved attendance.')); }
      onViewChange();
    } finally { setBusy(false); }
  }
  async function discardDeviceDraft() {
    setBusy(true); setError(''); setNotice('');
    try { await attendanceDrafts.clear(); setDeviceDraft(null); setDiscardStored(false); setNotice('Device attendance draft discarded. Server records are unchanged.'); }
    catch { setError(classFailure(null, 'The device draft could not be cleared. Try again.')); }
    finally { setDiscardStored(false); setBusy(false); }
  }

  const students = active && context ? eligibleStudents(context, active.session, academy.timezone) : [];
  const batchName = (id: string) => context?.batches.find(batch => batch.id === id)?.name ?? 'Batch';
  const caption = (session: ClassSession) => { const start = localParts(session.starts_at, academy.timezone); const end = localParts(session.ends_at, academy.timezone); return `${start.date} ${start.time} – ${end.date === start.date ? '' : end.date + ' '}${end.time}`; };
  return <View style={s.root}>
    <Text style={s.kicker}>YOUR TEACHING SCHEDULE</Text>
    <Text accessibilityRole="header" style={s.heading}>{draft ? 'Class details' : active ? 'Class attendance' : 'Classes and attendance'}</Text>
    <Text style={s.body}>Dates and times use {academy.timezone}.</Text>
    {!!notice && <Text style={s.notice}>{notice}</Text>}
    {!!error && <Text style={s.error}>{error}</Text>}
    {draft ? <View style={s.card}>
      <SelectField label="Class batch" value={draft.batch} disabled={busy || !!batchDraft} options={[{ value: '', label: 'Choose a batch' }, ...(context?.batches ?? []).filter(b => !b.archived_at || b.id === draft.batch).map(b => ({ value: b.id, label: b.name }))]} onChange={id => { update('batch', id); setDraft(value => value ? { ...value, room: context?.batches.find(b => b.id === id)?.room ?? value.room } : value); }} />
      {!batchDraft ? <Button title="Create a batch here" disabled={busy} onPress={() => setBatchDraft({ id: randomUUID(), name: '', room: '', fee: '' })} /> : <View style={s.card}>
        <Field label="New teaching batch name" value={batchDraft.name} disabled={busy} onChange={name => setBatchDraft(value => value ? { ...value, name } : value)} />
        <Text style={s.body}>No fee setup required. Your class details stay here.</Text>
        <Button title="Create batch and use for class" disabled={busy} onPress={() => { void createTeachingBatch(); }} />
        <Button title="Cancel new batch" disabled={busy} onPress={() => setBatchDraft(null)} />
      </View>}
      <Field label="Start date (YYYY-MM-DD)" value={draft.startDate} onChange={v => { setDraft(value => value ? { ...value, startDate: v, endDate: value.endDate === value.startDate ? v : value.endDate } : value); setDirty(true); }} disabled={busy} />
      <Field label="Start time (HH:MM, 24 hour)" value={draft.startTime} onChange={v => update('startTime', v)} disabled={busy} />
      <Field label="End time (HH:MM, 24 hour)" value={draft.endTime} onChange={v => update('endTime', v)} disabled={busy} />
      <Field label="Class room or location" value={draft.room} onChange={v => update('room', v)} disabled={busy} />
      <Button title={advanced ? 'Hide extra class settings' : 'More class settings'} disabled={busy} onPress={() => setAdvanced(value => !value)} />
      {advanced && <>
      <Field label="End date (YYYY-MM-DD)" value={draft.endDate} onChange={v => update('endDate', v)} disabled={busy} />
      <Text style={s.label}>Class status</Text>
      {(['scheduled', 'completed', 'cancelled'] as const).map(status => <Pressable key={status} accessibilityRole="radio" accessibilityLabel={`Class status ${status}`} accessibilityState={{ checked: draft.status === status, disabled: busy }} aria-checked={draft.status === status} disabled={busy} onPress={() => update('status', status)} style={[s.choice,draft.status===status&&s.selected]}><Text style={[s.choiceText,draft.status===status&&s.selectedText]}>{draft.status === status ? '●' : '○'} {status}</Text></Pressable>)}
      <Text style={s.body}>After attendance is recorded, class times are protected. Cancel the class and create a replacement to change its timing.</Text>
      </>}
      <Button title={busy ? 'Saving…' : 'Save class'} disabled={busy || !!batchDraft} onPress={() => { void saveSession(); }} />
      <Button title="Back to classes" disabled={busy} onPress={back} />
    </View> : active ? <View style={s.card}>
      <Text style={s.title}>{batchName(active.session.batch_id)}</Text><Text style={s.body}>{caption(active.session)}</Text>
      <ClassMediaPanel key={active.session.id} academy={academy.id} session={active.session.id} students={students} disabled={busy || !!conflict} onWorking={setBusy} />
      <Text style={s.body}>{active.local ? 'Unsent device draft' : 'Showing saved class attendance'} · {Object.keys(active.marks).length}/{students.length} marked</Text>
      {!students.length && <Text style={s.body}>No active students are enrolled for this class date.</Text>}
      <Button title="Mark all present" disabled={busy || !students.length || students.length > 500 || !!conflict} onPress={() => { void changeMarks(Object.fromEntries(students.map(student => [student.id, 'present']))); }} />
      {students.map(student => <View style={s.student} key={student.id}><Text style={s.title}>{student.name}</Text>
        <View style={s.row}>{(['present', 'late', 'absent'] as Mark[]).map(mark => <Pressable key={mark} accessibilityRole="radio" accessibilityLabel={`${student.name}: ${mark}`} accessibilityState={{ checked: active.marks[student.id] === mark, disabled: busy || !!conflict }} aria-checked={active.marks[student.id] === mark} disabled={busy || !!conflict} onPress={() => { void changeMarks({ ...active.marks, [student.id]: mark }); }} style={[s.choice,active.marks[student.id]===mark&&(mark==='present'?s.attendancePresent:mark==='late'?s.attendanceLate:s.attendanceAbsent)]}><Text style={[s.attendanceText,active.marks[student.id]===mark&&s.selectedText]}>{mark}</Text></Pressable>)}</View>
      </View>)}
      <Button title={busy ? 'Please wait…' : 'Save attendance to class'} disabled={busy || !students.length || !!conflict} onPress={() => { void submitAttendance(); }} />
      {onWriteFeedback&&<Button title="Write feedback for this class" disabled={busy||active.local||!!conflict||active.session.attendance_revision<1} onPress={()=>onWriteFeedback(active.session,students.filter(student=>active.saved[student.id]==='present'||active.saved[student.id]==='late').map(student=>student.id))} />}
      <Button title="Reopen saved attendance" disabled={busy} onPress={() => { void openAttendance(active.session); }} />
      <Button title="Back to classes" disabled={busy || !!conflict} onPress={back} />
    </View> : <>
      <View style={s.card}><Field label="Class date (YYYY-MM-DD)" value={date} onChange={setDate} disabled={loading || busy} />
        <Button title="Show date" disabled={loading || busy} onPress={() => {
          try { classValues({ id: '', batch: 'date-check', startDate: date, startTime: '12:00', endDate: date, endTime: '13:00', room: '', status: 'scheduled' }, academy.timezone); setSelectedDate(date); if (date === selectedDate) void reload(); }
          catch (failure) { setError(failure instanceof Error ? failure.message : 'Check the date.'); }
        }} />
        <Button title="Create a class" disabled={!context || loading || busy} onPress={() => edit()} />
        <Field label={`Note to families (optional, up to ${NOTE_LIMIT} characters)`} value={familyNote} onChange={v => setFamilyNote(v.slice(0, NOTE_LIMIT))} disabled={loading || busy} />
        <Button title="Mark this day as a holiday" disabled={!context || loading || busy} onPress={() => setHolidayAsk(true)} />
        <Button title="Refresh classes" disabled={loading || busy} onPress={() => { setNotice(''); void reload().then(ok => { if (ok) setNotice('Classes refreshed.', { kind: 'success', title: 'Refresh complete' }); }); }} />
      </View>
      {unsent.length > 0 && <View style={s.card}><Text style={s.title}>Families have not been told yet</Text><Text style={s.body}>The schedule change is saved, but {unsent.length} {unsent.length === 1 ? 'notice' : 'notices'} could not be sent.</Text>
        <Button title="Send notice to families" disabled={busy} onPress={() => { void (async () => { setBusy(true); const failed = await sendNotices(unsent); setBusy(false); if (!failed.length) setNotice('Families notified.', { kind: 'success', title: 'Notice sent' }); })(); }} /></View>}
      {loading && <ActivityIndicator accessibilityLabel="Loading classes" />}
      {deviceDraft && <View style={s.card}><Text style={s.title}>Attendance draft on this device</Text><Text style={s.body}>Reconnect to verify the class and resume your unsent work. Nothing is sent automatically.</Text><Button title="Resume attendance draft" disabled={busy || loading} onPress={() => { void resumeDraft(); }} /><Button title="Discard saved attendance draft" disabled={busy} onPress={() => setDiscardStored(true)} /></View>}
      {context && !loading && !context.sessions.length && <Text style={s.body}>No classes scheduled for {selectedDate}.</Text>}
      {context?.sessions.map(session => <View style={s.card} key={session.id}>
        <Text style={s.title}>{batchName(session.batch_id)}</Text><Text style={s.body}>{caption(session)} · {session.status}</Text><Text style={s.body}>{session.room || 'Location not set'}</Text>
        <Button title={`Attendance for ${batchName(session.batch_id)} at ${localParts(session.starts_at, academy.timezone).time}`} disabled={busy || loading || session.status === 'cancelled'} onPress={() => { void openAttendance(session); }} />
        <Button title={`Edit class ${batchName(session.batch_id)} at ${localParts(session.starts_at, academy.timezone).time}`} disabled={busy || loading} onPress={() => edit(session)} />
        {canRemindClass(session, new Date()) && <Button title={`Remind families about ${batchName(session.batch_id)} at ${localParts(session.starts_at, academy.timezone).time}`} disabled={busy || loading} onPress={() => { void remind(session); }} />}
        {canRestore(session) && <Button title={`Restore class ${batchName(session.batch_id)} at ${localParts(session.starts_at, academy.timezone).time}`} disabled={busy || loading} onPress={() => { void setStatus([session], 'scheduled', 'Class restored.'); }} />}
      </View>)}
    </>}
    <ConfirmDialog visible={holidayAsk} title="Mark this day as a holiday?" message={holidayMessage(holidayTargets(context?.sessions ?? []).length)} confirmLabel="Cancel classes" cancelLabel="Keep classes" onConfirm={() => { setHolidayAsk(false); const targets = holidayTargets(context?.sessions ?? []); if (targets.length) void setStatus(targets, 'cancelled', `Holiday set: ${targets.length} ${targets.length === 1 ? 'class' : 'classes'} cancelled.`, true); }} onCancel={() => setHolidayAsk(false)} />
    <ConfirmDialog visible={discard} title="Leave your unsaved edits?" message="Edits that could not be saved on this device will be lost. Previously saved device drafts are retained." confirmLabel="Leave this form" cancelLabel="Keep editing" onCancel={() => setDiscard(false)} onConfirm={() => { close(); void reload(); }} />
    <ConfirmDialog visible={discardStored} title="Discard the device draft?" message="This removes unsent attendance from this device. Attendance already saved to the class is retained." confirmLabel="Discard device draft" cancelLabel="Keep draft" onCancel={() => setDiscardStored(false)} onConfirm={() => { void discardDeviceDraft(); }} />
    <ConfirmDialog visible={!!replaceWith} title="Another class has an unsent draft" message="Keep that draft and resume it from the class list, or discard it before opening this class." confirmLabel="Discard old draft and continue" cancelLabel="Keep old draft" onCancel={() => setReplaceWith(null)} onConfirm={() => {
      const next = replaceWith; setReplaceWith(null);
      if (next) void openAttendance({ id: next }, true);
    }} />
    <ConfirmDialog visible={!!conflict} title="The saved class or attendance changed" message="Keep the server records, or review the device draft against the latest class. Nothing is overwritten until you explicitly save." confirmLabel="Review device draft" cancelLabel="Use server records" onCancel={() => {
      setConflict(null); setNotice('Showing the server records. The old device draft is retained until you discard it or save a replacement.');
    }} onConfirm={() => { if (active && conflict) { const marks = visibleMarks(active.session, conflict.marks); setConflict(null); void changeMarks(marks); } }} />
  </View>;
}
const s = StyleSheet.create({
  root:{gap:16},kicker:{color:c.sky,fontSize:10,fontWeight:'800',letterSpacing:1.5},
  heading:{color:c.text,fontSize:30,lineHeight:31.5,letterSpacing:-1.2,fontWeight:'700'},title:{color:c.text,fontSize:15.5,fontWeight:'700',letterSpacing:-0.2},
  body:{color:c.muted,fontSize:13,lineHeight:20},label:{color:c.muted,fontSize:12,fontWeight:prototypeWeight(750)},
  card:{padding:14,borderRadius:18,backgroundColor:c.surface,borderColor:c.border,borderWidth:1,gap:14},
  field:{gap:7},input:{paddingHorizontal:11,paddingVertical:10,minHeight:44,borderWidth:1,borderColor:c.border,borderRadius:12,color:c.text,fontSize:13,backgroundColor:c.raised},
  button:{paddingVertical:13,paddingHorizontal:16,minHeight:44,borderRadius:14,backgroundColor:c.white,alignItems:'center'},buttonText:{color:c.black,fontSize:13.5,fontWeight:'800'},
  disabled:{opacity:0.5},row:{flexDirection:'row',flexWrap:'wrap',gap:6},choice:{paddingHorizontal:11,paddingVertical:9,minHeight:44,borderRadius:11,borderWidth:1,borderColor:c.outline,backgroundColor:c.raised,justifyContent:'center'},
  choiceText:{fontSize:11.5,fontWeight:'800',color:c.text},attendanceText:{fontSize:12,fontWeight:prototypeWeight(850),color:c.text},selected:{backgroundColor:c.white,borderColor:c.white},selectedText:{color:c.black},attendancePresent:{backgroundColor:c.mint,borderColor:c.mint},attendanceLate:{backgroundColor:c.sun,borderColor:c.sun},attendanceAbsent:{backgroundColor:c.rose,borderColor:c.rose},student:{paddingVertical:12,gap:10,borderTopWidth:1,borderTopColor:c.border},
  notice:{padding:12,color:c.sky,backgroundColor:c.raised,lineHeight:20,fontSize:13,borderRadius:12},error:{padding:12,color:c.rose,backgroundColor:c.raised,lineHeight:20,fontSize:13,borderRadius:12},
});
