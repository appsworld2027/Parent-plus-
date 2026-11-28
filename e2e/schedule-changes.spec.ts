// Browser tests for docs/product/schedule-changes (SC-01, 02, 04, 07). Rules: tests/schedule-changes.test.ts. SC-08 NOT RUN.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

async function open(page: Page) {
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark this day as a holiday', exact: true })).toBeEnabled();
}
const holiday = (page: Page) => page.getByRole('button', { name: 'Mark this day as a holiday', exact: true });
test('SC-04/SC-01/SC-02 holiday cancels the day, then one class can be restored', async ({ page }) => {
  await open(page);
  await expect(page.getByText(/· scheduled/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Restore class/ })).toHaveCount(0);
  await holiday(page).click(); await page.getByRole('button', { name: 'Cancel classes', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Holiday set: 1 class cancelled.');
  await expect(page.getByText(/· cancelled/)).toBeVisible();
  await page.getByRole('button', { name: /^Restore class Fictional Clay Class/ }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Class restored.');
  await expect(page.getByText(/· scheduled/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Restore class/ })).toHaveCount(0);
});
test('SC-07 declining the holiday dialog changes nothing', async ({ page }) => {
  await open(page);
  await holiday(page).click(); await page.getByRole('button', { name: 'Keep classes', exact: true }).click();
  await expect(page.getByText(/· scheduled/)).toBeVisible();
});
