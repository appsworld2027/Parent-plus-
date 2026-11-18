import {expect,it,vi} from 'vitest';
import {runApVerseChildCreation,type ApChildCreationRpcClient} from '../src/parent/apverseChildCreation';

const owner='00000000-0000-0000-0000-000000000001';
const other='00000000-0000-0000-0000-000000000002';
const intent='00000000-0000-0000-0000-000000000003';
const child='00000000-0000-0000-0000-000000000004';
const request='00000000-0000-0000-0000-000000000005';
const current={intent_id:intent,child_id:child,display_name:'Ari',acknowledged:false,prior_intent_id:null,request_id:request};

function client(data:unknown,error:unknown=null,userId:string|null=owner){
 const rpc=vi.fn(async()=>({data,error}));
 const value:ApChildCreationRpcClient={auth:{getUser:async()=>({data:{user:userId?{id:userId}:null},error:null})},rpc};
 return {value,rpc};
}

it('reads current creation status under the verified owner account',async()=>{
 const fake=client([current]);
 await expect(runApVerseChildCreation(fake.value,{operation:'status',expectedOwnerId:owner})).resolves.toEqual({ok:true,operation:'status',ownerId:owner,current:{intentId:intent,childId:child,name:'Ari',acknowledged:false,priorIntentId:null,requestId:request}});
 expect(fake.rpc).toHaveBeenCalledWith('app_current_child_creation',{});
});

it('represents an empty APVerse creation status without inventing a profile',async()=>{
 const fake=client([]);
 await expect(runApVerseChildCreation(fake.value,{operation:'status',expectedOwnerId:owner})).resolves.toEqual({ok:true,operation:'status',ownerId:owner,current:null});
});

it('creates or reconciles a profile using the server request identity and allowlisted result',async()=>{
 const fake=client([{...current,display_name:'Ari',disposition:'created'}]);
 await expect(runApVerseChildCreation(fake.value,{operation:'begin',expectedOwnerId:owner,displayName:' Ari ',priorIntentId:null,requestId:request})).resolves.toEqual({ok:true,operation:'begin',disposition:'created',current:{intentId:intent,childId:child,name:'Ari',acknowledged:false,priorIntentId:null,requestId:request}});
 expect(fake.rpc).toHaveBeenCalledWith('app_begin_child_creation',{p_display_name:'Ari',p_prior_intent_id:null,p_request_id:request});
});

it('acknowledges only the exact current intent after account verification',async()=>{
 const fake=client(true);
 await expect(runApVerseChildCreation(fake.value,{operation:'ack',expectedOwnerId:owner,intentId:intent})).resolves.toEqual({ok:true,operation:'ack'});
 expect(fake.rpc).toHaveBeenCalledWith('app_ack_child_creation',{p_intent_id:intent});
});

it('fences a validated uncertain request for the verified owner',async()=>{
 const fake=client('fenced');
 await expect(runApVerseChildCreation(fake.value,{operation:'fence',expectedOwnerId:owner,priorIntentId:null,requestId:request})).resolves.toEqual({ok:true,operation:'fence',ownerId:owner,disposition:'fenced'});
 expect(fake.rpc).toHaveBeenCalledWith('app_fence_child_creation',{p_prior_intent_id:null,p_request_id:request});
});

it('checks child creation history for the verified owner',async()=>{
 const fake=client('found');
 await expect(runApVerseChildCreation(fake.value,{operation:'history',expectedOwnerId:owner,priorIntentId:null,requestId:request})).resolves.toEqual({ok:true,operation:'history',ownerId:owner,disposition:'found'});
 expect(fake.rpc).toHaveBeenCalledWith('app_historical_child_creation',{p_prior_intent_id:null,p_request_id:request});
});

it('does not call APVerse for an account mismatch or missing account',async()=>{
 const wrong=client([],null,other),missing=client([],null,null);
 await expect(runApVerseChildCreation(wrong.value,{operation:'status',expectedOwnerId:owner})).resolves.toMatchObject({ok:false});
 await expect(runApVerseChildCreation(missing.value,{operation:'status',expectedOwnerId:owner})).resolves.toMatchObject({ok:false});
 expect(wrong.rpc).not.toHaveBeenCalled();expect(missing.rpc).not.toHaveBeenCalled();
});

it('rejects malformed operation inputs before account or RPC access',async()=>{
 const fake=client([]);
 const invalid=[
  {operation:'begin',expectedOwnerId:owner,displayName:' ',priorIntentId:null,requestId:request},
  {operation:'begin',expectedOwnerId:owner,displayName:'x'.repeat(121),priorIntentId:null,requestId:request},
  {operation:'begin',expectedOwnerId:owner,displayName:'Ari',priorIntentId:'bad',requestId:request},
  {operation:'ack',expectedOwnerId:owner,intentId:'bad'},
  {operation:'fence',expectedOwnerId:owner,priorIntentId:'bad',requestId:request},
  {operation:'history',expectedOwnerId:owner,priorIntentId:null,requestId:'bad'},
  {operation:'unknown',expectedOwnerId:owner},
 ];
 for(const input of invalid)await expect(runApVerseChildCreation(fake.value,input)).resolves.toMatchObject({ok:false});
 expect(fake.rpc).not.toHaveBeenCalled();
});

it.each([
 ['too many current rows',[current,current]],
 ['malformed child id',[{...current,child_id:'invalid'}]],
 ['unbounded child name',[{...current,display_name:'x'.repeat(121)}]],
 ['contradictory begin disposition',[{...current,acknowledged:true,disposition:'created'}]],
 ['different request id',[{...current,request_id:other,disposition:'existing'}]],
] as const)('fails closed on %s from APVerse',async(_case,data)=>{
 const fake=client(data);
 const input=_case==='too many current rows'||_case==='malformed child id'||_case==='unbounded child name'
  ? {operation:'status',expectedOwnerId:owner}
  : {operation:'begin',expectedOwnerId:owner,displayName:'Ari',priorIntentId:null,requestId:request};
 await expect(runApVerseChildCreation(fake.value,input)).resolves.toMatchObject({ok:false});
});

it('does not expose private RPC error details to the Parent UI',async()=>{
 const fake=client(null,{message:'private database detail'});
 const result=await runApVerseChildCreation(fake.value,{operation:'status',expectedOwnerId:owner});
 expect(result).toMatchObject({ok:false});expect(JSON.stringify(result)).not.toContain('private database detail');
});
