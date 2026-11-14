import { randomUUID } from 'expo-crypto';
import { supabase } from '../auth/client';
import { photoType } from './model';
export type PhotoKind = 'student' | 'observation';
export type CoachPhoto = { object_path: string; url: string };
const bucket='parentplus-coach-photos';
export async function loadPhoto(academy: string, kind: PhotoKind, id: string): Promise<CoachPhoto | null> {
  if (!supabase) throw new Error('Unavailable');
  const result=await supabase.from('coach_photos').select('object_path').eq('academy_id',academy).eq('kind',kind).eq('entity_id',id).maybeSingle();
  if(result.error) throw result.error;
  if(!result.data) return null;
  const signed=await supabase.storage.from(bucket).createSignedUrl(result.data.object_path,60);
  if(signed.error) throw signed.error;
  return {object_path:result.data.object_path,url:signed.data.signedUrl};
}
export async function savePhoto(academy: string,kind: PhotoKind,id: string,uri: string,previous: CoachPhoto|null) {
  if(!supabase) throw new Error('Unavailable');
  const response=await fetch(uri);
  const bytes=new Uint8Array(await response.arrayBuffer());
  const type=photoType(bytes);
  const path=`${academy}/${kind}/${id}/${randomUUID()}.${type.extension}`;
  const uploaded=await supabase.storage.from(bucket).upload(path,bytes,{contentType:type.mime,upsert:false});
  if(uploaded.error) throw uploaded.error;
  try {
    const result=await supabase.rpc('attach_coach_photo',{target_academy:academy,entity_kind:kind,target_entity:id,target_path:path,expected_path:previous?.object_path??null});
    if(result.error) throw result.error;
  } catch(error) {
    // Reconcile a lost attach response before cleaning up. Storage rules also
    // reject deleting an object already referenced by a committed photo record.
    const saved=await loadPhoto(academy,kind,id).catch(()=>null);
    if(saved?.object_path===path) return saved;
    await supabase.storage.from(bucket).remove([path]).catch(()=>undefined);
    throw error;
  }
  if(previous) await supabase.storage.from(bucket).remove([previous.object_path]).catch(()=>undefined);
  return loadPhoto(academy,kind,id);
}
export async function removePhoto(academy: string,kind: PhotoKind,id: string,previous: CoachPhoto) {
  if(!supabase) throw new Error('Unavailable');
  const result=await supabase.rpc('attach_coach_photo',{target_academy:academy,entity_kind:kind,target_entity:id,target_path:null,expected_path:previous.object_path});
  if(result.error) throw result.error;
  await supabase.storage.from(bucket).remove([previous.object_path]).catch(()=>undefined);
}

export async function studentPhotoThumbnails(academy: string): Promise<Record<string,string>> {
  if(!supabase)return {};
  const photos:{entity_id:string;object_path:string}[]=[];
  for(let offset=0;;offset+=500){
    const result=await supabase.from('coach_photos').select('entity_id,object_path').eq('academy_id',academy).eq('kind','student').order('entity_id').range(offset,offset+499);
    if(result.error)throw result.error;
    photos.push(...(result.data??[]));if((result.data?.length??0)<500)break;
  }
  const urls:Record<string,string>={};
  for(let offset=0;offset<photos.length;offset+=250){
    const group=photos.slice(offset,offset+250),result=await supabase.storage.from(bucket).createSignedUrls(group.map(p=>p.object_path),60);
    if(result.error)throw result.error;
    for(const photo of group){const signed=result.data.find(value=>value.path===photo.object_path);if(signed?.signedUrl)urls[photo.entity_id]=signed.signedUrl;}
  }
  return urls;
}
