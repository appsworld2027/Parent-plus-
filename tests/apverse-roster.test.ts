import { describe, expect, it, vi } from 'vitest';
import { addConnectedChildToBatch, loadApVerseRoster, type ApVerseRosterRpc } from '../src/roster/apverseService';

const workspace='00000000-0000-0000-0000-000000000010';
const batchA='00000000-0000-0000-0000-000000000020';
const batchB='00000000-0000-0000-0000-000000000021';
const childA='00000000-0000-0000-0000-000000000030';
const childB='00000000-0000-0000-0000-000000000031';
const enrollmentA='00000000-0000-0000-0000-000000000040';
const request='00000000-0000-0000-0000-000000000050';

describe('APVerse Coach roster', () => {
  it('combines only connected children and their authorized batch enrollments', async () => {
    const rpc: ApVerseRosterRpc=vi.fn(async(name,args)=>{
      if(name==='app_enrollment_batches')return {data:[
        {batch_id:batchA,batch_name:'Studio A',course_name:'Drawing'},
        {batch_id:batchB,batch_name:'Studio B',course_name:'Clay'},
      ],error:null};
      if(name==='app_batch_enrollments')return {data:args.p_batch_id===batchA?[
        {enrollment_id:enrollmentA,child_id:childA,child_name:'Asha',status:'active',version:1},
      ]:[{enrollment_id:'00000000-0000-0000-0000-000000000041',child_id:childA,child_name:'Asha',status:'paused',version:2}],error:null};
      if(name==='app_enrollment_candidates')return {data:[
        {child_id:childA,child_name:'Asha'},
        {child_id:childB,child_name:'Ravi'},
      ],error:null};
      throw new Error(`Unexpected RPC ${name}`);
    });

    await expect(loadApVerseRoster(workspace,rpc)).resolves.toEqual({
      canManageEnrollments:true,
      batches:[
        {id:batchA,name:'Studio A',courseName:'Drawing'},
        {id:batchB,name:'Studio B',courseName:'Clay'},
      ],
      students:[
        {id:childA,name:'Asha',enrollments:[
          {id:enrollmentA,batchId:batchA,batchName:'Studio A',status:'active',version:1},
          {id:'00000000-0000-0000-0000-000000000041',batchId:batchB,batchName:'Studio B',status:'paused',version:2},
        ]},
        {id:childB,name:'Ravi',enrollments:[]},
      ],
    });
    expect(rpc).toHaveBeenCalledWith('app_enrollment_batches',{p_workspace_id:workspace});
    expect(rpc).toHaveBeenCalledWith('app_batch_enrollments',{p_workspace_id:workspace,p_batch_id:batchA,p_after:null});
    expect(rpc).toHaveBeenCalledWith('app_enrollment_candidates',{p_workspace_id:workspace,p_after:null});
  });

  it('limits a Coach to server-authorized assigned batches when manager-only candidates are denied', async () => {
    const rpc: ApVerseRosterRpc=vi.fn(async(name)=>{
      if(name==='app_enrollment_batches')return {data:[{batch_id:batchA,batch_name:'Assigned',course_name:'Music'}],error:null};
      if(name==='app_batch_enrollments')return {data:[{enrollment_id:enrollmentA,child_id:childA,child_name:'Asha',status:'active',version:1}],error:null};
      if(name==='app_enrollment_candidates')return {data:null,error:{code:'42501'}};
      throw new Error(`Unexpected RPC ${name}`);
    });
    await expect(loadApVerseRoster(workspace,rpc)).resolves.toEqual({
      canManageEnrollments:false,
      batches:[{id:batchA,name:'Assigned',courseName:'Music'}],
      students:[{id:childA,name:'Asha',enrollments:[{id:enrollmentA,batchId:batchA,batchName:'Assigned',status:'active',version:1}]}],
    });
  });

  it('loads all enrollment pages and rejects a cursor that does not advance', async () => {
    const first=Array.from({length:50},(_,i)=>({
      enrollment_id:`00000000-0000-0000-0001-${String(i+1).padStart(12,'0')}`,
      child_id:`00000000-0000-0000-0002-${String(i+1).padStart(12,'0')}`,
      child_name:`Child ${i+1}`,status:'active',version:1,
    }));
    const rpc: ApVerseRosterRpc=vi.fn(async(name,args)=>{
      if(name==='app_enrollment_batches')return {data:[{batch_id:batchA,batch_name:'Studio',course_name:'Art'}],error:null};
      if(name==='app_batch_enrollments')return {data:args.p_after===null?first:[{
        enrollment_id:'00000000-0000-0000-0001-000000000051',child_id:childB,child_name:'Child 51',status:'active',version:1,
      }],error:null};
      if(name==='app_enrollment_candidates')return {data:null,error:{code:'42501'}};
      throw new Error(`Unexpected RPC ${name}`);
    });
    const roster=await loadApVerseRoster(workspace,rpc);
    expect(roster.students).toHaveLength(51);
    expect(rpc).toHaveBeenCalledWith('app_batch_enrollments',{p_workspace_id:workspace,p_batch_id:batchA,p_after:first.at(-1)!.enrollment_id});

    const stuck: ApVerseRosterRpc=vi.fn(async(name)=>{
      if(name==='app_enrollment_batches')return {data:[{batch_id:batchA,batch_name:'Studio',course_name:'Art'}],error:null};
      if(name==='app_batch_enrollments')return {data:first,error:null};
      return {data:null,error:{code:'42501'}};
    });
    await expect(loadApVerseRoster(workspace,stuck)).rejects.toThrow('Invalid APVerse roster cursor');
  });

  it('keeps backend and malformed-response errors distinct from a genuinely empty roster', async () => {
    const failure: ApVerseRosterRpc=vi.fn().mockResolvedValue({data:null,error:{code:'08006'}});
    await expect(loadApVerseRoster(workspace,failure)).rejects.toMatchObject({code:'08006'});

    const malformed: ApVerseRosterRpc=vi.fn(async(name)=>name==='app_enrollment_batches'
      ? {data:[{batch_id:'bad-id',batch_name:'Studio',course_name:'Art'}],error:null}
      : {data:[],error:null});
    await expect(loadApVerseRoster(workspace,malformed)).rejects.toThrow('Invalid APVerse roster response');
  });

  it('saves one child enrollment with the caller-owned retry identity', async () => {
    const rpc: ApVerseRosterRpc=vi.fn().mockResolvedValue({data:[{enrollment_id:enrollmentA,status:'active',version:1}],error:null});
    await expect(addConnectedChildToBatch(workspace,batchA,childA,request,rpc)).resolves.toEqual({id:enrollmentA,status:'active',version:1});
    expect(rpc).toHaveBeenCalledExactlyOnceWith('app_save_enrollment',{
      p_workspace_id:workspace,p_batch_id:batchA,p_child_id:childA,p_request_id:request,
    });
  });

  it('rejects an invalid enrollment receipt instead of claiming a save', async () => {
    const rpc: ApVerseRosterRpc=vi.fn().mockResolvedValue({data:[],error:null});
    await expect(addConnectedChildToBatch(workspace,batchA,childA,request,rpc)).rejects.toThrow('Invalid APVerse enrollment response');
  });
});
