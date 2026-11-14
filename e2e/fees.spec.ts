import { expect, test, type Page } from '@playwright/test';
import { login } from './support/backend';
import { feesBackend } from './support/feesBackend';
async function setup(page: Page) {
  await feesBackend(page); await login(page); await page.getByRole('tab',{ name: 'Fees',exact: true }).click();
  await expect(page.getByRole('button',{ name: 'Create invoice',exact: true })).toBeEnabled();
}
async function issue(page: Page) {
  await page.getByRole('button',{ name: 'Create invoice',exact: true }).click();
  await page.getByRole('button',{ name: 'Fictional Ria · Fictional Clay Class · ₹2,500',exact: true }).click();
  await page.getByRole('button',{ name: 'Review invoice',exact: true }).click();
  await page.getByRole('button',{ name: 'Confirm fee save',exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Invoice created.');
}
async function enterPayment(page: Page, amount = '1000') {
  await page.getByRole('button',{ name: 'Record manual payment',exact: true }).click();
  await page.getByRole('textbox',{ name: 'Amount received (₹)',exact: true }).fill(amount);
  await page.getByRole('button',{ name: 'Review manual payment',exact: true }).click();
}
test('invoice and manual payments persist, show partial/paid balances, retain fee snapshot and label manual history', async ({ page },info) => {
  await setup(page); await issue(page); await enterPayment(page);
  await page.getByRole('button',{ name: 'Confirm fee save',exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Manual payment recorded.');
  await expect(page.getByText('Outstanding: ₹1,500',{ exact: true })).toBeVisible();
  await expect(page.getByText('₹1,000 · Manual record',{ exact: true })).toBeVisible();
  await page.evaluate(() => { window.__coachFixture.roster.batches[0].monthly_fee_paise=300000; });
  await page.getByRole('button',{ name: 'Refresh invoice',exact: true }).click();
  await expect(page.getByText(/Invoice: ₹2,500/)).toBeVisible();
  await enterPayment(page,'1500'); await page.getByRole('button',{ name: 'Confirm fee save',exact: true }).click();
  await expect(page.getByText('Outstanding: ₹0',{ exact: true })).toBeVisible();
  await expect(page.getByRole('button',{ name: 'Record manual payment',exact: true })).toHaveCount(0);
  await expect(page.getByRole('button',{ name: 'Confirm fee save',exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('fees-paid.png'),fullPage: true });
  await page.reload(); await page.getByRole('tab',{ name: 'Fees',exact: true }).click();
  await page.getByRole('button',{ name: 'Open invoice for Fictional Ria',exact: true }).click();
  await expect(page.getByText('Outstanding: ₹0',{ exact: true })).toBeVisible();
});
test('lost payment response survives restart and exact retry creates only one payment', async ({ page }) => {
  await setup(page); await issue(page); await enterPayment(page);
  await page.evaluate(() => { window.__feeFixture.loseResponse=true; });
  await page.getByRole('button',{ name: 'Confirm fee save',exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('save could not be confirmed');
  await expect(page.getByRole('button',{ name: 'Retry pending fee save',exact: true })).toBeEnabled();
  expect(await page.evaluate(() => window.__feeFixture.payments.length)).toBe(1);
  await page.reload(); await page.getByRole('tab',{ name: 'Fees',exact: true }).click();
  await page.getByRole('button',{ name: 'Retry pending fee save',exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Manual payment recorded.');
  expect(await page.evaluate(() => window.__feeFixture.payments.length)).toBe(1);
  await expect(page.getByText('Outstanding: ₹1,500',{ exact: true })).toBeVisible();
});
test('manual correction retains original history, then unpaid invoice can be voided and replaced', async ({ page }) => {
  await setup(page); await issue(page); await enterPayment(page);
  await page.getByRole('button',{ name: 'Confirm fee save',exact: true }).click();
  await page.getByRole('button',{ name: 'Correct manual record ₹1,000',exact: true }).click();
  await page.getByRole('textbox',{ name: 'Correction reason',exact: true }).fill('Fictional wrong receipt');
  await page.getByRole('button',{ name: 'Review correction',exact: true }).click();
  await page.getByRole('button',{ name: 'Confirm fee save',exact: true }).click();
  await expect(page.getByText('Outstanding: ₹2,500',{ exact: true })).toBeVisible();
  await expect(page.getByText(/Reason: Fictional wrong receipt/)).toBeVisible();
  await page.getByRole('button',{ name: 'Void unpaid invoice',exact: true }).click();
  await page.getByRole('textbox',{ name: 'Correction reason',exact: true }).fill('Fictional replacement needed');
  await page.getByRole('button',{ name: 'Review correction',exact: true }).click();
  await page.getByRole('button',{ name: 'Confirm fee save',exact: true }).click();
  await expect(page.getByText('Voided invoice',{ exact: true })).toBeVisible();
  await page.getByRole('button',{ name: 'Back to invoices',exact: true }).click();
  await issue(page); expect(await page.evaluate(() => window.__feeFixture.invoices.length)).toBe(2);
});
test('validation and navigation guards preserve entries; busy save blocks leaving and duplicate taps', async ({ page }) => {
  await setup(page); await issue(page);
  await page.getByRole('button',{ name: 'Record manual payment',exact: true }).click();
  await page.getByRole('textbox',{ name: 'Amount received (₹)',exact: true }).fill('2500.01');
  await page.getByRole('button',{ name: 'Review manual payment',exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('within the outstanding balance');
  await page.getByRole('tab',{ name: 'Students',exact: true }).click();
  await expect(page.getByText('Leave your unsaved changes?',{ exact: true })).toBeVisible();
  await page.getByRole('button',{ name: 'Keep editing',exact: true }).click();
  await page.getByRole('textbox',{ name: 'Amount received (₹)',exact: true }).fill('1000');
  await page.getByRole('button',{ name: 'Review manual payment',exact: true }).click();
  await page.evaluate(() => { window.__feeFixture.hold=true; });
  await page.getByRole('button',{ name: 'Confirm fee save',exact: true }).click();
  await page.getByRole('tab',{ name: 'Students',exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('wait for the save');
  await page.evaluate(() => { window.__feeFixture.hold=false; });
  await expect(page.getByText('Outstanding: ₹1,500',{ exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__feeFixture.payments.length)).toBe(1);
});
test('missing fees update is actionable and never looks like an empty successful list', async ({ page }) => {
  await feesBackend(page,{ missing: true }); await login(page); await page.getByRole('tab',{ name: 'Fees',exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('fees database update is needed');
  await expect(page.getByRole('button',{ name: 'Create invoice',exact: true })).toBeDisabled();
  await expect(page.getByText('No invoices for this billing month.',{ exact: true })).toHaveCount(0);
});
test('device storage failure sends no payment; retry and changed-balance rejection retain the editable form', async ({ page }) => {
  await setup(page); await issue(page); await enterPayment(page);
  await page.evaluate(() => {
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value) { if(key.startsWith('parentplus.coach.fee-pending.')) throw new Error('Fictional full storage'); return original.call(this,key,value); };
  });
  await page.getByRole('button',{ name: 'Confirm fee save',exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('No request was sent');
  await expect(page.getByRole('button',{ name: 'Confirm fee save',exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.__feeFixture.payments.length)).toBe(0);
  await expect(page.getByText('This request is only in memory until device storage succeeds. Keep this screen open and retry; closing or reloading can lose these entries.',{ exact: true })).toBeVisible();
  await page.getByRole('tab',{ name: 'Students',exact: true }).click();
  await expect(page.getByText('Leave your unsaved changes?',{ exact: true })).toBeVisible();
  await page.getByRole('button',{ name: 'Keep editing',exact: true }).click();
  await expect(page.getByRole('button',{ name: 'Retry pending fee save',exact: true })).toBeEnabled();
  await page.reload(); await page.getByRole('tab',{ name: 'Fees',exact: true }).click();
  await page.getByRole('button',{ name: 'Open invoice for Fictional Ria',exact: true }).click();
  await enterPayment(page,'2500');
  await page.evaluate(() => {
    window.__feeFixture.payments.push({ id: 'fictional-concurrent-payment',invoice_id: window.__feeFixture.invoices[0].id,request_id: 'fictional-concurrent-request',amount_paise: 100000,
      source: 'manual',mode: 'live',paid_on: '2026-11-01',method: 'cash',reference: '',recorded_at: new Date().toISOString(),recorded_by: null,reversal: null });
  });
  await page.getByRole('button',{ name: 'Confirm fee save',exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('fee or balance changed');
  await expect(page.getByRole('textbox',{ name: 'Amount received (₹)',exact: true })).toHaveValue('2500');
  await expect(page.getByRole('button',{ name: 'Retry pending fee save',exact: true })).toHaveCount(0);
});
test('invoice pagination retains equal timestamps even when another device inserts a newer invoice', async ({ page }) => {
  await setup(page); await issue(page);
  await page.evaluate(() => {
    const base=window.__feeFixture.invoices[0];
    window.__feeFixture.invoices=Array.from({ length: 51 },(_,index) => ({ ...base,id: `20000000-0000-0000-0000-${String(index).padStart(12,'0')}`,created_at: '2026-11-14T10:00:00.000Z' }));
  });
  await page.getByRole('button',{ name: 'Back to invoices',exact: true }).click();
  await expect(page.getByRole('button',{ name: 'Open invoice for Fictional Ria',exact: true })).toHaveCount(50);
  await page.evaluate(() => {
    const base=window.__feeFixture.invoices[0];
    window.__feeFixture.invoices.push({ ...base,id: '30000000-0000-0000-0000-000000000099',created_at: '2026-11-14T11:00:00.000Z' });
  });
  await page.getByRole('button',{ name: 'Load more invoices',exact: true }).click();
  await expect(page.getByRole('button',{ name: 'Open invoice for Fictional Ria',exact: true })).toHaveCount(51);
  await expect(page.getByRole('button',{ name: 'Load more invoices',exact: true })).toHaveCount(0);
});
test('unreadable recovery record blocks new fee writes instead of silently losing its retry identity', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => sessionStorage.setItem('parentplus.coach.fee-pending.v1.00000000-0000-0000-0000-000000000001.academy-test','not-json'));
  await page.reload(); await page.getByRole('tab',{ name: 'Fees',exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('pending fee save on this device could not be read');
  await expect(page.getByRole('button',{ name: 'Create invoice',exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.__feeFixture.writes)).toBe(0);
});
test('preserved manual and gateway test receipts are labelled TEST and excluded from real outstanding', async ({ page }) => {
  await setup(page); await issue(page);
  await page.evaluate(() => {
    const invoice=window.__feeFixture.invoices[0];
    for(const source of ['manual','gateway'] as const) window.__feeFixture.payments.push({ id: `fictional-test-${source}`,invoice_id: invoice.id,request_id: `fictional-request-${source}`,
      amount_paise: 10000,source,mode: 'test',paid_on: '2026-11-01',method: null,reference: null,recorded_at: new Date().toISOString(),recorded_by: null,reversal: null });
  });
  await page.getByRole('button',{ name: 'Refresh invoice',exact: true }).click();
  await expect(page.getByText('Outstanding: ₹2,500',{ exact: true })).toBeVisible();
  await expect(page.getByText('₹100 · Manual record · TEST',{ exact: true })).toBeVisible();
  await expect(page.getByText('₹100 · Gateway · TEST',{ exact: true })).toBeVisible();
  await expect(page.getByText('Test payment records: ₹200. Excluded from real balance.',{ exact: true })).toBeVisible();
});
