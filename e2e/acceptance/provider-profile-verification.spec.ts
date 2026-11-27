// LOCKED acceptance tests for docs/product/provider-profile-verification/ACCEPTANCE.md (AI Org AGENTS.md §7A).
// Written by Quinn (QA) before the feature exists. A build PR must make these pass WITHOUT editing, skipping or deleting them.
//
// Simulation notes (all fictional, no request leaves the browser):
// - ../support/providerBackend keeps one fictional provider service in Node, shared by every page and browser context of a test, so a
//   second device, another user and an admin see the same records. It refuses what the real service must refuse (locked profile,
//   non-admin decision, document of someone else). A "second device" is a separate browser context.
// - Row-level security, who may read documents and who may decide is proven on a disposable database in
//   tests/provider-verification-database.test.ts (PV-11, PV-12). Real storage short-lived links need a hosted project: NOT RUN here.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { login } from '../support/backend';
import { complete, ids, newStore, providerBackend, type Role, type Store } from '../support/providerBackend';

const E_NAME = 'Enter your full name.';
const E_PHONE = 'Enter a phone number with 10 digits.';
const E_BIO = 'Write at least 20 characters about yourself.';
const E_SPORTS = 'Add at least one sport.';
const E_EXP = 'Enter years of experience as a whole number.';
const E_TYPE = 'Use a JPG, PNG or PDF file.';
const E_BIG = 'This file is larger than 5 MB.';
const E_EMPTY = 'This file is empty.';
const E_REASON = 'Give a reason for the rejection.';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

async function open(page: Page, store: Store, role: Role = 'coach') {
  await providerBackend(page, store, role); await login(page);
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Provider profile', exact: true })).toBeVisible();
}
async function device(browser: Browser, store: Store, role: Role = 'coach') {
  const context = await browser.newContext(), page = await context.newPage(); await open(page, store, role); return { context, page };
}
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });
async function fill(page: Page, v: { name?: string; phone?: string; bio?: string; sports?: string; exp?: string } = {}) {
  await field(page, 'Full name').fill(v.name ?? 'Fictional Coach'); await field(page, 'Phone number').fill(v.phone ?? '9876543210');
  await field(page, 'About you').fill(v.bio ?? 'Fictional bio of a coach with real experience.'); await field(page, 'Sports you coach').fill(v.sports ?? 'Cricket');
  await field(page, 'Years of experience').fill(v.exp ?? '6');
}
async function attach(page: Page, button: string, file: { name: string; mimeType: string; buffer: Buffer }) {
  const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: button, exact: true }).click(); await (await chooser).setFiles(file);
}
const idFile = { name: 'id-card.png', mimeType: 'image/png', buffer: PNG };
const certFile = { name: 'coaching-cert.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fictional') };
const status = (page: Page) => page.getByTestId('provider-status');
async function pending(page: Page) { // a complete submitted profile, built through the screen
  await fill(page); await page.getByRole('button', { name: 'Save profile', exact: true }).click(); await expect(page.getByTestId('action-feedback')).toContainText('Profile saved.');
  await attach(page, 'Attach photo ID', idFile); await attach(page, 'Attach qualification', certFile);
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click(); await expect(status(page)).toHaveText('Pending review');
}

test('PV-01 a verified-email coach opens Profile: form for name, phone, bio, sports, experience; status Not submitted', async ({ page }) => {
  const store = newStore(); await open(page, store);
  for (const label of ['Full name', 'Phone number', 'About you', 'Sports you coach', 'Years of experience']) await expect(field(page, label)).toBeVisible();
  await expect(status(page)).toHaveText('Not submitted');
  await expect(page.getByRole('heading', { name: 'Review queue', exact: true })).toHaveCount(0);
});

test('PV-02 empty or invalid fields: nothing saves, field errors show, entries stay', async ({ page }) => {
  const store = newStore(); await open(page, store);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  for (const e of [E_NAME, E_PHONE, E_BIO, E_SPORTS, E_EXP]) await expect(page.getByText(e, { exact: true })).toBeVisible();
  await fill(page, { name: 'Fictional Coach', phone: '12345', bio: 'too short', sports: ' , ', exp: '-2' });
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  for (const e of [E_PHONE, E_BIO, E_SPORTS, E_EXP]) await expect(page.getByText(e, { exact: true })).toBeVisible();
  await expect(page.getByText(E_NAME, { exact: true })).toHaveCount(0);
  await expect(field(page, 'Phone number')).toHaveValue('12345'); await expect(field(page, 'About you')).toHaveValue('too short');
  expect(store.calls.filter(c => c.endsWith(':save'))).toHaveLength(0);
});

test('PV-03 a valid profile persists after reload and on another device', async ({ page, browser }) => {
  const store = newStore(); await open(page, store); await fill(page, { sports: 'Cricket, Football' });
  await page.getByRole('button', { name: 'Save profile', exact: true }).click(); await expect(page.getByTestId('action-feedback')).toContainText('Profile saved.');
  await page.reload(); await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await expect(field(page, 'Full name')).toHaveValue('Fictional Coach'); await expect(field(page, 'Sports you coach')).toHaveValue('Cricket, Football');
  await expect(field(page, 'Years of experience')).toHaveValue('6');
  const other = await device(browser, store);
  await expect(field(other.page, 'Full name')).toHaveValue('Fictional Coach'); await expect(field(other.page, 'Phone number')).toHaveValue('9876543210');
  await other.context.close();
});

test('PV-04 one photo ID and one qualification (JPG, PNG or PDF) attach and show with file names', async ({ page }) => {
  const store = newStore(); await open(page, store); await fill(page);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click(); await expect(page.getByTestId('action-feedback')).toContainText('Profile saved.');
  await attach(page, 'Attach photo ID', idFile); await expect(page.getByText('id-card.png', { exact: true })).toBeVisible();
  await attach(page, 'Attach qualification', certFile); await expect(page.getByText('coaching-cert.pdf', { exact: true })).toBeVisible();
  expect(store.profiles[ids.coach].docs.map(d => d.kind).sort()).toEqual(['photo_id', 'qualification']);
  expect(store.profiles[ids.coach].docs.every(d => d.path.startsWith(`${ids.coach}/`))).toBe(true); // private folder per owner
});

test('PV-05 a wrong type, oversize or empty file is refused with a clear message and nothing is stored', async ({ page }) => {
  const store = newStore(); await open(page, store);
  await attach(page, 'Attach photo ID', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(page.getByText(E_TYPE, { exact: true })).toBeVisible();
  await attach(page, 'Attach photo ID', { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await expect(page.getByText(E_BIG, { exact: true })).toBeVisible();
  await attach(page, 'Attach qualification', { name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) });
  await expect(page.getByText(E_EMPTY, { exact: true })).toBeVisible();
  expect(store.uploads).toBe(0); expect(store.objects).toHaveLength(0); expect(store.profiles[ids.coach]?.docs ?? []).toHaveLength(0);
  await expect(page.getByText('notes.txt')).toHaveCount(0);
});

test('PV-06 submit is refused, naming what is missing, when profile or a document is missing', async ({ page }) => {
  const store = newStore(); await open(page, store);
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click();
  await expect(page.getByTestId('submit-missing')).toContainText(/profile/i); await expect(status(page)).toHaveText('Not submitted');
  await fill(page); await page.getByRole('button', { name: 'Save profile', exact: true }).click(); await expect(page.getByTestId('action-feedback')).toContainText('Profile saved.');
  await attach(page, 'Attach photo ID', idFile);
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click();
  await expect(page.getByTestId('submit-missing')).toContainText(/qualification/i); await expect(page.getByTestId('submit-missing')).not.toContainText(/photo ID/i);
  await expect(status(page)).toHaveText('Not submitted'); expect(store.profiles[ids.coach].status).toBe('draft');
});

test('PV-07 submitting a complete profile makes it Pending review and locks fields and documents', async ({ page }) => {
  const store = newStore(); await open(page, store); await pending(page);
  expect(store.profiles[ids.coach].status).toBe('pending');
  await expect(page.getByRole('button', { name: 'Save profile', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Attach photo ID', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Attach qualification', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Submit for review', exact: true })).toHaveCount(0);
  for (const label of ['Full name', 'Phone number', 'About you', 'Sports you coach', 'Years of experience']) await expect(field(page, label)).not.toBeEditable();
  await page.reload(); await page.getByRole('tab', { name: 'Profile', exact: true }).click(); await expect(status(page)).toHaveText('Pending review');
});

test('PV-08 an admin sees the pending profile and both documents, and can Approve or Reject (reject needs a reason)', async ({ page, browser }) => {
  const store = newStore(); await open(page, store); await pending(page);
  const admin = await device(browser, store, 'admin'); const a = admin.page;
  await expect(a.getByRole('heading', { name: 'Review queue', exact: true })).toBeVisible();
  const item = a.getByTestId('review-item').first();
  await expect(item).toContainText('Fictional Coach'); await expect(item).toContainText('9876543210'); await expect(item).toContainText('Fictional bio of a coach with real experience.');
  await expect(item).toContainText('id-card.png'); await expect(item).toContainText('coaching-cert.pdf');
  await expect(item.getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
  await item.getByRole('button', { name: 'Open photo ID', exact: true }).click();
  await expect.poll(() => store.signed.length).toBeGreaterThan(0);
  expect(store.signed[0].expiresIn).toBeLessThanOrEqual(900); expect(store.publicRequests).toBe(0); // private, short-lived, never a public URL
  await item.getByRole('button', { name: 'Reject', exact: true }).click();
  await item.getByRole('button', { name: 'Confirm rejection', exact: true }).click();
  await expect(a.getByText(E_REASON, { exact: true })).toBeVisible(); expect(store.profiles[ids.coach].status).toBe('pending'); expect(store.decisions).toHaveLength(0);
  await admin.context.close();
});

test('PV-09 after approval the coach reopens the app and sees Verified with the approval date', async ({ page, browser }) => {
  const store = newStore(); await open(page, store); await pending(page);
  const admin = await device(browser, store, 'admin');
  await admin.page.getByTestId('review-item').first().getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(admin.page.getByTestId('review-item')).toHaveCount(0); await admin.context.close();
  await page.reload(); await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await expect(status(page)).toHaveText('Verified'); await expect(page.getByText('Verified on 27 Nov 2026', { exact: true })).toBeVisible();
});

test('PV-10 after rejection the coach sees Rejected with the reason, can edit and resubmit', async ({ page, browser }) => {
  const store = newStore(); await open(page, store); await pending(page);
  const admin = await device(browser, store, 'admin'); const item = admin.page.getByTestId('review-item').first();
  await item.getByRole('button', { name: 'Reject', exact: true }).click();
  await item.getByRole('textbox', { name: 'Reason for rejection', exact: true }).fill('The photo ID is blurred.');
  await item.getByRole('button', { name: 'Confirm rejection', exact: true }).click(); await expect(admin.page.getByTestId('review-item')).toHaveCount(0); await admin.context.close();
  await page.reload(); await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await expect(status(page)).toHaveText('Rejected'); await expect(page.getByText('The photo ID is blurred.', { exact: true })).toBeVisible();
  await field(page, 'About you').fill('Fictional updated bio of a coach with real experience.');
  await attach(page, 'Attach photo ID', { name: 'id-clear.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Save profile', exact: true }).click(); await expect(page.getByTestId('action-feedback')).toContainText('Profile saved.');
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click(); await expect(status(page)).toHaveText('Pending review');
});

test('PV-11 another user cannot reach the documents; links are private and short-lived (browser level)', async ({ page }) => {
  const store = newStore(); store.profiles[ids.coach] = complete('pending'); store.objects.push(...store.profiles[ids.coach].docs.map(d => d.path));
  await open(page, store, 'other');
  await expect(status(page)).toHaveText('Not submitted'); await expect(page.getByText('id.png')).toHaveCount(0); await expect(page.getByRole('heading', { name: 'Review queue', exact: true })).toHaveCount(0);
  const denied = await page.evaluate(async path => (await fetch(`https://fictional.supabase.co/storage/v1/object/sign/provider-documents/${path}`,
    { method: 'POST', body: JSON.stringify({ expiresIn: 300 }), headers: { 'Content-Type': 'application/json' } })).status, store.profiles[ids.coach].docs[0].path);
  expect(denied).toBe(404); expect(store.signed).toHaveLength(0); expect(store.publicRequests).toBe(0);
  // the DATABASE-level proof (owner/admin only, anon and strangers refused) is tests/provider-verification-database.test.ts
});

test('PV-12 a coach has no approve control and a direct decision call is refused; status unchanged (browser level)', async ({ page }) => {
  const store = newStore(); store.profiles[ids.coach] = complete('pending'); store.profiles[ids.coach].docs.forEach(d => store.objects.push(d.path));
  await open(page, store); await expect(status(page)).toHaveText('Pending review');
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
  const result = await page.evaluate(async user => (await fetch('https://fictional.supabase.co/rest/v1/rpc/decide_provider_profile',
    { method: 'POST', body: JSON.stringify({ p_user: user, p_decision: 'approve', p_reason: null }), headers: { 'Content-Type': 'application/json' } })).status, ids.coach);
  expect(result).toBe(403); expect(store.profiles[ids.coach].status).toBe('pending'); expect(store.decisions).toHaveLength(0);
  const admin = await device(page.context().browser()!, store, 'admin');
  await admin.page.getByTestId('review-item').first().getByRole('button', { name: 'Approve', exact: true }).click(); await expect(admin.page.getByTestId('review-item')).toHaveCount(0);
  expect(store.decisions).toEqual([{ user: ids.coach, decision: 'approve', reason: null, by: ids.admin, at: store.now }]); // who and when
  await admin.context.close();
});
