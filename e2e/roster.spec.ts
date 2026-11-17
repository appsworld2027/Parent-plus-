import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

async function openRoster(page: Page) {
  await backend(page, { academy: true });
  await login(page);
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await expect(page.getByText('No students yet. Add your first student.')).toBeVisible();
}
async function createBatch(page: Page) {
  await page.getByRole('button', { name: 'Batches', exact: true }).click();
  await page.getByRole('button', { name: 'Create a batch', exact: true }).click();
  await page.getByRole('textbox', { name: 'Batch name', exact: true }).fill('Fictional Clay Club');
  await page.getByRole('textbox', { name: 'Room or location' }).fill('Room 1');
  await page.getByRole('textbox', { name: 'Monthly fee (₹)', exact: true }).fill('2500.50');
  await page.getByRole('button', { name: 'Save batch', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Batch saved');
  await expect(page.getByText('Room 1 · ₹2,500.5/month')).toBeVisible();
}
test('batch and student can be created, edited, reloaded, searched, and archived', async ({ page }) => {
  await openRoster(page); await createBatch(page);
  await page.getByRole('button', { name: 'Edit Fictional Clay Club', exact: true }).click();
  await page.getByRole('textbox', { name: 'Monthly fee (₹)', exact: true }).fill('2400.25');
  await page.getByRole('button', { name: 'Save batch', exact: true }).click();
  await expect(page.getByText('Room 1 · ₹2,400.25/month')).toBeVisible();
  expect(await page.evaluate(() => window.__coachFixture.roster.batches.length)).toBe(1);
  await page.getByRole('button', { name: 'Students', exact: true }).click();
  await page.getByRole('button', { name: 'Add a student', exact: true }).click();
  await page.getByRole('textbox', { name: 'Student name', exact: true }).fill('Fictional Ria');
  await page.getByRole('textbox', { name: 'Age (optional)' }).fill('6');
  await page.getByRole('textbox', { name: 'Guardian name', exact: true }).fill('Fictional Guardian');
  await page.getByRole('textbox', { name: 'Guardian email', exact: true }).fill('guardian@example.test');
  await page.getByRole('checkbox', { name: 'Fictional Clay Club' }).click();
  await page.getByRole('button', { name: 'Save student', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Student saved');
  await expect(page.getByRole('button', { name: 'Edit Fictional Ria', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Fictional Ria', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Guardian email', exact: true })).toHaveValue('guardian@example.test');
  await expect(page.getByRole('checkbox', { name: 'Fictional Clay Club' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Fictional Clay Club' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Student name', exact: true }).fill('Fictional Ria Updated');
  await page.getByRole('button', { name: 'Save student', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search students' }).fill('no match');
  await expect(page.getByText('No students match these filters.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search students' }).fill('');
  await page.getByRole('button', { name: 'Archive Fictional Ria Updated', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm archive', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('history has been retained');
  await expect(page.getByRole('button', { name: 'Edit Fictional Ria Updated', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show archived students', exact: true }).click();
  await expect(page.getByText('Fictional Ria Updated', { exact: true })).toBeVisible();
});

test('failed and lost-response saves preserve input and reuse the same student identity', async ({ page }) => {
  await openRoster(page);
  await page.getByRole('button', { name: 'Add a student', exact: true }).click();
  await page.getByRole('textbox', { name: 'Student name', exact: true }).fill('Fictional Retry');
  await page.evaluate(() => { window.__coachFixture.failStudent = true; });
  await page.getByRole('button', { name: 'Save student', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Retry safely');
  await expect(page.getByRole('textbox', { name: 'Student name', exact: true })).toHaveValue('Fictional Retry');
  await page.evaluate(() => { window.__coachFixture.failStudent = false; window.__coachFixture.loseStudentResponse = true; });
  await page.getByRole('button', { name: 'Save student', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Retry safely');
  await page.getByRole('button', { name: 'Save student', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Student saved');
  expect(await page.evaluate(() => window.__coachFixture.roster.students.length)).toBe(1);
});

test('unsaved forms require confirmation before leaving through navigation', async ({ page }) => {
  await openRoster(page);
  await page.getByRole('button', { name: 'Add a student', exact: true }).click();
  await page.getByRole('textbox', { name: 'Student name', exact: true }).fill('Unsaved Fictional Child');
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(page.getByText('Leave your unsaved changes?')).toBeVisible();
  await expect(page.getByText('Leave your unsaved changes?')).toBeInViewport();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Student name', exact: true })).toHaveValue('Unsaved Fictional Child');
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Discard and leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
  expect(await page.evaluate(() => window.__coachFixture.roster.students.length)).toBe(0);
});

test('a long student form keeps its back/discard confirmation in the viewport', async ({ page }) => {
  await openRoster(page);
  await page.getByRole('button', { name: 'Add a student', exact: true }).click();
  await page.getByRole('textbox', { name: 'Student name', exact: true }).fill('Fictional Unsaved');
  await page.getByRole('button', { name: 'Back to students', exact: true }).click();
  await expect(page.getByText('Discard your unsaved changes?')).toBeInViewport();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Student name', exact: true })).toHaveValue('Fictional Unsaved');
});

test('missing database update is explained and does not display a fake empty roster', async ({ page }) => {
  await backend(page, { academy: true, missingRosterMigration: true });
  await login(page);
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('database update is needed');
  await expect(page.getByRole('button', { name: 'Add a student', exact: true })).toBeDisabled();
  await expect(page.getByText('No students yet. Add your first student.')).toHaveCount(0);
});
