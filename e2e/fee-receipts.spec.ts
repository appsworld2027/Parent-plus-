// Browser tests for docs/product/fee-receipts (FR-01, 02, 08). Pure rules: tests/fee-receipts.test.ts. FR-09 (device share sheet) NOT RUN.
import { expect, test } from '@playwright/test';
import { login } from './support/backend';
import { feesBackend } from './support/feesBackend';

async function recordPayment(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: 'Fees', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh fees', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Invoice history and corrections', exact: true }).click();
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click();
  await page.getByRole('button', { name: 'Fictional Ria · Fictional Clay Class · ₹2,500', exact: true }).click();
  await page.getByRole('button', { name: 'Review invoice', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm fee save', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Invoice created.');
  await page.getByRole('button', { name: 'Record manual payment', exact: true }).click();
  await page.getByRole('textbox', { name: 'Amount received (₹)', exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Review manual payment', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm fee save', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Manual payment recorded.');
}
const seedContact = (page: import('@playwright/test').Page, phone: string) => page.addInitScript(ph => {
  if (!sessionStorage.getItem('__fictional_roster')) sessionStorage.setItem('__fictional_roster', JSON.stringify({ students: [{ id: '00000000-0000-0000-0000-000000000021', name: 'Fictional Ria', age_years: 6, archived_at: null }],
    contacts: [{ student_id: '00000000-0000-0000-0000-000000000021', name: 'Fictional Parent', email: null, phone: ph || null }],
    batches: [{ id: '00000000-0000-0000-0000-000000000031', name: 'Fictional Clay Class', room: 'Room 1', monthly_fee_paise: 250000, archived_at: null }],
    enrolments: [{ id: '00000000-0000-0000-0000-000000000041', student_id: '00000000-0000-0000-0000-000000000021', batch_id: '00000000-0000-0000-0000-000000000031', starts_on: '2020-01-01', ends_on: null }] }));
}, phone);
test('FR-10 receipt can be sent on WhatsApp to the parent on file', async ({ page, context }) => {
  await context.route('https://wa.me/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }));
  await seedContact(page, '+919999900002'); await feesBackend(page); await login(page); await recordPayment(page);
  await page.getByRole('button', { name: 'View receipt', exact: true }).click();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Send receipt on WhatsApp', exact: true }).click();
  const url = (await popup).url();
  expect(url).toContain('https://wa.me/919999900002?text=');
  expect(decodeURIComponent(url.split('text=')[1])).toContain('Amount received: ₹1,000');
});
test('FR-10 without a phone number the receipt explains and Share remains', async ({ page }) => {
  await seedContact(page, ''); await feesBackend(page); await login(page); await recordPayment(page);
  await page.getByRole('button', { name: 'View receipt', exact: true }).click();
  await expect(page.getByText(/No parent phone number on file/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send receipt on WhatsApp', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Share receipt/ })).toBeVisible();
});
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
