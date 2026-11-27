// LOCKED acceptance tests for docs/product/provider-listing-publish/ACCEPTANCE.md (AI Org AGENTS.md §7A).
// Written by Quinn (QA) before the feature exists. A build PR must make these pass WITHOUT editing, skipping or deleting them.
// Same fictional provider service as C1.2 (../support/providerBackend, one shared state in Node; a second device is a separate browser
// context). Who can read or change a listing is proven on a disposable database in tests/provider-listing-database.test.ts
// (LP-07, LP-11, LP-12); the browser tests below prove what the screens show and what direct calls the service refuses.
// "Published" means ready and approved to be offered; it is NOT public (founder decision D-03, reading to be confirmed).
import { expect, test, type Browser, type Page } from '@playwright/test';
import { login } from '../support/backend';
import { complete, ids, newStore, providerBackend, type Role, type Store } from '../support/providerBackend';

const E = { title: 'Enter a title of 3 to 80 characters.', description: 'Write a description of at least 20 characters.', sport: 'Enter a sport.',
  age: 'Enter an age group.', location: 'Enter a location.', price: 'Enter a price note.' };
const NOT_PUBLIC = 'Not publicly visible. Only you and admins can see it.';
const FIELDS = ['Listing title', 'Description', 'Sport', 'Age group', 'Location', 'Price note'];
const GOOD = { 'Listing title': 'Fictional Cricket Coaching', Description: 'Weekend batting and bowling sessions for school children.', Sport: 'Cricket', 'Age group': '8 to 12', Location: 'Fictional Ground', 'Price note': 'Fictional 2000 per month' };

function verified(store: Store) { store.profiles[ids.coach] = complete('verified'); }
async function open(page: Page, store: Store, role: Role = 'coach') {
  await providerBackend(page, store, role); await login(page);
  await page.getByRole('tab', { name: 'Listing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Provider listing', exact: true })).toBeVisible();
}
async function device(browser: Browser, store: Store, role: Role = 'coach') { const context = await browser.newContext(), page = await context.newPage(); await open(page, store, role); return { context, page }; }
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });
async function fill(page: Page, over: Partial<typeof GOOD> = {}) { for (const [name, value] of Object.entries({ ...GOOD, ...over })) await field(page, name).fill(value); }
const status = (page: Page) => page.getByTestId('listing-status');
const save = (page: Page, name = 'Save draft') => page.getByRole('button', { name, exact: true }).click();
const post = (page: Page, rpc: string, body: object) => page.evaluate(async ([name, payload]) => (await fetch(`https://fictional.supabase.co/rest/v1/rpc/${name}`,
  { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })).status, [rpc, body] as const);

for (const state of ['draft', 'pending', 'rejected'] as const) test(`LP-01 a coach who is not Verified (${state}) is blocked with "Get verified first" and a link to Profile`, async ({ page }) => {
  const store = newStore(); if (state !== 'draft') store.profiles[ids.coach] = complete(state);
  await open(page, store);
  await expect(page.getByText('Get verified first', { exact: true })).toBeVisible();
  for (const name of FIELDS) await expect(field(page, name)).toHaveCount(0);
  await page.getByRole('button', { name: 'Go to Profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Provider profile', exact: true })).toBeVisible();
});

test('LP-02 a Verified coach sees an empty draft form with status Draft', async ({ page }) => {
  const store = newStore(); verified(store); await open(page, store);
  for (const name of FIELDS) { await expect(field(page, name)).toBeVisible(); await expect(field(page, name)).toHaveValue(''); }
  await expect(status(page)).toHaveText('Draft');
  await expect(page.getByRole('button', { name: 'Unpublish', exact: true })).toHaveCount(0);
});

test('LP-03 invalid or missing fields: nothing saves, field errors show, entries stay', async ({ page }) => {
  const store = newStore(); verified(store); await open(page, store);
  await save(page); for (const e of Object.values(E)) await expect(page.getByText(e, { exact: true })).toBeVisible();
  await fill(page, { 'Listing title': 'ab', Description: 'too short', Sport: '  ' });
  await save(page);
  for (const e of [E.title, E.description, E.sport]) await expect(page.getByText(e, { exact: true })).toBeVisible();
  await expect(page.getByText(E.location, { exact: true })).toHaveCount(0);
  await expect(field(page, 'Description')).toHaveValue('too short'); await expect(field(page, 'Location')).toHaveValue('Fictional Ground');
  expect(store.calls.filter(c => c.endsWith(':lsave'))).toHaveLength(0); expect(store.listings[ids.coach]).toBeUndefined();
});

test('LP-04 a valid draft persists after reload and on another device', async ({ page, browser }) => {
  const store = newStore(); verified(store); await open(page, store); await fill(page); await save(page);
  await expect(page.getByTestId('action-feedback')).toContainText('Draft saved.');
  await page.reload(); await page.getByRole('tab', { name: 'Listing', exact: true }).click();
  for (const [name, value] of Object.entries(GOOD)) await expect(field(page, name)).toHaveValue(value);
  await expect(status(page)).toHaveText('Draft');
  const other = await device(browser, store); for (const [name, value] of Object.entries(GOOD)) await expect(field(other.page, name)).toHaveValue(value); await other.context.close();
});

test('LP-05 an incomplete draft cannot be published; the listing says what is missing and stays Draft', async ({ page }) => {
  const store = newStore(); verified(store); await open(page, store);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  const missing = page.getByTestId('publish-missing');
  for (const word of [/title/i, /description/i, /sport/i, /age group/i, /location/i, /price/i]) await expect(missing).toContainText(word);
  await expect(status(page)).toHaveText('Draft'); expect(store.calls.filter(c => c.endsWith(':lpublish'))).toHaveLength(0);
  await fill(page, { Location: '' }); await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(missing).toContainText(/location/i); await expect(missing).not.toContainText(/title/i); await expect(status(page)).toHaveText('Draft');
});

test('LP-06 publishing a complete draft shows Published with the date and says it is not publicly visible', async ({ page }) => {
  const store = newStore(); verified(store); await open(page, store); await fill(page); await save(page); await expect(page.getByTestId('action-feedback')).toContainText('Draft saved.');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(status(page)).toHaveText('Published'); await expect(page.getByText('Published on 27 Nov 2026', { exact: true })).toBeVisible();
  await expect(page.getByText(NOT_PUBLIC, { exact: true })).toBeVisible(); expect(store.listings[ids.coach].status).toBe('published');
});

test('LP-07 a Published listing is unreachable to another user by screen or direct call (browser level)', async ({ page }) => {
  const store = newStore(); verified(store); store.listings[ids.coach] = { title: 'Fictional Cricket Coaching', description: 'Weekend batting and bowling sessions for school children.', sport: 'Cricket',
    age_group: '8 to 12', location: 'Fictional Ground', price_note: 'Fictional 2000 per month', status: 'published', published_at: store.now };
  await open(page, store, 'other');
  await expect(page.getByText('Get verified first', { exact: true })).toBeVisible(); await expect(page.getByText('Fictional Cricket Coaching')).toHaveCount(0);
  expect(await post(page, 'list_provider_listings', {})).toBe(403);
  // the DATABASE-level proof (owner and admin only; anon and other coaches see nothing) is tests/provider-listing-database.test.ts
});

test('LP-08 an admin sees Published listings read-only', async ({ page, browser }) => {
  const store = newStore(); verified(store); await open(page, store); await fill(page); await save(page); await expect(page.getByTestId('action-feedback')).toContainText('Draft saved.');
  await page.getByRole('button', { name: 'Publish', exact: true }).click(); await expect(status(page)).toHaveText('Published');
  const admin = await device(browser, store, 'admin'); const a = admin.page;
  await expect(a.getByRole('heading', { name: 'All listings', exact: true })).toBeVisible();
  const row = a.getByTestId('admin-listing').first();
  await expect(row).toContainText('Fictional Cricket Coaching'); await expect(row).toContainText('Fictional Coach'); await expect(row).toContainText('Fictional Ground');
  await expect(row.getByRole('button')).toHaveCount(0); await expect(row.getByRole('textbox')).toHaveCount(0);
  await admin.context.close();
});

test('LP-09 editing a Published listing persists and the status stays Published', async ({ page }) => {
  const store = newStore(); verified(store); await open(page, store); await fill(page); await save(page); await expect(page.getByTestId('action-feedback')).toContainText('Draft saved.');
  await page.getByRole('button', { name: 'Publish', exact: true }).click(); await expect(status(page)).toHaveText('Published');
  await field(page, 'Price note').fill('Fictional 2500 per month'); await save(page, 'Save changes');
  await expect(page.getByTestId('action-feedback')).toContainText('Changes saved.'); await expect(status(page)).toHaveText('Published');
  await page.reload(); await page.getByRole('tab', { name: 'Listing', exact: true }).click();
  await expect(field(page, 'Price note')).toHaveValue('Fictional 2500 per month'); await expect(status(page)).toHaveText('Published');
});

test('LP-10 Unpublish returns the listing to Draft and keeps its content', async ({ page }) => {
  const store = newStore(); verified(store); await open(page, store); await fill(page); await save(page); await expect(page.getByTestId('action-feedback')).toContainText('Draft saved.');
  await page.getByRole('button', { name: 'Publish', exact: true }).click(); await expect(status(page)).toHaveText('Published');
  await page.getByRole('button', { name: 'Unpublish', exact: true }).click(); await expect(status(page)).toHaveText('Draft');
  await page.reload(); await page.getByRole('tab', { name: 'Listing', exact: true }).click();
  await expect(status(page)).toHaveText('Draft'); for (const [name, value] of Object.entries(GOOD)) await expect(field(page, name)).toHaveValue(value);
});

test('LP-11 when verification is revoked the listing becomes Draft and cannot be republished', async ({ page, browser }) => {
  const store = newStore(); verified(store); await open(page, store); await fill(page); await save(page); await expect(page.getByTestId('action-feedback')).toContainText('Draft saved.');
  await page.getByRole('button', { name: 'Publish', exact: true }).click(); await expect(status(page)).toHaveText('Published');
  const admin = await device(browser, store, 'admin');
  expect(await post(admin.page, 'decide_provider_profile', { p_user: ids.coach, p_decision: 'reject', p_reason: 'Qualification expired.' })).toBe(200); await admin.context.close();
  expect(store.listings[ids.coach].status).toBe('draft');
  await page.reload(); await page.getByRole('tab', { name: 'Listing', exact: true }).click();
  await expect(page.getByText('Get verified first', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Publish', exact: true })).toHaveCount(0);
  expect(await post(page, 'publish_provider_listing', {})).toBe(403); expect(store.listings[ids.coach].status).toBe('draft');
});

test('LP-12 a coach cannot publish or edit another coach\'s listing; nothing changes', async ({ page }) => {
  const store = newStore(); verified(store); store.listings[ids.coach] = { title: 'Fictional Cricket Coaching', description: 'Weekend batting and bowling sessions for school children.', sport: 'Cricket',
    age_group: '8 to 12', location: 'Fictional Ground', price_note: 'Fictional 2000 per month', status: 'draft', published_at: null };
  const before = JSON.stringify(store.listings);
  await open(page, store, 'other'); // a second coach who is not verified
  expect(await post(page, 'publish_provider_listing', { p_user: ids.coach })).toBe(403);
  expect(await post(page, 'save_provider_listing', { p_user: ids.coach, p_title: 'Hijacked', p_description: 'x', p_sport: 'x', p_age_group: 'x', p_location: 'x', p_price_note: 'x' })).toBe(403);
  expect(await post(page, 'unpublish_provider_listing', { p_user: ids.coach })).toBe(403);
  expect(JSON.stringify(store.listings)).toBe(before);
});
