// Browser tests for docs/product/signal-attendance/ACCEPTANCE.md (SA-07..10). Rules: tests/signal-attendance.test.ts. All data fictional.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

const BATCH = '00000000-0000-0000-0000-000000000031', STUDENT = '00000000-0000-0000-0000-000000000021', SESSION = '00000000-0000-0000-0000-000000000901';
async function open(page: Page, signals: { kind: string }[], revision = 0, failTables: string[] = []) {
  const start = new Date(Date.now() + 3_600_000);
  const cls = { id: SESSION, batch_id: BATCH, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 3_600_000).toISOString(), room: 'Room 1', status: 'scheduled', attendance_revision: revision };
  await page.addInitScript(([c, s, f, sid, stu]) => {
    if (!sessionStorage.getItem('__fictional_classes')) { sessionStorage.setItem('__fictional_classes', JSON.stringify({ classes: [c], attendance: {} })); }
    (window as any).__coachSignals = (s as { kind: string }[]).map((x, i) => ({ id: `s${i}`, session_id: sid, student_id: stu, changed_at: new Date().toISOString(), ...x }));
    (window as any).__failTables = f;
  }, [cls, signals, failTables, SESSION, STUDENT] as const);
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByRole('button', { name: /^Attendance for Fictional Clay Class/ }).click();
  await expect(page.getByRole('button', { name: 'Mark all present', exact: true })).toBeVisible();
}
test('SA-07 a "Missing today" signal is offered as absent; tapping fills it without saving', async ({ page }) => {
  await open(page, [{ kind: 'missing_today' }]);
  await expect(page.getByText('Parents told you: 1 missing. Nothing is saved until you tap Save.')).toBeVisible();
  await page.getByRole('button', { name: 'Apply parent signals (1)', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Fictional Ria: absent' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText(/Draft saved on this device\. Not yet saved to your class/).first()).toBeVisible();
});
test('SA-08 no signals means no button', async ({ page }) => {
  await open(page, []); await page.waitForTimeout(1500);
  await expect(page.getByRole('button', { name: /^Apply parent signals/ })).toHaveCount(0);
});
test('SA-09 if the signals cannot load, no suggestion shows and the coach can still mark manually', async ({ page }) => {
  await open(page, [{ kind: 'missing_today' }], 0, ['parent_signals']); await page.waitForTimeout(1500);
  await expect(page.getByRole('button', { name: /^Apply parent signals/ })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Fictional Ria: present' }).click();
  await expect(page.getByRole('radio', { name: 'Fictional Ria: present' })).toHaveAttribute('aria-checked', 'true');
});
test('SA-10 a class whose attendance is already saved offers no suggestion', async ({ page }) => {
  await open(page, [{ kind: 'running_late' }], 1); await page.waitForTimeout(1500);
  await expect(page.getByRole('button', { name: /^Apply parent signals/ })).toHaveCount(0);
});
