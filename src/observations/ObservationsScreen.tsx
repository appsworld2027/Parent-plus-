import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../ui/Typography';
import * as Crypto from 'expo-crypto';
import type { Academy } from '../auth/AuthProvider';
import type { ClassSession } from '../classes/model';
import { localParts } from '../classes/model';
import { ParentModuleReview } from './ParentModuleReview';
import { WhatsAppReview } from './WhatsAppReview';
import { PhotoControl } from '../photos/PhotoControl';
import { SelectField } from '../ui/SelectField';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useFeedbackMessage } from '../ui/ActionFeedback';
import { observationDrafts } from './localDrafts';
import { eligibleRecipients, fromObservation, sameObservation, validateObservation } from './model';
import type { DeviceObservation, Observation, ObservationContext, ObservationDraft, ObservationVersion } from './model';
import { getObservation, listObservations, loadObservationContext, observationFailure, saveObservation } from './service';

const emptyContext: ObservationContext = { batches: [], students: [], enrolments: [], sessions: [] };
function Button({ title, action, disabled = false, soft = false }: { title: string; action: () => void; disabled?: boolean; soft?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={[s.button, soft && s.soft, disabled && s.disabled]}><Text style={[s.buttonText, soft && s.ink]}>{title}</Text></Pressable>;
}

// A single device draft prevents accidental silent replacement. Each save carries
// its own UUID and revision, so a lost response can be retried without duplication.
export function ObservationsScreen({ academy, owner, initialClass, onLaunchHandled, onDirtyChange, onBusyChange, onViewChange }: {
  academy: Academy; owner: string; initialClass?: {session:ClassSession;students:string[]}|null; onLaunchHandled?:()=>void; onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void; onViewChange: () => void;
}) {
  const [context, setContext] = useState(emptyContext);
  const [history, setHistory] = useState<Observation[]>([]);
  const [more, setMore] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [parentBusy, setParentBusy] = useState(false);
  const [, publish] = useFeedbackMessage('error', 'Observation needs attention');
  const [draft, setDraft] = useState<ObservationDraft | null>(null);
  const [versions, setVersions] = useState<ObservationVersion[]>([]);
  const [stored, setStored] = useState<DeviceObservation | null>(null);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [localState, setLocalState] = useState('');
  const [pending, setPending] = useState<'widen' | 'discard' | null>(null);
  const [conflict, setConflict] = useState<ObservationDraft | null>(null);
  const mounted = useRef(true);
  const writer = useRef(observationDrafts.token());
  const current = useRef<DeviceObservation | null>(null);
  const persisted = useRef('');
  const [dirty, setDirty] = useState(false);
  const request = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function snapshot(value: ObservationDraft): DeviceObservation {
    return { version: 1, owner, academy: academy.id, savedAt: new Date().toISOString(), draft: value };
  }
  function edit(value: ObservationDraft) {
    publish(''); // Clear a previous outcome without dismissing the typing keyboard.
    const next = snapshot(value);
    current.current = next; setDraft(value); setDirty(true); setLocalState('Saving draft on this device…');
  }
  async function persist(value: DeviceObservation) {
    let result: 'saved' | 'superseded';
    try { result = await observationDrafts.save(value, writer.current); }
    catch {
      if (mounted.current && current.current === value) setLocalState('Device save failed. Keep this screen open and retry saving.');
      throw { code: 'DEVICE_DRAFT_FAILURE' };
    }
    if (mounted.current && result === 'saved') {
      setStored(value); persisted.current = JSON.stringify(value);
      if (current.current === value) { setDirty(false); setLocalState('Draft saved on this device. Not yet saved to your workspace.'); }
    }
  }
  async function refresh(append = false) {
    const [nextContext, page] = await Promise.all([loadObservationContext(academy.id), listObservations(academy.id, append ? history.at(-1) : undefined)]);
    if (!mounted.current) return;
    setContext(nextContext); setHistory(previous => append ? [...previous, ...page.observations.filter(row => !previous.some(old => old.id === row.id))] : page.observations);
    setMore(page.more); setReady(true);
  }
  useEffect(() => {
    mounted.current = true;
    setBusy(true);
    void (async () => {
      try {
        const saved = await observationDrafts.read();
        if (!mounted.current) return;
        if (saved && (saved.owner !== owner || saved.academy !== academy.id)) {
          // A draft from a different identity is never displayed or resumed.
          await observationDrafts.clear(); writer.current = observationDrafts.token();
        } else setStored(saved);
      } catch { if (mounted.current) { setStorageBlocked(true); publish('Your saved device draft could not be read. Retry or explicitly discard it before starting another note.'); } }
      try { await refresh(); }
      catch (error) { if (mounted.current) publish(observationFailure(error, 'Observations could not load. Check your connection and retry.')); }
      finally { if (mounted.current) setBusy(false); }
    })();
    return () => { mounted.current = false; onDirtyChange(false); onBusyChange(false); };
  }, [academy.id, owner]);
  useEffect(()=>{
    if(!ready||busy||!initialClass)return;
    onLaunchHandled?.();
    if(stored||storageBlocked||draft){publish('Resume or remove your existing device feedback draft first. Your class attendance is saved; no draft was replaced.');return;}
    const next=context.sessions.some(value=>value.id===initialClass.session.id)?context:{...context,sessions:[initialClass.session,...context.sessions]};
    setContext(next);
    const eligible=new Set(eligibleRecipients(next,initialClass.session.batch_id,initialClass.session.id,academy.timezone).map(student=>student.id));
    open({id:Crypto.randomUUID(),batch:initialClass.session.batch_id,session:initialClass.session.id,audience:'batch',recipients:initialClass.students.filter(id=>eligible.has(id)),note:'',revision:0,status:'draft'});
  },[ready,busy,initialClass,stored,storageBlocked]);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange(busy || photoBusy || parentBusy); }, [busy, photoBusy, parentBusy, onBusyChange]);
  useEffect(() => {
    if (busy || !dirty || !current.current) return;
    const value = current.current;
    timer.current = setTimeout(() => { void persist(value).catch(() => {
      if (mounted.current && current.current === value) setLocalState('Device save failed. Keep this screen open and retry saving.');
    }); }, 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [draft, dirty, busy]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      const value = current.current;
      if (state !== 'active' && value && JSON.stringify(value) !== persisted.current) void persist(value).catch(() => {
        if (mounted.current) setLocalState('Device save failed. Keep this screen open and retry saving.');
      });
    });
    return () => subscription.remove();
  }, []);

  async function run(operation: () => Promise<void>) {
    if (request.current) return;
    if (timer.current) clearTimeout(timer.current);
    request.current = true; setBusy(true); publish('');
    try { await operation(); }
    catch (error) { if (mounted.current) publish(observationFailure(error, 'The action could not be confirmed. Your device draft is retained. Check your connection and retry.')); }
    finally { request.current = false; if (mounted.current) setBusy(false); }
  }
  function open(value: ObservationDraft, recent: ObservationVersion[] = []) {
    setDraft(value); current.current = null; setDirty(false); setLocalState(''); setVersions(recent); setConflict(null); onViewChange();
  }
  function create() {
    if (stored || storageBlocked) { publish('Resume or explicitly discard the saved device draft before starting another observation.'); return; }
    open({ id: Crypto.randomUUID(), batch: '', session: '', audience: 'student', recipients: [], note: '', revision: 0, status: 'draft' });
  }
  async function resume() {
    if (!stored) return;
    const result = await getObservation(academy.id, stored.draft.id);
    if (!mounted.current) return;
    if (result.observation) {
      const remote = fromObservation(result.observation, result.recipients);
      if (sameObservation(remote, stored.draft)) {
        await observationDrafts.clear(stored); setStored(null); open(remote, result.versions);
        publish(`This observation is already ${remote.status === 'recorded' ? 'recorded' : 'saved as a draft'} in your workspace.`, { kind: 'success', title: 'Workspace verified' }); return;
      }
      if (remote.revision !== stored.draft.revision) { setConflict(remote); return; }
    } else if (stored.draft.revision > 0) {
      publish('The saved observation was not found in your workspace. Your device draft is retained. Retry or copy it into a new draft.');
      setConflict({ ...stored.draft, note: '[Observation not found on server]' }); return;
    }
    const value = stored;
    // Requested 'recorded' in a device snapshot is not proof the server accepted
    // it. Restore editable draft scope unless the server actually recorded it.
    const restored = { ...value.draft, status: result.observation?.status ?? 'draft' as const };
    open(restored, result.versions); current.current = snapshot(restored); persisted.current = JSON.stringify(value);
    setLocalState('Restored from this device. Not yet saved to your workspace.');
  }
  function changeScope(batch: string, session: string, audience = draft!.audience) {
    if (!draft || draft.status === 'recorded') return;
    const eligible = eligibleRecipients(context, batch, session, academy.timezone);
    edit({ ...draft, batch, session, audience, recipients: audience === 'batch' ? eligible.map(student => student.id) : [] });
  }
  async function save(record: boolean) {
    if (!draft) return;
    const invalid = validateObservation(draft, record);
    if (invalid) { publish(invalid); return; }
    // Persist the exact requested status before the network call. If the response
    // is lost, resume compares it with the server rather than recording twice.
    const value = snapshot({ ...draft, status: record || draft.status === 'recorded' ? 'recorded' : 'draft' });
    current.current = value;
    await persist(value);
    const result = await saveObservation(academy.id, value.draft, value.draft.status);
    if (!mounted.current) return;
    open(fromObservation(result, value.draft.recipients));
    let cleanupFailed = false;
    try { await observationDrafts.clear(value); setStored(null); }
    catch { cleanupFailed = true; }
    publish(`${result.status === 'recorded' ? 'Observation recorded' : 'Draft saved'} in your workspace. No parent message was sent.${cleanupFailed ? ' The device copy could not be removed; resume it later to verify the saved version.' : ''}`, { kind: 'success', title: result.status === 'recorded' ? 'Recorded' : 'Draft saved' });
    // A refresh failure must never turn a confirmed write into a failed-save claim.
    try { await refresh(); const detail = await getObservation(academy.id, result.id); if (mounted.current) setVersions(detail.versions); }
    catch { if (mounted.current) setLocalState('Saved to workspace. History could not refresh; retry Refresh observations.'); }
  }
  async function discard() {
    // Unconditional clear invalidates delayed writers, including a pending debounce.
    await observationDrafts.clear(); writer.current = observationDrafts.token();
    if (!mounted.current) return;
    current.current = null; setStored(null); setStorageBlocked(false); setDraft(null); setDirty(false); setConflict(null); setLocalState('');
    publish('Device draft removed. Workspace observations are unchanged.', { kind: 'info', title: 'Device draft removed' });
  }
  const eligible = draft ? eligibleRecipients(context, draft.batch, draft.session, academy.timezone) : [];
  const names = (ids: string[]) => ids.map(id => context.students.find(student => student.id === id)?.name ?? 'Student no longer available').join(', ');
  const disabled = busy || photoBusy || parentBusy || storageBlocked;

  return <View style={s.stack} pointerEvents={photoBusy?'none':'auto'}>
    <Text accessibilityRole="header" style={s.heading}>Feedback for parents</Text>
    <Text style={s.body}>Write feedback, save it for your students, then review and share it to the Parent app or WhatsApp.</Text>
    {!draft && <>
      <Button title="Refresh observations" disabled={busy} soft action={() => { void run(async () => { await refresh(); publish('Observations refreshed.', { kind: 'success', title: 'Refreshed' }); }); }} />
      {(stored || storageBlocked) && <View style={s.card}>
        <Text style={s.title}>Observation draft on this device</Text>
        <Text style={s.body}>Resume your unsent work or explicitly remove the device copy.</Text>
        {stored && <Button title="Resume observation draft" disabled={busy || !ready} action={() => { void run(resume); }} />}
        <Button title="Discard device observation draft" soft disabled={busy || parentBusy} action={() => setPending('discard')} />
      </View>}
      <Button title="Write feedback" disabled={disabled || !ready || !!stored} action={create} />
      <Text style={s.title}>Workspace history</Text>
      {ready && !history.length && <Text style={s.body}>No observations saved yet.</Text>}
      {history.map(row => <View key={row.id} style={s.card}>
        <Text style={s.title}>{context.batches.find(batch => batch.id === row.batch_id)?.name ?? 'Batch'} · {row.status}</Text>
        <Text style={s.body}>{localParts(row.created_at, academy.timezone).date} · {row.audience === 'student' ? 'Individual' : 'Batch'} · revision {row.revision}</Text>
        <Text numberOfLines={3} style={s.body}>{row.note || 'No text yet'}</Text>
        <Button title={`Open ${row.status} observation`} soft disabled={disabled || !!stored} action={() => { void run(async () => {
          const detail = await getObservation(academy.id, row.id);
          if (!detail.observation) throw new Error('Observation unavailable');
          if (mounted.current) open(fromObservation(detail.observation, detail.recipients), detail.versions);
        }); }} />
      </View>)}
      {more && <Button title="Load older observations" soft disabled={busy} action={() => { void run(() => refresh(true)); }} />}
    </>}
    {conflict && stored && <View style={s.card}>
      <Text style={s.title}>Compare before continuing</Text>
      <Text style={s.body}>The server revision differs from this device. Neither copy has been overwritten.</Text>
      <Text style={s.title}>Workspace text</Text><Text selectable style={s.body}>{conflict.note}</Text>
      <Text style={s.title}>Device text</Text><Text selectable style={s.body}>{stored.draft.note}</Text>
      <Button title="Copy device text to a new draft" disabled={busy} action={() => { void run(async () => {
        const copied = { ...stored.draft, id: Crypto.randomUUID(), revision: 0, status: 'draft' as const };
        const value = snapshot(copied); await persist(value); if (mounted.current) { open(copied); current.current = value; setLocalState('Copied to a new device draft. Review students before recording.'); }
      }); }} />
      <Button title="Keep both copies and close comparison" soft action={() => setConflict(null)} />
    </View>}
    {draft && <View style={s.card}>
      <Text style={s.title}>{draft.status === 'recorded' ? 'Edit recorded text' : 'Observation draft'}</Text>
      <Text style={s.body}>{draft.status === 'recorded' ? 'The recorded student list and original recording time stay fixed.' : 'Choose a batch and review exactly which students this note belongs to.'}</Text>
      {draft.status === 'draft' ? <>
        <Text style={s.title}>Audience</Text>
        <Button title={`Individual student${draft.audience === 'student' ? ' · selected' : ''}`} soft disabled={disabled} action={() => { if (draft.audience !== 'student') changeScope(draft.batch, draft.session, 'student'); }} />
        <Button title={`Batch students${draft.audience === 'batch' ? ' · selected' : ''}`} soft disabled={disabled} action={() => {
          if (draft.audience !== 'batch') { if (draft.note.trim()) setPending('widen'); else changeScope(draft.batch, draft.session, 'batch'); }
        }} />
        <SelectField label="Feedback batch" value={draft.batch} disabled={disabled} options={[{value:'',label:'Choose a batch'},...context.batches.filter(batch=>!batch.archived_at||batch.id===draft.batch).map(batch=>({value:batch.id,label:batch.name}))]} onChange={id=>{if(id!==draft.batch)changeScope(id,'');}} />
        {!context.batches.some(batch => !batch.archived_at) && <Text style={s.body}>Create an active batch and enrol students in Students first.</Text>}
        {!!draft.batch && <>
          <SelectField label="Linked class (optional)" value={draft.session} disabled={disabled} options={[{value:'',label:'No linked class'},...context.sessions.filter(value=>value.batch_id===draft.batch&&value.status!=='cancelled').map(value=>{const date=localParts(value.starts_at,academy.timezone);return {value:value.id,label:`${date.date} ${date.time}`};})]} onChange={id=>{if(id!==draft.session)changeScope(draft.batch,id);}} />
          {draft.audience === 'student' ? <SelectField label="Student for this feedback" value={draft.recipients[0]??''} disabled={disabled} options={[{value:'',label:'Choose a student'},...eligible.map(student=>({value:student.id,label:student.name}))]} onChange={id=>edit({...draft,recipients:id?[id]:[]})} /> : <>
            <Text style={s.title}>Students for this feedback</Text>
            {eligible.map(student => <Button key={student.id} title={`${student.name}${draft.recipients.includes(student.id) ? ' · selected' : ''}`} soft disabled={disabled} action={() => edit({ ...draft, recipients: draft.recipients.includes(student.id) ? draft.recipients.filter(id => id !== student.id) : [...draft.recipients, student.id] })} />)}
          </>}
          {!eligible.length && <Text style={s.body}>No eligible students. Check batch enrolments and the class date.</Text>}
        </>}
      </> : <Text style={s.body}>Batch: {context.batches.find(batch => batch.id === draft.batch)?.name ?? 'Unavailable'}</Text>}
      <Text style={s.title}>Selected students: {draft.recipients.length}</Text><Text style={s.body}>{names(draft.recipients) || 'None selected'}</Text>
      <Text style={s.title}>Observation text</Text>
      <TextInput accessibilityLabel="Observation text" multiline maxLength={10000} editable={!disabled} value={draft.note} onChangeText={note => edit({ ...draft, note })} style={s.input} />
      <Text style={s.body}>{draft.note.length}/10,000 characters</Text>
      <PhotoControl key={`photo:${draft.id}`} academy={academy.id} kind="observation" id={draft.id} exists={draft.revision>0} disabled={busy||storageBlocked} locked={true} onWorking={setPhotoBusy}
        beforeUpload={async()=>{const invalid=validateObservation(draft,false);if(invalid){publish(invalid);throw new Error('Choose a batch first');}if(request.current)throw new Error('Save in progress');request.current=true;try{await save(false);}finally{request.current=false;}}} />
      <Text style={s.body}>For new class photos and videos, record guardian permission and capture/upload from the class attendance screen. Link that class here to review media for the Parent module. Older attached photos remain private and unchanged.</Text>
      {!!localState && <Text style={s.body}>{localState}</Text>}
      {dirty && <Button title="Retry device save" soft disabled={busy} action={() => { const value = current.current; if (value) void run(() => persist(value)); }} />}
      {draft.status === 'draft' && <Button title="Save draft to workspace" disabled={disabled} action={() => { void run(() => save(false)); }} />}
      {draft.status === 'draft' && <Text style={s.body}>Saving fixes the class and selected students for this note. Review and share with parents after saving.</Text>}
      <Button title={draft.status === 'recorded' ? 'Save feedback changes' : 'Save feedback'} disabled={disabled} action={() => {
        void run(() => save(true));
      }} />
      {draft.status === 'recorded' && <WhatsAppReview key={`whatsapp:${draft.id}`} academy={academy.id} academyName={academy.name} observation={draft.id} revision={draft.revision} disabled={disabled || dirty || draft.note !== versions[0]?.note} />}
      {draft.status === 'recorded' && <ParentModuleReview key={`parent:${draft.id}`} academy={academy.id} observation={draft.id} revision={draft.revision} disabled={busy || photoBusy || storageBlocked || dirty || draft.note !== versions[0]?.note} onWorking={setParentBusy} />}
      <Button title="Back to feedback history" soft disabled={busy || parentBusy} action={() => { void run(async () => {
        if (current.current) await persist(current.current); setDraft(null); setVersions([]); onViewChange();
      }); }} />
      {(stored || dirty) && <Button title="Discard device observation draft" soft disabled={busy || parentBusy} action={() => setPending('discard')} />}
      {!!versions.length && <View style={s.stack} pointerEvents={photoBusy?'none':'auto'}><Text style={s.title}>Recent saved versions (up to 5)</Text>{versions.map(version => <View key={version.revision} style={s.version}>
        <Text style={s.body}>Revision {version.revision} · {version.status} · {localParts(version.saved_at, academy.timezone).date}</Text><Text selectable style={s.body}>{version.note || 'No text'}</Text>
      </View>)}</View>}
    </View>}
    <ConfirmDialog visible={pending !== null} title={pending === 'widen' ? 'Change to a batch observation?' : 'Remove this device draft?'}
      message={pending === 'widen' ? 'This replaces the individual student selection with eligible students in the chosen batch. Review every selected student before recording.' : 'The unsent device copy will be removed. Workspace observations and their history are kept.'}
      confirmLabel={pending === 'widen' ? 'Change and review students' : 'Remove device draft'} cancelLabel="Keep editing" onCancel={() => setPending(null)} onConfirm={() => {
        const action = pending; setPending(null);
        if (action === 'widen' && draft) changeScope(draft.batch, draft.session, 'batch');
        else if (action === 'discard') void run(discard);
      }} />
  </View>;
}
const s = StyleSheet.create({
  stack: { gap: 16 }, heading: { fontSize: 32, fontWeight: '700', color: '#22303A' }, title: { fontSize: 17, fontWeight: '700', color: '#22303A' },
  body: { color: '#5C6B73', fontSize: 14, lineHeight: 22 }, card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14, borderWidth: 1, borderColor: '#E3E8E2' },
  button: { minHeight: 48, padding: 15, borderRadius: 13, backgroundColor: '#1F6F6B', alignItems: 'center', justifyContent: 'center' },
  soft: { backgroundColor: '#EDF1EC' }, buttonText: { fontSize: 14, color: '#fff', fontWeight: '600' }, ink: { color: '#22303A' }, disabled: { opacity: 0.5 },
  input: { minHeight: 160, borderWidth: 1, borderColor: '#CCD4CF', borderRadius: 12, padding: 14, color: '#22303A', backgroundColor: '#FAFAF8', textAlignVertical: 'top', fontSize: 16 },
  version: { borderTopWidth: 1, borderTopColor: '#E3E8E2', paddingTop: 12, gap: 6 },
});
