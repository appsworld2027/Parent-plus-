import {test,expect,type Page} from '@playwright/test';
import {backend} from './support/backend';

declare global {
 interface Window {__apVerseParentFixture:{children:{id:string;name:string}[];calls:string[];recordCalls:string[];moments:Record<string,unknown>[];todos:Record<string,unknown>[];events:Record<string,unknown>[];current:{intent_id:string;child_id:string;display_name:string;acknowledged:boolean;prior_intent_id:string|null;request_id:string;disposition?:string}|null;failList:boolean;loseFirstSignalResponse:boolean;signalRequests:{requestId:string;payload:Record<string,unknown>;receipt:Record<string,unknown>}[];reportCalls:Record<string,unknown>[];latestSignal:Record<string,unknown>|null};}
}

async function setup(page:Page,options:boolean|{failList?:boolean;loseFirstSignalResponse?:boolean}=false){
 const config=typeof options==='boolean'?{failList:options}:options;
 await backend(page);
 await page.addInitScript(({failList,loseFirstSignalResponse})=>{
  sessionStorage.setItem('parentplus.e2e-parent-runtime','apverse');
  const saved=JSON.parse(sessionStorage.getItem('parentplus.apverse.fixture')??'null') as Partial<Window['__apVerseParentFixture']>|null;
  const state:Window['__apVerseParentFixture']={children:saved?.children??[],calls:[],recordCalls:[],moments:saved?.moments??[],todos:saved?.todos??[],events:saved?.events??[],current:saved?.current??null,failList,loseFirstSignalResponse,signalRequests:saved?.signalRequests??[],reportCalls:saved?.reportCalls??[],latestSignal:saved?.latestSignal??null};
  window.__apVerseParentFixture=state;
  const persist=()=>sessionStorage.setItem('parentplus.apverse.fixture',JSON.stringify({children:state.children,moments:state.moments,todos:state.todos,events:state.events,current:state.current,signalRequests:state.signalRequests,reportCalls:state.reportCalls,latestSignal:state.latestSignal}));
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
    const makeRow=(index:number,name:string)=>{const starts=new Date(base+index*60_000).toISOString(),ends=new Date(base+(index+45)*60_000).toISOString(),sessionId=`00000000-0000-0000-0000-${String(401+index).padStart(12,'0')}`,signal=state.latestSignal?.session_id===sessionId?state.latestSignal:null;return{id:sessionId,batch_id:'00000000-0000-0000-0000-000000000501',batch_name:name,starts_at:starts,ends_at:ends,status:index===0&&!after?'scheduled':'completed',version:index===0&&!after?2:1,can_signal:index===0&&!after,own_latest_signal:signal,attendance:index===0?null:index===1?{status:'make_up'}:{status:'present'}};};
    const sessions=after?[makeRow(50,'Final class')]:Array.from({length:50},(_,index)=>makeRow(index,index===0?'Clay class':index===1?'Art class':`Class ${index+1}`));
    const last=sessions.at(-1);
    return reply({date:payload.p_date,time_zone:'Asia/Kolkata',server_now:new Date().toISOString(),sessions,next:after||!last?null:{id:last.id,starts_at:last.starts_at}});
   }
   if(endpoint==='app_send_parent_signal'){
    state.reportCalls.push(payload);persist();
    let request=state.signalRequests.find(item=>item.requestId===payload.p_request_id);
    if(!request){
     const receipt={request_id:payload.p_request_id,signal_id:'00000000-0000-0000-0000-000000000601',session_id:payload.p_session_id,child_id:payload.p_child_id,type:payload.p_type,reason:payload.p_reason,created_at:new Date().toISOString()};
     request={requestId:payload.p_request_id,payload:{operation:'send_parent_signal',child_id:payload.p_child_id,workspace_id:payload.p_workspace_id,session_id:payload.p_session_id,expected_session_version:payload.p_expected_session_version,type:payload.p_type,reason:payload.p_reason},receipt};
     state.signalRequests.push(request);state.latestSignal={id:receipt.signal_id,child_id:receipt.child_id,actor_id:'00000000-0000-0000-0000-000000000001',type:receipt.type,reason:receipt.reason,created_at:receipt.created_at,session_id:receipt.session_id};persist();
     if(state.loseFirstSignalResponse){state.loseFirstSignalResponse=false;return reply({message:'simulated lost response'},502);}
    }
    return reply(request.receipt);
   }
   if(endpoint==='app_parent_signal_request_status'){
    const request=state.signalRequests.find(item=>item.requestId===payload.p_request_id&&JSON.stringify(item.payload)===JSON.stringify(payload.p_payload));
    return reply(request?{state:'known',receipt:request.receipt}:{state:'unknown',receipt:null});
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
 },{failList:config.failList??false,loseFirstSignalResponse:config.loseFirstSignalResponse??false});
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

test('APVerse Parent can submit a non-mutating report to the Coach',async({page})=>{
 await setup(page);
 await page.getByLabel('Child name',{exact:true}).fill('Ari');
 await page.getByRole('button',{name:'Create child',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Class attendance',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Send an update to Coach',exact:true}).click();
 await page.getByRole('button',{name:'Send Parent report',exact:true}).click();
 await expect(page.getByText(/Latest report: Running late/)).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__apVerseParentFixture.reportCalls.length)).toBe(1);
 const calls=await page.evaluate(()=>window.__apVerseParentFixture.calls);
 expect(calls).not.toContain('app_record_attendance');
 expect(await page.evaluate(()=>window.__apVerseParentFixture.reportCalls[0])).toMatchObject({p_type:'running_late',p_reason:null,p_expected_session_version:2});
});

test('APVerse Parent recovers a saved report after a lost response and reload',async({page})=>{
 await setup(page,{loseFirstSignalResponse:true});
 await page.getByLabel('Child name',{exact:true}).fill('Ari');
 await page.getByRole('button',{name:'Create child',exact:true}).click();
 await page.getByRole('button',{name:'Send an update to Coach',exact:true}).click();
 await page.getByRole('button',{name:'Send Parent report',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('could not confirm');
 await page.reload();
 await expect(page.getByRole('tab',{name:'Choose child Ari',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Check report status',exact:true}).click();
 await expect(page.getByText(/Latest report: Running late/)).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__apVerseParentFixture.reportCalls.length)).toBe(1);
 const calls=await page.evaluate(()=>window.__apVerseParentFixture.calls);
 expect(calls).toContain('app_parent_signal_request_status');
 expect(calls).not.toContain('app_record_attendance');
});
