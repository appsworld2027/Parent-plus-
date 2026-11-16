import {supabase} from '../auth/client';
export type ParentRequest={id:string;academy_id:string;student_id:string;child_id:string;parent_user_id:string;guardian_email:string;parent_name:string;child_name:string;born_on:string|null;status:'pending'|'approved'|'rejected'|'cancelled';link_id:string|null};
export type CoachRequest={id:string;student_id:string;student_name:string;parent_user_id:string;guardian_email:string;parent_name:string;child_name:string;born_on:string|null;requested_at:string};
export async function coachRequests(academy:string):Promise<CoachRequest[]>{
  if(!supabase)throw new Error('Unavailable');const result=await supabase.rpc('get_coach_parent_requests',{target_academy:academy});if(result.error)throw result.error;return result.data??[];
}
export function identityFailure(error:unknown){
  const code=error&&typeof error==='object'&&'code'in error?String(error.code):'';
  if(['PGRST202','PGRST205','42P01'].includes(code))return 'The Parent connection security update014 must be installed before connecting accounts.';
  if(code==='40001')return 'The parent or child details changed. Reject this request and issue a fresh invitation before approving.';
  if(code==='22023')return 'This invitation or request is unavailable for this account, expired, or already resolved. Check the guardian email and refresh the connection status.';
  if(code==='42501')return 'Sign in with the intended verified guardian email. Only the owning coach can approve the child match.';
  return 'The connection could not be confirmed. Keep your entries and refresh the saved status before retrying.';
}
