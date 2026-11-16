import { supabase } from '../auth/client';
import type { Family, ParentData } from './model';
export async function loadFamily(owner:string):Promise<Family|null> {
  if(!supabase)throw new Error('Unavailable');
  const result=await supabase.from('parent_families').select('id,owner_id,parent_name,name,timezone').eq('owner_id',owner).maybeSingle();
  if(result.error)throw result.error;return result.data;
}
export async function createFamily(owner:string,id:string,parentName:string,familyName:string):Promise<Family> {
  if(!supabase)throw new Error('Unavailable');
  const result=await supabase.from('parent_families').insert({id,owner_id:owner,parent_name:parentName.trim(),name:familyName.trim(),timezone:'Asia/Kolkata'});
  if(result.error&&result.error.code!=='23505')throw result.error;
  const family=await loadFamily(owner);if(!family)throw new Error('Family not confirmed');return family;
}
export async function loadParentData(family:string):Promise<ParentData> {
  if(!supabase)throw new Error('Unavailable');
  async function rows(table:string,fields:string,scoped=true) {
    const all:unknown[]=[];
    for(let offset=0;;offset+=500){
      let query=supabase!.from(table).select(fields).order('id').range(offset,offset+499);
      if(scoped)query=query.eq('family_id',family);
      const result=await query;if(result.error)throw result.error;all.push(...(result.data??[]));if((result.data?.length??0)<500)return all;
    }
  }
  const [children,moments,todos,events,links,feedback,permissions]=await Promise.all([
    rows('family_children','id,family_id,name,born_on,color,archived_at'),rows('family_moments','id,family_id,child_id,note,minutes,kind,occurred_on'),
    rows('family_todos','id,family_id,child_id,title,done'),rows('family_events','id,family_id,child_id,title,starts_at,ends_at,location'),
    supabase.rpc('get_parent_coach_connections'),rows('parent_feedback_feed','id,child_id,snapshot,reviewed_at',false),
    supabase.rpc('get_parent_media_permissions'),
  ]);
  if(permissions.error)throw permissions.error;
  if(links.error)throw links.error;
  return {children,moments,todos,events,links:links.data??[],feedback,permissions:permissions.data??[]} as ParentData;
}
export async function saveFamilyRecord(table:'family_children'|'family_moments'|'family_todos'|'family_events',value:object) {
  if(!supabase)throw new Error('Unavailable');const result=await supabase.from(table).upsert(value,{onConflict:'id'});if(result.error)throw result.error;
}
export function parentFailure(error:unknown) {
  const code=error&&typeof error==='object'&&'code'in error?String(error.code):'';
  return ['42P01','PGRST205','PGRST202'].includes(code)?'Your Parent workspace is not enabled on the shared database yet. Your Coach records are unchanged.':'This could not be confirmed. Keep your entries and retry, or refresh your saved records before entering them again.';
}
