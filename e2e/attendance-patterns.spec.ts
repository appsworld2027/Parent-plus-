// Browser tests for docs/product/attendance-patterns (AP-01, 02, 08, 10). Pure rules are in tests/attendance-patterns.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

const BATCH = '00000000-0000-0000-0000-000000000031', STUDENT = '00000000-0000-0000-0000-000000000021';
const day = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString();
async function open(page: Page, statuses: string[], failSessions = false, phone?: string) {
  if (phone !== undefined) await page.addInitScript(([sid, bid, ph]) => { if (!sessionStorage.getItem('__fictional_roster')) sessionStorage.setItem('__fictional_roster', JSON.stringify({ students: [{ id: sid, name: 'Fictional Ria', age_years: 6, archived_at: null }], contacts: [{ student_id: sid, name: 'Fictional Parent', email: null, phone: ph || null }], batches: [{ id: bid, name: 'Fictional Clay Class', room: 'Room 1', monthly_fee_paise: 250000, archived_at: null }], enrolments: [{ id: '00000000-0000-0000-0000-000000000041', student_id: sid, batch_id: bid, starts_on: '2020-01-01', ends_on: null }] })); }, [STUDENT, BATCH, phone] as const);
  const classes = statuses.map((_, i) => ({ id: `00000000-0000-0000-0000-0000000009${String(i).padStart(2, '0')}`, batch_id: BATCH, starts_at: day(i + 1), ends_at: day(i + 1), room: 'Room 1', status: 'completed', attendance_revision: 1 }));
  const attendance = Object.fromEntries(classes.map((c, i) => [c.id, { [STUDENT]: statuses[i] }]));
  await page.addInitScript(([c, a]) => { if (!sessionStorage.getItem('__fictional_classes')) sessionStorage.setItem('__fictional_classes', JSON.stringify({ classes: c, attendance: a })); }, [classes, attendance] as const);
  if (failSessions) await page.addInitScript(() => { (window as unknown as { __failTables: string[] }).__failTables = ['attendance']; });
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
  await page.waitForTimeout(1500);
  await expect(page.getByText('Attendance alerts', { exact: true })).toHaveCount(0);
});
test('AP-10 a failed load hides the card and Today still works', async ({ page }) => {
  await open(page, ['absent', 'absent', 'absent'], true);
  await page.waitForTimeout(1500);
  await expect(page.getByText('Attendance alerts', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Your teaching workspace', { exact: true })).toBeVisible();
});
test('AP-12 Message parent opens WhatsApp with a prefilled check-in', async ({ page, context }) => {
  await context.route('https://wa.me/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }));
  await open(page, ['absent', 'absent', 'absent'], false, '+919999900001');
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Message parent of Fictional Ria on WhatsApp', exact: true }).click();
  const url = (await popup).url();
  expect(url).toContain('https://wa.me/919999900001?text=');
  const text = decodeURIComponent(url.split('text=')[1]);
  expect(text).toContain('missed Fictional Ria in the last 3 Fictional Clay Class classes');
});
test('AP-13 no phone number on file shows guidance instead of a button', async ({ page }) => {
  await open(page, ['absent', 'absent', 'absent'], false, '');
  await expect(page.getByText(/No phone number on file/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Message parent of/ })).toHaveCount(0);
});
