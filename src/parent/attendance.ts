// Adapted from AM ParentPlus parent-feed/contracts.ts at 380adba.
// Destination wire contract; no Next.js imports or runtime API activation.
export type AttendanceStatus='present'|'late'|'absent'|'excused'|'make_up';
export type AttendanceSession={session_id:string;workspace_id:string;workspace_name:string;batch_name:string;starts_at:string;ends_at:string;session_status:'scheduled'|'completed'|'cancelled';attendance_status:AttendanceStatus|null};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const stamp=(v:unknown):v is string=>typeof v==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
export function decodeAttendanceSessions(value:unknown):AttendanceSession[]|null {
 if(!Array.isArray(value)||value.length>50)return null;
 const rows:AttendanceSession[]=[];
 for(const row of value){
  if(!row||typeof row!=='object')return null;
  const workspaceId=row.workspace_id??row.academy_id,workspaceName=row.workspace_name??row.academy_name;
  if((row.workspace_id!==undefined&&row.academy_id!==undefined&&row.workspace_id!==row.academy_id)||(row.workspace_name!==undefined&&row.academy_name!==undefined&&row.workspace_name!==row.academy_name)||!uuid(row.session_id)||!uuid(workspaceId)||typeof workspaceName!=='string'||!workspaceName.trim()||workspaceName.length>100||typeof row.batch_name!=='string'||!row.batch_name.trim()||row.batch_name.length>100||!stamp(row.starts_at)||!stamp(row.ends_at)||Date.parse(row.ends_at)<=Date.parse(row.starts_at)||!['scheduled','completed','cancelled'].includes(row.session_status)||!(row.attendance_status===null||['present','late','absent','excused','make_up'].includes(row.attendance_status)))return null;
  if(rows.some(r=>r.session_id===row.session_id))return null;
  const last=rows.at(-1);
  if(last&&(Date.parse(last.starts_at)>Date.parse(row.starts_at)||(Date.parse(last.starts_at)===Date.parse(row.starts_at)&&last.session_id.toLowerCase()>=row.session_id.toLowerCase())))return null;
  rows.push({session_id:row.session_id,workspace_id:workspaceId,workspace_name:workspaceName,batch_name:row.batch_name,starts_at:row.starts_at,ends_at:row.ends_at,session_status:row.session_status,attendance_status:row.attendance_status});
 }
 return rows;
}
// Source's Monday calculation is reused for the later weekly attendance view.
export function mondayOf(day:string):string {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('Invalid day');
 const d=new Date(`${day}T12:00:00Z`);
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==day)throw new Error('Invalid day');
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);
}
