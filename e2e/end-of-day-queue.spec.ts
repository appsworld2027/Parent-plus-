// Browser tests for docs/product/end-of-day-queue (EQ-01, 03, 05, 06). Rules: tests/wrap-up.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

const BATCH = '00000000-0000-0000-0000-000000000031';
async function open(page: Page, o: { startedMinutesAgo?: number; revision?: number; drafts?: number; fail?: boolean } = {}) {
  const classes = o.startedMinutesAgo === undefined ? [] : [{ id: '00000000-0000-0000-0000-000000000901', batch_id: BATCH, starts_at: new Date(Date.now() - o.startedMinutesAgo * 60_000).toISOString(),
    ends_at: new Date(Date.now() + 3_600_000).toISOString(), room: 'Room 1', status: 'scheduled', attendance_revision: o.revision ?? 0 }];
  const observations = Array.from({ length: o.drafts ?? 0 }, (_, i) => ({ id: `00000000-0000-0000-0000-0000000008${String(i).padStart(2, '0')}`, academy_id: 'a', batch_id: BATCH, session_id: null, note: 'Fictional draft', status: 'draft', audience: 'batch', revision: 1, author_id: 'u', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', recorded_at: null }));
  await page.addInitScript(([c, ob]) => { if (!sessionStorage.getItem('__fictional_classes')) sessionStorage.setItem('__fictional_classes', JSON.stringify({ classes: c, attendance: {} })); if (!sessionStorage.getItem('__fictional_observations')) sessionStorage.setItem('__fictional_observations', JSON.stringify({ observations: ob, recipients: {}, versions: {} })); }, [classes, observations] as const);
  if (o.fail) await page.addInitScript(() => { (window as unknown as { __failTables: string[] }).__failTables = ['observations']; });
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await expect(page.getByRole('heading', { name: 'Needs you', exact: true })).toBeVisible();
}
test('EQ-01/03 a started class with no attendance is listed and opens Schedule', async ({ page }) => {
  await open(page, { startedMinutesAgo: 1 });
  await expect(page.getByText('Wrap up today', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '1 class needs attendance', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Schedule', exact: true })).toHaveAttribute('aria-selected', 'true');
});
test('EQ-02/03 feedback drafts are listed and open Feedback', async ({ page }) => {
  await open(page, { drafts: 2 });
  await page.getByRole('button', { name: '2 feedback drafts to finish', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Feedback', exact: true })).toHaveAttribute('aria-selected', 'true');
});
test('EQ-05 nothing pending shows no card', async ({ page }) => {
  await open(page, { startedMinutesAgo: 1, revision: 1 });
  await page.waitForTimeout(1500);
  await expect(page.getByText('Wrap up today', { exact: true })).toHaveCount(0);
});
test('EQ-06 a failed load hides the card; Today still works', async ({ page }) => {
  await open(page, { startedMinutesAgo: 1, fail: true });
  await page.waitForTimeout(1500);
  await expect(page.getByText('Wrap up today', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Your teaching workspace', { exact: true })).toBeVisible();
});
