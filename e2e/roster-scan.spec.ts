import {test,expect,type Page} from '@playwright/test';
import {backend,login} from './support/backend';
test.setTimeout(60_000);
declare global{interface Window{__scanFixture:{reads:number;imports:number;lose:boolean;unavailable:boolean;requests:Record<string,string[]>}}}
async function setup(page:Page){
 await backend(page,{academy:true,readyClass:true});
 await page.addInitScript(()=>{
  window.__scanFixture={reads:0,imports:0,lose:false,unavailable:false,requests:{}};
  const original=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
   const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
   if(raw.startsWith('data:')||raw.startsWith('blob:'))return original(input,init);
   const url=new URL(raw,location.origin),state=window.__scanFixture;
   const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
   if(url.pathname.endsWith('/functions/v1/scan-roster')){state.reads++;return state.unavailable?reply({code:'SETUP'},503):reply({students:[{name:'Fictional Tara',age:9,guardian:'',email:'',phone:'',proficiency:'intermediate',warnings:['Check handwriting']},{name:'Fictional Ria',age:null,guardian:null,email:null,phone:null,proficiency:'unassessed',warnings:[]}],warnings:[]});}
   if(url.pathname.endsWith('/rpc/import_roster_scan')){
    state.imports++;const p=JSON.parse(String(init?.body)),r=window.__coachFixture.roster;
    if(!state.requests[p.import_request]){
     state.requests[p.import_request]=p.reviewed_students.map((row:{id:string})=>row.id);
     for(const row of p.reviewed_students){
      if(row.mode==='new')r.students.push({id:row.id,name:row.name,age_years:row.age?Number(row.age):null,proficiency_level:row.proficiency,archived_at:null});
      if(p.target_batch&&!r.enrolments.some(e=>e.student_id===row.id&&e.batch_id===p.target_batch))r.enrolments.push({student_id:row.id,batch_id:p.target_batch,starts_on:'2020-01-01',ends_on:null});
     }sessionStorage.setItem('__fictional_roster',JSON.stringify(r));
    }
    if(state.lose){state.lose=false;throw new TypeError('Fictional lost import response');}
    return reply(state.requests[p.import_request]);
   }return original(input,init);
  };
 });
 await login(page);await page.getByRole('tab',{name:'Students',exact:true}).click();
}
async function choose(page:Page){const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Take or choose register photo',exact:true}).click();await(await chooser).setFiles({name:'fictional-register.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});}
test('batch scan reviews and corrects names, links existing students and imports only after confirmation',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Batches',exact:true}).click();await page.getByRole('button',{name:'Open batch Fictional Clay Class',exact:true}).click();
 await page.getByRole('button',{name:'Scan student list into this batch',exact:true}).click();await choose(page);
 await expect(page.getByRole('textbox',{name:'Student name row 1',exact:true})).toHaveValue('Fictional Tara',{timeout:15000});
 expect(await page.evaluate(()=>window.__scanFixture.imports)).toBe(0);
 await page.getByRole('textbox',{name:'Student name row 1',exact:true}).fill('Fictional Tara Corrected');
 await page.getByRole('button',{name:'Edit more details for student 1',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Age row 1',exact:true})).toHaveValue('9');
 await page.getByRole('textbox',{name:'Age row 1',exact:true}).fill('10');
 await page.getByRole('button',{name:'Use existing Fictional Ria · age 6',exact:true}).click();
 await page.getByRole('button',{name:'Review import (2)',exact:true}).click();
 expect(await page.evaluate(()=>window.__scanFixture.imports)).toBe(0);
 await page.getByRole('button',{name:'Confirm student import',exact:true}).click();
 await expect(page.getByRole('button',{name:'View profile for Fictional Tara Corrected',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__coachFixture.roster.students.length)).toBe(2);
});
test('a lost import response locks edits and retries without duplicate profiles',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Scan student list',exact:true}).click();await choose(page);
 await page.getByRole('button',{name:'Review import (1)',exact:true}).click();await page.evaluate(()=>{window.__scanFixture.lose=true;});
 await page.getByRole('button',{name:'Confirm student import',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Student name row 1',exact:true})).not.toBeEditable();
 await expect(page.getByText('An import may already have saved. Retry this same review to confirm it.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Retry same student import',exact:true}).click();
 await expect(page.getByRole('button',{name:'View profile for Fictional Tara',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>[window.__coachFixture.roster.students.length,window.__scanFixture.imports])).toEqual([2,2]);
});
test('unconfigured scanning saves nothing and leaves manual student entry available',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Add a student',exact:true}).click();await page.getByRole('button',{name:'Scan a student list instead',exact:true}).click();
 await page.evaluate(()=>{window.__scanFixture.unavailable=true;});await choose(page);
 await expect(page.getByText(/Photo scanning is unavailable/)).toBeVisible();
 expect(await page.evaluate(()=>window.__scanFixture.imports)).toBe(0);
 await page.getByRole('button',{name:'Back to student entry',exact:true}).click();await expect(page.getByRole('textbox',{name:'Student name',exact:true})).toBeEditable();
});
