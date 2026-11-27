// Browser tests for docs/product/fee-receipts (FR-01, 02, 08). Pure rules: tests/fee-receipts.test.ts. FR-09 (device share sheet) NOT RUN.
import { expect, test } from '@playwright/test';
import { login } from './support/backend';
import { feesBackend } from './support/feesBackend';

test('FR-01/02/08 a recorded payment can show and hide its receipt', async ({ page }) => {
  await feesBackend(page); await login(page); await page.getByRole('tab', { name: 'Fees', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh fees', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Invoice history and corrections', exact: true }).click();
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click();
  await page.getByRole('button', { name: 'Fictional Ria · Fictional Clay Class · ₹2,500', exact: true }).click();
  await page.getByRole('button', { name: 'Review invoice', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm fee save', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Invoice created.');
  await expect(page.getByRole('button', { name: 'View receipt', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Record manual payment', exact: true }).click();
  await page.getByRole('textbox', { name: 'Amount received (₹)', exact: true }).fill('1000');
  await page.getByRole('textbox', { name: 'Receipt reference (optional)', exact: true }).fill('UPI-FICT-1');
  await page.getByRole('button', { name: 'Review manual payment', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm fee save', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Manual payment recorded.');
  await page.getByRole('button', { name: 'View receipt', exact: true }).click();
  const receipt = page.getByText(/Fee receipt/);
  await expect(receipt).toBeVisible();
  for (const part of [/Amount received: ₹1,000/, /Reference: UPI-FICT-1/, /Student: Fictional Ria/, /Receipt no: RCPT-/]) await expect(receipt).toContainText(part);
  await page.getByRole('button', { name: 'Hide receipt', exact: true }).click();
  await expect(page.getByText(/Fee receipt/)).toHaveCount(0);
});
