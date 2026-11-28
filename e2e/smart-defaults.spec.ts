// Browser tests for M2-09 smart attendance defaults (SD-09..11) and M2-07 holiday hint (HC-06). Rules: tests/smart-defaults.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

const BATCH = '00000000-0000-0000-0000-000000000031', STUDENT = '00000000-0000-0000-0000-000000000021';
const day = (n: number) => new Date(Date.now() + n * 86_400_000);
const cls = (id: string, start: Date, rev: number) => ({ id, batch_id: BATCH, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 3_600_000).toISOString(), room: 'Room 1', status: 'scheduled', attendance_revision: rev });
async function open(page: Page, past: string[]) {
  const classes = [cls('00000000-0000-0000-0000-000000000901', new Date(Date.now() + 3_600_000), 0), ...past.map((_, i) => cls(`00000000-0000-0000-0000-00000000090${i + 2}`, day(-(i + 1)), 1))];
  const attendance = Object.fromEntries(past.map((st, i) => [`00000000-0000-0000-0000-00000000090${i + 2}`, { [STUDENT]: st }]));
  await page.addInitScript(([c, a]) => { if (!sessionStorage.getItem('__fictional_classes')) sessionStorage.setItem('__fictional_classes', JSON.stringify({ classes: c, attendance: a })); }, [classes, attendance] as const);
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
}
const attendanceFor = (page: Page) => page.getByRole('button', { name: /^Attendance for Fictional Clay Class/ });
test('SD-09 a regular attender is suggested; tapping fills present without saving', async ({ page }) => {
  await open(page, ['present', 'present', 'late']); await attendanceFor(page).click();
  const fill = page.getByRole('button', { name: 'Fill usual attendance (1)', exact: true }); await expect(fill).toBeVisible();
  await fill.click();
  await expect(page.getByText(/Draft saved on this device\. Not yet saved to your class/).first()).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Fictional Ria: present' })).toHaveAttribute('aria-checked', 'true');
});
test('SD-10 a child who missed last time gets no suggestion', async ({ page }) => {
  await open(page, ['absent', 'present', 'present']); await attendanceFor(page).click();
  await expect(page.getByRole('button', { name: 'Mark all present', exact: true })).toBeVisible(); await page.waitForTimeout(1500);
  await expect(page.getByRole('button', { name: /^Fill usual attendance/ })).toHaveCount(0);
});
test('SD-11 no history means no button', async ({ page }) => {
  await open(page, []); await attendanceFor(page).click();
  await expect(page.getByRole('button', { name: 'Mark all present', exact: true })).toBeVisible(); await page.waitForTimeout(1500);
  await expect(page.getByRole('button', { name: /^Fill usual attendance/ })).toHaveCount(0);
});
test('HC-06 a holiday day shows a prompt but never cancels by itself', async ({ page }) => {
  await open(page, []);
  await page.getByLabel(/date/i).first().fill('2026-08-15'); await page.getByRole('button', { name: 'Show date', exact: true }).click();
  await expect(page.getByText(/Independence Day is a national holiday/)).toBeVisible();
});
