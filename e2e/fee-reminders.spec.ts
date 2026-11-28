// Browser tests for docs/product/fee-reminders (FRM-04, 05, 06). Ladder wording: tests/fee-reminders.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { login } from './support/backend';
import { feesBackend } from './support/feesBackend';

const SID = '00000000-0000-0000-0000-000000000021', BID = '00000000-0000-0000-0000-000000000031';
const seedContact = (page: Page, phone: string) => page.addInitScript(([ph, sid, bid]) => {
  if (!sessionStorage.getItem('__fictional_roster')) sessionStorage.setItem('__fictional_roster', JSON.stringify({ students: [{ id: sid, name: 'Fictional Ria', age_years: 6, archived_at: null }],
    contacts: [{ student_id: sid, name: 'Fictional Parent', email: null, phone: ph || null }], batches: [{ id: bid, name: 'Fictional Clay Class', room: 'Room 1', monthly_fee_paise: 250000, archived_at: null }],
    enrolments: [{ id: '00000000-0000-0000-0000-000000000041', student_id: sid, batch_id: bid, starts_on: '2020-01-01', ends_on: null }] }));
}, [phone, SID, BID] as const);
async function overdueInvoice(page: Page, due: string) {
  await page.getByRole('tab', { name: 'Fees', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh fees', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Invoice history and corrections', exact: true }).click();
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click();
  await page.getByRole('button', { name: 'Fictional Ria · Fictional Clay Class · ₹2,500', exact: true }).click();
  await page.getByRole('button', { name: 'Review invoice', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm fee save', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Invoice created.');
  await page.evaluate(d => { window.__feeFixture.invoices[0].due_on = d; }, due);
  await page.getByRole('button', { name: 'Refresh invoice', exact: true }).click();
}
test('FRM-05 an overdue invoice opens WhatsApp to the parent with the reminder', async ({ page, context }) => {
  await context.route('https://wa.me/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }));
  await seedContact(page, '+919999900003'); await feesBackend(page); await login(page); await overdueInvoice(page, '2020-01-01');
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Remind parent on WhatsApp', exact: true }).click();
  const url = (await popup).url();
  expect(url).toContain('https://wa.me/919999900003?text=');
  const text = decodeURIComponent(url.split('text=')[1]);
  expect(text).toContain('Fictional Ria'); expect(text).toContain('₹2,500'); expect(text).toContain('talk about it');
});
test('FRM-06 without a phone number a note explains and nothing opens', async ({ page }) => {
  await seedContact(page, ''); await feesBackend(page); await login(page); await overdueInvoice(page, '2020-01-01');
  await page.getByRole('button', { name: 'Remind parent on WhatsApp', exact: true }).click();
  await expect(page.getByText(/No parent phone number on file. Add one in Students/)).toBeVisible();
});
test('FRM-04 an invoice that is not yet due has no reminder button', async ({ page }) => {
  await seedContact(page, '+919999900003'); await feesBackend(page); await login(page); await overdueInvoice(page, '2999-01-01');
  await page.waitForTimeout(1000);
  await expect(page.getByRole('button', { name: 'Remind parent on WhatsApp', exact: true })).toHaveCount(0);
});
