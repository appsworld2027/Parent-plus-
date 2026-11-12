import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

async function openClasses(page: Page) {
  await backend(page, { academy: true, readyClass: true });
  await login(page);
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Attendance for Fictional Clay Class at 16:00', exact: true })).toBeVisible();
}
async function attendance(page: Page) {
  await page.getByRole('button', { name: 'Attendance for Fictional Clay Class at 16:00', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Class attendance', exact: true })).toBeVisible();
}

test('creates, edits and cancels a dated class without deleting the occurrence', async ({ page }, testInfo) => {
  await openClasses(page);
  await page.getByRole('button', { name: 'Create a class', exact: true }).click();
  await page.getByRole('button', { name: 'Save class', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Choose a batch');
  await page.getByRole('radio', { name: 'Class batch Fictional Clay Class', exact: true }).click();
  await page.getByRole('textbox', { name: 'Start time (HH:MM, 24 hour)', exact: true }).fill('18:00');
  await page.getByRole('textbox', { name: 'End time (HH:MM, 24 hour)', exact: true }).fill('19:00');
  await page.getByRole('textbox', { name: 'Class room or location', exact: true }).fill('Fictional Room 2');
  await page.getByRole('button', { name: 'Save class', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Class saved');
  await page.screenshot({ path: testInfo.outputPath('classes.png'), fullPage: true });
  await page.getByRole('button', { name: 'Edit class Fictional Clay Class at 18:00', exact: true }).click();
  await page.getByRole('radio', { name: 'Class status cancelled', exact: true }).click();
  await page.getByRole('button', { name: 'Save class', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Attendance for Fictional Clay Class at 18:00', exact: true })).toBeDisabled();
  const sessions = await page.evaluate(() => window.__coachFixture.classes);
  expect(sessions).toHaveLength(2); expect(sessions.filter(s => s.status === 'cancelled')).toHaveLength(1);
  await page.reload();
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Attendance for Fictional Clay Class at 18:00', exact: true })).toBeDisabled();
});

test('attendance draft survives restart; saving it updates actual Today figures', async ({ page }, testInfo) => {
  await openClasses(page); await attendance(page);
  await page.getByRole('button', { name: 'Mark all present', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved on this device');
  expect(await page.evaluate(() => window.__coachFixture.calls.filter(c => c.endsWith('/save_class_attendance')).length)).toBe(0);
  await page.reload();
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByRole('button', { name: 'Resume attendance draft', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Fictional Ria: present', exact: true })).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath('attendance.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save attendance to class', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Attendance saved to your class');
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(page.getByText('1 classes have an attendance save.', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click(); await attendance(page);
  await expect(page.getByRole('radio', { name: 'Fictional Ria: present', exact: true })).toBeChecked();
});

test('failed attendance save retains device draft and lost response reconciles without duplicate save', async ({ page }) => {
  await openClasses(page); await attendance(page);
  await page.getByRole('radio', { name: 'Fictional Ria: late', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved on this device');
  await page.evaluate(() => { window.__coachFixture.failAttendance = true; });
  await page.getByRole('button', { name: 'Save attendance to class', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('draft is retained');
  await expect(page.getByRole('radio', { name: 'Fictional Ria: late', exact: true })).toBeChecked();
  await page.evaluate(() => { window.__coachFixture.failAttendance = false; window.__coachFixture.loseAttendanceResponse = true; });
  await page.getByRole('button', { name: 'Save attendance to class', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Attendance saved to your class');
  expect(await page.evaluate(() => window.__coachFixture.classes[0].attendance_revision)).toBe(1);
  await page.reload(); await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume attendance draft', exact: true })).toHaveCount(0);
});

test('stale draft requires an explicit comparison before replacing server attendance', async ({ page }) => {
  await openClasses(page); await attendance(page);
  await page.getByRole('radio', { name: 'Fictional Ria: late', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved on this device');
  await page.evaluate(() => {
    const state = window.__coachFixture; const session = state.classes[0];
    session.attendance_revision = 1;
    state.attendance[session.id] = { '00000000-0000-0000-0000-000000000021': 'absent' };
    sessionStorage.setItem('__fictional_classes', JSON.stringify({ classes: state.classes, attendance: state.attendance }));
  });
  await page.getByRole('button', { name: 'Save attendance to class', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Attendance changed on the server');
  await page.getByRole('button', { name: 'Reopen saved attendance', exact: true }).click();
  await expect(page.getByText('The saved class or attendance changed', { exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Use server records', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Fictional Ria: absent', exact: true })).toBeChecked();
  expect(await page.evaluate(() => window.__coachFixture.classes[0].attendance_revision)).toBe(1);
});

test('sign-out clears private attendance drafts', async ({ page }) => {
  await openClasses(page); await attendance(page);
  await page.getByRole('button', { name: 'Mark all present', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved on this device');
  await page.getByRole('button', { name: 'Open support and diagnostics', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.', exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith('parentplus.coach.attendance-draft.')))).toEqual([]);
});

test('unsaved class edits are guarded before navigating away', async ({ page }) => {
  await openClasses(page); await page.getByRole('button', { name: 'Create a class', exact: true }).click();
  await page.getByRole('textbox', { name: 'Class room or location', exact: true }).fill('Unsaved room');
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(page.getByText('Leave your unsaved changes?', { exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Class room or location', exact: true })).toHaveValue('Unsaved room');
});

test('missing classes migration shows a setup error instead of a fake empty schedule', async ({ page }) => {
  await backend(page, { academy: true, missingClassMigration: true }); await login(page);
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('classes database update is needed');
  await expect(page.getByText(/No classes scheduled/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create a class', exact: true })).toBeDisabled();
});
