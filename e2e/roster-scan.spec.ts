import {test,expect,type Page} from '@playwright/test';
import {backend,login} from './support/backend';
import type {Proficiency} from '../src/roster/model';
test.setTimeout(60_000);
type ImportPayload={target_batch:string|null;import_request:string;reviewed_students:{id:string;mode:string;[key:string]:unknown}[]};
declare global{interface Window{__scanFixture:{reads:number;imports:number;lose:boolean;unavailable:boolean;rawOnly:boolean;monthlyDenied:boolean;failRefresh:boolean;rosterFailures:number;scannedStudents:unknown[];payloads:ImportPayload[];requests:Record<string,string[]>}}}
const clay='00000000-0000-0000-0000-000000000031';
async function setup(page:Page,{fresh=false,today=false}:{fresh?:boolean;today?:boolean}={}){
 await backend(page,{academy:true,readyClass:!fresh});
 await page.addInitScript(()=>{
  window.__scanFixture={reads:0,imports:0,lose:false,unavailable:false,rawOnly:false,monthlyDenied:false,failRefresh:false,rosterFailures:0,payloads:[],requests:{},scannedStudents:[{name:'Fictional Tara',age:9,guardian:'Fictional Meera',email:'meera@example.test',phone:'9876543210',proficiency:'intermediate',warnings:['Check handwriting']},{name:'Fictional Ria',age:null,guardian:null,email:null,phone:null,proficiency:'unassessed',warnings:[]}]};
  const original=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
   const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
   if(raw.startsWith('data:')||raw.startsWith('blob:'))return original(input,init);
   const url=new URL(raw,location.origin),state=window.__scanFixture;
   const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
   if(url.pathname.endsWith('/coach_photos'))return reply(url.searchParams.has('entity_id')?null:[]);
   if(url.pathname.endsWith('/students')&&state.rosterFailures>0){state.rosterFailures--;return reply({code:'XX000',message:'Fictional roster refresh failed'},500);}
   if(url.pathname.endsWith('/functions/v1/scan-roster')){
    state.reads++;const form=init?.body as unknown as {get(name:string):unknown};
    if(form?.get('recognizer')!=='cloud-vision-v1')return reply({code:'UPGRADE_REQUIRED'},409);
    if(state.monthlyDenied)return reply({code:'LIMIT_MONTH'},429);
    if(state.rawOnly)return reply({students:[],warnings:['Review recognised lines.'],rawLines:['Fictional Meera','Fictional Aarav']});
    return state.unavailable?reply({code:'SETUP'},503):reply({students:state.scannedStudents,warnings:[],rawLines:['Student Name Age Guardian Phone','Fictional Tara 9 Fictional Meera 9876543210']});
   }
   if(url.pathname.endsWith('/rpc/import_roster_scan')){
    state.imports++;const p=JSON.parse(String(init?.body)) as ImportPayload,r=window.__coachFixture.roster;state.payloads.push(p);
    if(!state.requests[p.import_request]){
     state.requests[p.import_request]=p.reviewed_students.map(row=>row.id);
     for(const row of p.reviewed_students){
      if(row.mode==='new'){
       r.students.push({id:row.id,name:String(row.name),age_years:row.age?Number(row.age):null,proficiency_level:row.proficiency as Proficiency,archived_at:null});
       if(row.guardian)r.contacts.push({student_id:row.id,name:String(row.guardian),email:row.email?String(row.email):null,phone:row.phone?String(row.phone):null});
      }
      if(p.target_batch&&!r.enrolments.some(e=>e.student_id===row.id&&e.batch_id===p.target_batch))r.enrolments.push({student_id:row.id,batch_id:p.target_batch,starts_on:'2020-01-01',ends_on:null});
     }
     sessionStorage.setItem('__fictional_roster',JSON.stringify(r));
    }
    if(state.failRefresh){state.failRefresh=false;state.rosterFailures=1;}
    if(state.lose){state.lose=false;throw new TypeError('Fictional lost import response');}
    return reply(state.requests[p.import_request]);
   }
   return original(input,init);
  };
 });
 await login(page);
 if(!today){await page.getByRole('tab',{name:'Students',exact:true}).click();await expect(page.getByRole('button',{name:'Scan student list',exact:true})).toBeEnabled();}
}
async function choose(page:Page,cancel=false){
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Take or choose register photo',exact:true}).click();
 await(await chooser).setFiles(cancel?[]:{name:'fictional-register.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
}
async function createBatch(page:Page,name:string){
 await page.getByRole('button',{name:'Create a new batch',exact:true}).click();
 await page.getByRole('textbox',{name:'New batch name',exact:true}).fill(name);
 await page.getByRole('textbox',{name:'Monthly batch fee (₹)',exact:true}).fill('1500');
 await page.getByRole('textbox',{name:'Batch room or location',exact:true}).fill('Fictional Room');
 await page.getByRole('button',{name:'Create batch and continue',exact:true}).click();
 const select=page.getByRole('combobox',{name:'Batch for these students',exact:true});
 await expect(select.locator('option:checked')).toHaveText(name);await expect(select).toBeEnabled();return select.inputValue();
}
async function scan(page:Page){await page.getByRole('button',{name:'Scan student list',exact:true}).click();await choose(page);await expect(page.getByRole('textbox',{name:'Student name row 1',exact:true})).toHaveValue('Fictional Tara',{timeout:15000});}
async function confirm(page:Page,count:number){await page.getByRole('button',{name:`Review import (${count})`,exact:true}).click();await page.getByRole('button',{name:'Confirm student import',exact:true}).click();}

test('fresh Today setup creates a batch, populates reviewed profiles, changes batch and reopens persisted roster and details',async({page},info)=>{
 await setup(page,{fresh:true,today:true});
 await expect(page.getByText('0 students',{exact:true})).toBeVisible();await expect(page.getByText('0 batches',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Create batch and scan students',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Set up your students',exact:true})).toBeVisible();
 const original=await createBatch(page,'Fictional Sunday');await choose(page);
 await expect(page.getByRole('textbox',{name:'Student name row 1',exact:true})).toHaveValue('Fictional Tara',{timeout:15000});
 await expect(page.getByRole('textbox',{name:'Age row 1',exact:true})).toHaveValue('9');
 await expect(page.getByRole('combobox',{name:'Proficiency row 1',exact:true})).toHaveValue('intermediate');
 await page.getByRole('button',{name:'Edit more details for student 1',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Guardian name row 1',exact:true})).toHaveValue('Fictional Meera');
 await expect(page.getByRole('textbox',{name:'Guardian phone row 1',exact:true})).toHaveValue('9876543210');
 const selected=await createBatch(page,'Fictional Drawing');
 await expect(page.getByRole('textbox',{name:'Student name row 1',exact:true})).toHaveValue('Fictional Tara');
 const dropdown=page.getByRole('combobox',{name:'Batch for these students',exact:true});await dropdown.selectOption(original);await dropdown.selectOption(selected);
 expect(await page.evaluate(()=>window.__scanFixture.imports)).toBe(0);
 await page.getByRole('button',{name:'Review import (2)',exact:true}).click();expect(await page.evaluate(()=>window.__scanFixture.imports)).toBe(0);
 await page.getByRole('button',{name:'Confirm student import',exact:true}).click();
 await expect(page.getByRole('heading',{name:'2 students saved',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open saved profile for Fictional Tara',exact:true})).toBeEnabled();
 await page.screenshot({path:info.outputPath('setup-saved.png'),fullPage:true});
 expect(await page.evaluate(()=>window.__scanFixture.payloads[0].target_batch)).toBe(selected);
 expect(await page.evaluate(batch=>window.__coachFixture.roster.enrolments.filter(e=>e.batch_id===batch).length,original)).toBe(0);
 await page.getByRole('button',{name:'View batch Fictional Drawing',exact:true}).click();
 await expect(page.getByText('2 students',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'View profile for Fictional Tara',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'View profile for Fictional Tara',exact:true}).click();
 await expect(page.getByText('9 years old',{exact:true})).toBeVisible();await expect(page.getByText('Intermediate',{exact:true})).toBeVisible();await expect(page.getByText('Fictional Meera',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open batch Fictional Drawing',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('setup-profile.png'),fullPage:true});
 await page.reload();await expect(page.getByText('2 students',{exact:true})).toBeVisible();await expect(page.getByText('2 batches',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Students',exact:true}).click();await page.getByRole('button',{name:'View profile for Fictional Tara',exact:true}).click();
 await expect(page.getByText('9 years old',{exact:true})).toBeVisible();await expect(page.getByText('Intermediate',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__coachFixture.roster.students.length)).toBe(2);
});

test('an unknown save locks review and retries the exact import without duplicate profiles or another scan',async({page})=>{
 await setup(page);await scan(page);await page.getByRole('combobox',{name:'Batch for these students',exact:true}).selectOption(clay);
 await page.evaluate(()=>{window.__scanFixture.lose=true;});await confirm(page,1);
 await expect(page.getByRole('textbox',{name:'Student name row 1',exact:true})).not.toBeEditable();await expect(page.getByRole('combobox',{name:'Batch for these students',exact:true})).toBeDisabled();
 await expect(page.getByText('An import may already have saved. Retry this same review to confirm it.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Retry same student import',exact:true}).click();
 await expect(page.getByRole('heading',{name:'1 students saved',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>({students:window.__coachFixture.roster.students.length,imports:window.__scanFixture.imports,reads:window.__scanFixture.reads,same:JSON.stringify(window.__scanFixture.payloads[0])===JSON.stringify(window.__scanFixture.payloads[1])}))).toEqual({students:2,imports:2,reads:1,same:true});
});

test('confirmed import with failed roster refresh retries only the refresh and then opens its saved profile',async({page})=>{
 await setup(page);await scan(page);await page.getByRole('combobox',{name:'Batch for these students',exact:true}).selectOption(clay);
 await page.evaluate(()=>{window.__scanFixture.failRefresh=true;});await confirm(page,1);
 await expect(page.getByRole('heading',{name:'1 students saved',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Refresh saved profiles',exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Open saved profile for Fictional Tara',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'View batch Fictional Clay Class',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>window.__scanFixture.imports)).toBe(1);
 await page.getByRole('button',{name:'Refresh saved profiles',exact:true}).click();
 await expect(page.getByRole('button',{name:'Open saved profile for Fictional Tara',exact:true})).toBeEnabled();
 expect(await page.evaluate(()=>({imports:window.__scanFixture.imports,reads:window.__scanFixture.reads}))).toEqual({imports:1,reads:1});
 await page.getByRole('button',{name:'Open saved profile for Fictional Tara',exact:true}).click();await expect(page.getByText('9 years old',{exact:true})).toBeVisible();
});

test('cancelled photo selection and a failed scan retain the created batch and permit manual student entry',async({page})=>{
 await setup(page,{fresh:true,today:true});await page.getByRole('button',{name:'Create batch and scan students',exact:true}).click();
 const batch=await createBatch(page,'Fictional Retained');await choose(page,true);
 await expect(page.getByRole('button',{name:'Take or choose register photo',exact:true})).toBeEnabled();await expect(page.getByRole('combobox',{name:'Batch for these students',exact:true})).toHaveValue(batch);
 expect(await page.evaluate(()=>window.__scanFixture.reads)).toBe(0);
 await page.evaluate(()=>{window.__scanFixture.unavailable=true;});await choose(page);
 await expect(page.getByText(/Photo scanning is unavailable/)).toBeVisible();await expect(page.getByRole('combobox',{name:'Batch for these students',exact:true})).toHaveValue(batch);
 await page.getByRole('button',{name:'Back to student entry',exact:true}).click();await page.getByRole('button',{name:'Add a student',exact:true}).click();
 await page.getByRole('textbox',{name:'Student name',exact:true}).fill('Fictional Manual');await page.getByRole('checkbox',{name:'Fictional Retained',exact:true}).check();
 await page.getByRole('button',{name:'Save student',exact:true}).click();await expect(page.getByRole('button',{name:'View profile for Fictional Manual',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>({batches:window.__coachFixture.roster.batches.length,students:window.__coachFixture.roster.students.length,imports:window.__scanFixture.imports}))).toEqual({batches:1,students:1,imports:0});
});

test('linking an existing profile adds only selected membership and preserves age, level and guardian',async({page})=>{
 await setup(page);
 await page.evaluate(()=>{const r=window.__coachFixture.roster;r.students[0].proficiency_level='beginner';r.contacts=[{student_id:r.students[0].id,name:'Original Guardian',email:'original@example.test',phone:'12345'}];window.__scanFixture.scannedStudents=[{name:'Fictional Ria',age:120,guardian:'Wrong Guardian',email:'wrong@example.test',phone:'99999',proficiency:'advanced',warnings:[]}];});
 await page.getByRole('button',{name:'Refresh roster',exact:true}).click();await page.getByRole('button',{name:'Scan student list',exact:true}).click();
 await createBatch(page,'Fictional Additional');await choose(page);
 await page.getByRole('button',{name:'Use existing Fictional Ria · age 6',exact:true}).click();await confirm(page,1);
 await expect(page.getByRole('heading',{name:'1 students saved',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__scanFixture.payloads[0].reviewed_students)).toEqual([{id:'00000000-0000-0000-0000-000000000021',mode:'existing'}]);
 await page.getByRole('button',{name:'Open saved profile for Fictional Ria',exact:true}).click();
 await expect(page.getByText('6 years old',{exact:true})).toBeVisible();await expect(page.getByText('Beginner',{exact:true})).toBeVisible();await expect(page.getByText('Original Guardian',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open batch Fictional Clay Class',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Open batch Fictional Additional',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__coachFixture.roster.students.length)).toBe(1);
});

test('names-only OCR automatically populates review without another scan or invented profile fields',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Scan student list',exact:true}).click();await page.evaluate(()=>{window.__scanFixture.rawOnly=true;});await choose(page);
 await expect(page.getByRole('textbox',{name:'Student name row 1',exact:true})).toHaveValue('Fictional Meera');await expect(page.getByRole('textbox',{name:'Student name row 2',exact:true})).toHaveValue('Fictional Aarav');
 await expect(page.getByRole('textbox',{name:'Age row 1',exact:true})).toHaveValue('');await expect(page.getByRole('combobox',{name:'Proficiency row 1',exact:true})).toHaveValue('unassessed');
 await expect(page.getByRole('button',{name:'Use recognised lines as names',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>[window.__scanFixture.reads,window.__scanFixture.imports])).toEqual([1,0]);
 await page.getByRole('combobox',{name:'Batch for these students',exact:true}).selectOption(clay);await confirm(page,2);await expect(page.getByRole('heading',{name:'2 students saved',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__scanFixture.reads)).toBe(1);
});

test('monthly scan quota refusal leaves manual entry available and saves no students',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Add a student',exact:true}).click();await page.getByRole('button',{name:'Scan a student list instead',exact:true}).click();
 await page.evaluate(()=>{window.__scanFixture.monthlyDenied=true;});await choose(page);
 await expect(page.getByText('The shared monthly scanning limit has been reached. Manual entry is still available.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__scanFixture.imports)).toBe(0);await page.getByRole('button',{name:'Back to student entry',exact:true}).click();await expect(page.getByRole('textbox',{name:'Student name',exact:true})).toBeEditable();
});
