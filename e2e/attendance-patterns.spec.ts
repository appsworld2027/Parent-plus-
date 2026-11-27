// Browser tests for docs/product/attendance-patterns (AP-01, 02, 08, 10). Pure rules are in tests/attendance-patterns.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

const BATCH = '00000000-0000-0000-0000-000000000031', STUDENT = '00000000-0000-0000-0000-000000000021';
const day = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString();
async function open(page: Page, statuses: string[], failSessions = false) {
  const classes = statuses.map((_, i) => ({ id: `00000000-0000-0000-0000-0000000009${String(i).padStart(2, '0')}`, batch_id: BATCH, starts_at: day(i + 1), ends_at: day(i + 1), room: 'Room 1', status: 'completed', attendance_revision: 1 }));
  const attendance = Object.fromEntries(classes.map((c, i) => [c.id, { [STUDENT]: statuses[i] }]));
  await page.addInitScript(([c, a]) => { if (!sessionStorage.getItem('__fictional_classes')) sessionStorage.setItem('__fictional_classes', JSON.stringify({ classes: c, attendance: a })); }, [classes, attendance] as const);
  if (failSessions) await page.route('**/rest/v1/attendance*', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"fail"}' }));
  await backend(page, { academy: true, readyClass: true });
  await login(page);
  await expect(page.getByRole('heading', { name: 'Needs you', exact: true })).toBeVisible();
}
test('AP-01 three absences in a row shows an alert', async ({ page }) => {
  await open(page, ['absent', 'absent', 'absent', 'present']);
  await expect(page.getByText('Attendance alerts', { exact: true })).toBeVisible();
  await expect(page.getByText('Fictional Ria · Fictional Clay Class · absent 3 classes in a row', { exact: true })).toBeVisible();
});
test('AP-02 two absences show nothing; AP-08 no card', async ({ page }) => {
  await open(page, ['absent', 'absent', 'present']);
  await expect(page.getByText('Attendance alerts', { exact: true })).toHaveCount(0);
});
test('AP-10 a failed load hides the card and Today still works', async ({ page }) => {
  await open(page, ['absent', 'absent', 'absent'], true);
  await expect(page.getByText('Attendance alerts', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Your teaching workspace', { exact: true })).toBeVisible();
});
