import { expect, test } from '@playwright/test';

test('native component shell supports all five destinations without fake records', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /More teaching/ })).toBeVisible();
  for (const name of ['Schedule', 'Post', 'Students', 'Fees']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByText('Coming in the next modules', { exact: true })).toBeVisible();
  }
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('heading', { name: /More teaching/ })).toBeVisible();
});

test('error report stays safe, can be cleared, and app remains usable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open support and diagnostics' }).click();
  await expect(page.getByText('Not verified', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Run safe error check', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Reference: PP-');
  await expect(page.getByTestId('diagnostic-report')).toContainText('CONTROLLED_FAILURE');
  await expect(page.getByTestId('diagnostic-report')).not.toContainText('supabase.co');
  await expect(page.getByTestId('diagnostic-report')).not.toContainText('sb_publishable_');
  await page.getByRole('button', { name: 'Clear local diagnostic report' }).click();
  await expect(page.getByTestId('diagnostic-report')).toHaveCount(0);
  await page.getByRole('button', { name: 'Prepare diagnostic report' }).click();
  await expect(page.getByTestId('diagnostic-report')).toContainText('"events": []');
});

test('screen error boundary recovers and preserves only a sanitized error code', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open support and diagnostics' }).click();
  await page.getByRole('button', { name: 'Test screen recovery', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Let’s reopen this screen' })).toBeVisible();
  await expect(page.getByText(/Error reference: PP-/)).toBeVisible();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: /More teaching/ })).toBeVisible();
  await page.getByRole('button', { name: 'Open support and diagnostics' }).click();
  await page.getByRole('button', { name: 'Prepare diagnostic report' }).click();
  await expect(page.getByTestId('diagnostic-report')).toContainText('SCREEN_FAILURE');
  await expect(page.getByTestId('diagnostic-report')).not.toContainText('Controlled development render failure');
});
