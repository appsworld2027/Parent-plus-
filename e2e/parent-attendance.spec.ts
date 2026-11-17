import {test,expect,type Page} from '@playwright/test';
import {parentBackend} from './support/parentBackend';
declare global {interface Window {__attendanceFixture:{fail:boolean;hold:boolean;started:boolean;finished:boolean};}}
async function setup(page:Page){
 await parentBackend(page);
 await page.addInitScript(()=>{
  const id=(n:number)=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
  const s=window.__parentFixture;
  s.families=[{id:id(61),owner_id:id(1),parent_name:'Fictional Parent',name:'Family',timezone:'Asia/Kolkata'}];
  s.children=[{id:id(71),family_id:id(61),name:'Ria',born_on:null,color:'sun',archived_at:null},{id:id(72),family_id:id(61),name:'Asha',born_on:null,color:'sky',archived_at:null}];
  s.links=s.children.map((child,i)=>({id:id(81+i),academy_id:id(11),student_id:id(21+i),child_id:child.id,active:true,academy_name:'Academy',student_name:child.name}));
  const state:Window['__attendanceFixture']={fail:false,hold:false,started:false,finished:false};
  window.__attendanceFixture=state;
  const original=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
   const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
   if(!new URL(raw,location.origin).pathname.endsWith('/get_parent_attendance_sessions'))return original(input,init);
   const p=JSON.parse(String(init?.body));
   if(p.target_child===id(71)){state.started=true;while(state.hold)await new Promise(resolve=>setTimeout(resolve,20));state.finished=true;}
   return new Response(JSON.stringify(state.fail?{code:'unavailable'}:[{session_id:id(41),academy_id:id(11),academy_name:'Academy',batch_name:p.target_child===id(71)?'Ria class':'Asha class',starts_at:`${p.target_day}T10:00:00Z`,ends_at:`${p.target_day}T11:00:00Z`,session_status:'scheduled',attendance_status:null}]),{status:state.fail?503:200,headers:{'Content-Type':'application/json'}});
  };

 });
 await page.goto('/parent');await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');await page.getByLabel('Password',{exact:true}).fill('FictionalPassword123');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Class attendance',exact:true})).toBeVisible();
}
test('Parent sees unrecorded attendance; a failed refresh never becomes a false empty schedule',async({page})=>{
 await setup(page);await expect(page.getByText('Attendance not recorded',{exact:true})).toBeVisible();
 await page.evaluate(()=>{window.__attendanceFixture.fail=true;});await page.getByRole('button',{name:'Refresh attendance',exact:true}).click();
 await expect(page.getByText('Attendance could not be loaded. Retry to check the latest records.',{exact:true})).toBeVisible();
 await expect(page.getByText('Attendance not recorded',{exact:true})).toHaveCount(0);
 await expect(page.getByText('No shared classes for this date.',{exact:true})).toHaveCount(0);
 await page.evaluate(()=>{window.__attendanceFixture.fail=false;});await page.getByRole('button',{name:'Refresh attendance',exact:true}).click();await expect(page.getByText('Attendance not recorded',{exact:true})).toBeVisible();
});
test('switching children ignores a late previous-child response',async({page})=>{
 await setup(page);await expect(page.getByText('Academy · Ria class',{exact:true})).toBeVisible();
 await page.evaluate(()=>{window.__attendanceFixture.hold=true;window.__attendanceFixture.started=false;window.__attendanceFixture.finished=false;});
 await page.getByRole('button',{name:'Refresh attendance',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.__attendanceFixture.started)).toBe(true);
 await page.getByRole('tab',{name:'Choose child Asha',exact:true}).click();await expect(page.getByText('Academy · Asha class',{exact:true})).toBeVisible();
 await page.evaluate(()=>{window.__attendanceFixture.hold=false;});await expect.poll(()=>page.evaluate(()=>window.__attendanceFixture.finished)).toBe(true);
 await expect(page.getByText('Academy · Ria class',{exact:true})).toHaveCount(0);
});
