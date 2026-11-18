export type ApChildCreationRpcClient={
 auth:{getUser:()=>Promise<{data:{user:{id:string}|null};error:unknown|null}>};
 rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:unknown|null}>;
};
type Current={intentId:string;childId:string;name:string;acknowledged:boolean;priorIntentId:string|null;requestId:string};
type Operation='status'|'begin'|'ack'|'fence'|'history';
type Result=
 | {ok:false;error:string}
 | {ok:true;operation:'status';ownerId:string;current:Current|null}
 | {ok:true;operation:'begin';current:Current;disposition:'created'|'existing'}
 | {ok:true;operation:'ack'}
 | {ok:true;operation:'fence';ownerId:string;disposition:'fenced'|'created'|'unknown'}
 | {ok:true;operation:'history';ownerId:string;disposition:'found'|'unknown'};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId=(value:unknown):value is string=>typeof value==='string'&&UUID.test(value);
const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const invalid:Result={ok:false,error:'Check the child profile details.'};
const unavailable:Result={ok:false,error:'Unable to confirm the profile. Check its status before trying again.'};

function parseCurrent(row:unknown):Current|null{
 if(!isRecord(row)||!isId(row.intent_id)||!isId(row.child_id)||typeof row.display_name!=='string'||!row.display_name.trim()||Array.from(row.display_name).length>120||typeof row.acknowledged!=='boolean'||!isId(row.request_id)||(row.prior_intent_id!==null&&!isId(row.prior_intent_id)))return null;
 return {intentId:row.intent_id,childId:row.child_id,name:row.display_name,acknowledged:row.acknowledged,priorIntentId:row.prior_intent_id,requestId:row.request_id};
}

async function rpcForOwner(client:ApChildCreationRpcClient,ownerId:string,name:string,args:Record<string,unknown>):Promise<unknown>{
 const before=await client.auth.getUser();
 if(before.error||before.data.user?.id.toLowerCase()!==ownerId.toLowerCase())throw new Error('Owner changed');
 const result=await client.rpc(name,args);
 if(result.error)throw new Error('APVerse request failed');
 const after=await client.auth.getUser();
 if(after.error||after.data.user?.id.toLowerCase()!==ownerId.toLowerCase())throw new Error('Owner changed');
 return result.data;
}

/** Runs the account-bound APVerse child creation/status/recovery RPCs without exposing provider errors. */
export async function runApVerseChildCreation(client:ApChildCreationRpcClient,input:unknown):Promise<Result>{
 if(!isRecord(input)||!['status','begin','ack','fence','history'].includes(String(input.operation))||!isId(input.expectedOwnerId))return invalid;
 const value=input as Record<string,unknown>&{operation:Operation;expectedOwnerId:string};
 if(value.operation==='begin'&&(typeof value.displayName!=='string'||!isId(value.requestId)||(value.priorIntentId!==null&&!isId(value.priorIntentId))))return invalid;
 if(value.operation==='ack'&&!isId(value.intentId))return invalid;
 if((value.operation==='fence'||value.operation==='history')&&(!isId(value.requestId)||(value.priorIntentId!==null&&!isId(value.priorIntentId))))return invalid;
 const ownerId=value.expectedOwnerId;
 try{
  if(value.operation==='status'){
   const data=await rpcForOwner(client,ownerId,'app_current_child_creation',{});
   if(!Array.isArray(data)||data.length>1)return unavailable;
   if(data.length===0)return {ok:true,operation:'status',ownerId,current:null};
   const current=parseCurrent(data[0]);
   return current?{ok:true,operation:'status',ownerId,current}:unavailable;
  }
  if(value.operation==='begin'){
   const name=(value.displayName as string).trim();
   if(!name||Array.from(name).length>120)return invalid;
   const data=await rpcForOwner(client,ownerId,'app_begin_child_creation',{p_display_name:name,p_prior_intent_id:value.priorIntentId,p_request_id:value.requestId});
   if(!Array.isArray(data)||data.length!==1)return unavailable;
   const row=data[0],current=parseCurrent(row),disposition=isRecord(row)?row.disposition:undefined;
   if(!current||current.name!==name||current.requestId.toLowerCase()!==(value.requestId as string).toLowerCase()||(current.priorIntentId?.toLowerCase()??null)!==(isId(value.priorIntentId)?value.priorIntentId.toLowerCase():null)||(disposition!=='created'&&disposition!=='existing')||(disposition==='created'&&current.acknowledged))return unavailable;
   return {ok:true,operation:'begin',current,disposition};
  }
  if(value.operation==='ack'){
   const data=await rpcForOwner(client,ownerId,'app_ack_child_creation',{p_intent_id:value.intentId});
   return data===true?{ok:true,operation:'ack'}:unavailable;
  }
  if(value.operation==='fence'||value.operation==='history'){
   const history=value.operation==='history';
   const data=await rpcForOwner(client,ownerId,history?'app_historical_child_creation':'app_fence_child_creation',{p_prior_intent_id:value.priorIntentId,p_request_id:value.requestId});
   const accepted=history?['found','unknown']:['fenced','created','unknown'];
   if(typeof data!=='string'||!accepted.includes(data))return unavailable;
   return history?{ok:true,operation:'history',ownerId,disposition:data as 'found'|'unknown'}:{ok:true,operation:'fence',ownerId,disposition:data as 'fenced'|'created'|'unknown'};
  }
  return invalid;
 }catch{return unavailable;}
}
