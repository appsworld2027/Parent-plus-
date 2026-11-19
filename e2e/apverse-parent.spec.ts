import {test,expect,type Page} from '@playwright/test';
import {backend} from './support/backend';

declare global {
 interface Window {__apVerseParentFixture:{children:{id:string;name:string}[];calls:string[];current:{intent_id:string;child_id:string;display_name:string;acknowledged:boolean;prior_intent_id:string|null;request_id:string;disposition?:string}|null;failList:boolean};}
}


async function setup(page:Page,failList=false){
 await backend(page);
 await page.addInitScript(({failList})=>{
  sessionStorage.setItem('parentplus.e2e-parent-runtime','apverse');
  window.__apVerseParentFixture={children:[],calls:[],current:null,failList};
  const prior=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
   const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
   const url=new URL(raw,location.origin),endpoint=url.pathname.split('/').at(-1)??'';
   if(!url.pathname.includes('/rpc/app_'))return prior(input,init);
   const state=window.__apVerseParentFixture,payload=JSON.parse(String(init?.body??'{}'));
   state.calls.push(endpoint);
   const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
   if(endpoint==='app_list_created_children')return reply(state.failList?{code:'unavailable'}:state.children.map(child=>({child_id:child.id,display_name:child.name})) ,state.failList?503:200);
   if(endpoint==='app_current_child_creation')return reply(state.current?[state.current]:[]);
   if(endpoint==='app_begin_child_creation'){
    const row={intent_id:'00000000-0000-0000-0000-000000000201',child_id:'00000000-0000-0000-0000-000000000101',display_name:payload.p_display_name,acknowledged:false,prior_intent_id:payload.p_prior_intent_id,request_id:payload.p_request_id,disposition:'created'};
    state.current=row;state.children.push({id:row.child_id,name:row.display_name});return reply([row]);
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
 await expect.poll(()=>page.evaluate(()=>window.__apVerseParentFixture.calls)).toEqual(['app_list_created_children','app_current_child_creation','app_begin_child_creation','app_ack_child_creation','app_list_created_children']);
});

test('APVerse child-list errors never appear as a successful empty state',async({page})=>{
 await setup(page,true);
 await expect(page.getByRole('heading',{name:'Your children',exact:true})).toBeVisible();
 await expect(page.getByRole('alert')).toContainText('Children could not be loaded');
 await expect(page.getByText('No children yet.',{exact:true})).toHaveCount(0);
});
