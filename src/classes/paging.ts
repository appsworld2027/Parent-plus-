export const CLASS_PAGE_SIZE=500;

// A short page can be the server's configured cap rather than the end. Stop
// only on an empty page; require ordered identity progress to reject repeats.
export async function readClassRows<T>(read:(after:string|null)=>PromiseLike<{data:unknown;error:unknown}>):Promise<T[]> {
 const all:T[]=[];
 let cursor:string|null=null;
 for(;;){
  const result=await read(cursor);
  if(result.error)throw result.error;
  if(!Array.isArray(result.data)||result.data.length>CLASS_PAGE_SIZE)throw new Error('Invalid class records');
  if(!result.data.length)return all;
  for(const row of result.data){
   if(!row||typeof row!=='object'||typeof row.id!=='string'||!row.id||(cursor!==null&&row.id<=cursor))throw new Error('Invalid class records');
   cursor=row.id;all.push(row as T);
  }
 }
}
