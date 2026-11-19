import {expect,it} from 'vitest';
import {createApVerseParentSignalPendingStore,type ApVerseParentSignalPendingStoreStorage} from '../src/parent/apverseParentSignalPending';

const owner='00000000-0000-0000-0000-000000000001';
const child='00000000-0000-0000-0000-000000000002';
const workspace='00000000-0000-0000-0000-000000000003';
const session='00000000-0000-0000-0000-000000000004';
const request='00000000-0000-0000-0000-000000000005';
const payload={operation:'send_parent_signal' as const,child_id:child,workspace_id:workspace,session_id:session,expected_session_version:2,type:'missing_today' as const,reason:'unwell' as const};

function memory(){
 const values=new Map<string,string>();
 const storage:ApVerseParentSignalPendingStoreStorage={getItem:async key=>values.get(key)??null,setItem:async(key,value)=>{values.set(key,value);},removeItem:async key=>{values.delete(key);}};
 return {values,storage};
}

it('persists the exact owner, child, request identity and report payload across store recreation',async()=>{
 const fake=memory(),first=createApVerseParentSignalPendingStore(fake.storage);
 const saved=await first.save({ownerId:owner,requestId:request,payload});
 const reopened=createApVerseParentSignalPendingStore(fake.storage);
 await expect(reopened.list(owner,child)).resolves.toEqual([saved]);
});

it('does not replace an unresolved report for the same class with a different payload',async()=>{
 const fake=memory(),store=createApVerseParentSignalPendingStore(fake.storage);
 await store.save({ownerId:owner,requestId:request,payload});
 await expect(store.save({ownerId:owner,requestId:'00000000-0000-0000-0000-000000000006',payload:{...payload,type:'running_late',reason:null}})).rejects.toThrow('An unresolved report already exists for this class');
 await expect(store.list(owner,child)).resolves.toHaveLength(1);
});

it('removes only the exact saved request and keeps another class request',async()=>{
 const fake=memory(),store=createApVerseParentSignalPendingStore(fake.storage),otherSession='00000000-0000-0000-0000-000000000007',otherRequest='00000000-0000-0000-0000-000000000008';
 await store.save({ownerId:owner,requestId:request,payload});
 await store.save({ownerId:owner,requestId:otherRequest,payload:{...payload,session_id:otherSession}});
 await store.remove(owner,child,session,request);
 await expect(store.list(owner,child)).resolves.toMatchObject([{requestId:otherRequest,payload:{session_id:otherSession}}]);
});

it('fails closed on corrupt storage instead of treating an unresolved report as absent',async()=>{
 const fake=memory(),store=createApVerseParentSignalPendingStore(fake.storage);
 fake.values.set('parentplus.apverse-parent-signal.v1.'+owner+'.'+child,'{bad json');
 await expect(store.list(owner,child)).rejects.toThrow();
 await expect(store.save({ownerId:owner,requestId:request,payload})).rejects.toThrow();
});

it('rejects malformed pending requests and records stored under a different owner',async()=>{
 const fake=memory(),store=createApVerseParentSignalPendingStore(fake.storage);
 await expect(store.save({ownerId:owner,requestId:request,payload:{...payload,child_id:'invalid'}})).rejects.toThrow('Invalid pending report');
 await expect(store.save({ownerId:'invalid',requestId:request,payload})).rejects.toThrow('Invalid pending report');
 await expect(store.list(owner,'invalid')).rejects.toThrow('Invalid pending report scope');
 fake.values.set('parentplus.apverse-parent-signal.v1.'+owner+'.'+child,JSON.stringify({version:1,requests:[{ownerId:'00000000-0000-0000-0000-000000000099',requestId:request,payload,createdAt:new Date().toISOString()}]}));
 await expect(store.list(owner,child)).rejects.toThrow('does not match this account');
});

