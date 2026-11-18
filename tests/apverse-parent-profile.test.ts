import {expect,it,vi} from 'vitest';
import {loadApVerseChildren,type ApParentProfileRpcClient} from '../src/parent/apverseParentProfile';

const owner='00000000-0000-0000-0000-000000000001';
const child='00000000-0000-0000-0000-000000000002';
const child2='00000000-0000-0000-0000-000000000003';
function client(data:unknown,userId:string|null=owner,error?:unknown){
 const rpc=vi.fn(async()=>({data,error}));
 const value:ApParentProfileRpcClient={auth:{getUser:async()=>({data:{user:userId?{id:userId}:null},error:null})},rpc};
 return {value,rpc};
}

it('loads only APVerse children owned by the verified parent and strips extra database fields',async()=>{
 const fake=client([{child_id:child,display_name:'Ari',private_value:'omit'},{child_id:child2,display_name:'Bo'}]);
 await expect(loadApVerseChildren(fake.value,owner)).resolves.toEqual([{id:child,name:'Ari'},{id:child2,name:'Bo'}]);
 expect(fake.rpc).toHaveBeenCalledWith('app_list_created_children',{});
});

it('does not query APVerse when the signed-in account does not match the requested parent',async()=>{
 const fake=client([],child2);
 await expect(loadApVerseChildren(fake.value,owner)).rejects.toThrow('Account changed');
 expect(fake.rpc).not.toHaveBeenCalled();
});

it.each([
 ['invalid child id',[{child_id:'not-a-uuid',display_name:'Ari'}]],
 ['blank child name',[{child_id:child,display_name:'  '}]],
 ['duplicate child id',[{child_id:child,display_name:'Ari'},{child_id:child,display_name:'Ari 2'}]],
 ['unsorted child ids',[{child_id:child2,display_name:'Bo'},{child_id:child,display_name:'Ari'}]],
 ['more than 100 child rows',Array.from({length:101},(_,i)=>({child_id:`00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`,display_name:'Child'}))],
] as const)('rejects malformed APVerse child profiles: %s',async(_case,rows)=>{
 const fake=client(rows);
 await expect(loadApVerseChildren(fake.value,owner)).rejects.toThrow('Invalid APVerse child response');
});

it('rejects an account change while the child list is loading',async()=>{
 let reads=0;
 const value:ApParentProfileRpcClient={
  auth:{getUser:async()=>({data:{user:{id:++reads===1?owner:child2}},error:null})},
  rpc:async()=>({data:[{child_id:child,display_name:'Ari'}],error:null}),
 };
 await expect(loadApVerseChildren(value,owner)).rejects.toThrow('Account changed');
});

it('returns an API error without disguising it as an empty child list',async()=>{
 const failure=new Error('child profile unavailable');
 const fake=client(null,owner,failure);
 await expect(loadApVerseChildren(fake.value,owner)).rejects.toBe(failure);
});
