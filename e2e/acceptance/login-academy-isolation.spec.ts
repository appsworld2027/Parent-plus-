// LOCKED acceptance tests for docs/product/login-academy-isolation/ACCEPTANCE.md (AI Org AGENTS.md §7A).
// Written by Quinn (QA) from the approved contract. Only an `ai:contract` PR may change this file;
// a build PR must make these pass WITHOUT editing, skipping or deleting them (contract-lock enforces it).
//
// Browser scope: AI-01..AI-04 (the screen). The database side of AI-03 and AI-05..AI-11 is in
// tests/login-academy-isolation-database.test.ts (disposable in-process PGlite database).
//
// Simulation notes (all fictional, no request leaves the browser):
// - ../support/backend answers every Supabase request. `academyServer` wraps it and keeps one stored
//   academy per page, so the screen shows the name the "database" stored, records every create_academy
//   payload, and can fail the next save with a server error (AI-04).
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from '../support/backend';

const SETUP = 'Your academy, your way.';
const M15 = 'Your academy could not be saved. Your entries are still here; try again.';
const CREATE = 'Create my workspace';

type Created = { academy_name: string; owner_name: string };
declare global {
  interface Window { __ai: { stored: null | { id: string; name: string; timezone: string; currency: string }; creates: Created[]; failNext: boolean } }
}

async function academyServer(page: Page) {
  await backend(page);
  // Registered after backend(), so this wrapper sees requests first and passes the rest through.
  await page.addInitScript(() => {
    window.__ai = { stored: null, creates: [], failNext: false };
    const inner = window.fetch;
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status,
      headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } });
    window.fetch = async (input, init) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, window.location.origin);
      if (url.hostname.endsWith('.supabase.co')) {
        if (url.pathname.endsWith('/rpc/create_academy')) {
          const body = JSON.parse(String(init?.body ?? '{}')) as Created;
          window.__ai.creates.push(body);
          if (window.__ai.failNext) { window.__ai.failNext = false; return json({ message: 'Internal private database text' }, 500); }
          window.__ai.stored ??= { id: 'academy-fictional-ai', name: body.academy_name.trim(), timezone: 'Asia/Kolkata', currency: 'INR' };
          return json(window.__ai.stored);
        }
        if (url.pathname.endsWith('/rest/v1/academies')) return json(window.__ai.stored ? [window.__ai.stored] : []);
      }
      return inner(input, init);
    };
  });
}
async function openSetup(page: Page) {
  await academyServer(page);
  await login(page);
  await expect(page.getByRole('heading', { name: SETUP })).toBeVisible();
}
async function fill(page: Page, owner: string, academy: string) {
  await page.getByRole('textbox', { name: 'Your name' }).fill(owner);
  await page.getByRole('textbox', { name: 'Academy name' }).fill(academy);
}
const creates = (page: Page) => page.evaluate(() => window.__ai.creates);

test('AI-01 a verified coach with no academy sees the academy setup screen on first sign-in', async ({ page }) => {
  await openSetup(page);
  await expect(page.getByRole('textbox', { name: 'Your name' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Academy name' })).toBeVisible();
  await expect(page.getByRole('button', { name: CREATE })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
});

test('AI-02 creating the workspace opens an empty Today with the academy name, Asia/Kolkata and INR', async ({ page }) => {
  await openSetup(page);
  await expect(page.getByText(/INR/)).toBeVisible();
  await expect(page.getByText(/Asia\/Kolkata/)).toBeVisible();
  await fill(page, 'Fictional Coach', 'Fictional Clay Studio');
  await page.getByRole('button', { name: CREATE }).click();
  await expect(page.getByRole('heading', { name: SETUP })).toHaveCount(0);
  await expect(page.getByText('Fictional Clay Studio', { exact: true })).toBeVisible();
  const today = page.getByRole('tab', { name: 'Today', exact: true });
  await expect(today).toBeVisible();
  await expect(today).toHaveAttribute('aria-selected', 'true');
  // Empty: the new academy has no students or classes yet, and no fixture records leak in.
  await expect(page.getByText('Fictional Ria', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Fictional Test Academy', { exact: true })).toHaveCount(0);
  expect(await creates(page)).toEqual([{ academy_name: 'Fictional Clay Studio', owner_name: 'Fictional Coach' }]);
  expect(await page.evaluate(() => window.__ai.stored)).toMatchObject({ timezone: 'Asia/Kolkata', currency: 'INR' });
});

test('AI-03 the app accepts 1 and 100 characters', async ({ page }) => {
  await openSetup(page);
  const hundred = 'F'.repeat(100);
  await fill(page, 'C', hundred);
  await page.getByRole('button', { name: CREATE }).click();
  await expect(page.getByText(hundred, { exact: true })).toBeVisible();
  expect(await creates(page)).toEqual([{ academy_name: hundred, owner_name: 'C' }]);
});

test('AI-03 the app accepts a one-character academy name and a 100-character owner name', async ({ page }) => {
  await openSetup(page);
  await fill(page, 'O'.repeat(100), 'A');
  await page.getByRole('button', { name: CREATE }).click();
  await expect(page.getByRole('heading', { name: SETUP })).toHaveCount(0);
  expect(await creates(page)).toEqual([{ academy_name: 'A', owner_name: 'O'.repeat(100) }]);
});

test('AI-03 the app refuses spaces-only names without calling the database', async ({ page }) => {
  await openSetup(page);
  for (const [owner, academy] of [['   ', 'Fictional Academy'], ['Fictional Coach', '    ']]) {
    await fill(page, owner, academy);
    await page.getByRole('button', { name: CREATE }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('heading', { name: SETUP })).toBeVisible();
  }
  expect(await creates(page)).toEqual([]);
});

test('AI-03 the app refuses a 101-character academy or owner name without calling the database', async ({ page }) => {
  await openSetup(page);
  for (const [owner, academy] of [['Fictional Coach', 'x'.repeat(101)], ['y'.repeat(101), 'Fictional Academy']]) {
    await fill(page, owner, academy);
    // Refused either way: the field cannot hold 101 characters, or submitting shows an error and saves nothing.
    const kept = [await page.getByRole('textbox', { name: 'Your name' }).inputValue(), await page.getByRole('textbox', { name: 'Academy name' }).inputValue()];
    if (kept.every(value => value.length <= 100)) continue;
    await page.getByRole('button', { name: CREATE }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('heading', { name: SETUP })).toBeVisible();
  }
  expect(await creates(page)).toEqual([]);
  await expect(page.getByRole('heading', { name: SETUP })).toBeVisible();
});

test('AI-04 a failed save shows M15, keeps the entries and leaves Sign out available', async ({ page }) => {
  await openSetup(page);
  await fill(page, 'Fictional Coach', 'Fictional Retry Studio');
  await page.evaluate(() => { window.__ai.failNext = true; });
  await page.getByRole('button', { name: CREATE }).click();
  await expect(page.getByRole('alert')).toContainText(M15);
  await expect(page.getByRole('alert')).not.toContainText('private database');
  await expect(page.getByRole('heading', { name: SETUP })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your name' })).toHaveValue('Fictional Coach');
  await expect(page.getByRole('textbox', { name: 'Academy name' })).toHaveValue('Fictional Retry Studio');
  const signOut = page.getByRole('button', { name: 'Sign out', exact: true });
  await expect(signOut).toBeVisible();
  await expect(signOut).toBeEnabled();
  await expect(page.getByRole('button', { name: CREATE })).toBeEnabled();
  await signOut.click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  expect(await page.evaluate(() => window.__ai.stored)).toBeNull();
});

test('AI-04 after a failed save the coach can retry with the kept entries and reach Today', async ({ page }) => {
  await openSetup(page);
  await fill(page, 'Fictional Coach', 'Fictional Retry Studio');
  await page.evaluate(() => { window.__ai.failNext = true; });
  await page.getByRole('button', { name: CREATE }).click();
  await expect(page.getByRole('alert')).toContainText(M15);
  await page.getByRole('button', { name: CREATE }).click();
  await expect(page.getByText('Fictional Retry Studio', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toBeVisible();
  expect((await creates(page)).map(c => c.academy_name)).toEqual(['Fictional Retry Studio', 'Fictional Retry Studio']);
});
