import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({fetch:vi.fn()}));
vi.mock('../src/auth/client',async()=>{
 const {createClient}=await import('@supabase/supabase-js');
 return {supabase:createClient('https://example.supabase.co','fictional-public-key',{
  auth:{persistSession:false,autoRefreshToken:false},global:{fetch:state.fetch},
 })};
});
import {loadClasses} from '../src/classes/service';
beforeEach(()=>{state.fetch.mockReset();});
it('keeps academy and local-day filters on every SDK page',async()=>{
 const calls:URL[]=[];
 state.fetch.mockImplementation(async(input:RequestInfo|URL)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);calls.push(url);
  expect(url.searchParams.get('academy_id')).toBe('eq.academy-1');
  expect(url.searchParams.get('order')).toBe('id.asc');
  expect(url.searchParams.get('limit')).toBe('500');
  if(url.pathname.endsWith('/class_sessions')){
   expect(url.searchParams.getAll('starts_at')).toEqual(['gte.2026-11-15T18:30:00.000Z','lt.2026-11-16T18:30:00.000Z']);
   return new Response(JSON.stringify(url.searchParams.has('id')?[]:[{id:'00000000-0000-0000-0000-000000000051',batch_id:'00000000-0000-0000-0000-000000000031',starts_at:'2026-11-16T10:00Z',ends_at:'2026-11-16T11:00Z',room:'',status:'scheduled',attendance_revision:0}]),{headers:{'Content-Type':'application/json'}});
  }
  return new Response('[]',{headers:{'Content-Type':'application/json'}});
 });
 const result=await loadClasses('academy-1','2026-11-16','Asia/Kolkata');
 expect(result.sessions).toHaveLength(1);
 expect(calls.filter(url=>url.pathname.endsWith('/class_sessions')).map(url=>url.searchParams.get('id'))).toEqual([null,'gt.00000000-0000-0000-0000-000000000051']);
 expect(calls.find(url=>url.pathname.endsWith('/enrolments'))!.searchParams.get('select')!.split(',')).toContain('id');
});
it('rejects the entire class context if any later API page fails',async()=>{
 state.fetch.mockImplementation(async(input:RequestInfo|URL)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  if(url.pathname.endsWith('/students'))return new Response(JSON.stringify(url.searchParams.has('id')?{code:'XX000',message:'fictional failure'}:[{id:'00000000-0000-0000-0000-000000000021',name:'Fictional student',age_years:6,archived_at:null}]),{status:url.searchParams.has('id')?500:200,headers:{'Content-Type':'application/json'}});
  return new Response('[]',{headers:{'Content-Type':'application/json'}});
 });
 await expect(loadClasses('academy-1','2026-11-16','Asia/Kolkata')).rejects.toMatchObject({code:'XX000'});
});
