// Not a locked contract test: covers the admin revoke screen added after the C1.2 review (decide_provider_profile on a Verified profile).
import { expect, test } from '@playwright/test';
import { login } from './support/backend';
import { complete, ids, newStore, providerBackend } from './support/providerBackend';
test('admin revokes a verified coach with a reason; the coach is Rejected and the listing returns to Draft', async ({ page }) => {
  const store = newStore(); store.profiles[ids.coach] = complete('verified');
  store.listings[ids.coach] = { title: 'Fictional Cricket Coaching', description: 'Weekend sessions for school children.', sport: 'Cricket', age_group: '8 to 12', location: 'Fictional Ground', price_note: 'x', status: 'published', published_at: store.now };
  await providerBackend(page, store, 'admin'); await login(page); await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  const row = page.getByTestId('verified-item').first(); await expect(row).toContainText('Fictional Coach');
  await row.getByRole('button', { name: 'Revoke verification', exact: true }).click();
  await row.getByRole('button', { name: 'Confirm revoke', exact: true }).click();
  await expect(page.getByText('Give a reason for revoking.', { exact: true })).toBeVisible(); expect(store.profiles[ids.coach].status).toBe('verified');
  await row.getByRole('textbox', { name: 'Reason for revoking', exact: true }).fill('Qualification expired.');
  await row.getByRole('button', { name: 'Confirm revoke', exact: true }).click();
  await expect(page.getByTestId('verified-item')).toHaveCount(0);
  expect(store.profiles[ids.coach]).toMatchObject({ status: 'rejected', reason: 'Qualification expired.' }); expect(store.listings[ids.coach].status).toBe('draft');
  expect(store.decisions.at(-1)).toMatchObject({ decision: 'reject', by: ids.admin });
});
