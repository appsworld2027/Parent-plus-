import {Platform} from 'react-native';
import {supabase} from '../auth/client';
import {photoType} from '../photos/model';
import {parseScan,importPayload,type ReviewStudent} from './model';
export async function scanRoster(academy:string,uri:string){
  if(!supabase)throw new Error('Sign in to scan a list.');
  const response=await fetch(uri),bytes=new Uint8Array(await response.arrayBuffer());const type=photoType(bytes);
  const body=new FormData();body.append('academy',academy);body.append('recognizer','cloud-vision-v1');
  // RN FormData uses a URI part; browsers accept Blob. File bytes are validated above.
  if(Platform.OS==='web')body.append('image',new Blob([bytes.buffer as ArrayBuffer],{type:type.mime}),`list.${type.extension}`);
  else body.append('image',{uri,name:`list.${type.extension}`,type:type.mime} as unknown as Blob);
  const result=await supabase.functions.invoke('scan-roster',{body,timeout:60000});
  if(result.error){
    let code='';try{code=(await result.error.context?.json())?.code??'';}catch{}
    throw new Error(code==='UPGRADE_REQUIRED'?'Refresh or update the app before using Cloud Vision scanning.':code==='LIMIT_MONTH'?'The shared monthly scanning limit has been reached. Manual entry is still available.':code==='LIMIT'?'The scan limit was reached. Wait before retrying; each academy has 10 scans per day.':code==='NO_TEXT'?'No readable students found. Try a clearer register photo.':code==='INVALID_IMAGE'?'Choose a JPEG, PNG or WebP image up to 5 MB.':code==='UNAUTHORIZED'?'Sign in again before scanning.':'Photo scanning is unavailable. Your academy’s scanning service may need setup; manual entry still works.');
  }
  return parseScan(result.data);
}
export async function importRoster(academy:string,batch:string|null,request:string,rows:ReviewStudent[]){
  if(!supabase)throw new Error('Sign in again.');
  const result=await supabase.rpc('import_roster_scan',{target_academy:academy,target_batch:batch,import_request:request,reviewed_students:importPayload(rows)});
  if(result.error)throw new Error(['PGRST202','42883'].includes(result.error.code)?'The roster import database update is needed.':'Import could not be confirmed. Retry this same review safely. If a matching name now exists, reopen the roster and use its existing profile.');
  return result.data as string[];
}
