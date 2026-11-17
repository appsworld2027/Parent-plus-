import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

async function setup(page: Page) {
  await backend(page, { academy: true, readyClass: true });
  await login(page);
}
async function openAttendance(page: Page) {
  await setup(page);
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByRole('button', { name: 'Attendance for Fictional Clay Class at 16:00', exact: true }).click();
}

test('save notification remains fully visible when scrolled and identical saves notify again', async ({ page }, testInfo) => {
  await setup(page);
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await page.getByRole('button', { name: 'Batches', exact: true }).click();
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('button', { name: 'Edit Fictional Clay Class', exact: true }).click();
    await page.getByRole('button', { name: 'Save batch', exact: true }).click();
    await expect(page.getByTestId('action-feedback')).toContainText('Batch saved.');
    await page.getByTestId('workspace-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
    await expect(page.getByTestId('action-feedback')).toBeInViewport({ ratio: 1 });
    if (attempt === 0) await page.screenshot({ path: testInfo.outputPath('feedback-success.png'), fullPage: true });
    await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
    await expect(page.getByTestId('action-feedback')).toHaveCount(0);
  }
  expect(await page.evaluate(() => window.__coachFixture.roster.batches.length)).toBe(1);
});

test('failed archive closes its confirmation and shows a persistent visible failure', async ({ page }, testInfo) => {
  await setup(page);
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await page.evaluate(() => { window.__coachFixture.failArchive = true; });
  await page.getByRole('button', { name: 'Archive Fictional Ria', exact: true }).click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toBeVisible();
  await page.getByRole('button', { name: 'Confirm archive', exact: true }).click();
  // Busy changes the button label before the fading dialog has unmounted.
  await expect(confirmation).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Confirm archive', exact: true })).toHaveCount(0);
  const failure = page.getByTestId('action-feedback');
  await expect(failure).toHaveAttribute('role', 'alert');
  await expect(failure).toContainText('Archiving could not be confirmed');
  await expect(failure).toContainText('PP-');
  await page.getByTestId('workspace-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(page.getByTestId('action-feedback')).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: testInfo.outputPath('feedback-error.png'), fullPage: true });
  expect(await page.evaluate(() => window.__coachFixture.roster.students[0].archived_at)).toBeNull();
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search students', exact: true }).fill('no-match');
  await expect(page.getByTestId('action-feedback')).toHaveCount(0);
});

test('device draft, confirmed class save and failure have distinct visible feedback', async ({ page }) => {
  await openAttendance(page);
  await page.getByRole('button', { name: 'Mark all present', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Device draft saved — not sent to class');
  expect(await page.evaluate(() => window.__coachFixture.classes[0].attendance_revision)).toBe(0);
  await page.getByRole('button', { name: 'Save attendance to class', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Attendance saved to class');
  expect(await page.evaluate(() => window.__coachFixture.classes[0].attendance_revision)).toBe(1);
  await page.getByRole('radio', { name: 'Fictional Ria: late', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Not yet saved to your class');
  await page.evaluate(() => { window.__coachFixture.failAttendance = true; });
  await page.getByRole('button', { name: 'Save attendance to class', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Action needs attention');
  await expect(page.getByRole('alert')).toContainText('entries remain on this screen');
  expect(await page.evaluate(() => window.__coachFixture.classes[0].attendance_revision)).toBe(1);
});

test('an earlier success is cleared while a new server save is pending', async ({ page }) => {
  await openAttendance(page);
  await page.getByRole('button', { name: 'Mark all present', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved on this device');
  await page.getByRole('button', { name: 'Save attendance to class', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Attendance saved to class');
  await page.evaluate(() => { window.__coachFixture.holdAttendance = true; });
  await page.getByRole('button', { name: 'Save attendance to class', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Please wait…', exact: true })).toBeDisabled();
  await expect(page.getByTestId('action-feedback')).toHaveCount(0);
  await page.evaluate(() => { window.__coachFixture.holdAttendance = false; });
  await expect(page.getByRole('status')).toContainText('Attendance saved to class');
});
