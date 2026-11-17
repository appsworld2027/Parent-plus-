import React, { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../ui/Typography';
import * as ImagePicker from 'expo-image-picker';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../auth/client';
import type { Student } from '../roster/model';
import { SelectField } from '../ui/SelectField';
import { canUseMedia, type ClassMedia, type MediaConsent, type MediaKind } from './model';
import { classMediaBucket, loadClassMedia, mediaSetupError, recordMediaConsent, uploadClassMedia, type PendingClassMedia } from './service';

function Button({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, disabled && s.disabled]}><Text style={s.label}>{title}</Text></Pressable>;
}
function Check({ title, checked, onPress, disabled = false }: { title: string; checked: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={title} accessibilityState={{ checked, disabled }} aria-checked={checked} disabled={disabled} onPress={onPress} style={s.check}><Text style={s.label}>{checked ? '☑' : '☐'} {title}</Text></Pressable>;
}
export function ClassMediaPanel({ academy, session, students, disabled, onWorking }: { academy: string; session: string; students: Student[]; disabled: boolean; onWorking: (busy: boolean) => void }) {
  const [open, setOpen] = useState(false), [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [consents, setConsents] = useState<MediaConsent[]>([]), [media, setMedia] = useState<ClassMedia[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]), [everyone, setEveryone] = useState(false);
  const [consentChild, setConsentChild] = useState(''), [guardian, setGuardian] = useState(''), [evidence, setEvidence] = useState('');
  const [photos, setPhotos] = useState(false), [videos, setVideos] = useState(false), [sharing, setSharing] = useState(false), [attested, setAttested] = useState(false);
  const [pending, setPending] = useState<PendingClassMedia | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<{id:string;url:string} | null>(null);
  const alive = useRef(true), lock = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function run(action: () => Promise<void>) {
    if (lock.current || disabled) return;
    lock.current = true; setBusy(true); onWorking(true); setError('');
    try { await action(); } catch (failure) { if (alive.current) setError(failure instanceof Error && /^(Choose |Select |Record |Confirm )/.test(failure.message) ? failure.message : mediaSetupError(failure)); }
    finally { lock.current = false; if (alive.current) setBusy(false); onWorking(false); }
  }
  async function refresh() {
    const data = await loadClassMedia(academy, session);
    if (alive.current) { setConsents(data.consents); setMedia(data.media); setReady(true); }
  }
  function chooseChild(id: string) {
    const consent = consents.find(value => value.student_id === id);
    setConsentChild(id); setGuardian(consent?.guardian_name ?? ''); setEvidence('');
    setPhotos(consent?.allow_photos ?? false); setVideos(consent?.allow_videos ?? false); setSharing(consent?.allow_parent_sharing ?? false); setAttested(false);
  }
  async function saveConsent(withdraw = false) {
    if (!consentChild || !guardian.trim() || evidence.trim().length < 3 || !attested) throw new Error('Record the guardian name, how permission was obtained or withdrawn, and your confirmation.');
    await recordMediaConsent(academy, consentChild, guardian, evidence, !withdraw && photos, !withdraw && videos, !withdraw && sharing);
    setAttested(false); setEveryone(false); setPreview(null); setNotice(withdraw ? 'Permission withdrawn. New access and pending media handoffs are blocked.' : 'Guardian permission recorded. Review who appears before adding media.');
    try { await refresh(); } catch { setError('Permission was recorded, but the screen could not refresh. Close and reopen class media before capturing.'); }
  }
  async function upload(value: PendingClassMedia) {
    await uploadClassMedia(academy, session, value);
    // A confirmed upload must not be repeated because the list refresh fails.
    setPending(null); setNotice('Class media saved privately. It has not been sent to parents.');
    try { await refresh(); } catch { setError('Media was saved, but the list could not refresh. Close and reopen class media; do not choose the file again.'); }
  }
  async function pick(kind: MediaKind, camera = false) {
    const latest = await loadClassMedia(academy, session);
    if (alive.current) setConsents(latest.consents);
    if (!everyone || !canUseMedia(latest.consents, subjects, kind)) throw new Error('Confirm everyone pictured and record their guardian permission before capture or selection.');
    if (camera) { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) throw new Error('Choose an existing photo, or allow camera access.'); }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: kind === 'photo' ? ['images'] : ['videos'], quality: 0.8 };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    const asset = result.assets[0], limit = kind === 'photo' ? 5 * 1024 * 1024 : 25 * 1024 * 1024;
    if (asset.fileSize && asset.fileSize > limit) throw new Error(kind === 'photo' ? 'Choose a photo up to 5 MB.' : 'Choose a video up to 25 MB.');
    const value = { id: randomUUID(), uri: asset.uri, subjects: [...subjects], kind };
    setPending(value); await upload(value);
  }
  const blocked = busy || disabled, frozen = blocked || !!pending;
  return <View style={s.card}>
    <Button title={open ? 'Close class media' : 'Class photos, videos and consent'} disabled={blocked || !!pending} onPress={() => { setOpen(value => !value); if (!open) void run(refresh); }} />
    {open && <>
      <Text style={s.title}>Class photos and videos</Text>
      <Text style={s.body}>Private class collection. Nothing is sent automatically. Photos up to 5 MB; MP4, MOV or WebM clips up to 25 MB. Record a clip with your phone’s camera, then choose it here. In-app audio/video recording is not enabled.</Text>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {!!notice && <Text style={s.body}>{notice}</Text>}
      {!ready ? <Button title="Retry loading class media" disabled={blocked} onPress={() => { void run(refresh); }} /> : <>
        <Text style={s.title}>1. Record guardian permission</Text>
        <Text style={s.body}>Use permission already obtained from the guardian. These controls record your confirmation; they do not request or verify consent from a parent account. Add a new record if permission changes.</Text>
        <SelectField label="Student consent record" value={consentChild} disabled={frozen} onChange={chooseChild} options={[{value:'',label:'Choose student'},...students.map(student=>({value:student.id,label:student.name}))]} />
        {!!consentChild && <>
          <TextInput accessibilityLabel="Consenting guardian name" placeholder="Guardian name" maxLength={100} editable={!frozen} value={guardian} onChangeText={value=>{setGuardian(value);setAttested(false);}} style={s.input} />
          <TextInput accessibilityLabel="Permission evidence or withdrawal note" placeholder="How and when permission was obtained, or withdrawn" maxLength={500} editable={!frozen} value={evidence} onChangeText={value=>{setEvidence(value);setAttested(false);}} style={s.input} />
          <Check title="Guardian permits class photos" checked={photos} disabled={frozen} onPress={()=>{setPhotos(value=>!value);setAttested(false);}} />
          <Check title="Guardian permits class videos" checked={videos} disabled={frozen} onPress={()=>{setVideos(value=>!value);setAttested(false);}} />
          <Check title="Guardian permits sharing class media with parents" checked={sharing} disabled={frozen} onPress={()=>{setSharing(value=>!value);setAttested(false);}} />
          <Check title="I confirm this records the guardian’s actual decision" checked={attested} disabled={frozen} onPress={()=>setAttested(value=>!value)} />
          <Button title="Save guardian permission" disabled={frozen || !attested} onPress={()=>{void run(()=>saveConsent());}} />
          <Button title="Withdraw guardian permission" disabled={frozen || !attested} onPress={()=>{void run(()=>saveConsent(true));}} />
        </>}
        <Text style={s.title}>2. Select everyone who will appear</Text>
        <Text style={s.body}>Include every visible child, including classmates in the background. Do not capture identifiable bystanders who are not covered here.</Text>
        {students.map(student => <Check key={student.id} title={`Media includes ${student.name}`} checked={subjects.includes(student.id)} disabled={frozen} onPress={()=>{setSubjects(values=>values.includes(student.id)?values.filter(id=>id!==student.id):[...values,student.id]);setEveryone(false);}} />)}
        <Check title="Everyone pictured is selected above" checked={everyone} disabled={frozen} onPress={()=>setEveryone(value=>!value)} />
        {!canUseMedia(consents,subjects,'photo') && <Text style={s.body}>Select students with photo permission to enable photos.</Text>}
        {Platform.OS !== 'web' && <Button title="Take consented class photo" disabled={frozen || !everyone || !canUseMedia(consents,subjects,'photo')} onPress={()=>{void run(()=>pick('photo',true));}} />}
        <Button title="Choose consented class photo" disabled={frozen || !everyone || !canUseMedia(consents,subjects,'photo')} onPress={()=>{void run(()=>pick('photo'));}} />
        <Button title="Choose consented class video" disabled={frozen || !everyone || !canUseMedia(consents,subjects,'video')} onPress={()=>{void run(()=>pick('video'));}} />
        {!!pending && <><Text style={s.body}>Upload not confirmed. Retry the same file and students; do not select it again.</Text><Button title="Retry same class media upload" disabled={blocked} onPress={()=>{void run(()=>upload(pending));}} /></>}
        <Text style={s.title}>Saved class media ({media.length})</Text>
        {media.map(item=><View key={item.id} style={s.item}><Text style={s.body}>{item.kind} · {(item.byte_size/1048576).toFixed(1)} MB · {item.subject_ids.map(id=>students.find(student=>student.id===id)?.name??'Student').join(', ')}</Text>
          <Button title={`Prepare private preview ${item.kind} ${media.indexOf(item)+1}`} disabled={blocked} onPress={()=>{void run(async()=>{if(!supabase)return;const result=await supabase.storage.from(classMediaBucket).createSignedUrl(item.object_path,60);if(result.error)throw result.error;setPreview({id:item.id,url:result.data.signedUrl});});}} />
          {preview?.id===item.id && (Platform.OS==='web'?React.createElement('a',{href:preview.url,target:'_blank',rel:'noopener noreferrer'},'Open private preview (expires in 60 seconds)'):<Button title="Open private media preview" disabled={blocked} onPress={()=>{void Linking.openURL(preview.url).catch(()=>setError('Preview could not open.'));}} />)}
        </View>)}
      </>}
    </>}
  </View>;
}
const s=StyleSheet.create({card:{padding:16,gap:14,backgroundColor:'#F0F5F1',borderRadius:16},title:{fontSize:18,fontWeight:'700',color:'#22303A'},body:{fontSize:14,lineHeight:22,color:'#53676B'},label:{fontSize:14,fontWeight:'600',color:'#22303A'},button:{minHeight:48,padding:14,borderRadius:12,backgroundColor:'#DCEDEA',alignItems:'center'},check:{minHeight:48,justifyContent:'center'},input:{minHeight:48,borderRadius:12,borderWidth:1,borderColor:'#CED8CC',padding:12,fontSize:16,backgroundColor:'#fff'},disabled:{opacity:0.45},error:{color:'#8E3434'},item:{gap:8,borderTopWidth:1,borderColor:'#CED8CC',paddingTop:12}});
