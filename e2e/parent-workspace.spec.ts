import { expect, test, type Page } from '@playwright/test';
import { parentBackend } from './support/parentBackend';

async function loginParent(page:Page){await page.goto('/parent');await expect(page.getByText('YOUR FAMILY WORKSPACE',{exact:true})).toBeVisible();await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');await page.getByLabel('Password',{exact:true}).fill('FictionalParentPassword123');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByLabel('Your parent name',{exact:true})).toBeVisible();}
async function family(page:Page){await page.getByLabel('Your parent name',{exact:true}).fill('Fictional Parent');await page.getByLabel('Family name',{exact:true}).fill('Fictional Family');await page.getByRole('button',{name:'Create my family workspace',exact:true}).click();await page.getByRole('button',{name:'Add my first child',exact:true}).click();await page.getByLabel('Child name',{exact:true}).fill('Fictional Family Ria');await page.getByLabel('Birth date (optional)',{exact:true}).fill('2018-04-12');await page.getByRole('button',{name:'Save child',exact:true}).click();await expect(page.getByRole('tab',{name:'Choose child Fictional Family Ria',exact:true})).toBeVisible();}

test('Aurora Parent workspace creates family and children, logs real private time/reminders and persists across reload',async({page},info)=>{
  await parentBackend(page);await loginParent(page);await family(page);
  expect(await page.evaluate(()=>window.__coachFixture.calls.some(path=>path.endsWith('/academies')))).toBe(false);
  await page.getByRole('tab',{name:'Parent Together',exact:true}).click();await page.getByRole('button',{name:'Try Paper boat race',exact:true}).click();
  await page.getByLabel('Together minutes',{exact:true}).fill('12');await page.getByRole('button',{name:'We did this — save time',exact:true}).click();
  await page.getByRole('tab',{name:'Parent Home',exact:true}).click();await expect(page.getByText('12',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Parent Explore',exact:true}).click();await page.getByRole('button',{name:'Add a reminder',exact:true}).click();await page.getByLabel('Reminder',{exact:true}).fill('Bring the drawing book');await page.getByRole('button',{name:'Save family record',exact:true}).click();
  await page.reload();await page.getByRole('tab',{name:'Parent Home',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Bring the drawing book',exact:true})).toBeVisible();
  await page.getByRole('checkbox',{name:'Bring the drawing book',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Bring the drawing book',exact:true})).toBeChecked();
  await page.getByRole('button',{name:'Add a child',exact:true}).click();await page.getByLabel('Child name',{exact:true}).fill('Fictional Second Child');await page.getByRole('button',{name:'Save child',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'Bring the drawing book',exact:true})).toHaveCount(0);
  await page.getByRole('tab',{name:'Choose child Fictional Family Ria',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Bring the drawing book',exact:true})).toBeChecked();
  expect(await page.evaluate(()=>window.__parentFixture.moments.length)).toBe(1);expect(await page.evaluate(()=>window.__coachFixture.roster.students.length)).toBe(1);
  await page.screenshot({path:info.outputPath('parent-aurora-home.png'),fullPage:true});
  await page.getByRole('button',{name:'My family setup',exact:true}).click();await page.getByRole('button',{name:'Edit child Fictional Family Ria',exact:true}).click();await page.getByLabel('Child name',{exact:true}).fill('Fictional Ria Updated');await page.getByRole('button',{name:'Save child',exact:true}).click();
  await expect(page.getByRole('tab',{name:'Choose child Fictional Ria Updated',exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__parentFixture.children.length)).toBe(2);
  await page.getByRole('tab',{name:'Parent Explore',exact:true}).click();await page.getByRole('button',{name:'Add a family plan',exact:true}).click();await page.getByLabel('Family plan title',{exact:true}).fill('Family art evening');await page.getByRole('button',{name:'Save family record',exact:true}).click();await page.getByRole('tab',{name:'Parent Week',exact:true}).click();await expect(page.getByText('Family art evening',{exact:true})).toBeVisible();
});

test('a lost family memory save keeps one record on retry, and unsaved child edits require review before discard',async({page})=>{
  await parentBackend(page);await loginParent(page);await family(page);
  await page.getByRole('button',{name:'Log a family moment',exact:true}).click();await page.getByLabel('Family moment',{exact:true}).fill('Private family memory');await page.evaluate(()=>{window.__parentFixture.loseMoment=true;});
  await page.getByRole('button',{name:'Save family record',exact:true}).click();await expect(page.getByLabel('Family moment',{exact:true})).toHaveValue('Private family memory');await page.getByRole('button',{name:'Save family record',exact:true}).click();
  expect(await page.evaluate(()=>window.__parentFixture.moments.length)).toBe(1);
  await page.getByRole('button',{name:'Add a child',exact:true}).click();await page.getByLabel('Child name',{exact:true}).fill('Unsent name');await page.getByRole('button',{name:'Close Parent form',exact:true}).click();await expect(page.getByText('Discard this family form?',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Keep editing',exact:true}).click();await expect(page.getByLabel('Child name',{exact:true})).toHaveValue('Unsent name');
});

test('coach invitation explicitly links an independently named family child and exposes only reviewed feedback',async({page},info)=>{
  await parentBackend(page);await loginParent(page);await family(page);
  await page.goto('/');await page.getByRole('tab',{name:'Students',exact:true}).click();await page.getByRole('button',{name:'View profile for Fictional Ria',exact:true}).click();
  await page.getByRole('button',{name:'Create Parent invitation',exact:true}).click();const code=await page.getByLabel('Parent invitation code',{exact:true}).textContent();expect(code).toMatch(/^[0-9a-f]{64}$/);
  await page.goto('/parent');await page.getByRole('tab',{name:'Parent Explore',exact:true}).click();await page.getByRole('button',{name:'Connect a coach',exact:true}).click();await page.getByLabel('Coach invitation code',{exact:true}).fill(code!);await page.getByRole('button',{name:'Review coach invitation',exact:true}).click();
  await expect(page.getByText('Coach student: Fictional Ria → Your child: Fictional Family Ria',{exact:true})).toBeVisible();await page.getByRole('checkbox',{name:'This is the right coach and child',exact:true}).check();await page.getByRole('button',{name:'Confirm coach connection',exact:true}).click();
  await page.goto('/');await page.getByRole('button',{name:'Write feedback for parents',exact:true}).click();await page.getByRole('button',{name:'Write feedback',exact:true}).click();await page.getByRole('combobox',{name:'Feedback batch',exact:true}).selectOption(await page.evaluate(()=>window.__coachFixture.roster.batches[0].id));await page.getByRole('combobox',{name:'Student for this feedback',exact:true}).selectOption(await page.evaluate(()=>window.__coachFixture.roster.students[0].id));await page.getByLabel('Observation text',{exact:true}).fill('Reviewed coach feedback: independent clay work.');
  await page.getByRole('button',{name:'Save feedback',exact:true}).click();await page.getByRole('button',{name:'Confirm save',exact:true}).click();await page.getByRole('button',{name:'Review for Parent module',exact:true}).click();await page.getByRole('checkbox',{name:'I reviewed the feedback, recipients and media for parents',exact:true}).check();await page.getByRole('button',{name:'Approve and hold for Parent module',exact:true}).click();
  await page.goto('/parent');await expect(page.getByText('Reviewed coach feedback: independent clay work.',{exact:true})).toBeVisible();await page.getByText('Reviewed coach feedback: independent clay work.',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('parent-reviewed-coach-feed.png'),fullPage:true});
  await page.getByRole('tab',{name:'Parent Explore',exact:true}).click();await page.getByRole('button',{name:'Media permissions for Fictional Test Academy',exact:true}).click();await page.getByRole('checkbox',{name:'Allow class photos of my child',exact:true}).check();await page.getByRole('checkbox',{name:'I am the guardian and confirm these choices',exact:true}).check();await page.getByRole('button',{name:'Save my media choices',exact:true}).click();
  expect(await page.evaluate(()=>window.__parentFixture.permissions[0].allow_photos)).toBe(true);expect(await page.evaluate(()=>window.__parentFixture.permissions[0].allow_videos)).toBe(false);
});

test('missing Parent database setup is explained without creating a Coach academy or fake family records',async({page})=>{
  await parentBackend(page);await page.addInitScript(()=>{window.__parentFixture.missing=true;});await page.goto('/parent');await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');await page.getByLabel('Password',{exact:true}).fill('FictionalParentPassword123');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByText(/Your Parent workspace is not enabled/)).toBeVisible();expect(await page.evaluate(()=>window.__parentFixture.families.length)).toBe(0);expect(await page.evaluate(()=>window.__coachFixture.calls.some(path=>path.includes('create_academy')))).toBe(false);
});

test('Parent password recovery reuses the existing callback and returns to Parent, without academy onboarding',async({page})=>{
  await parentBackend(page);await page.goto('/parent');
  await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
  await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');
  await page.getByRole('button',{name:'Send recovery email',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
  await page.goto('/auth/recovery?code=fictional-parent-recovery');
  await expect(page.getByRole('heading',{name:'Choose a new password.',exact:true})).toBeVisible();
  await expect(page).toHaveURL(/\/parent$/);
  await page.getByLabel('New password',{exact:true}).fill('NewFictionalParentPassword123');
  await page.getByLabel('Confirm password',{exact:true}).fill('NewFictionalParentPassword123');
  await page.getByRole('button',{name:'Save new password',exact:true}).click();
  await expect(page.getByLabel('Your parent name',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.__coachFixture.calls.some(path=>path.endsWith('/academies')))).toBe(false);
});
