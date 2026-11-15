import {test,expect,type Page} from '@playwright/test';
import {backend,login} from './support/backend';
test.setTimeout(60_000);
declare global{interface Window{__scanFixture:{reads:number;imports:number;lose:boolean;unavailable:boolean;rawOnly:boolean;monthlyDenied:boolean;requests:Record<string,string[]>}}}
async function setup(page:Page){
 await backend(page,{academy:true,readyClass:true});
 await page.addInitScript(()=>{
  window.__scanFixture={reads:0,imports:0,lose:false,unavailable:false,rawOnly:false,monthlyDenied:false,requests:{}};
  const original=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
   const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
   if(raw.startsWith('data:')||raw.startsWith('blob:'))return original(input,init);
   const url=new URL(raw,location.origin),state=window.__scanFixture;
   const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
   if(url.pathname.endsWith('/functions/v1/scan-roster')){state.reads++;const form=init?.body as unknown as {get(name:string):unknown};if(form?.get('recognizer')!=='cloud-vision-v1')return reply({code:'UPGRADE_REQUIRED'},409);if(state.monthlyDenied)return reply({code:'LIMIT_MONTH'},429);if(state.rawOnly)return reply({students:[],warnings:['Review recognised lines.'],rawLines:['Fictional Meera','Fictional Aarav']});return state.unavailable?reply({code:'SETUP'},503):reply({students:[{name:'Fictional Tara',age:9,guardian:'Fictional Meera',email:'meera@example.test',phone:'9876543210',proficiency:'intermediate',warnings:['Check handwriting']},{name:'Fictional Ria',age:null,guardian:null,email:null,phone:null,proficiency:'unassessed',warnings:[]}],warnings:[],rawLines:['Student Name Age Guardian Phone','Fictional Tara 9 Fictional Meera 9876543210']});}
   if(url.pathname.endsWith('/rpc/import_roster_scan')){
    state.imports++;const p=JSON.parse(String(init?.body)),r=window.__coachFixture.roster;
    if(!state.requests[p.import_request]){
     state.requests[p.import_request]=p.reviewed_students.map((row:{id:string})=>row.id);
     for(const row of p.reviewed_students){
      if(row.mode==='new'){r.students.push({id:row.id,name:row.name,age_years:row.age?Number(row.age):null,proficiency_level:row.proficiency,archived_at:null});if(row.guardian)r.contacts.push({student_id:row.id,name:row.guardian,email:row.email||null,phone:row.phone||null});}
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
 await expect(page.getByRole('textbox',{name:'Guardian name row 1',exact:true})).toHaveValue('Fictional Meera');
 await expect(page.getByRole('textbox',{name:'Guardian phone row 1',exact:true})).toHaveValue('9876543210');
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

test('unclear OCR layouts show text and names-only review without a second scan request',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Scan student list',exact:true}).click();
 await page.evaluate(()=>{window.__scanFixture.rawOnly=true;});await choose(page);
 await expect(page.getByRole('heading',{name:'Scan student list',exact:true})).toBeVisible();
 await expect(page.getByText('Review recognised text',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__scanFixture.imports)).toBe(0);
 await page.getByRole('button',{name:'Use recognised lines as names',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Student name row 1',exact:true})).toHaveValue('Fictional Meera');
 await expect(page.getByRole('textbox',{name:'Student name row 2',exact:true})).toHaveValue('Fictional Aarav');
 expect(await page.evaluate(()=>window.__scanFixture.reads)).toBe(1);
 await page.getByRole('button',{name:'Review import (2)',exact:true}).click();
 expect(await page.evaluate(()=>window.__scanFixture.imports)).toBe(0);
 await page.getByRole('button',{name:'Confirm student import',exact:true}).click();
 await expect(page.getByRole('button',{name:'View profile for Fictional Meera',exact:true})).toBeVisible();
});
test('monthly shared quota refusal keeps manual entry available and saves no students',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Add a student',exact:true}).click();await page.getByRole('button',{name:'Scan a student list instead',exact:true}).click();
 await page.evaluate(()=>{window.__scanFixture.monthlyDenied=true;});await choose(page);
 await expect(page.getByText('The shared monthly scanning limit has been reached. Manual entry is still available.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__scanFixture.imports)).toBe(0);
 await page.getByRole('button',{name:'Back to student entry',exact:true}).click();await expect(page.getByRole('textbox',{name:'Student name',exact:true})).toBeEditable();
});
