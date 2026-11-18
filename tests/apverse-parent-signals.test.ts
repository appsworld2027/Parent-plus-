import {expect,it,vi} from 'vitest';
import {sendApVerseParentSignal,checkApVerseParentSignal,type ApParentSignalRpcClient} from '../src/parent/apverseParentSignals';

const owner='00000000-0000-0000-0000-000000000001';
const child='00000000-0000-0000-0000-000000000002';
const workspace='00000000-0000-0000-0000-000000000003';
const session='00000000-0000-0000-0000-000000000004';
const request='00000000-0000-0000-0000-000000000005';
const signal='00000000-0000-0000-0000-000000000006';
const created='2026-11-18T10:00:00.000Z';
const payload={operation:'send_parent_signal',child_id:child,workspace_id:workspace,session_id:session,expected_session_version:2,type:'missing_today',reason:'unwell'};
const receipt={request_id:request,signal_id:signal,session_id:session,child_id:child,type:'missing_today',reason:'unwell',created_at:created};

function client(data:unknown,error:unknown=null,userId:string|null=owner){
 const rpc=vi.fn(async()=>({data,error}));
 const value:ApParentSignalRpcClient={auth:{getUser:async()=>({data:{user:userId?{id:userId}:null},error:null})},rpc};
 return {value,rpc};
}

it('sends a canonical Parent report with the stable request identity and no actor-supplied account id',async()=>{
 const fake=client(receipt);
 await expect(sendApVerseParentSignal(fake.value,{ownerId:owner,requestId:request,payload})).resolves.toEqual({ok:true,receipt:{requestId:request,signalId:signal,sessionId:session,childId:child,type:'missing_today',reason:'unwell',createdAt:created}});
 expect(fake.rpc).toHaveBeenCalledWith('app_send_parent_signal',{p_child_id:child,p_workspace_id:workspace,p_session_id:session,p_expected_session_version:2,p_type:'missing_today',p_reason:'unwell',p_request_id:request});
});

it('checks a known retry result using the exact original payload and request id',async()=>{
 const fake=client({state:'known',receipt});
 await expect(checkApVerseParentSignal(fake.value,{ownerId:owner,requestId:request,payload})).resolves.toEqual({ok:true,state:'known',receipt:{requestId:request,signalId:signal,sessionId:session,childId:child,type:'missing_today',reason:'unwell',createdAt:created}});
 expect(fake.rpc).toHaveBeenCalledWith('app_parent_signal_request_status',{p_child_id:child,p_workspace_id:workspace,p_session_id:session,p_request_id:request,p_payload:payload});
});

it('keeps an unknown request distinct from a failed or empty report',async()=>{
 const fake=client({state:'unknown',receipt:null});
 await expect(checkApVerseParentSignal(fake.value,{ownerId:owner,requestId:request,payload})).resolves.toEqual({ok:true,state:'unknown',receipt:null});
});

it('does not call APVerse for a missing or different signed-in owner',async()=>{
 const wrong=client(null,null,workspace),missing=client(null,null,null);
 await expect(sendApVerseParentSignal(wrong.value,{ownerId:owner,requestId:request,payload})).resolves.toEqual({ok:false,kind:'forbidden'});
 await expect(sendApVerseParentSignal(missing.value,{ownerId:owner,requestId:request,payload})).resolves.toEqual({ok:false,kind:'forbidden'});
 expect(wrong.rpc).not.toHaveBeenCalled();expect(missing.rpc).not.toHaveBeenCalled();
});

it('rejects invalid scope, request identity, signal type and reason before network access',async()=>{
 const fake=client(receipt);
 const invalid=[
  {ownerId:'bad',requestId:request,payload},
  {ownerId:owner,requestId:'bad',payload},
  {ownerId:owner,requestId:request,payload:{...payload,child_id:'bad'}},
  {ownerId:owner,requestId:request,payload:{...payload,expected_session_version:0}},
  {ownerId:owner,requestId:request,payload:{...payload,type:'unknown'}},
  {ownerId:owner,requestId:request,payload:{...payload,type:'picked_up',reason:'unwell'}},
  {ownerId:owner,requestId:request,payload:{...payload,type:'missing_today',reason:'unknown'}},
  {ownerId:owner,requestId:request,payload:{...payload,extra:'must not be sent'}},
 ];
 for(const input of invalid)await expect(sendApVerseParentSignal(fake.value,input)).resolves.toMatchObject({ok:false,kind:'invalid'});
 expect(fake.rpc).not.toHaveBeenCalled();
});

it('rejects a valid-looking receipt for a different child/session/request or changed payload',async()=>{
 const mismatches=[{...receipt,request_id:workspace},{...receipt,child_id:workspace},{...receipt,session_id:workspace},{...receipt,type:'picked_up',reason:null}];
 for(const bad of mismatches){
  const fake=client(bad);
  await expect(sendApVerseParentSignal(fake.value,{ownerId:owner,requestId:request,payload})).resolves.toEqual({ok:false,kind:'unknown'});
 }
});

it('fails closed on malformed retry status and malformed known receipts',async()=>{
 for(const data of [null,{}, {state:'unknown'}, {state:'known',receipt:{...receipt,signal_id:'bad'}}, {state:'known',receipt:{...receipt,request_id:workspace}}]){
  const fake=client(data);
  await expect(checkApVerseParentSignal(fake.value,{ownerId:owner,requestId:request,payload})).resolves.toEqual({ok:false,kind:'unknown'});
 }
});

it('classifies authorization and changed-request responses without exposing provider details',async()=>{
 const denied=client(null,{code:'42501',message:'private row detail'}),changed=client(null,{code:'23505',message:'private receipt detail'});
 const a=await sendApVerseParentSignal(denied.value,{ownerId:owner,requestId:request,payload});
 const b=await sendApVerseParentSignal(changed.value,{ownerId:owner,requestId:request,payload});
 expect(a).toEqual({ok:false,kind:'forbidden'});expect(b).toEqual({ok:false,kind:'conflict'});
 expect(JSON.stringify([a,b])).not.toMatch(/private (row|receipt) detail/);
});

it('rechecks the account after an in-flight report RPC',async()=>{
 let reads=0;
 const fake:ApParentSignalRpcClient={auth:{getUser:async()=>({data:{user:{id:++reads===1?owner:workspace}},error:null})},rpc:async()=>({data:receipt,error:null})};
 await expect(sendApVerseParentSignal(fake,{ownerId:owner,requestId:request,payload})).resolves.toEqual({ok:false,kind:'forbidden'});
});

it('does not expose an RPC network error as a saved or empty report',async()=>{
 const fake=client(null,{code:'FETCH_ERROR',message:'private transport detail'});
 const result=await sendApVerseParentSignal(fake.value,{ownerId:owner,requestId:request,payload});
 expect(result).toEqual({ok:false,kind:'unknown'});expect(JSON.stringify(result)).not.toContain('private transport detail');
});
