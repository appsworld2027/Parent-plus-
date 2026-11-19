import {expect,it,vi} from 'vitest';
import {loadApVerseParentRecords,saveApVerseParentRecord,type ApVerseParentRecordsClient} from '../src/parent/apverseParentRecords';

const ids={owner:'00000000-0000-0000-0000-000000000001',child:'00000000-0000-0000-0000-000000000011',otherChild:'00000000-0000-0000-0000-000000000012',moment:'00000000-0000-0000-0000-000000000101',todo:'00000000-0000-0000-0000-000000000102'};
type Row=Record<string,unknown>;
const tables:Record<string,Row[]>={parent_family_moments:[],parent_family_todos:[],parent_family_events:[]};
function client(userIds:string[]=[ids.owner],ignoreFilters=false){
 const state=structuredClone(tables);let authReads=0;const calls:{table:string;operation:string;filters:Record<string,string>}[]=[];
 const auth={getUser:vi.fn(async()=>({data:{user:{id:userIds[Math.min(authReads++,userIds.length-1)]}},error:null}))};
 const from=vi.fn((table:string)=>({
  select:(columns:string)=>{
   const filters:Record<string,string>={};let offset=0;calls.push({table,operation:`select:${columns}`,filters});
   const query={eq:(key:string,value:string)=>{filters[key]=value;return query;},order:()=>query,range:(start:number)=>{offset=start;return query;},then:(resolve:(value:{data:Row[];error:null})=>unknown,reject?:(reason:unknown)=>unknown)=>Promise.resolve({data:(ignoreFilters?state[table]:state[table].filter(row=>Object.entries(filters).every(([key,value])=>row[key]===value))).slice(offset,offset+500),error:null}).then(resolve,reject)};
   return query;
  },
  upsert:vi.fn(async(row:Row)=>{calls.push({table,operation:'upsert',filters:{}});const rows=state[table],index=rows.findIndex(item=>item.id===row.id);if(index<0)rows.push(row);else rows[index]=row;return {error:null};}),
 }));
 return {value:{auth,from} as unknown as ApVerseParentRecordsClient,state,calls,auth,from};
}

it('loads only the selected APVerse child records and returns allowlisted fields',async()=>{
 const fake=client();fake.state.parent_family_moments.push({id:ids.moment,owner_id:ids.owner,child_id:ids.child,note:'Museum',minutes:45,kind:'memory',occurred_on:'2026-11-18',secret:'omit'});
 fake.state.parent_family_todos.push({id:ids.todo,owner_id:ids.owner,child_id:ids.child,title:'Water bottle',done:false});
 const result=await loadApVerseParentRecords(fake.value,ids.owner,ids.child);
 expect(result.moments).toEqual([{id:ids.moment,child_id:ids.child,note:'Museum',minutes:45,kind:'memory',occurred_on:'2026-11-18'}]);
 expect(result.todos).toEqual([{id:ids.todo,child_id:ids.child,title:'Water bottle',done:false}]);
 expect(fake.calls).toHaveLength(3);
 expect(fake.calls.every(call=>call.filters.owner_id===ids.owner&&call.filters.child_id===ids.child)).toBe(true);
});

it('does not query APVerse when the signed-in account differs from the selected Parent',async()=>{
 const fake=client([ids.otherChild]);
 await expect(loadApVerseParentRecords(fake.value,ids.owner,ids.child)).rejects.toThrow('Parent account changed');
 expect(fake.calls).toEqual([]);
});

it('fails closed if a response includes a record for another child or owner',async()=>{
 const fake=client([ids.owner],true);fake.state.parent_family_todos.push({id:ids.todo,owner_id:ids.owner,child_id:ids.otherChild,title:'Foreign',done:false});
 await expect(loadApVerseParentRecords(fake.value,ids.owner,ids.child)).rejects.toThrow('Invalid APVerse Parent records');
});

it('retries a saved memory with its stable ID without creating a duplicate',async()=>{
 const fake=client();const record={kind:'moment' as const,id:ids.moment,childId:ids.child,note:'Museum',minutes:45,memoryKind:'memory' as const,occurredOn:'2026-11-18'};
 await saveApVerseParentRecord(fake.value,ids.owner,record);await saveApVerseParentRecord(fake.value,ids.owner,record);
 expect(fake.state.parent_family_moments).toHaveLength(1);
 expect(fake.state.parent_family_moments[0]).toMatchObject({id:ids.moment,owner_id:ids.owner,child_id:ids.child,note:'Museum'});
});

it('rejects invalid private Parent record values before database access',async()=>{
 const fake=client();
 await expect(saveApVerseParentRecord(fake.value,ids.owner,{kind:'todo',id:ids.todo,childId:ids.child,title:'   ',done:false})).rejects.toThrow('Invalid Parent record');
 expect(fake.from).not.toHaveBeenCalled();
});

it('does not report a successful save if the signed-in account changes during the request',async()=>{
 const fake=client([ids.owner,ids.otherChild]);
 await expect(saveApVerseParentRecord(fake.value,ids.owner,{kind:'todo',id:ids.todo,childId:ids.child,title:'Call school',done:false})).rejects.toThrow('Parent account changed');
});
