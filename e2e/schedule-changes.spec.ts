// Browser tests for docs/product/schedule-changes (SC-01, 02, 04, 07). Rules: tests/schedule-changes.test.ts. SC-08 NOT RUN.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

const BATCH = '00000000-0000-0000-0000-000000000031';
const posts = (page: Page) => page.evaluate(() => (window as unknown as { __announceFixture?: { posts: string[] } }).__announceFixture?.posts ?? []);
async function open(page: Page, failPosts = 0) {
  // One class starting 2 hours from now so it is upcoming (families are only told about classes that have not started).
  const starts = new Date(Date.now() + 2 * 3_600_000);
  await page.addInitScript(([c, fails]) => { if (!sessionStorage.getItem('__fictional_classes')) sessionStorage.setItem('__fictional_classes', JSON.stringify({ classes: c, attendance: {} })); (window as unknown as { __announceFixture: unknown }).__announceFixture = { posts: [], fails }; },
    [[{ id: '00000000-0000-0000-0000-000000000901', batch_id: BATCH, starts_at: starts.toISOString(), ends_at: new Date(starts.getTime() + 3_600_000).toISOString(), room: 'Room 1', status: 'scheduled', attendance_revision: 0 }], failPosts] as const);
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark this day as a holiday', exact: true })).toBeEnabled();
}
const holiday = (page: Page) => page.getByRole('button', { name: 'Mark this day as a holiday', exact: true });
test('SC-04/SC-01/SC-02 holiday cancels the day, then one class can be restored', async ({ page }) => {
  await open(page);
  await expect(page.getByText(/· scheduled/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Restore class/ })).toHaveCount(0);
  await page.getByLabel(/Note to families/).fill('Diwali');
  await holiday(page).click(); await page.getByRole('button', { name: 'Cancel classes', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Holiday set: 1 class cancelled. Families of 1 batch notified.');
  expect(await posts(page)).toEqual([expect.stringMatching(/^Holiday: no Fictional Clay Class class on .*\. Diwali$/)]);
  await expect(page.getByText(/· cancelled/)).toBeVisible();
  await page.getByRole('button', { name: /^Restore class Fictional Clay Class/ }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Class restored. Families of 1 batch notified.');
  expect((await posts(page))[1]).toMatch(/is on again\.$/);
  await expect(page.getByText(/· scheduled/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Restore class/ })).toHaveCount(0);
});
test('SC-07 declining the holiday dialog changes nothing and tells no one', async ({ page }) => {
  await open(page);
  await holiday(page).click(); await page.getByRole('button', { name: 'Keep classes', exact: true }).click();
  await expect(page.getByText(/· scheduled/)).toBeVisible();
  expect(await posts(page)).toEqual([]);
});
test('SN-06 failed notice is reported, retry sends only the failed notice', async ({ page }) => {
  await open(page, 1);
  await holiday(page).click(); await page.getByRole('button', { name: 'Cancel classes', exact: true }).click();
  await expect(page.getByText('Families have not been told yet', { exact: true })).toBeVisible();
  await expect(page.getByTestId('action-feedback')).toContainText('1 family notice could not be sent.');
  expect(await posts(page)).toEqual([]);
  await page.getByRole('button', { name: 'Send notice to families', exact: true }).click();
  await expect(page.getByText('Families have not been told yet', { exact: true })).toHaveCount(0);
  expect(await posts(page)).toHaveLength(1);
});
