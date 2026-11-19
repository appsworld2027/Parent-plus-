import {expect,it,vi} from 'vitest';
import {loadApVerseAttendanceDay,loadApVerseAttendancePage,type ApAttendanceRpcClient} from '../src/parent/apverseAttendance';

const ids={owner:'00000000-0000-0000-0000-000000000001',child:'00000000-0000-0000-0000-000000000002',workspace:'00000000-0000-0000-0000-000000000003',session:'00000000-0000-0000-0000-000000000041',batch:'00000000-0000-0000-0000-000000000042',enrollment:'00000000-0000-0000-0000-000000000043'};
const row={id:ids.session,batch_id:ids.batch,batch_name:'Drawing',course_name:'Art',starts_at:'2026-11-16T10:00:00Z',ends_at:'2026-11-16T11:00:00Z',status:'scheduled',version:1,enrollment_id:ids.enrollment,enrollment_status:'active',attendance:null,own_latest_signal:null,can_signal:true};
const response={date:'2026-11-16',time_zone:'Asia/Kolkata',server_now:'2026-11-16T08:00:00Z',sessions:[row],next:null};
function client(data:unknown,userId:string|null=ids.owner,error?:unknown){
 const rpc=vi.fn(async()=>({data,error}));
 const value:ApAttendanceRpcClient={auth:{getUser:async()=>({data:{user:userId?{id:userId}:null},error:null})},rpc};
 return {value,rpc};
}
function routedClient(handler:(name:string,args:Record<string,unknown>)=>unknown,userId:string|null=ids.owner){
 const rpc=vi.fn(async(name:string,args:Record<string,unknown>)=>({data:handler(name,args),error:null}));
 const value:ApAttendanceRpcClient={auth:{getUser:async()=>({data:{user:userId?{id:userId}:null},error:null})},rpc};
 return {value,rpc};
}

it('adapts APVerse session rows to the shared Parent attendance contract and omits private fields',async()=>{
 const fake=client({...response,sessions:[{...row,private_note:'never expose'}]});
 await expect(loadApVerseAttendancePage(fake.value,{ownerId:ids.owner,childId:ids.child,workspaceId:ids.workspace,workspaceName:'North Academy',day:'2026-11-16'})).resolves.toEqual({rows:[{session_id:ids.session,workspace_id:ids.workspace,workspace_name:'North Academy',batch_name:'Drawing',starts_at:row.starts_at,ends_at:row.ends_at,session_status:'scheduled',attendance_status:null,session_version:1,can_signal:true,own_latest_signal:null}],next:null});
 expect(fake.rpc).toHaveBeenCalledWith('app_parent_sessions',{p_child_id:ids.child,p_workspace_id:ids.workspace,p_date:'2026-11-16',p_batch_id:null,p_after_start:null,p_after_id:null});
});

it('retains only validated session version, report eligibility and the signed-in parent latest signal',async()=>{
 const latest={id:'00000000-0000-0000-0000-000000000045',child_id:ids.child,actor_id:ids.owner,type:'missing_today',reason:'unwell',created_at:'2026-11-16T09:00:00Z'};
 const fake=client({...response,sessions:[{...row,own_latest_signal:latest,extra:'private'}]});
 const page=await loadApVerseAttendancePage(fake.value,{ownerId:ids.owner,childId:ids.child,workspaceId:ids.workspace,workspaceName:'North Academy',day:'2026-11-16'});
 expect(page.rows[0]).toMatchObject({session_version:1,can_signal:true,own_latest_signal:{id:latest.id,type:'missing_today',reason:'unwell',created_at:latest.created_at}});
 expect(page.rows[0]).not.toHaveProperty('actor_id');
});

it('preserves recorded attendance, validates the returned next cursor, and sends a validated cursor',async()=>{
 const after={session_id:'00000000-0000-0000-0000-000000000040',starts_at:'2026-11-16T09:00:00Z'};
 const sessions=Array.from({length:50},(_,index)=>({...row,id:`00000000-0000-0000-0000-${String(index+1).padStart(12,'0')}`,starts_at:new Date(Date.parse(row.starts_at)+index*60_000).toISOString(),ends_at:new Date(Date.parse(row.ends_at)+index*60_000).toISOString(),attendance:index===0?{status:'late',confirmed_at:'2026-11-16T10:08:00Z'}:null}));
 const last=sessions.at(-1)!;
 const fake=client({...response,sessions,next:{starts_at:last.starts_at,id:last.id}});
 const page=await loadApVerseAttendancePage(fake.value,{ownerId:ids.owner,childId:ids.child,workspaceId:ids.workspace,workspaceName:'North Academy',day:'2026-11-16',after});
 expect(page.rows).toHaveLength(50);expect(page.rows[0].attendance_status).toBe('late');expect(page.next).toEqual({starts_at:last.starts_at,session_id:last.id});
 expect(fake.rpc).toHaveBeenCalledWith('app_parent_sessions',expect.objectContaining({p_after_start:after.starts_at,p_after_id:after.session_id}));
});
it.each(['excused','make_up'] as const)('preserves APVerse-only attendance outcome %s',async status=>{
 const fake=client({...response,sessions:[{...row,attendance:{status,confirmed_at:'2026-11-16T10:08:00Z'}}]});
 const page=await loadApVerseAttendancePage(fake.value,{ownerId:ids.owner,childId:ids.child,workspaceId:ids.workspace,workspaceName:'North Academy',day:'2026-11-16'});
 expect(page.rows[0].attendance_status).toBe(status);
});

it.each([
 ['unknown session status',{...response,sessions:[{...row,status:'unknown'}]}],
 ['unknown attendance status',{...response,sessions:[{...row,attendance:{status:'future_status'}}]}],
 ['non-positive session duration',{...response,sessions:[{...row,ends_at:row.starts_at}] }],
 ['cursor that is not the last returned row',{...response,next:{starts_at:'2026-11-16T12:00:00Z',id:ids.session}}],
 ['different response date',{...response,date:'2026-11-15'}],
 ['invalid session version',{...response,sessions:[{...row,version:0}]}],
 ['invalid signal permission flag',{...response,sessions:[{...row,can_signal:'true'}]}],
 ['latest signal belongs to another child',{...response,sessions:[{...row,own_latest_signal:{id:'00000000-0000-0000-0000-000000000045',child_id:ids.workspace,actor_id:ids.owner,type:'running_late',reason:null,created_at:'2026-11-16T09:00:00Z'}}]}],
 ['latest signal belongs to another account',{...response,sessions:[{...row,own_latest_signal:{id:'00000000-0000-0000-0000-000000000045',child_id:ids.child,actor_id:ids.workspace,type:'running_late',reason:null,created_at:'2026-11-16T09:00:00Z'}}]}],
])('rejects malformed APVerse response: %s',async (_reason,data)=>{
 const fake=client(data);
 await expect(loadApVerseAttendancePage(fake.value,{ownerId:ids.owner,childId:ids.child,workspaceId:ids.workspace,workspaceName:'North Academy',day:'2026-11-16'})).rejects.toThrow('Invalid APVerse attendance response');
});

it('does not call the database when the signed-in account changes',async()=>{
 const fake=client(response,'00000000-0000-0000-0000-000000000099');
 await expect(loadApVerseAttendancePage(fake.value,{ownerId:ids.owner,childId:ids.child,workspaceId:ids.workspace,workspaceName:'North Academy',day:'2026-11-16'})).rejects.toThrow('Account changed');
 expect(fake.rpc).not.toHaveBeenCalled();
});

it('merges Parent attendance from every authorized APVerse workspace in chronological order',async()=>{
 const secondWorkspace='00000000-0000-0000-0000-000000000004';
 const academyPage={academies:[{workspace_id:ids.workspace,name:'North Academy',time_zone:'Asia/Kolkata'},{workspace_id:secondWorkspace,name:'East Academy',time_zone:'UTC'}],next_after:null};
 const north={...response,sessions:[{...row,starts_at:'2026-11-16T10:00:00Z',ends_at:'2026-11-16T11:00:00Z'}]};
 const eastRow={...row,id:'00000000-0000-0000-0000-000000000044',starts_at:'2026-11-16T09:30:00Z',ends_at:'2026-11-16T10:30:00Z'};
 const east={...response,sessions:[eastRow]};
 const fake=routedClient((name,args)=>name==='app_parent_academies'?academyPage:args.p_workspace_id===ids.workspace?north:east);
 const page=await loadApVerseAttendanceDay(fake.value,{ownerId:ids.owner,childId:ids.child,day:'2026-11-16'});
 expect(page.rows.map(value=>[value.workspace_name,value.session_id])).toEqual([['East Academy',eastRow.id],['North Academy',ids.session]]);
 expect(fake.rpc).toHaveBeenCalledTimes(3);
});

it('uses one global cursor when the merged workspace stream exceeds 50 sessions',async()=>{
 const secondWorkspace='00000000-0000-0000-0000-000000000004';
 const sessions=Array.from({length:50},(_,index)=>({...row,id:`00000000-0000-0000-0000-${String(index+100).padStart(12,'0')}`,starts_at:new Date(Date.parse(row.starts_at)+index*60_000).toISOString(),ends_at:new Date(Date.parse(row.ends_at)+index*60_000).toISOString()}));
 const last=sessions.at(-1)!;
 const extra={...row,id:'00000000-0000-0000-0000-000000000090',starts_at:'2026-11-16T09:30:00Z',ends_at:'2026-11-16T10:30:00Z'};
 const academyPage={academies:[{workspace_id:ids.workspace,name:'North Academy',time_zone:'UTC'},{workspace_id:secondWorkspace,name:'East Academy',time_zone:'UTC'}],next_after:null};
 const fake=routedClient((name,args)=>name==='app_parent_academies'?academyPage:args.p_workspace_id===ids.workspace?{...response,sessions,next:{starts_at:last.starts_at,id:last.id}}:{...response,sessions:[extra]});
 const page=await loadApVerseAttendanceDay(fake.value,{ownerId:ids.owner,childId:ids.child,day:'2026-11-16'});
 expect(page.rows).toHaveLength(50);expect(page.rows[0].workspace_name).toBe('East Academy');expect(page.next).toEqual({session_id:page.rows[49].session_id,starts_at:page.rows[49].starts_at});
});

