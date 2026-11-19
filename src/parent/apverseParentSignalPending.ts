import type {ApParentSignalInput,ApParentSignalPayload} from './apverseParentSignals';

export type ApVerseParentSignalPending=ApParentSignalInput&{createdAt:string};
export type ApVerseParentSignalPendingStoreStorage={
 getItem:(key:string)=>Promise<string|null>;
 setItem:(key:string,value:string)=>Promise<void>;
 removeItem:(key:string)=>Promise<void>;
};

const MAX_PENDING=20;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNAL_TYPES=['running_late','missing_today','dropped_off','picked_up'] as const;
const REASONS=['unwell','travelling','other'] as const;
const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const exactKeys=(value:Record<string,unknown>,keys:string[])=>Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const isStamp=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&/T.*Z$/.test(value);
const same=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);

function validScope(ownerId:string,childId:string){return UUID.test(ownerId)&&UUID.test(childId);}
function parsePayload(value:unknown,childId:string):ApParentSignalPayload|null{
 if(!isRecord(value)||!exactKeys(value,['operation','child_id','workspace_id','session_id','expected_session_version','type','reason'])||value.operation!=='send_parent_signal'||typeof value.child_id!=='string'||value.child_id.toLowerCase()!==childId.toLowerCase()||!UUID.test(value.child_id)||typeof value.workspace_id!=='string'||!UUID.test(value.workspace_id)||typeof value.session_id!=='string'||!UUID.test(value.session_id)||!Number.isSafeInteger(value.expected_session_version)||Number(value.expected_session_version)<1||!SIGNAL_TYPES.includes(value.type as typeof SIGNAL_TYPES[number]))return null;
 if(value.type==='missing_today'?!REASONS.includes(value.reason as typeof REASONS[number]):value.reason!==null)return null;
 return {operation:'send_parent_signal',child_id:value.child_id,workspace_id:value.workspace_id,session_id:value.session_id,expected_session_version:Number(value.expected_session_version),type:value.type as ApParentSignalPayload['type'],reason:value.reason as ApParentSignalPayload['reason']};
}
function parsePending(value:unknown,ownerId:string,childId:string):ApVerseParentSignalPending|null{
 if(!isRecord(value)||!exactKeys(value,['ownerId','requestId','payload','createdAt']))return null;
 const storedOwner=value.ownerId,requestId=value.requestId,createdAt=value.createdAt;
 if(typeof storedOwner!=='string'||storedOwner.toLowerCase()!==ownerId.toLowerCase()||!UUID.test(storedOwner)||typeof requestId!=='string'||!UUID.test(requestId)||!isStamp(createdAt))return null;
 const payload=parsePayload(value.payload,childId);
 return payload?{ownerId:storedOwner,requestId,payload,createdAt}:null;
}
function decodeCollection(raw:string|null,ownerId:string,childId:string):ApVerseParentSignalPending[]{
 if(raw===null)return [];
 let value:unknown;
 try{value=JSON.parse(raw);}catch{throw new Error('Pending report storage is unreadable');}
 if(!isRecord(value)||!exactKeys(value,['version','requests'])||value.version!==1||!Array.isArray(value.requests)||value.requests.length>MAX_PENDING)throw new Error('Pending report storage is invalid');
 const requests=value.requests.map(request=>parsePending(request,ownerId,childId));
 if(requests.some(request=>request===null))throw new Error('Pending report storage does not match this account');
 const decoded=requests as ApVerseParentSignalPending[];
 if(new Set(decoded.map(request=>request.requestId.toLowerCase())).size!==decoded.length||new Set(decoded.map(request=>request.payload.session_id.toLowerCase())).size!==decoded.length)throw new Error('Pending report storage contains duplicate requests');
 return decoded;
}
const storageKey=(ownerId:string,childId:string)=>`parentplus.apverse-parent-signal.v1.${ownerId.toLowerCase()}.${childId.toLowerCase()}`;

/** Bounded owner/child-scoped durable retry storage. The injected driver uses per-tab sessionStorage on web and SecureStore on native. */
export function createApVerseParentSignalPendingStore(storage:ApVerseParentSignalPendingStoreStorage){
 let queue:Promise<unknown>=Promise.resolve();
 function serial<T>(operation:()=>Promise<T>):Promise<T>{const result=queue.then(operation);queue=result.then(()=>undefined,()=>undefined);return result;}
 async function read(ownerId:string,childId:string){return decodeCollection(await storage.getItem(storageKey(ownerId,childId)),ownerId,childId);}
 return {
  list:(ownerId:string,childId:string)=>serial(async()=>{if(!validScope(ownerId,childId))throw new Error('Invalid pending report scope');return read(ownerId,childId);}),
  save:(input:ApParentSignalInput)=>serial(async()=>{
   if(!validScope(input.ownerId,input.payload?.child_id??'' )||!UUID.test(input.requestId))throw new Error('Invalid pending report');
   const payload=parsePayload(input.payload,input.payload.child_id);
   if(!payload)throw new Error('Invalid pending report');
   const requests=await read(input.ownerId,payload.child_id);
   const existing=requests.find(item=>item.payload.session_id.toLowerCase()===payload.session_id.toLowerCase());
   if(existing){if(existing.requestId.toLowerCase()===input.requestId.toLowerCase()&&same(existing.payload,payload))return existing;throw new Error('An unresolved report already exists for this class');}
   if(requests.length>=MAX_PENDING)throw new Error('Too many unresolved Parent reports');
   const pending:ApVerseParentSignalPending={ownerId:input.ownerId,requestId:input.requestId,payload,createdAt:new Date().toISOString()};
   await storage.setItem(storageKey(input.ownerId,payload.child_id),JSON.stringify({version:1,requests:[...requests,pending]}));
   return pending;
  }),
  remove:(ownerId:string,childId:string,sessionId:string,requestId:string)=>serial(async()=>{
   if(!validScope(ownerId,childId)||!UUID.test(sessionId)||!UUID.test(requestId))throw new Error('Invalid pending report scope');
   const requests=await read(ownerId,childId),next=requests.filter(item=>!(item.payload.session_id.toLowerCase()===sessionId.toLowerCase()&&item.requestId.toLowerCase()===requestId.toLowerCase()));
   if(next.length===requests.length)return;
   if(next.length===0)await storage.removeItem(storageKey(ownerId,childId));
   else await storage.setItem(storageKey(ownerId,childId),JSON.stringify({version:1,requests:next}));
  }),
 };
}
