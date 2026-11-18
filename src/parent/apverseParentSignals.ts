export type ApParentSignalRpcClient={
 auth:{getUser:()=>Promise<{data:{user:{id:string}|null};error:unknown|null}>};
 rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:unknown|null}>;
};
export type ApParentSignalType='running_late'|'missing_today'|'dropped_off'|'picked_up';
export type ApParentSignalReason='unwell'|'travelling'|'other';
export type ApParentSignalPayload={operation:'send_parent_signal';child_id:string;workspace_id:string;session_id:string;expected_session_version:number;type:ApParentSignalType;reason:ApParentSignalReason|null};
export type ApParentSignalReceipt={requestId:string;signalId:string;sessionId:string;childId:string;type:ApParentSignalType;reason:ApParentSignalReason|null;createdAt:string};
export type ApParentSignalInput={ownerId:string;requestId:string;payload:ApParentSignalPayload};
export type ApParentSignalResult=
 | {ok:false;kind:'invalid'|'forbidden'|'conflict'|'unknown'}
 | {ok:true;receipt:ApParentSignalReceipt}
 | {ok:true;state:'known';receipt:ApParentSignalReceipt}
 | {ok:true;state:'unknown';receipt:null};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const isId=(value:unknown):value is string=>typeof value==='string'&&UUID.test(value);
const isStamp=(value:unknown):value is string=>typeof value==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));
const keys=(value:Record<string,unknown>,expected:string[])=>Object.keys(value).length===expected.length&&expected.every(key=>Object.hasOwn(value,key));
const signalTypes:ApParentSignalType[]=['running_late','missing_today','dropped_off','picked_up'];
const signalReasons:ApParentSignalReason[]=['unwell','travelling','other'];

function canonicalInput(value:unknown):ApParentSignalInput|null{
 if(!isRecord(value)||!keys(value,['ownerId','requestId','payload'])||!isId(value.ownerId)||!isId(value.requestId)||!isRecord(value.payload))return null;
 const p=value.payload;
 if(!keys(p,['operation','child_id','workspace_id','session_id','expected_session_version','type','reason'])||p.operation!=='send_parent_signal'||!isId(p.child_id)||!isId(p.workspace_id)||!isId(p.session_id)||!Number.isSafeInteger(p.expected_session_version)||Number(p.expected_session_version)<1||!signalTypes.includes(p.type as ApParentSignalType))return null;
 if(p.type==='missing_today'?!signalReasons.includes(p.reason as ApParentSignalReason):p.reason!==null)return null;
 return {ownerId:value.ownerId,requestId:value.requestId,payload:{operation:'send_parent_signal',child_id:p.child_id,workspace_id:p.workspace_id,session_id:p.session_id,expected_session_version:p.expected_session_version as number,type:p.type as ApParentSignalType,reason:p.reason as ApParentSignalReason|null}};
}

function receipt(value:unknown):ApParentSignalReceipt|null{
 if(!isRecord(value)||!isId(value.request_id)||!isId(value.signal_id)||!isId(value.session_id)||!isId(value.child_id)||!signalTypes.includes(value.type as ApParentSignalType)||!isStamp(value.created_at))return null;
 if(value.type==='missing_today'?!signalReasons.includes(value.reason as ApParentSignalReason):value.reason!==null)return null;
 return {requestId:value.request_id,signalId:value.signal_id,sessionId:value.session_id,childId:value.child_id,type:value.type as ApParentSignalType,reason:value.reason as ApParentSignalReason|null,createdAt:value.created_at};
}

function matches(value:unknown,input:ApParentSignalInput):ApParentSignalReceipt|null{
 const parsed=receipt(value),p=input.payload;
 return parsed&&parsed.requestId.toLowerCase()===input.requestId.toLowerCase()&&parsed.childId.toLowerCase()===p.child_id.toLowerCase()&&parsed.sessionId.toLowerCase()===p.session_id.toLowerCase()&&parsed.type===p.type&&parsed.reason===p.reason?parsed:null;
}

async function currentOwner(client:ApParentSignalRpcClient,ownerId:string):Promise<boolean>{
 try{const result=await client.auth.getUser();return !result.error&&result.data.user?.id.toLowerCase()===ownerId.toLowerCase();}catch{return false;}
}

function errorKind(error:unknown):'forbidden'|'conflict'|'unknown'{
 if(!isRecord(error))return 'unknown';
 if(error.code==='42501')return 'forbidden';
 if(error.code==='23505'||error.code==='40001')return 'conflict';
 return 'unknown';
}

/** Sends an account-bound, recoverable APVerse Parent report; report RPCs never write attendance. */
export async function sendApVerseParentSignal(client:ApParentSignalRpcClient,input:unknown):Promise<ApParentSignalResult>{
 const value=canonicalInput(input);if(!value)return {ok:false,kind:'invalid'};
 if(!await currentOwner(client,value.ownerId))return {ok:false,kind:'forbidden'};
 const p=value.payload;
 let result:{data:unknown;error:unknown|null};
 try{result=await client.rpc('app_send_parent_signal',{p_child_id:p.child_id,p_workspace_id:p.workspace_id,p_session_id:p.session_id,p_expected_session_version:p.expected_session_version,p_type:p.type,p_reason:p.reason,p_request_id:value.requestId});}catch{return {ok:false,kind:'unknown'};}
 if(result.error)return {ok:false,kind:errorKind(result.error)};
 const parsed=matches(result.data,value);
 if(!parsed)return {ok:false,kind:'unknown'};
 if(!await currentOwner(client,value.ownerId))return {ok:false,kind:'forbidden'};
 return {ok:true,receipt:parsed};
}

/** Checks an uncertain report by the exact original request identity and canonical payload. */
export async function checkApVerseParentSignal(client:ApParentSignalRpcClient,input:unknown):Promise<ApParentSignalResult>{
 const value=canonicalInput(input);if(!value)return {ok:false,kind:'invalid'};
 if(!await currentOwner(client,value.ownerId))return {ok:false,kind:'forbidden'};
 const p=value.payload;
 let result:{data:unknown;error:unknown|null};
 try{result=await client.rpc('app_parent_signal_request_status',{p_child_id:p.child_id,p_workspace_id:p.workspace_id,p_session_id:p.session_id,p_request_id:value.requestId,p_payload:p});}catch{return {ok:false,kind:'unknown'};}
 if(result.error)return {ok:false,kind:errorKind(result.error)};
 if(!isRecord(result.data))return {ok:false,kind:'unknown'};
 if(result.data.state==='unknown'&&result.data.receipt===null){
  if(!await currentOwner(client,value.ownerId))return {ok:false,kind:'forbidden'};
  return {ok:true,state:'unknown',receipt:null};
 }
 const parsed=result.data.state==='known'?matches(result.data.receipt,value):null;
 if(!parsed)return {ok:false,kind:'unknown'};
 if(!await currentOwner(client,value.ownerId))return {ok:false,kind:'forbidden'};
 return {ok:true,state:'known',receipt:parsed};
}
