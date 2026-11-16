import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { Batch, BatchDraft, Roster, Student, StudentDraft, Proficiency } from './model';
import { formatFee, parseFee, validateStudent, batchStudents, proficiencyLabels } from './model';
import { addBatchStudents, archiveStudent, loadRoster, rosterFailure, saveBatch, saveStudent } from './service';
import { studentPhotoThumbnails } from '../photos/service';
import { ScanRosterScreen, type SavedRosterImport } from '../onboarding/ScanRosterScreen';
import { PhotoControl } from '../photos/PhotoControl';
import { localParts } from '../classes/model';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useFeedbackMessage } from '../ui/ActionFeedback';

function Button({ label, onPress, soft = false, disabled = false }: { label: string; onPress: () => void; soft?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[s.button, soft && s.soft, disabled && { opacity: 0.5 }]}><Text style={[s.buttonText, soft && s.softText]}>{label}</Text></Pressable>;
}
function Field({ label, value, onChange, disabled, kind = 'text', max = 100 }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; kind?: 'text' | 'email' | 'phone' | 'number' | 'money'; max?: number }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
    editable={!disabled} maxLength={max} autoCorrect={false} autoCapitalize={kind === 'email' ? 'none' : 'words'}
    keyboardType={kind === 'email' ? 'email-address' : kind === 'phone' ? 'phone-pad' : kind === 'number' ? 'number-pad' : kind === 'money' ? 'decimal-pad' : 'default'} style={s.input} /></View>;
}

export function RosterScreen({ academy, timezone = 'Asia/Kolkata', startWithScan = false, onLaunchHandled, onDirtyChange, onBusyChange, onViewChange }: { academy: string; timezone?: string; startWithScan?: boolean; onLaunchHandled?: () => void; onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void; onViewChange: () => void }) {
  const [scanOpen,setScanOpen]=useState(startWithScan);
  const [tab, setTab] = useState<'students' | 'batches'>('students');
  const [photoUrls,setPhotoUrls]=useState<Record<string,string>>({});
  const [data, setData] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const working = busy || photoBusy;
  const [error, setError] = useFeedbackMessage('error', 'Action needs attention');
  const [notice, setNotice] = useFeedbackMessage('success', 'Saved to your workspace');
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [studentDraft, setStudentDraft] = useState<StudentDraft | null>(null);
  const [batchDraft, setBatchDraft] = useState<BatchDraft | null>(null);
  const [profileId,setProfileId]=useState<string|null>(null);
  const [profileAddBatch,setProfileAddBatch]=useState(false);
  const [activeBatch, setActiveBatch] = useState<string | null>(null);
  const [addingMembers, setAddingMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const writeLock = useRef(false);
  const today = localParts(new Date().toISOString(), timezone).date;
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Student | null>(null);
  // Ignore stale responses after another reload or unmount. This avoids restoring
  // old roster data over a newer save; it does not cancel the network requests.
  const loadVersion = useRef(0);

  const reload = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true); setError('');
    try { const result = await loadRoster(academy); if (loadVersion.current === version) { setData(result); return result; } return null; }
    catch (failure) { if (loadVersion.current === version) setError(rosterFailure(failure, 'Your roster could not be loaded. Check the connection and retry.')); return null; }
    finally { if (loadVersion.current === version) setLoading(false); }
  }, [academy]);
  useEffect(()=>{if(startWithScan){setScanOpen(true);onLaunchHandled?.();}},[startWithScan,onLaunchHandled]);
  useEffect(() => { void reload(); return () => { loadVersion.current++; }; }, [reload]);
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange(working); return () => onBusyChange(false); }, [working, onBusyChange]);
  useEffect(onViewChange, [studentDraft?.id, batchDraft?.id, tab, onViewChange]);

  useEffect(()=>{let active=true;setPhotoUrls({});if(data)void studentPhotoThumbnails(academy).then(urls=>{if(active)setPhotoUrls(urls);}).catch(()=>undefined);return()=>{active=false;};},[academy,data]);
  const batches = data?.batches.filter(b => !b.archived_at) ?? [];
  const existingEnrolments = (student: string) => data?.enrolments.filter(e => e.student_id === student).map(e => e.batch_id) ?? [];
  function editStudent(student?: Student, batch?: string) {
    if (!data) return;
    const contact = data.contacts.find(c => c.student_id === student?.id);
    // Allocate an ID once per opened form, not on each Save press. A lost-response
    // retry must address the same student so the server can avoid duplicates.
    setStudentDraft({ id: student?.id ?? randomUUID(), name: student?.name ?? '', age: student?.age_years?.toString() ?? '',
      proficiency: student?.proficiency_level ?? 'unassessed', guardian: contact?.name ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '', batches: student ? existingEnrolments(student.id) : batch ? [batch] : [] });
    setDirty(false); setError(''); setNotice(''); setArchiveTarget(null);
  }
  function editBatch(batch?: Batch) {
    setBatchDraft({ id: batch?.id ?? randomUUID(), name: batch?.name ?? '', room: batch?.room ?? '', fee: batch ? (batch.monthly_fee_paise / 100).toFixed(2) : '' });
    setDirty(!!studentDraft); setError(''); setNotice(''); setArchiveTarget(null);
  }
  function close() {
    if (batchDraft && studentDraft) { setBatchDraft(null); setDirty(true); }
    else { setStudentDraft(null); setBatchDraft(null); setAddingMembers(false); setSelectedMembers([]); setDirty(false); }
    setDiscard(false); setError('');
  }
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
    if (writeLock.current) return;
    const invalid = batchDraft
      ? !batchDraft.name.trim() ? 'Enter a batch name.' : parseFee(batchDraft.fee) === null ? 'Enter a monthly fee in rupees, with up to two decimal places.' : null : studentDraft ? validateStudent(studentDraft) : 'Open a record first.';
    if (invalid) { setError(invalid); onViewChange(); return; }
    writeLock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (batchDraft) {
        await saveBatch(academy, batchDraft);
        if (studentDraft) {
          setStudentDraft(value => value ? { ...value, batches: [...new Set([...value.batches, batchDraft.id])] } : value);
          setBatchDraft(null); setDirty(true);
          setNotice('Batch created and selected. Save the student to finish.');
        } else { close(); setNotice('Batch saved.'); }
      } else if (studentDraft) { await saveStudent(academy, studentDraft); close(); setNotice('Student saved.'); }
      await reload();
    } catch (failure) { setError(rosterFailure(failure, 'The save could not be confirmed. Your entries are still here. Retry safely.')); onViewChange(); }
    finally { writeLock.current = false; setBusy(false); }
  }
  async function saveBeforePhoto() {
    if (!studentDraft || writeLock.current) throw new Error('Student unavailable');
    const invalid=validateStudent(studentDraft);if(invalid){setError(invalid);throw new Error('Complete the student fields first');}
    writeLock.current=true;
    try {await saveStudent(academy,studentDraft);await reload();setDirty(false);setNotice('Student details saved.');}
    finally {writeLock.current=false;}
  }
  async function confirmArchive() {
    if (!archiveTarget || busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await archiveStudent(archiveTarget.id); setArchiveTarget(null); setNotice('Student archived. Their history has been retained.'); await reload(); }
    catch (failure) { setArchiveTarget(null); setError(rosterFailure(failure, 'Archiving could not be confirmed. Retry safely.')); }
    finally { writeLock.current = false; setBusy(false); }
  }

  async function saveMembers() {
    if (!activeBatch || !selectedMembers.length || writeLock.current) return;
    writeLock.current = true; setBusy(true); setError('');
    try { await addBatchStudents(academy, activeBatch, selectedMembers); setSelectedMembers([]); setAddingMembers(false); setDirty(false); await reload(); setNotice('Students added to this batch.'); }
    catch (failure) { setError(rosterFailure(failure, 'Adding students could not be confirmed. Your selection is retained; retry safely.')); }
    finally { writeLock.current = false; setBusy(false); }
  }
  const profile = data?.students.find(student=>student.id===profileId);
  const profileBatches = profile ? data?.enrolments.filter(e=>e.student_id===profile.id&&e.starts_on<=today&&(!e.ends_on||e.ends_on>=today)).map(e=>data.batches.find(b=>b.id===e.batch_id)).filter((b):b is Batch=>!!b)??[] : [];
  const selectedBatch = data?.batches.find(batch => batch.id === activeBatch);
  const members = data && activeBatch ? batchStudents(data, activeBatch, today) : [];
  const heading = batchDraft ? (studentDraft ? 'Create a batch for this student' : data?.batches.some(x => x.id === batchDraft.id) ? 'Edit batch' : 'Create a batch') : studentDraft ? (data?.students.some(x => x.id === studentDraft.id) ? 'Edit student' : 'Add a student')
    : profile ? profile.name : selectedBatch ? selectedBatch.name : tab === 'students' ? 'Your students' : 'Your batches';
  const list = data?.students.filter(student => (!!student.archived_at === showArchived) && student.name.toLowerCase().includes(search.toLowerCase())
    && (batchFilter === 'all' || data.enrolments.some(e => e.student_id === student.id && e.batch_id === batchFilter))) ?? [];
  async function refreshImported(result:SavedRosterImport){
    const fresh=await reload();setStudentDraft(null);setDirty(false);setSearch('');setBatchFilter('all');setShowArchived(false);
    return !!fresh&&result.ids.every(id=>fresh.students.some(student=>student.id===id))&&(!result.batchId||result.ids.every(id=>fresh.enrolments.some(enrolment=>enrolment.student_id===id&&enrolment.batch_id===result.batchId)));
  }
  if(scanOpen&&data)return <ScanRosterScreen academy={academy} roster={data} initialBatch={tab==='batches'?activeBatch:null} onDirtyChange={setDirty} onBusyChange={setPhotoBusy} onViewChange={onViewChange}
    onCancel={()=>{setScanOpen(false);setDirty(false);void reload();onViewChange();}}
    onSaved={refreshImported}
    onOpenBatch={id=>{setScanOpen(false);setProfileId(null);setStudentDraft(null);setTab('batches');setActiveBatch(id);setAddingMembers(false);setDirty(false);onViewChange();}}
    onOpenStudent={id=>{setScanOpen(false);setStudentDraft(null);setTab('students');setProfileId(id);setProfileAddBatch(false);setDirty(false);onViewChange();}}/>;
  return <View style={s.root} pointerEvents={photoBusy ? 'none' : 'auto'}>
    <Text style={s.kicker}>THE PEOPLE BEHIND YOUR TEACHING</Text><Text accessibilityRole="header" style={s.heading}>{heading}</Text>
    {/* Inline context stays available; ActionFeedback announces the result outside scrolling. */}
    {!!notice && <Text style={s.notice}>{notice}</Text>}
    {!!error && <Text style={s.error}>{error}</Text>}
    <ConfirmDialog visible={discard} title="Discard your unsaved changes?" message="Keep editing to retain this form, or discard it to go back."
      confirmLabel="Discard changes" cancelLabel="Keep editing" onConfirm={close} onCancel={() => setDiscard(false)} />
    {studentDraft && !batchDraft ? <View style={s.card}>
      {!data?.students.some(x=>x.id===studentDraft.id)&&<Button label="Scan a student list instead" soft disabled={working||dirty} onPress={()=>{setScanOpen(true);onViewChange();}}/>}
      <Text style={s.formSectionTitle}>Student details</Text>
      <Text style={s.body}>Keep the student’s age and learning level easy to find.</Text>
      <Field label="Student name" value={studentDraft.name} onChange={value => updateStudent('name', value)} disabled={working} />
      <Field label="Age (optional)" kind="number" max={3} value={studentDraft.age} onChange={value => updateStudent('age', value)} disabled={working} />
      <Text style={s.label}>Proficiency level</Text>
      <View style={s.levelChoices}>{(Object.keys(proficiencyLabels) as Proficiency[]).map(level=><Pressable key={level} accessibilityRole="radio" accessibilityLabel={`Proficiency ${proficiencyLabels[level]}`} accessibilityState={{selected:(studentDraft.proficiency??'unassessed')===level,disabled:working}} disabled={working} onPress={()=>updateStudent('proficiency',level)} style={[s.levelChoice,(studentDraft.proficiency??'unassessed')===level&&s.selected]}><Text style={s.label}>{proficiencyLabels[level]}</Text></Pressable>)}</View>
      <Text style={s.formSectionTitle}>Guardian contact</Text><Text style={s.body}>Optional contact details. This does not create a parent account or send an invitation.</Text>
      <Field label="Guardian name" value={studentDraft.guardian} onChange={value => updateStudent('guardian', value)} disabled={working} />
      <Field label="Guardian email" kind="email" max={320} value={studentDraft.email} onChange={value => updateStudent('email', value)} disabled={working} />
      <Field label="Guardian phone" kind="phone" max={30} value={studentDraft.phone} onChange={value => updateStudent('phone', value)} disabled={working} />
      <Text style={s.formSectionTitle}>Batches</Text><Text style={s.body}>Choose one or more batches for this student. Existing enrolments are retained; moving or ending an enrolment comes in a later module.</Text>
      <Button label="Create a new batch" soft disabled={working} onPress={() => editBatch()} />
      {!batches.length && <Text style={s.body}>Create a batch first, or save this student without a batch.</Text>}
      {batches.map(batch => {
        const enrolled = existingEnrolments(studentDraft.id).includes(batch.id);
        const selected = studentDraft.batches.includes(batch.id);
        return <Pressable key={batch.id} accessibilityRole="checkbox" accessibilityLabel={batch.name} aria-checked={selected} accessibilityState={{ checked: selected, disabled: busy || enrolled }} disabled={busy || enrolled}
          onPress={() => updateStudent('batches', selected ? studentDraft.batches.filter(id => id !== batch.id) : [...studentDraft.batches, batch.id])} style={[s.check, selected && s.selected]}>
          <Text style={s.label}>{selected ? '[✓]' : '[ ]'} {batch.name}</Text>{enrolled && <Text style={s.caption}>Already enrolled</Text>}
        </Pressable>;
      })}
      <PhotoControl key={studentDraft.id} academy={academy} kind="student" id={studentDraft.id} exists={!!data?.students.some(student=>student.id===studentDraft.id)} disabled={busy} beforeUpload={saveBeforePhoto} onWorking={setPhotoBusy} />
      <Button label={busy ? 'Saving…' : 'Save student'} disabled={working} onPress={() => { void save(); }} />
      <Button label={profileId?"Back to profile":"Back to students"} soft disabled={working} onPress={back} />
    </View> : batchDraft ? <View style={s.card}>
      <Field label="Batch name" value={batchDraft.name} disabled={working} onChange={value => updateBatch('name', value)} />
      <Field label="Room or location" value={batchDraft.room} disabled={working} onChange={value => updateBatch('room', value)} />
      <Field label="Monthly fee (₹)" kind="money" max={12} value={batchDraft.fee} disabled={working} onChange={value => updateBatch('fee', value)} />
      <Text style={s.body}>This sets a default fee. It does not issue an invoice or collect money.</Text>
      <Button label={busy ? 'Saving…' : 'Save batch'} disabled={working} onPress={() => { void save(); }} />
      <Button label="Back to batches" soft disabled={working} onPress={back} />
    </View> : profile ? <>
      <View style={s.profileHero}>
        {photoUrls[profile.id]?<Image accessibilityLabel={`Photo of ${profile.name}`} source={{uri:photoUrls[profile.id]}} style={s.profileAvatar}/>:<View style={[s.initialAvatar,s.profileAvatar]}><Text style={s.profileInitial}>{profile.name.slice(0,1).toUpperCase()}</Text></View>}
        <Text style={s.profileName}>{profile.name}</Text>
        <View style={s.profileTags}><Text style={s.profileTag}>{profile.age_years===null?'Age not provided':`${profile.age_years} years old`}</Text><Text style={s.profileTag}>{proficiencyLabels[profile.proficiency_level??'unassessed']}</Text></View>
        <Button label="Edit student details" soft disabled={working||!!profile.archived_at} onPress={()=>editStudent(profile)} />
      </View>
      <View style={s.card}>
        <PhotoControl key={profile.id} academy={academy} kind="student" id={profile.id} exists disabled={busy} locked={!!profile.archived_at} onWorking={setPhotoBusy}/>
      </View>
      <View style={s.card}>
        <Text style={s.title}>Guardian</Text>
        <Text style={s.body}>{data?.contacts.find(c=>c.student_id===profile.id)?.name??'No guardian details yet'}</Text>
        {!!data?.contacts.find(c=>c.student_id===profile.id)?.phone&&<Text style={s.body}>{data.contacts.find(c=>c.student_id===profile.id)!.phone}</Text>}
        {!!data?.contacts.find(c=>c.student_id===profile.id)?.email&&<Text style={s.body}>{data.contacts.find(c=>c.student_id===profile.id)!.email}</Text>}
      </View>
      <View style={s.card}>
        <View style={s.studentHeading}><Text style={s.title}>Batches ({profileBatches.length})</Text></View>
        {!profileBatches.length&&<Text style={s.body}>This student is not in a batch yet.</Text>}
        {profileBatches.map(batch=><Button key={batch.id} label={`Open batch ${batch.name}`} soft disabled={working} onPress={()=>{setProfileId(null);setProfileAddBatch(false);setTab('batches');setActiveBatch(batch.id);onViewChange();}}/>)}
        {!profile.archived_at&&<Button label={profileAddBatch?'Close batch choices':'Add batch to this student'} disabled={working} onPress={()=>setProfileAddBatch(value=>!value)} />}
        {profileAddBatch&&<>
          <Text style={s.body}>Choose an existing batch. The student keeps their other batches.</Text>
          {batches.filter(batch=>!data?.enrolments.some(e=>e.student_id===profile.id&&e.batch_id===batch.id)).map(batch=><Button key={batch.id} label={`Join ${batch.name}`} soft disabled={working} onPress={()=>{if(writeLock.current)return;writeLock.current=true;setBusy(true);void addBatchStudents(academy,batch.id,[profile.id]).then(async()=>{await reload();setProfileAddBatch(false);setNotice('Student added to the batch.');}).catch(failure=>setError(rosterFailure(failure,'Adding this batch could not be confirmed. Retry safely.'))).finally(()=>{writeLock.current=false;setBusy(false);});}} />)}
          <Button label="Create a batch for this student" soft disabled={working} onPress={()=>{editStudent(profile);editBatch();setDirty(true);}} />
        </>}
      </View>
      <Button label={activeBatch?'Back to batch roster':'Back to students'} soft disabled={working} onPress={()=>{setProfileId(null);setProfileAddBatch(false);onViewChange();}} />
    </> : <>
      <View style={s.tabs}><Button label="Students" soft={tab !== 'students'} disabled={working} onPress={() => { setTab('students'); setError(''); }} />
        <Button label="Batches" soft={tab !== 'batches'} disabled={working} onPress={() => { setTab('batches'); setError(''); }} /></View>
      {loading && <ActivityIndicator accessibilityLabel="Loading roster" color="#1F6F6B" />}
      <Button label="Refresh roster" soft disabled={loading || busy} onPress={() => { setNotice(''); void reload().then(ok => { if (ok) setNotice('Roster refreshed.', { title: 'Refresh complete' }); }); }} />
      {tab === 'students' ? <>
        <Button label="Scan student list" soft disabled={!data||loading||working} onPress={()=>{setScanOpen(true);onViewChange();}}/>
        <Button label="Add a student" disabled={!data || loading || working} onPress={() => editStudent()} />
        {data && <><Field label="Search students" value={search} disabled={working} onChange={setSearch} />
          <View style={s.chips}>{[{ id: 'all', name: 'All batches' }, ...batches].map(b => <Pressable key={b.id} accessibilityRole="button" onPress={() => setBatchFilter(b.id)} style={[s.chip, batchFilter === b.id && s.selected]}><Text style={s.label}>{b.name}</Text></Pressable>)}</View>
          <Button label={showArchived ? 'Show active students' : 'Show archived students'} soft onPress={() => setShowArchived(x => !x)} />
          {!list.length && <Text style={s.body}>{search || batchFilter !== 'all' ? 'No students match these filters.' : showArchived ? 'No archived students.' : 'No students yet. Add your first student.'}</Text>}
          {list.map(student => <View key={student.id} style={s.card}>
            <Pressable accessibilityRole="button" accessibilityLabel={`View profile for ${student.name}`} onPress={()=>{setProfileId(student.id);setProfileAddBatch(false);onViewChange();}} style={s.studentHeading}>{photoUrls[student.id]?<Image accessibilityLabel={`Photo of ${student.name}`} source={{uri:photoUrls[student.id]}} style={s.smallAvatar}/>:<View style={s.initialAvatar}><Text style={s.initial}>{student.name.slice(0,1).toUpperCase()}</Text></View>}<Text style={s.title}>{student.name}</Text></Pressable><Text style={s.body}>{student.age_years === null ? 'Age not provided' : `${student.age_years} years old`} · {proficiencyLabels[student.proficiency_level??'unassessed']}{student.archived_at ? ' · Archived' : ''}</Text>
            <Text style={s.body}>{data.enrolments.filter(e => e.student_id === student.id && e.starts_on <= today && (!e.ends_on || e.ends_on >= today)).map(e => data.batches.find(b => b.id === e.batch_id)?.name).filter(Boolean).join(' · ') || 'No batches yet'}</Text>
            {data.contacts.find(c => c.student_id === student.id) && <Text style={s.body}>Guardian: {data.contacts.find(c => c.student_id === student.id)?.name}</Text>}
            {!student.archived_at && <><Button label={`Edit ${student.name}`} soft onPress={() => editStudent(student)} />
              <Button label={`Archive ${student.name}`} soft onPress={() => setArchiveTarget(student)} disabled={working} /></>}
          </View>)}
        </>}
      </> : selectedBatch ? <>
        <View style={s.batchHero}>
          <Text style={s.heroTitle}>{members.length} students</Text>
          <Text style={s.heroBody}>{selectedBatch.room || 'Location not set'} · {formatFee(selectedBatch.monthly_fee_paise)} per student / month</Text>
          <Button label={`Edit ${selectedBatch.name}`} soft disabled={working} onPress={() => editBatch(selectedBatch)} />
        </View>
        {addingMembers ? <View style={s.card}>
          <Text style={s.title}>Add existing students</Text>
          <Field label="Find an existing student" value={memberSearch} disabled={working} onChange={setMemberSearch} />
          {data?.students.filter(student => !student.archived_at && student.name.toLowerCase().includes(memberSearch.toLowerCase())
            && !data.enrolments.some(e => e.student_id === student.id && e.batch_id === activeBatch)).map(student => <Pressable key={student.id}
              accessibilityRole="checkbox" accessibilityLabel={`Add ${student.name} to batch`} aria-checked={selectedMembers.includes(student.id)}
              accessibilityState={{ checked: selectedMembers.includes(student.id), disabled: busy }} disabled={working}
              onPress={() => { setSelectedMembers(ids => ids.includes(student.id) ? ids.filter(id => id !== student.id) : [...ids, student.id]); setDirty(true); }} style={[s.check, selectedMembers.includes(student.id) && s.selected]}>
              <Text style={s.label}>{selectedMembers.includes(student.id) ? '✓ ' : '+ '}{student.name}</Text>
            </Pressable>)}
          <Text style={s.caption}>Students already in this batch are retained. The same student can belong to other batches too.</Text>
          <Button label={`Add selected students (${selectedMembers.length})`} disabled={busy || !selectedMembers.length} onPress={() => { void saveMembers(); }} />
          <Button label="Cancel adding students" soft disabled={working} onPress={back} />
        </View> : <>
          <Button label="Add existing students" disabled={working || loading} onPress={() => { setAddingMembers(true); setSelectedMembers([]); setMemberSearch(''); }} />
          <Button label="Scan student list into this batch" soft disabled={working||loading} onPress={()=>{setScanOpen(true);onViewChange();}}/>
          <Button label="Add new student to this batch" soft disabled={working || loading} onPress={() => editStudent(undefined, selectedBatch.id)} />
          <Text style={s.title}>Students in this batch</Text>
          {!members.length && <Text style={s.body}>This batch has no students yet. Add an existing student or create a new student here.</Text>}
          {members.map(student => <View key={student.id} style={s.card}>
            <Pressable accessibilityRole="button" accessibilityLabel={`View profile for ${student.name}`} onPress={()=>{setProfileId(student.id);setProfileAddBatch(false);onViewChange();}} style={s.studentHeading}>{photoUrls[student.id]?<Image accessibilityLabel={`Photo of ${student.name}`} source={{uri:photoUrls[student.id]}} style={s.smallAvatar}/>:<View style={s.initialAvatar}><Text style={s.initial}>{student.name.slice(0,1).toUpperCase()}</Text></View>}<Text style={s.title}>{student.name}</Text></Pressable>
            <Text style={s.body}>{data?.contacts.find(c => c.student_id === student.id)?.name ? `Guardian: ${data.contacts.find(c => c.student_id === student.id)!.name}` : 'Guardian not provided'}</Text>
            <Button label={`Edit ${student.name}`} soft disabled={working} onPress={() => editStudent(student)} />
          </View>)}
          <Button label="Back to batches" soft disabled={working} onPress={() => { setActiveBatch(null); onViewChange(); }} />
        </>}
      </> : <>
        <Button label="Create a batch" disabled={!data || loading || working} onPress={() => editBatch()} />
        {data && !batches.length && <Text style={s.body}>No batches yet. Create your first teaching group.</Text>}
        {batches.map(batch => <View key={batch.id} style={s.card}><Text style={s.title}>{batch.name}</Text>
          <Text style={s.body}>{batch.room || 'Location not set'} · {formatFee(batch.monthly_fee_paise)}/month</Text>
          <Text style={s.body}>{data ? batchStudents(data, batch.id, today).length : 0} active students</Text>
          <Button label={`Open batch ${batch.name}`} disabled={working} onPress={() => { setActiveBatch(batch.id); setAddingMembers(false); onViewChange(); }} />
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
  formSectionTitle: {fontSize:18,fontWeight:'700',color:'#22303A',paddingTop:16,borderTopWidth:1,borderTopColor:'#E3E8E2'},levelChoices:{flexDirection:'row',flexWrap:'wrap',gap:8},levelChoice:{minHeight:44,paddingHorizontal:13,paddingVertical:12,borderWidth:1,borderColor:'#CED8CC',borderRadius:12,justifyContent:'center'},profileHero:{backgroundColor:'#1F6F6B',borderRadius:22,padding:24,gap:16,alignItems:'center'},profileAvatar:{width:96,height:96,borderRadius:48},profileInitial:{fontSize:36,fontWeight:'700',color:'#1F6F6B'},profileName:{fontSize:26,fontWeight:'700',color:'#fff'},profileTags:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'center'},profileTag:{color:'#1F6F6B',backgroundColor:'#DCEDEA',borderRadius:14,paddingHorizontal:12,paddingVertical:8,fontSize:13,fontWeight:'600'},
  studentHeading: { flexDirection: 'row', gap: 12, alignItems: 'center' }, smallAvatar: {width:48,height:48,borderRadius:24}, initialAvatar: {width:48,height:48,borderRadius:24,backgroundColor:'#DCEDEA',alignItems:'center',justifyContent:'center'}, initial:{fontSize:22,fontWeight:'700',color:'#1F6F6B'},
  batchHero: { backgroundColor: '#1F6F6B', borderRadius: 20, padding: 22, gap: 14 }, heroTitle: { color: '#fff', fontSize: 30, fontWeight: '700' }, heroBody: { color: '#E0EEEA', lineHeight: 22 },
  root: { gap: 16 }, kicker: { color: '#1F6F6B', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  heading: { fontSize: 32, lineHeight: 39, fontWeight: '700', letterSpacing: -1, color: '#22303A' },
  title: { fontSize: 17, fontWeight: '700', color: '#22303A' }, body: { fontSize: 13, lineHeight: 21, color: '#5C6B73' },
  card: { padding: 20, gap: 20, borderRadius: 18, borderWidth: 1, borderColor: '#E3E8E2', backgroundColor: '#fff' },
  tabs: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { padding: 12, borderRadius: 22, backgroundColor: '#fff', borderColor: '#CED8CC', borderWidth: 1 },
  field: { gap: 8 }, label: { color: '#22303A', fontWeight: '600', fontSize: 13 },
  input: { padding: 13, minHeight: 52, borderWidth: 1, borderColor: '#CED8CC', borderRadius: 12, fontSize: 16, color: '#22303A', backgroundColor: '#FAFBF8' },
  button: { padding: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1F6F6B' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' }, soft: { backgroundColor: '#EDF1EC' }, softText: { color: '#22303A' },
  error: { padding: 14, borderRadius: 12, color: '#8D2635', backgroundColor: '#FCE8EB', lineHeight: 22 },
  notice: { padding: 14, borderRadius: 12, color: '#1F6F6B', backgroundColor: '#DCEDEA', lineHeight: 22 },
  check: { padding: 14, minHeight: 48, borderWidth: 1, borderColor: '#CED8CC', borderRadius: 12, gap: 5 },
  selected: { backgroundColor: '#DCEDEA', borderColor: '#1F6F6B' }, caption: { color: '#5C6B73', fontSize: 11 },
});
