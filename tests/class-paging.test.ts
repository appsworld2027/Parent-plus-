import {expect,it} from 'vitest';
import {readClassRows} from '../src/classes/paging';
const id=(n:number)=>String(n).padStart(6,'0');
it('loads records beyond the API page cap, including a final short page',async()=>{
 const rows=Array.from({length:1201},(_,n)=>({id:id(n+1)}));
 const cursors:(string|null)[]=[];
 const actual=await readClassRows(async after=>{cursors.push(after);return {data:rows.filter(r=>after===null||r.id>after).slice(0,200),error:null};});
 expect(actual).toEqual(rows);expect(cursors).toEqual([null,id(200),id(400),id(600),id(800),id(1000),id(1200),id(1201)]);
});
it('rejects a failed later page instead of returning an incomplete roster',async()=>{
 await expect(readClassRows(async after=>after?{data:null,error:new Error('page failure')}:{data:[{id:id(1)}],error:null})).rejects.toThrow('page failure');
});
it.each([{rows:[{id:id(2)},{id:id(1)}]},{rows:[{id:id(1)},{id:id(1)}]},{rows:[{id:''}]},{rows:[{}]}])('rejects invalid or unordered page %j',async ({rows})=>{
 await expect(readClassRows(async()=>({data:rows,error:null}))).rejects.toThrow('Invalid class records');
});
it('rejects an API that repeats the cursor instead of looping or duplicating records',async()=>{
 await expect(readClassRows(async()=>({data:[{id:id(1)}],error:null}))).rejects.toThrow('Invalid class records');
});
it('rejects a null success payload rather than showing a false empty result',async()=>{
 await expect(readClassRows(async()=>({data:null,error:null}))).rejects.toThrow('Invalid class records');
});

it('retains the unread tail when an earlier row disappears between pages',async()=>{
 const rows=[{id:id(1)},{id:id(2)},{id:id(3)}];
 const result=await readClassRows(async after=>{
  if(after===null)return {data:rows.slice(0,2),error:null};
  if(after===id(2))rows.shift();
  return {data:rows.filter(row=>row.id>after).slice(0,2),error:null};
 });
 expect(result).toEqual([{id:id(1)},{id:id(2)},{id:id(3)}]);
});
