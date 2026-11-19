import {expect,test,type Page} from '@playwright/test';
import {parentBackend} from './support/parentBackend';
import {login} from './support/backend';

const invitation='d'.repeat(64);
async function setup(page:Page){
  await parentBackend(page);await login(page);
  await page.evaluate(code=>{
    const state=window.__parentFixture;
    state.families.push({id:'family',owner_id:'00000000-0000-0000-0000-000000000001',name:'Fictional Family',parent_name:'Fictional Parent',timezone:'Asia/Kolkata'});
    state.children.push({id:'first',family_id:'family',name:'Existing older sibling',born_on:'2016-03-10',color:'sun',archived_at:null},{id:'second',family_id:'family',name:'Existing younger sibling',born_on:'2019-07-04',color:'mint',archived_at:null});
    state.invites[code]={student:window.__coachFixture.roster.students[0].id,used:false};state.inviteEmails[code]='coach@example.test';
    sessionStorage.setItem('__fictional_parent',JSON.stringify(state));
  },invitation);
  await page.goto('/parent');
}
async function openConnection(page:Page){
  await page.getByRole('tab',{name:'Parent Explore',exact:true}).click();
  await page.getByRole('button',{name:'Connect a coach',exact:true}).click();
  await page.getByLabel('Coach invitation code',{exact:true}).fill(invitation);
}

test('PAR-CON-01 invitation requires an explicit sibling choice and an uncertain claim retries the same child',async({page})=>{
  await setup(page);await openConnection(page);
  const target=page.getByRole('combobox',{name:'Child receiving this feedback',exact:true});
  await expect(target).toHaveValue('');
  await expect(page.getByRole('button',{name:'Review coach invitation',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>window.__parentFixture.requests.length)).toBe(0);
  await target.selectOption('first');await page.getByRole('button',{name:'Review coach invitation',exact:true}).click();
  await page.getByRole('checkbox',{name:'This is the right coach and child',exact:true}).check();
  await target.selectOption('second');
  await expect(page.getByRole('checkbox',{name:'This is the right coach and child',exact:true})).not.toBeChecked();
  await expect(page.getByRole('button',{name:'Request coach approval',exact:true})).toBeDisabled();
  await expect(page.getByText('Coach student: Fictional Ria → Your child: Existing younger sibling',{exact:true})).toBeVisible();
  await page.getByRole('checkbox',{name:'This is the right coach and child',exact:true}).check();
  await page.evaluate(()=>{window.__parentFixture.loseClaim=true;});
  await page.getByRole('button',{name:'Request coach approval',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('could not be confirmed');
  await expect(target).toHaveValue('second');await expect(page.getByLabel('Coach invitation code',{exact:true})).toHaveValue(invitation);
  await page.getByRole('button',{name:'Request coach approval',exact:true}).click();
  await page.getByRole('tab',{name:'Parent Home',exact:true}).click();
  await expect(page.getByText('Waiting for coach approval',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>({targets:window.__parentFixture.claimTargets,requests:window.__parentFixture.requests.map(row=>({child:row.child_id,status:row.status})),links:window.__parentFixture.links.length}))).toEqual({targets:['second','second'],requests:[{child:'second',status:'pending'}],links:0});
  await page.reload();await expect(page.getByText('Waiting for coach approval',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Choose child Existing older sibling',exact:true}).click();await expect(page.getByText('Waiting for coach approval',{exact:true})).toHaveCount(0);
});

test('PAR-CON-04 an explicitly rejected child save can be corrected without losing the invitation',async({page})=>{
  await setup(page);await openConnection(page);await page.getByRole('button',{name:'Add a different child',exact:true}).click();
  const name=page.getByLabel('New child name',{exact:true});await name.fill('Fictional rejected details');
  await page.evaluate(()=>{window.__parentFixture.rejectChild=true;});
  await page.getByRole('button',{name:'Save child and continue',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Review the child details');
  await expect(name).toBeEditable();
  await name.fill('Fictional corrected child');await page.getByRole('button',{name:'Save child and continue',exact:true}).click();
  await expect(page.getByLabel('Coach invitation code',{exact:true})).toHaveValue(invitation);
  await expect(page.getByRole('combobox',{name:'Child receiving this feedback',exact:true})).not.toHaveValue('');
  expect(await page.evaluate(()=>window.__parentFixture.children.map(child=>child.name))).toEqual(['Existing older sibling','Existing younger sibling','Fictional corrected child']);
  expect(await page.evaluate(()=>window.__parentFixture.requests.length)).toBe(0);
});

test('PAR-CON-05 impossible calendar birth dates are rejected before starting a child save',async({page})=>{
  await setup(page);await openConnection(page);await page.getByRole('button',{name:'Add a different child',exact:true}).click();
  await page.getByLabel('New child name',{exact:true}).fill('Fictional calendar child');
  const birth=page.getByLabel('New child birth date (optional)',{exact:true});
  // Exercise manual/native-style date text rather than relying on browser date normalization.
  await birth.evaluate(input=>input.setAttribute('type','text'));await birth.fill('2020-02-31');
  await page.getByRole('button',{name:'Save child and continue',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Choose a valid birth date');
  expect(await page.evaluate(()=>window.__parentFixture.children.length)).toBe(2);
  await expect(birth).toBeEditable();await birth.fill('2020-02-29');
  await page.getByRole('button',{name:'Save child and continue',exact:true}).click();
  expect(await page.evaluate(()=>window.__parentFixture.children.at(-1)?.born_on)).toBe('2020-02-29');
});

test('PAR-CON-02 add a different child keeps the invitation and uses one identity across lost saves and refresh failure',async({page})=>{
  test.setTimeout(60000);await setup(page);await openConnection(page);
  await page.getByRole('button',{name:'Add a different child',exact:true}).click();
  await expect(page.getByRole('button',{name:'Review coach invitation',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Save child and continue',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Enter a child name');
  expect(await page.evaluate(()=>window.__parentFixture.children.length)).toBe(2);
  await page.getByLabel('New child name',{exact:true}).fill('Fictional new family child');
  await page.getByLabel('New child birth date (optional)',{exact:true}).fill('2020-08-11');
  await page.evaluate(()=>{window.__parentFixture.loseChild=true;});
  await page.getByRole('button',{name:'Save child and continue',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('could not be confirmed');
  await expect(page.getByLabel('New child name',{exact:true})).toHaveValue('Fictional new family child');
  await page.evaluate(()=>{window.__parentFixture.failChildRefresh=true;});
  await page.getByRole('button',{name:'Save child and continue',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Child saved');
  await expect(page.getByLabel('Coach invitation code',{exact:true})).toHaveValue(invitation);
  const writes=await page.evaluate(()=>window.__parentFixture.writes.filter(value=>value.startsWith('family_children:')));
  expect(writes).toHaveLength(2);expect(new Set(writes).size).toBe(1);
  await page.getByRole('button',{name:'Retry loading child profiles',exact:true}).click();
  expect(await page.evaluate(()=>window.__parentFixture.writes.filter(value=>value.startsWith('family_children:')))).toEqual(writes);
  const target=await page.getByRole('combobox',{name:'Child receiving this feedback',exact:true}).inputValue();expect(target).not.toBe('first');expect(target).not.toBe('second');
  await page.getByRole('button',{name:'Review coach invitation',exact:true}).click();
  await expect(page.getByText('Coach student: Fictional Ria → Your child: Fictional new family child',{exact:true})).toBeVisible();
  await page.getByRole('checkbox',{name:'This is the right coach and child',exact:true}).check();await page.getByRole('button',{name:'Request coach approval',exact:true}).click();
  expect(await page.evaluate(()=>({children:window.__parentFixture.children.map(row=>row.name),child:window.__parentFixture.requests[0].child_id,status:window.__parentFixture.requests[0].status,links:window.__parentFixture.links.length}))).toEqual({children:['Existing older sibling','Existing younger sibling','Fictional new family child'],child:target,status:'pending',links:0});
});

test('PAR-CON-03 pending academy B does not hide approved academy A updates or expose a sibling feed',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{
    const state=window.__parentFixture,student=window.__coachFixture.roster.students[0].id;
    state.links.push({id:'approved-link',academy_id:'academy-a',student_id:student,child_id:'first',active:true,academy_name:'Approved academy A',student_name:'School name for older sibling'});
    state.requests.push({id:'pending-b',academy_id:'academy-b',student_id:'other-school-student',child_id:'first',parent_user_id:'00000000-0000-0000-0000-000000000001',guardian_email:'coach@example.test',parent_name:'Fictional Parent',child_name:'Existing older sibling',born_on:'2016-03-10',status:'pending',link_id:null});
    window.__mediaFixture.handoffs.push({id:'reviewed-a',student_id:student,observation_id:'fictional-note',observation_revision:1,media_ids:[],snapshot:{note:'Approved academy A learning update',student_id:student},state:'available_to_parent'});
    window.__mediaFixture.handoffs.push({id:'held-b',student_id:'other-school-student',observation_id:'fictional-held-note',observation_revision:1,media_ids:[],snapshot:{note:'Private pending academy B update',student_id:'other-school-student'},state:'awaiting_parent_link'});
    sessionStorage.setItem('__fictional_parent',JSON.stringify(state));sessionStorage.setItem('__fictional_media',JSON.stringify(window.__mediaFixture));
  });
  await page.reload();await expect(page.getByText('Waiting for coach approval',{exact:true})).toBeVisible();
  await expect(page.getByText('Approved academy A learning update',{exact:true})).toBeVisible();
  await expect(page.getByText('Private pending academy B update',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Check connection approval',exact:true}).click();
  await expect(page.getByText('Approved academy A learning update',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Choose child Existing younger sibling',exact:true}).click();
  await expect(page.getByText('Approved academy A learning update',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Waiting for coach approval',{exact:true})).toHaveCount(0);
  await page.getByRole('tab',{name:'Choose child Existing older sibling',exact:true}).click();
  await page.reload();await expect(page.getByText('Approved academy A learning update',{exact:true})).toBeVisible();
  await expect(page.getByText('Waiting for coach approval',{exact:true})).toBeVisible();
  await expect(page.getByText('Private pending academy B update',{exact:true})).toHaveCount(0);
});
