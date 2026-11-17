import {supabase} from '../auth/client';
import {decodeAttendanceSessions,mondayOf,type AttendanceSession} from './attendance';
export async function loadAttendancePage(owner:string,child:string,day:string,after?:AttendanceSession):Promise<AttendanceSession[]> {
 if(!supabase)throw new Error('Unavailable');
 mondayOf(day); // Reject invalid calendar dates before a network request.
 const identity=await supabase.auth.getUser();
 if(identity.error||identity.data.user?.id!==owner)throw new Error('Account changed');
 const result=await supabase.rpc('get_parent_attendance_sessions',{target_child:child,target_day:day,after_start:after?.starts_at??null,after_id:after?.session_id??null});
 if(result.error)throw result.error;
 const rows=decodeAttendanceSessions(result.data);
 if(!rows)throw new Error('Invalid attendance response');
 if(after&&rows.some(row=>Date.parse(row.starts_at)<Date.parse(after.starts_at)||(Date.parse(row.starts_at)===Date.parse(after.starts_at)&&row.session_id.toLowerCase()<=after.session_id.toLowerCase())))throw new Error('Invalid attendance cursor');
 return rows;
}
