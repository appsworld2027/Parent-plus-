import {decodeAttendanceSessions,mondayOf,type AttendanceSession} from './attendance';

/** Narrow subset of Supabase used by the APVerse attendance adapter and its contract tests. */
export type ApAttendanceRpcClient={
 auth:{getUser:()=>Promise<{data:{user:{id:string}|null};error:unknown|null}>};
 rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:unknown|null}>;
};
export type ApAttendanceCursor={session_id:string;starts_at:string};
export type ApVerseParentSignalSummary={id:string;type:'running_late'|'missing_today'|'dropped_off'|'picked_up';reason:'unwell'|'travelling'|'other'|null;created_at:string};
export type ApVerseAttendanceSession=AttendanceSession&{session_version:number;can_signal:boolean;own_latest_signal:ApVerseParentSignalSummary|null};
export type ApAttendancePage={rows:ApVerseAttendanceSession[];next:ApAttendanceCursor|null};
export type ApAttendanceQuery={ownerId:string;childId:string;workspaceId:string;workspaceName:string;day:string;after?:ApAttendanceCursor};
export type ApVerseDayQuery={ownerId:string;childId:string;day:string;after?:ApAttendanceCursor};

const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const isUuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const isStamp=(value:unknown):value is string=>typeof value==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));
const signalTypes=['running_late','missing_today','dropped_off','picked_up'] as const;
const signalReasons=['unwell','travelling','other'] as const;
const afterCursor=(value:AttendanceSession,after:ApAttendanceCursor)=>Date.parse(value.starts_at)>Date.parse(after.starts_at)||(Date.parse(value.starts_at)===Date.parse(after.starts_at)&&value.session_id.toLowerCase()>after.session_id.toLowerCase());

function decodeApPage(value:unknown,query:ApAttendanceQuery):ApAttendancePage|null {
 if(!isRecord(value)||value.date!==query.day||typeof value.time_zone!=='string'||!value.time_zone.trim()||!isStamp(value.server_now)||!Array.isArray(value.sessions)||value.sessions.length>50)return null;
 try{new Intl.DateTimeFormat('en',{timeZone:value.time_zone});}catch{return null;}
 const rows:unknown[]=[],metadata:Array<Pick<ApVerseAttendanceSession,'session_version'|'can_signal'|'own_latest_signal'>>=[];
 for(const entry of value.sessions){
  if(!isRecord(entry)||!isUuid(entry.id)||!isUuid(entry.batch_id)||typeof entry.batch_name!=='string'||!entry.batch_name.trim()||entry.batch_name.length>100||!isStamp(entry.starts_at)||!isStamp(entry.ends_at)||Date.parse(entry.ends_at)<=Date.parse(entry.starts_at)||!['scheduled','completed','cancelled'].includes(String(entry.status))||!Number.isSafeInteger(entry.version)||Number(entry.version)<1||typeof entry.can_signal!=='boolean')return null;
  let latest:ApVerseParentSignalSummary|null=null;
  if(entry.own_latest_signal!==null){
   const signal=entry.own_latest_signal;
   if(!isRecord(signal)||!isUuid(signal.id)||!isUuid(signal.child_id)||!isUuid(signal.actor_id)||signal.child_id.toLowerCase()!==query.childId.toLowerCase()||signal.actor_id.toLowerCase()!==query.ownerId.toLowerCase()||!signalTypes.includes(signal.type as typeof signalTypes[number])||!isStamp(signal.created_at))return null;
   if(signal.type==='missing_today'?!signalReasons.includes(signal.reason as typeof signalReasons[number]):signal.reason!==null)return null;
   latest={id:signal.id,type:signal.type as ApVerseParentSignalSummary['type'],reason:signal.reason as ApVerseParentSignalSummary['reason'],created_at:signal.created_at};
  }
  let attendanceStatus:unknown=null;
  if(entry.attendance!==null){
   if(!isRecord(entry.attendance)||!['present','late','absent','excused','make_up'].includes(String(entry.attendance.status)))return null;
   attendanceStatus=entry.attendance.status;
  }
  rows.push({session_id:entry.id,workspace_id:query.workspaceId,workspace_name:query.workspaceName,batch_name:entry.batch_name,starts_at:entry.starts_at,ends_at:entry.ends_at,session_status:entry.status,attendance_status:attendanceStatus,session_version:Number(entry.version),can_signal:entry.can_signal,own_latest_signal:latest});
  metadata.push({session_version:Number(entry.version),can_signal:entry.can_signal,own_latest_signal:latest});
 }
 const decoded=decodeAttendanceSessions(rows);
 if(!decoded||query.after&&decoded.some(row=>!afterCursor(row,query.after!)))return null;
 const extended=decoded.map((row,index)=>({...row,...metadata[index]}));
 let next:ApAttendanceCursor|null=null;
 if(value.next!==null){
  if(!isRecord(value.next)||!isUuid(value.next.id)||!isStamp(value.next.starts_at)||decoded.length!==50)return null;
  const last=extended.at(-1);
  if(!last||last.session_id.toLowerCase()!==value.next.id.toLowerCase()||last.starts_at!==value.next.starts_at)return null;
  next={session_id:value.next.id,starts_at:value.next.starts_at};
 }
 return {rows:extended,next};
}

async function assertCurrentAccount(client:ApAttendanceRpcClient,ownerId:string){
 const identity=await client.auth.getUser();
 if(identity.error||identity.data.user?.id!==ownerId)throw new Error('Account changed');
}
function validZone(value:unknown):value is string{
 if(typeof value!=='string'||!value.trim())return false;
 try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}
}
type ApVerseWorkspace={workspace_id:string;name:string;time_zone:string|null};
function decodeWorkspacePage(value:unknown,after:string|null):{workspaces:ApVerseWorkspace[];next:string|null}|null{
 if(!isRecord(value)||!Array.isArray(value.academies)||value.academies.length>50)return null;
 const workspaces:ApVerseWorkspace[]=[];
 for(const entry of value.academies){
  if(!isRecord(entry)||!isUuid(entry.workspace_id)||typeof entry.name!=='string'||!entry.name.trim()||entry.name.length>100||!(entry.time_zone===null||validZone(entry.time_zone)))return null;
  const previous=workspaces.at(-1)?.workspace_id??after;
  if(previous&&entry.workspace_id.toLowerCase()<=previous.toLowerCase())return null;
  workspaces.push({workspace_id:entry.workspace_id,name:entry.name,time_zone:entry.time_zone});
 }
 if(value.next_after!==null&&(!isUuid(value.next_after)||workspaces.length!==50||workspaces.at(-1)?.workspace_id.toLowerCase()!==value.next_after.toLowerCase()))return null;
 if(value.next_after===null&&workspaces.length===0&&after!==null)return {workspaces,next:null};
 return {workspaces,next:value.next_after as string|null};
}

/** Calls APVerse's workspace-scoped Parent reader and converts it to the shared, allowlisted UI contract. */
export async function loadApVerseAttendancePage(client:ApAttendanceRpcClient,query:ApAttendanceQuery):Promise<ApAttendancePage>{
 if(!isUuid(query.ownerId)||!isUuid(query.childId)||!isUuid(query.workspaceId)||typeof query.workspaceName!=='string'||!query.workspaceName.trim()||query.workspaceName.length>100)throw new Error('Invalid attendance request');
 mondayOf(query.day); // validates the calendar date before any network request
 if(query.after&&(!isUuid(query.after.session_id)||!isStamp(query.after.starts_at)))throw new Error('Invalid attendance cursor');
 await assertCurrentAccount(client,query.ownerId);
 const result=await client.rpc('app_parent_sessions',{p_child_id:query.childId,p_workspace_id:query.workspaceId,p_date:query.day,p_batch_id:null,p_after_start:query.after?.starts_at??null,p_after_id:query.after?.session_id??null});
 if(result.error)throw result.error;
  const page=decodeApPage(result.data,query);
 if(!page)throw new Error('Invalid APVerse attendance response');
 await assertCurrentAccount(client,query.ownerId);
 return page;
}

/** Merges the authenticated child's workspace-scoped APVerse session streams into the Parent's global day timeline. */
export async function loadApVerseAttendanceDay(client:ApAttendanceRpcClient,query:ApVerseDayQuery):Promise<ApAttendancePage>{
 if(!isUuid(query.ownerId)||!isUuid(query.childId))throw new Error('Invalid attendance request');
 mondayOf(query.day);
 if(query.after&&(!isUuid(query.after.session_id)||!isStamp(query.after.starts_at)))throw new Error('Invalid attendance cursor');
 await assertCurrentAccount(client,query.ownerId);

 const workspaces:ApVerseWorkspace[]=[];let workspaceCursor:string|null=null;
 do{
  const result=await client.rpc('app_parent_academies',{p_child_id:query.childId,p_after:workspaceCursor});
  if(result.error)throw result.error;
  const page=decodeWorkspacePage(result.data,workspaceCursor);
  if(!page)throw new Error('Invalid APVerse workspace response');
  workspaces.push(...page.workspaces);
  workspaceCursor=page.next;
 }while(workspaceCursor!==null);

 const loadWorkspacePage=async(workspace:ApVerseWorkspace)=>{
  const result=await client.rpc('app_parent_sessions',{p_child_id:query.childId,p_workspace_id:workspace.workspace_id,p_date:query.day,p_batch_id:null,p_after_start:query.after?.starts_at??null,p_after_id:query.after?.session_id??null});
  if(result.error)throw result.error;
  const page=decodeApPage(result.data,{...query,ownerId:query.ownerId,workspaceId:workspace.workspace_id,workspaceName:workspace.name});
  if(!page)throw new Error('Invalid APVerse attendance response');
  return page;
 };
 const pages:ApAttendancePage[]=[];
 for(let offset=0;offset<workspaces.length;offset+=8)pages.push(...await Promise.all(workspaces.slice(offset,offset+8).map(loadWorkspacePage)));

 await assertCurrentAccount(client,query.ownerId);
 const all=pages.flatMap(page=>page.rows).sort((left,right)=>Date.parse(left.starts_at)-Date.parse(right.starts_at)||left.session_id.toLowerCase().localeCompare(right.session_id.toLowerCase()));
 if(all.some((row,index)=>index>0&&row.session_id.toLowerCase()===all[index-1].session_id.toLowerCase()))throw new Error('Invalid APVerse attendance response');
 const more=all.length>50||pages.some(page=>page.next!==null);
 if(more&&all.length<50)throw new Error('Invalid APVerse attendance response');
 const rows=all.slice(0,50);
 const last=rows.at(-1);
 return {rows,next:more&&last?{session_id:last.session_id,starts_at:last.starts_at}:null};
}
