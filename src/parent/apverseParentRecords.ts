export type ApVerseParentMoment={id:string;child_id:string;note:string;minutes:number;kind:'memory'|'together';occurred_on:string};
export type ApVerseParentTodo={id:string;child_id:string;title:string;done:boolean};
export type ApVerseParentEvent={id:string;child_id:string;title:string;starts_at:string;ends_at:string;location:string|null};
export type ApVerseParentRecords={moments:ApVerseParentMoment[];todos:ApVerseParentTodo[];events:ApVerseParentEvent[]};

type QueryResult={data:unknown[]|null;error:unknown|null};
interface ParentRecordsQuery extends PromiseLike<QueryResult>{
 eq(column:string,value:string):ParentRecordsQuery;
 order(column:string,options?:{ascending?:boolean}):ParentRecordsQuery;
 range(from:number,to:number):ParentRecordsQuery;
}
interface ParentRecordsTable{
 select(columns:string):ParentRecordsQuery;
 upsert(value:Record<string,unknown>,options:{onConflict:'id'}):PromiseLike<{error:unknown|null}>;
}
export interface ApVerseParentRecordsClient{
 auth:{getUser():Promise<{data:{user:{id:string}|null};error:unknown|null}>};
 from(table:string):ParentRecordsTable;
}

export type ApVerseParentRecordInput=
 |{kind:'moment';id:string;childId:string;note:string;minutes:number;memoryKind:'memory'|'together';occurredOn:string}
 |{kind:'todo';id:string;childId:string;title:string;done:boolean}
 |{kind:'event';id:string;childId:string;title:string;startsAt:string;endsAt:string;location:string|null};

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function validDate(value:unknown){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;}
function invalid(){return new Error('Invalid APVerse Parent records');}
function checkIdentity(value:unknown,ownerId:string,childId:string){
 if(!record(value)||value.owner_id!==ownerId||value.child_id!==childId||typeof value.id!=='string'||!uuid.test(value.id))throw invalid();
 return value;
}
function parseMoment(value:unknown,ownerId:string,childId:string):ApVerseParentMoment{
 const row=checkIdentity(value,ownerId,childId);
 if(typeof row.note!=='string'||row.note.trim().length<1||row.note.length>2000||!Number.isInteger(row.minutes)||Number(row.minutes)<0||Number(row.minutes)>1440||(row.kind!=='memory'&&row.kind!=='together')||!validDate(row.occurred_on))throw invalid();
 return{id:row.id as string,child_id:childId,note:row.note,minutes:row.minutes as number,kind:row.kind as 'memory'|'together',occurred_on:row.occurred_on as string};
}
function parseTodo(value:unknown,ownerId:string,childId:string):ApVerseParentTodo{
 const row=checkIdentity(value,ownerId,childId);
 if(typeof row.title!=='string'||row.title.trim().length<1||row.title.length>200||typeof row.done!=='boolean')throw invalid();
 return{id:row.id as string,child_id:childId,title:row.title,done:row.done};
}
function parseEvent(value:unknown,ownerId:string,childId:string):ApVerseParentEvent{
 const row=checkIdentity(value,ownerId,childId),start=typeof row.starts_at==='string'?Date.parse(row.starts_at):NaN,end=typeof row.ends_at==='string'?Date.parse(row.ends_at):NaN;
 if(typeof row.title!=='string'||row.title.trim().length<1||row.title.length>200||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||(row.location!==null&&row.location!==undefined&&(typeof row.location!=='string'||row.location.length>200)))throw invalid();
 return{id:row.id as string,child_id:childId,title:row.title,starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),location:(row.location??null) as string|null};
}
async function assertOwner(client:ApVerseParentRecordsClient,ownerId:string){
 const result=await client.auth.getUser();
 if(result.error||result.data.user?.id!==ownerId)throw new Error('Parent account changed');
}
function validateScope(ownerId:string,childId:string){if(!uuid.test(ownerId)||!uuid.test(childId))throw invalid();}
async function readRows(client:ApVerseParentRecordsClient,table:string,fields:string,ownerId:string,childId:string,sort:string,ascending:boolean){
 const all:unknown[]=[];
 for(let offset=0;;offset+=500){
  const result=await client.from(table).select(fields).eq('owner_id',ownerId).eq('child_id',childId).order(sort,{ascending}).range(offset,offset+499);
  if(result.error||!Array.isArray(result.data))throw new Error('Parent records could not be confirmed');
  all.push(...result.data);
  if(result.data.length<500)return all;
 }
}

export async function loadApVerseParentRecords(client:ApVerseParentRecordsClient,ownerId:string,childId:string):Promise<ApVerseParentRecords>{
 validateScope(ownerId,childId);await assertOwner(client,ownerId);
 const [moments,todos,events]=await Promise.all([
  readRows(client,'parent_family_moments','id,owner_id,child_id,note,minutes,kind,occurred_on',ownerId,childId,'occurred_on',false),
  readRows(client,'parent_family_todos','id,owner_id,child_id,title,done',ownerId,childId,'created_at',false),
  readRows(client,'parent_family_events','id,owner_id,child_id,title,starts_at,ends_at,location',ownerId,childId,'starts_at',true),
 ]);
 const result={moments:moments.map(row=>parseMoment(row,ownerId,childId)),todos:todos.map(row=>parseTodo(row,ownerId,childId)),events:events.map(row=>parseEvent(row,ownerId,childId))};
 await assertOwner(client,ownerId);return result;
}

function inputRow(ownerId:string,input:ApVerseParentRecordInput):Record<string,unknown>{
 if(!uuid.test(input.id)||!uuid.test(input.childId))throw invalid();
 if(input.kind==='moment'){
  if(typeof input.note!=='string'||input.note.trim().length<1||input.note.length>2000||!Number.isInteger(input.minutes)||input.minutes<0||input.minutes>1440||!['memory','together'].includes(input.memoryKind)||!validDate(input.occurredOn)||input.occurredOn>new Date().toISOString().slice(0,10))throw new Error('Invalid Parent record');
  return{id:input.id,owner_id:ownerId,child_id:input.childId,note:input.note.trim(),minutes:input.minutes,kind:input.memoryKind,occurred_on:input.occurredOn};
 }
 if(input.kind==='todo'){
  if(typeof input.title!=='string'||input.title.trim().length<1||input.title.length>200||typeof input.done!=='boolean')throw new Error('Invalid Parent record');
  return{id:input.id,owner_id:ownerId,child_id:input.childId,title:input.title.trim(),done:input.done};
 }
 const start=Date.parse(input.startsAt),end=Date.parse(input.endsAt);
 if(typeof input.title!=='string'||input.title.trim().length<1||input.title.length>200||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||(input.location!==null&&(typeof input.location!=='string'||input.location.length>200)))throw new Error('Invalid Parent record');
 return{id:input.id,owner_id:ownerId,child_id:input.childId,title:input.title.trim(),starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),location:input.location?.trim()||null};
}

export async function saveApVerseParentRecord(client:ApVerseParentRecordsClient,ownerId:string,input:ApVerseParentRecordInput):Promise<void>{
 validateScope(ownerId,input.childId);await assertOwner(client,ownerId);const value=inputRow(ownerId,input);
 const table=input.kind==='moment'?'parent_family_moments':input.kind==='todo'?'parent_family_todos':'parent_family_events';
 const result=await client.from(table).upsert(value,{onConflict:'id'});
 if(result.error)throw new Error('Parent record could not be confirmed');
 await assertOwner(client,ownerId);
}
