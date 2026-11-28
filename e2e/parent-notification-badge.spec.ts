// Browser tests for docs/product/parent-notification-badge (NB-01, 02, 03, 05). Rules: tests/parent-unseen.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { parentBackend } from './support/parentBackend';

async function loginParent(page: Page) { await page.goto('/parent'); await expect(page.getByText('YOUR FAMILY WORKSPACE', { exact: true })).toBeVisible(); await page.getByLabel('Email address', { exact: true }).fill('coach@example.test'); await page.getByLabel('Password', { exact: true }).fill('FictionalParentPassword123'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page.getByLabel('Your parent name', { exact: true })).toBeVisible(); }
async function family(page: Page) { await page.getByLabel('Your parent name', { exact: true }).fill('Fictional Parent'); await page.getByLabel('Family name', { exact: true }).fill('Fictional Family'); await page.getByRole('button', { name: 'Create my family workspace', exact: true }).click(); await page.getByRole('button', { name: 'Add my first child', exact: true }).click(); await page.getByLabel('Child name', { exact: true }).fill('Fictional Family Ria'); await page.getByLabel('Birth date (optional)', { exact: true }).fill('2018-04-12'); await page.getByRole('button', { name: 'Save child', exact: true }).click(); await expect(page.getByRole('tab', { name: 'Choose child Fictional Family Ria', exact: true })).toBeVisible(); }
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `a${i}`, batch_name: 'Fictional Clay Class', body: `Fictional notice ${i + 1}`, created_at: new Date(Date.now() - i * 60_000).toISOString() }));
async function open(page: Page, n: number) {
  await page.addInitScript(list => { (window as unknown as { __announcements: unknown }).__announcements = list; }, rows(n));
  await parentBackend(page); await loginParent(page); await family(page);
}
test('NB-01/02/03 banner counts new updates, clears on Mark as read and stays cleared after reload', async ({ page }) => {
  await open(page, 2);
  await expect(page.getByText('2 new updates from your coach', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark as read', exact: true }).click();
  await expect(page.getByText('2 new updates from your coach', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Fictional notice 1', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('tab', { name: 'Choose child Fictional Family Ria', exact: true })).toBeVisible();
  await expect(page.getByText('Fictional notice 1', { exact: true })).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.getByText(/new updates? from your coach/)).toHaveCount(0);
});
test('NB-05 no updates means no banner', async ({ page }) => {
  await open(page, 0);
  await page.waitForTimeout(1500);
  await expect(page.getByText(/new updates? from your coach/)).toHaveCount(0);
});
