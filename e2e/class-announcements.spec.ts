// Browser tests for docs/product/class-announcements/ACCEPTANCE.md (CA-01/02/03/05/06/08). All data fictional.
// Database rules (CA-03/04/07/09-12) are in tests/class-announcements-candidate.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';
import { parentBackend } from './support/parentBackend';

async function loginParent(page:Page){await page.goto('/parent');await expect(page.getByText('YOUR FAMILY WORKSPACE',{exact:true})).toBeVisible();await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');await page.getByLabel('Password',{exact:true}).fill('FictionalParentPassword123');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByLabel('Your parent name',{exact:true})).toBeVisible();}
async function family(page:Page){await page.getByLabel('Your parent name',{exact:true}).fill('Fictional Parent');await page.getByLabel('Family name',{exact:true}).fill('Fictional Family');await page.getByRole('button',{name:'Create my family workspace',exact:true}).click();await page.getByRole('button',{name:'Add my first child',exact:true}).click();await page.getByLabel('Child name',{exact:true}).fill('Fictional Family Ria');await page.getByLabel('Birth date (optional)',{exact:true}).fill('2018-04-12');await page.getByRole('button',{name:'Save child',exact:true}).click();await expect(page.getByRole('tab',{name:'Choose child Fictional Family Ria',exact:true})).toBeVisible();}
const posts = (page: Page) => page.evaluate(() => (window as any).__announceFixture?.posts ?? []);

test('CA-01/02/03 coach posts to a batch; blank is refused', async ({ page }) => {
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await expect(page.getByText('Announce to a batch', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Post announcement', exact: true }).click();
  await expect(page.getByText('Write a message first.')).toBeVisible();
  expect(await posts(page)).toEqual([]);
  await page.getByLabel('Announcement message', { exact: true }).fill('Fictional: no class on Friday');
  await page.getByRole('button', { name: 'Post announcement', exact: true }).click();
  await expect(page.getByText(/Posted to Fictional Clay Class/)).toBeVisible();
  expect(await posts(page)).toEqual(['Fictional: no class on Friday']);
  await expect(page.getByLabel('Announcement message', { exact: true })).toHaveValue('');
});

test('CA-05 a failed post keeps the text and retry posts once', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__announceFixture = { posts: [], fails: 1 }; });
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.getByLabel('Announcement message', { exact: true }).fill('Fictional: bring clay aprons');
  await page.getByRole('button', { name: 'Post announcement', exact: true }).click();
  await expect(page.getByText(/Could not post/)).toBeVisible();
  await expect(page.getByLabel('Announcement message', { exact: true })).toHaveValue('Fictional: bring clay aprons');
  await page.getByRole('button', { name: 'Post announcement', exact: true }).click();
  await expect(page.getByText(/Posted to/)).toBeVisible();
  expect(await posts(page)).toEqual(['Fictional: bring clay aprons']);
});

test('CA-06 parent sees the coach announcement on the child card', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__announcements = [{ id: 'a1', batch_name: 'Fictional Pottery Batch', body: 'Fictional: class moves to Room 2', created_at: new Date().toISOString() }]; });
  await parentBackend(page); await loginParent(page); await family(page);
  await expect(page.getByText('From your coach', { exact: true })).toBeVisible();
  await expect(page.getByText('Fictional: class moves to Room 2')).toBeVisible();
});

test('CA-08 parent with no announcements sees no coach area', async ({ page }) => {
  await parentBackend(page); await loginParent(page); await family(page);
  await page.waitForTimeout(1000);
  await expect(page.getByText('From your coach', { exact: true })).toHaveCount(0);
});
