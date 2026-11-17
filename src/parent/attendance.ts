// Adapted from AM ParentPlus parent-feed/contracts.ts at 380adba.
// Destination wire contract; no Next.js imports or runtime API activation.
export type AttendanceSession={session_id:string;academy_id:string;academy_name:string;batch_name:string;starts_at:string;ends_at:string;session_status:'scheduled'|'completed'|'cancelled';attendance_status:'present'|'late'|'absent'|null};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const stamp=(v:unknown):v is string=>typeof v==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
export function decodeAttendanceSessions(value:unknown):AttendanceSession[]|null {
 if(!Array.isArray(value)||value.length>50)return null;
 const rows:AttendanceSession[]=[];
 for(const row of value){
  if(!row||typeof row!=='object'||!uuid(row.session_id)||!uuid(row.academy_id)||typeof row.academy_name!=='string'||!row.academy_name.trim()||row.academy_name.length>100||typeof row.batch_name!=='string'||!row.batch_name.trim()||row.batch_name.length>100||!stamp(row.starts_at)||!stamp(row.ends_at)||Date.parse(row.ends_at)<=Date.parse(row.starts_at)||!['scheduled','completed','cancelled'].includes(row.session_status)||!(row.attendance_status===null||['present','late','absent'].includes(row.attendance_status)))return null;
  if(rows.some(r=>r.session_id===row.session_id))return null;
  const last=rows.at(-1);
  if(last&&(Date.parse(last.starts_at)>Date.parse(row.starts_at)||(Date.parse(last.starts_at)===Date.parse(row.starts_at)&&last.session_id.toLowerCase()>=row.session_id.toLowerCase())))return null;
  rows.push({session_id:row.session_id,academy_id:row.academy_id,academy_name:row.academy_name,batch_name:row.batch_name,starts_at:row.starts_at,ends_at:row.ends_at,session_status:row.session_status,attendance_status:row.attendance_status});
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
