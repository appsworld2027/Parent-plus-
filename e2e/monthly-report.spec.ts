// Browser tests for M2-23 monthly progress report (MR-09..11). Rules: tests/monthly-report.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

const BATCH = '00000000-0000-0000-0000-000000000031', STUDENT = '00000000-0000-0000-0000-000000000021', PAST = '00000000-0000-0000-0000-000000000902';
async function open(page: Page, withClass: boolean) {
  const start = new Date(Date.now() - 2 * 3_600_000);
  const classes = withClass ? [{ id: PAST, batch_id: BATCH, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 3_600_000).toISOString(), room: 'Room 1', status: 'scheduled', attendance_revision: 1 }] : [];
  await page.addInitScript(([c, a]) => { if (!sessionStorage.getItem('__fictional_classes')) sessionStorage.setItem('__fictional_classes', JSON.stringify({ classes: c, attendance: a })); }, [classes, { [PAST]: { [STUDENT]: 'present' } }] as const);
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await page.getByRole('button', { name: 'View profile for Fictional Ria', exact: true }).click();
}
test('MR-09 the coach prepares this month and sees attendance facts', async ({ page }) => {
  await open(page, true);
  await page.getByRole('button', { name: /^Prepare \w+ \d{4} report$/ }).first().click();
  await expect(page.getByText(/progress for Fictional Ria/)).toBeVisible();
  await expect(page.getByText(/attended 1 of 1/)).toBeVisible();
});
test('MR-10 a month with nothing recorded says so and offers no sharing', async ({ page }) => {
  await open(page, false);
  await page.getByRole('button', { name: /^Prepare \w+ \d{4} report$/ }).nth(1).click();
  await expect(page.getByText('Nothing was recorded this month.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share report on WhatsApp' })).toHaveCount(0);
});
test('MR-13 a prepared report has no coach-notes section when only batch notes exist', async ({ page }) => {
  await open(page, true);
  await page.getByRole('button', { name: /^Prepare \w+ \d{4} report$/ }).first().click();
  await expect(page.getByText(/progress for Fictional Ria/)).toBeVisible();
  await expect(page.getByText('From the coach:')).toHaveCount(0);
});
