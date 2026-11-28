// Browser tests for docs/product/spotlight-rotation (SP-01, 03, 06, 07). Rules: tests/spotlight.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

const BATCH = '00000000-0000-0000-0000-000000000031', STUDENT = '00000000-0000-0000-0000-000000000021';
async function open(page: Page, o: { status?: string; observedDaysAgo?: number; fail?: boolean } = {}) {
  const classes = [{ id: '00000000-0000-0000-0000-000000000901', batch_id: BATCH, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3_600_000).toISOString(), room: 'Room 1', status: o.status ?? 'scheduled', attendance_revision: 0 }];
  const at = o.observedDaysAgo === undefined ? null : new Date(Date.now() - o.observedDaysAgo * 86_400_000).toISOString();
  const observations = at ? [{ id: '00000000-0000-0000-0000-000000000801', academy_id: 'a', batch_id: BATCH, session_id: null, note: 'Fictional', status: 'recorded', audience: 'student', revision: 1, author_id: 'u', created_at: at, updated_at: at, recorded_at: at }] : [];
  await page.addInitScript(([c, ob, sid]) => { if (!sessionStorage.getItem('__fictional_classes')) sessionStorage.setItem('__fictional_classes', JSON.stringify({ classes: c, attendance: {} })); if (!sessionStorage.getItem('__fictional_observations')) sessionStorage.setItem('__fictional_observations', JSON.stringify({ observations: ob, recipients: ob.length ? { [ob[0].id]: [sid] } : {}, versions: {} })); }, [classes, observations, STUDENT] as const);
  if (o.fail) await page.addInitScript(() => { (window as unknown as { __failTables: string[] }).__failTables = ['observations']; });
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await expect(page.getByRole('heading', { name: 'Needs you', exact: true })).toBeVisible();
}
test('SP-01/03 a never-observed child in today\'s class is in the spotlight', async ({ page }) => {
  await open(page);
  await expect(page.getByText('Spotlight today', { exact: true })).toBeVisible();
  await expect(page.getByText('Fictional Ria · no recorded observation yet', { exact: true })).toBeVisible();
});
test('SP-03 shows days since last observation', async ({ page }) => {
  await open(page, { observedDaysAgo: 12 });
  await expect(page.getByText('Fictional Ria · last observed 12 days ago', { exact: true })).toBeVisible();
});
test('SP-06 no class today (cancelled) means no card', async ({ page }) => {
  await open(page, { status: 'cancelled' });
  await page.waitForTimeout(1500);
  await expect(page.getByText('Spotlight today', { exact: true })).toHaveCount(0);
});
test('SP-07 a failed load hides the card', async ({ page }) => {
  await open(page, { fail: true });
  await page.waitForTimeout(1500);
  await expect(page.getByText('Spotlight today', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Your teaching workspace', { exact: true })).toBeVisible();
});
test('SP-08 tapping a spotlight line opens Feedback', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Write an observation about Fictional Ria', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Feedback', exact: true })).toHaveAttribute('aria-selected', 'true');
});
