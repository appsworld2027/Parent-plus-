import {test,expect,type Page} from '@playwright/test';
import {backend} from './support/backend';

declare global {
 interface Window {__apVerseParentFixture:{children:{id:string;name:string}[];calls:string[];recordCalls:string[];moments:Record<string,unknown>[];todos:Record<string,unknown>[];events:Record<string,unknown>[];current:{intent_id:string;child_id:string;display_name:string;acknowledged:boolean;prior_intent_id:string|null;request_id:string;disposition?:string}|null;failList:boolean};}
}


async function setup(page:Page,failList=false){
 await backend(page);
 await page.addInitScript(({failList})=>{
  sessionStorage.setItem('parentplus.e2e-parent-runtime','apverse');
  const saved=JSON.parse(sessionStorage.getItem('parentplus.apverse.fixture')??'null') as Partial<Window['__apVerseParentFixture']>|null;
  const state:Window['__apVerseParentFixture']={children:saved?.children??[],calls:[],recordCalls:[],moments:saved?.moments??[],todos:saved?.todos??[],events:saved?.events??[],current:saved?.current??null,failList};
  window.__apVerseParentFixture=state;
  const persist=()=>sessionStorage.setItem('parentplus.apverse.fixture',JSON.stringify({children:state.children,moments:state.moments,todos:state.todos,events:state.events,current:state.current}));
  const prior=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
   const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
   const url=new URL(raw,location.origin),endpoint=url.pathname.split('/').at(-1)??'';
   if(url.pathname.includes('/rest/v1/parent_family_')){
    const table=url.pathname.split('/').at(-1)??'',rows=table.endsWith('moments')?state.moments:table.endsWith('todos')?state.todos:state.events,request=input instanceof Request?input:null,method=init?.method??request?.method??'GET';
    state.recordCalls.push(`${method}:${table}`);
    if(method==='GET')return new Response(JSON.stringify(rows),{status:200,headers:{'Content-Type':'application/json','Content-Range':`0-${Math.max(0,rows.length-1)}/${rows.length}`}});
    if(method==='POST'){
     const body=JSON.parse(String(init?.body??(request?await request.clone().text():'{}'))),values=Array.isArray(body)?body:[body];
     for(const value of values){const index=rows.findIndex(row=>row.id===value.id);if(index<0)rows.push(value);else rows[index]=value;}
     persist();return new Response(null,{status:201,headers:{'Content-Range':`*/${rows.length}`}});
    }
    return new Response(JSON.stringify({message:'unsupported'}),{status:405,headers:{'Content-Type':'application/json'}});
   }
   if(url.pathname.endsWith('/token')){
    const expires=Math.floor(Date.now()/1000)+3600,part=(value:object)=>btoa(JSON.stringify(value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    const user={id:'00000000-0000-0000-0000-000000000001',email:'parent@example.test',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-01-01T00:00:00Z',created_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{},identities:[]};
    return new Response(JSON.stringify({access_token:`${part({alg:'HS256',typ:'JWT'})}.${part({sub:user.id,exp:expires})}.fictional_signature`,token_type:'bearer',expires_in:3600,expires_at:expires,refresh_token:'fictional-parent-refresh-token',user}),{status:200,headers:{'Content-Type':'application/json'}});
   }
   if(!url.pathname.includes('/rpc/app_'))return prior(input,init);
   const payload=JSON.parse(String(init?.body??'{}'));
   state.calls.push(endpoint);
   const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
   if(endpoint==='app_parent_academies')return reply({academies:[{workspace_id:'00000000-0000-0000-0000-000000000301',name:'North Academy',time_zone:'Asia/Kolkata'}],next_after:null});
   if(endpoint==='app_parent_sessions'){
    const after=payload.p_after_id!==null,base=Date.parse(`${payload.p_date}T08:00:00.000Z`);
    const makeRow=(index:number,name:string)=>{const starts=new Date(base+index*60_000).toISOString(),ends=new Date(base+(index+45)*60_000).toISOString();return{id:`00000000-0000-0000-0000-${String(401+index).padStart(12,'0')}`,batch_id:'00000000-0000-0000-0000-000000000501',batch_name:name,starts_at:starts,ends_at:ends,status:'completed',version:1,can_signal:false,own_latest_signal:null,attendance:index===0?null:index===1?{status:'make_up'}:{status:'present'}};};
    const sessions=after?[makeRow(50,'Final class')]:Array.from({length:50},(_,index)=>makeRow(index,index===0?'Clay class':index===1?'Art class':`Class ${index+1}`));
    const last=sessions.at(-1);
    return reply({date:payload.p_date,time_zone:'Asia/Kolkata',server_now:new Date().toISOString(),sessions,next:after||!last?null:{id:last.id,starts_at:last.starts_at}});
   }
   if(endpoint==='app_list_created_children')return reply(state.failList?{code:'unavailable'}:state.children.map(child=>({child_id:child.id,display_name:child.name})) ,state.failList?503:200);
   if(endpoint==='app_current_child_creation')return reply(state.current?[state.current]:[]);
   if(endpoint==='app_begin_child_creation'){
    const row={intent_id:'00000000-0000-0000-0000-000000000201',child_id:'00000000-0000-0000-0000-000000000101',display_name:payload.p_display_name,acknowledged:false,prior_intent_id:payload.p_prior_intent_id,request_id:payload.p_request_id,disposition:'created'};
    state.current=row;state.children.push({id:row.child_id,name:row.display_name});persist();return reply([row]);
   }
   if(endpoint==='app_ack_child_creation'){
    if(!state.current||state.current.intent_id!==payload.p_intent_id)return reply(false);
    state.current.acknowledged=true;return reply(true);
   }
   return reply({code:'unavailable'},404);
  };
 },{failList});
 await page.goto('/parent');
 await page.getByLabel('Email address',{exact:true}).fill('parent@example.test');
 await page.getByLabel('Password',{exact:true}).fill('FictionalPassword123');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
}

test('APVerse Parent can create a child through the recoverable account-bound flow',async({page})=>{
 await setup(page);
 await expect(page.getByRole('heading',{name:'Your children',exact:true})).toBeVisible();
 await expect(page.getByText('No children yet.',{exact:true})).toBeVisible();
 await page.getByLabel('Child name',{exact:true}).fill('Ari');
 await page.getByRole('button',{name:'Create child',exact:true}).click();
 await expect(page.getByRole('tab',{name:'Choose child Ari',exact:true})).toBeVisible();
 await expect(page.getByText('Child profile saved.',{exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__apVerseParentFixture.calls)).toEqual(['app_list_created_children','app_current_child_creation','app_begin_child_creation','app_ack_child_creation','app_list_created_children','app_parent_academies','app_parent_sessions']);
});

test('APVerse child-list errors never appear as a successful empty state',async({page})=>{
 await setup(page,true);
 await expect(page.getByRole('heading',{name:'Your children',exact:true})).toBeVisible();
 await expect(page.getByRole('alert')).toContainText('Children could not be loaded');
 await expect(page.getByText('No children yet.',{exact:true})).toHaveCount(0);
});

test('APVerse Parent memories, reminders and events save for one child and survive reload',async({page})=>{
 await setup(page);
 await expect(page.getByRole('heading',{name:'Your children',exact:true})).toBeVisible();
 await page.getByLabel('Child name',{exact:true}).fill('Ari');
 await page.getByRole('button',{name:'Create child',exact:true}).click();
 await expect(page.getByRole('tab',{name:'Choose child Ari',exact:true})).toBeVisible();
 await page.getByLabel('Memory note',{exact:true}).fill('Museum visit');
 await page.getByLabel('Minutes together',{exact:true}).fill('45');
 await page.getByRole('button',{name:'Save memory',exact:true}).click();
 await expect(page.getByText('Museum visit · 45 minutes',{exact:true})).toBeVisible();
 await page.getByLabel('Reminder title',{exact:true}).fill('Pack water');
 await page.getByRole('button',{name:'Add reminder',exact:true}).click();
 await expect(page.getByRole('checkbox',{name:'Pack water',exact:true})).toBeVisible();
 await page.getByRole('checkbox',{name:'Pack water',exact:true}).click();
 await expect(page.getByRole('checkbox',{name:'Pack water',exact:true})).toHaveAttribute('aria-checked','true');
 await page.getByLabel('Event title',{exact:true}).fill('Art class');
 await page.getByLabel('Event location',{exact:true}).fill('Studio');
 await page.getByRole('button',{name:'Add event',exact:true}).click();
 await expect(page.getByText(/^Art class ·/)).toBeVisible();
 await page.reload();
 await expect(page.getByRole('tab',{name:'Choose child Ari',exact:true})).toBeVisible();
 await expect(page.getByText('Museum visit · 45 minutes',{exact:true})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:'Pack water',exact:true})).toHaveAttribute('aria-checked','true');
 await expect(page.getByText(/^Art class ·/)).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__apVerseParentFixture.recordCalls.some(call=>call.endsWith(':parent_family_moments')))).toBe(true);
});

test('APVerse Parent shows saved and unrecorded academy attendance without changing it',async({page})=>{
 await setup(page);
 await page.getByLabel('Child name',{exact:true}).fill('Ari');
 await page.getByRole('button',{name:'Create child',exact:true}).click();
 await expect(page.getByRole('tab',{name:'Choose child Ari',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Class attendance',exact:true})).toBeVisible();
 await expect(page.getByText('Attendance not recorded',{exact:true})).toBeVisible();
 await expect(page.getByText('Coach recorded: make-up session',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Load more attendance',exact:true}).click();
 await expect(page.getByText(/North Academy · Final class/)).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__apVerseParentFixture.calls.includes('app_parent_sessions'))).toBe(true);
});
