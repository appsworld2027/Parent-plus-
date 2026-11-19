import {expect,test,type Page} from '@playwright/test';
import {parentBackend} from './support/parentBackend';
import {login} from './support/backend';
const note='Today Ria explained her clay design clearly and practised careful shaping.';
async function shareClassFeedback(page:Page){
  await page.getByRole('button',{name:'Open attendance for Fictional Clay Class at 16:00',exact:true}).click();
  await page.getByRole('button',{name:'Mark all present',exact:true}).click();await page.getByRole('button',{name:'Save attendance to class',exact:true}).click();
  await page.getByRole('button',{name:'Write feedback for this class',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Linked class (optional)',exact:true})).toHaveValue(await page.evaluate(()=>window.__coachFixture.classes[0].id));
  await page.getByLabel('Observation text',{exact:true}).fill(note);await page.getByRole('button',{name:'Save feedback',exact:true}).click();
  expect(await page.evaluate(()=>window.__mediaFixture.handoffs.length)).toBe(0);
  await page.getByRole('button',{name:'Review and share to Parent',exact:true}).click();await page.getByRole('checkbox',{name:'I reviewed the feedback, recipients and media for parents',exact:true}).check();
  await page.getByRole('button',{name:'Share approved feedback to Parent',exact:true}).click();
}
test('one login: class feedback → review/share → family and child setup → explicit connection → Parent update and reload',async({page})=>{
  test.setTimeout(60000);await parentBackend(page);await login(page);await shareClassFeedback(page);
  await page.getByRole('button',{name:'Open Fictional Ria’s update in Parent',exact:true}).click();
  await expect(page).toHaveURL(/\/parent$/);await expect(page.getByLabel('Your parent name',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'View Fictional Ria’s class update',exact:true})).toBeVisible();
  await page.getByLabel('Your parent name',{exact:true}).fill('Coach also testing Parent');await page.getByLabel('Family name',{exact:true}).fill('Our test family');await page.getByRole('button',{name:'Create my family workspace',exact:true}).click();
  await page.getByRole('button',{name:'Add my first child',exact:true}).click();await page.getByLabel('Child name',{exact:true}).fill('My child Ria');await page.getByRole('button',{name:'Save child',exact:true}).click();
  expect(await page.evaluate(()=>window.__parentFixture.links.length)).toBe(0);
  await page.getByRole('button',{name:'Connect child and view update',exact:true}).click();await expect(page.getByRole('combobox',{name:'Child receiving this feedback',exact:true})).toHaveValue('');await page.getByRole('combobox',{name:'Child receiving this feedback',exact:true}).selectOption(await page.evaluate(()=>window.__parentFixture.children[0].id));
  await page.getByRole('button',{name:'Review coach invitation',exact:true}).click();await expect(page.getByText('Coach student: Fictional Ria → Your child: My child Ria',{exact:true})).toBeVisible();
  await page.getByRole('checkbox',{name:'This is the right coach and child',exact:true}).check();await page.getByRole('button',{name:'Request coach approval',exact:true}).click();
  await expect(page.getByText('Waiting for coach approval',{exact:true})).toBeVisible();
  await expect(page.getByText(note,{exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'Open Coach to approve this connection',exact:true}).click();
  await page.getByRole('checkbox',{name:'I verified the guardian and child match for Fictional Ria',exact:true}).check();
  await page.getByRole('button',{name:'Approve Parent connection for Fictional Ria',exact:true}).click();
  await page.getByRole('link',{name:'Open Parent to view approved update',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your shared class update',exact:true})).toBeVisible();await expect(page.getByText(note,{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('parentplus.feedback-journey.v1'))).toBeNull();
  await page.reload();await expect(page.getByText(note,{exact:true})).toBeVisible();
});
test('existing own connection selects the linked child without another invitation or sign-in',async({page})=>{
  await parentBackend(page);await login(page);await shareClassFeedback(page);
  await page.evaluate(()=>{
    const state=window.__parentFixture,owner='00000000-0000-0000-0000-000000000001';
    state.families.push({id:'family',owner_id:owner,parent_name:'Test Parent',name:'Family',timezone:'Asia/Kolkata'});
    for(const [id,name] of [['sibling','Sibling'],['target','My child Ria']])state.children.push({id,family_id:'family',name,born_on:null,color:'sun',archived_at:null});
    state.links.push({id:'existing-link',academy_id:'academy-test',student_id:window.__coachFixture.roster.students[0].id,child_id:'target',parent_user_id:owner,active:true,academy_name:'Fictional Test Academy',student_name:'Fictional Ria'});
    sessionStorage.setItem('__fictional_parent',JSON.stringify(state));
  });
  await page.getByRole('button',{name:'Open Fictional Ria’s update in Parent',exact:true}).click();
  // The Coach editor/history also contain this text while navigation is pending.
  await expect(page.getByRole('heading',{name:'Your shared class update',exact:true})).toBeVisible();
  await expect(page.getByText(note,{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>Object.keys(window.__parentFixture.invites).length)).toBe(0);
  await page.reload();await expect(page.getByText(note,{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Choose child Sibling',exact:true}).click();await expect(page.getByText(note,{exact:true})).toHaveCount(0);
});
test('same-login shortcut cannot open or replace another parent’s connection',async({page})=>{
  await parentBackend(page);await login(page);await shareClassFeedback(page);
  await page.evaluate(()=>{window.__parentFixture.links.push({id:'foreign-link',academy_id:'academy-test',student_id:window.__coachFixture.roster.students[0].id,child_id:'foreign-child',parent_user_id:'different-account',active:true,academy_name:'Fictional Test Academy',student_name:'Fictional Ria'});});
  await page.getByRole('button',{name:'Open Fictional Ria’s update in Parent',exact:true}).click();await expect(page.getByRole('alert')).toContainText('connected to another parent account');
  expect(await page.evaluate(()=>sessionStorage.getItem('parentplus.feedback-journey.v1'))).toBeNull();expect(await page.evaluate(()=>Object.keys(window.__parentFixture.invites).length)).toBe(0);
});
test('opening Parent locks sibling actions and cancellation until the connection check finishes',async({page})=>{
  await parentBackend(page);await login(page);await shareClassFeedback(page);
  await page.evaluate(()=>{window.__parentFixture.holdConnections=true;});
  const open=page.getByRole('button',{name:'Open Fictional Ria’s update in Parent',exact:true});await open.click();
  await expect(page.getByRole('button',{name:'Review and share to Parent',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Cancel Parent handoff for Fictional Ria',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>window.__parentFixture.connectionReads)).toBe(1);
  await page.evaluate(()=>{const state=window.__parentFixture;state.links.push({id:'foreign',academy_id:'academy-test',student_id:window.__coachFixture.roster.students[0].id,child_id:'another-child',parent_user_id:'another-account',active:true,academy_name:'Academy',student_name:'Ria'});state.holdConnections=false;});
  await expect(page.getByRole('alert')).toContainText('connected to another parent account');
  await expect(page.getByRole('button',{name:'Cancel Parent handoff for Fictional Ria',exact:true})).toBeEnabled();
});
test('sign-out clears a pending feedback connection and requires normal authentication again',async({page})=>{
  await parentBackend(page);await login(page);
  await page.evaluate(()=>sessionStorage.setItem('parentplus.feedback-journey.v1',JSON.stringify({owner:'00000000-0000-0000-0000-000000000001',academy:'academy-test',student:window.__coachFixture.roster.students[0].id,name:'Fictional Ria',handoff:'test-handoff',code:'a'.repeat(64),expires:Date.now()+60000})));
  await page.evaluate(()=>sessionStorage.setItem('parentplus.family-child.v1',JSON.stringify({owner:'00000000-0000-0000-0000-000000000001',family:'old-family',child:'previous-child'})));
  await page.goto('/parent');await expect(page.getByRole('heading',{name:'View Fictional Ria’s class update',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('parentplus.family-child.v1'))).not.toBeNull();
  await page.getByRole('button',{name:'My family setup',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('parentplus.feedback-journey.v1'))).toBeNull();
  expect(await page.evaluate(()=>sessionStorage.getItem('parentplus.family-child.v1'))).toBeNull();
});
