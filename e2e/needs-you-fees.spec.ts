// Browser tests for docs/product/needs-you-fees-overdue (AC-01,03,04,10,11). Pure rules AC-05/06/09/12/13/15 are in tests/overdue-fees.test.ts.
// AC-14 (TEST receipts) depends on the database view and is NOT RUN here.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

const ENROLMENT = '00000000-0000-0000-0000-000000000041';
const invoice = (balance: number, due = '2020-01-01') => ({ id: crypto.randomUUID?.() ?? 'i1', academy_id: 'a', enrolment_id: ENROLMENT, billing_month: '2020-01-01', due_on: due,
  amount_paise: balance, paid_paise: 0, balance_paise: balance, excess_paise: 0, test_paise: 0, student_name: 'Fictional Ria', batch_name: 'Fictional Batch',
  created_at: '2020-01-01T00:00:00Z', created_by: null, voided_at: null, voided_by: null, void_reason: null });
async function open(page: Page, invoices: unknown[]) {
  await page.addInitScript(rows => { (window as unknown as { __coachInvoices: unknown[] }).__coachInvoices = rows; }, invoices);
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await expect(page.getByRole('heading', { name: 'Needs you', exact: true })).toBeVisible();
}
test('AC-11 one overdue student shows singular wording and the amount', async ({ page }) => {
  await open(page, [invoice(150000)]);
  await expect(page.getByRole('button', { name: '1 fee overdue', exact: true })).toBeVisible();
  await expect(page.getByText('₹1,500 pending', { exact: true })).toBeVisible();
});
test('AC-02/10 feedback and fees items appear together', async ({ page }) => {
  await open(page, [invoice(350000), invoice(200000)]);
  await expect(page.getByRole('button', { name: '1 fee overdue', exact: true })).toBeVisible();
  await expect(page.getByText('₹5,500 pending', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /child needs|children need/ })).toBeVisible();
});
test('AC-12 an invoice due today is not overdue', async ({ page }) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await open(page, [invoice(100000, '2999-01-01'), invoice(100000, today)]);
  await expect(page.getByRole('button', { name: /fees? overdue/ })).toHaveCount(0);
});
test('AC-03 tapping the fees item opens Fees', async ({ page }) => {
  await open(page, [invoice(150000)]);
  await page.getByRole('button', { name: '1 fee overdue', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Fees', exact: true })).toHaveAttribute('aria-selected', 'true');
});
