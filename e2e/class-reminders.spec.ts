// Browser tests for docs/product/class-reminders (CR-02, 03, 04). Wording and eligibility: tests/class-reminders.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

const BATCH = '00000000-0000-0000-0000-000000000031';
const posts = (page: Page) => page.evaluate(() => (window as unknown as { __announceFixture?: { posts: string[] } }).__announceFixture?.posts ?? []);
async function open(page: Page, o: { status?: string; fails?: number } = {}) {
  const starts = new Date(Date.now() + 2 * 3_600_000);
  await page.addInitScript(([c, fails]) => { if (!sessionStorage.getItem('__fictional_classes')) sessionStorage.setItem('__fictional_classes', JSON.stringify({ classes: c, attendance: {} })); (window as unknown as { __announceFixture: unknown }).__announceFixture = { posts: [], fails }; },
    [[{ id: '00000000-0000-0000-0000-000000000901', batch_id: BATCH, starts_at: starts.toISOString(), ends_at: new Date(starts.getTime() + 3_600_000).toISOString(), room: 'Room 1', status: o.status ?? 'scheduled', attendance_revision: 0 }], o.fails ?? 0] as const);
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark this day as a holiday', exact: true })).toBeEnabled();
}
const remind = (page: Page) => page.getByRole('button', { name: /^Remind families about Fictional Clay Class/ });
test('CR-02 one tap posts the reminder to the batch', async ({ page }) => {
  await open(page); await remind(page).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Families notified.');
  const sent = await posts(page); expect(sent).toHaveLength(1); expect(sent[0]).toMatch(/^Reminder: Fictional Clay Class class (today|tomorrow|\w{3} \d+ \w{3}) at \d\d:\d\d \(Room 1\)\. See you there!$/);
});
test('CR-03 a cancelled class has no reminder button', async ({ page }) => {
  await open(page, { status: 'cancelled' }); await page.waitForTimeout(1000);
  await expect(remind(page)).toHaveCount(0);
});
test('CR-04 a failed post is reported and the retry posts once', async ({ page }) => {
  await open(page, { fails: 1 }); await remind(page).click();
  await expect(page.getByText('Families have not been told yet', { exact: true })).toBeVisible();
  expect(await posts(page)).toEqual([]);
  await page.getByRole('button', { name: 'Send notice to families', exact: true }).click();
  await expect(page.getByText('Families have not been told yet', { exact: true })).toHaveCount(0);
  expect(await posts(page)).toHaveLength(1);
});
