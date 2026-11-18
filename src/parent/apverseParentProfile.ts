export type ApParentProfileRpcClient={
 auth:{getUser:()=>Promise<{data:{user:{id:string}|null};error:unknown|null}>};
 rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:unknown|null}>;
};
export type ApVerseChildProfile={id:string;name:string};

const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const isUuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function assertCurrentAccount(client:ApParentProfileRpcClient,ownerId:string){
 const identity=await client.auth.getUser();
 if(identity.error||identity.data.user?.id!==ownerId)throw new Error('Account changed');
}

/** Reads the current account's own APVerse children through its guardian-scoped RPC. */
export async function loadApVerseChildren(client:ApParentProfileRpcClient,ownerId:string):Promise<ApVerseChildProfile[]>{
 if(!isUuid(ownerId))throw new Error('Invalid Parent request');
 await assertCurrentAccount(client,ownerId);
 const result=await client.rpc('app_list_created_children',{});
 if(result.error)throw result.error;
 if(!Array.isArray(result.data)||result.data.length>100)throw new Error('Invalid APVerse child response');
 const children:ApVerseChildProfile[]=[];
 for(const row of result.data){
  if(!isRecord(row)||!isUuid(row.child_id)||typeof row.display_name!=='string'||!row.display_name.trim()||row.display_name.length>100)throw new Error('Invalid APVerse child response');
  const previous=children.at(-1)?.id.toLowerCase();
  if(previous&&row.child_id.toLowerCase()<=previous)throw new Error('Invalid APVerse child response');
  children.push({id:row.child_id,name:row.display_name.trim()});
 }
 await assertCurrentAccount(client,ownerId);
 return children;
}
