// Browser tests for docs/product/parent-quick-signals/ACCEPTANCE.md (QS-01..06, 09). All data fictional; the three signal
// functions are simulated in Node per test. Database rules (QS-10..12) are tested in tests/parent-quick-signals-candidate.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { parentBackend } from './support/parentBackend';

async function loginParent(page:Page){await page.goto('/parent');await expect(page.getByText('YOUR FAMILY WORKSPACE',{exact:true})).toBeVisible();await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');await page.getByLabel('Password',{exact:true}).fill('FictionalParentPassword123');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByLabel('Your parent name',{exact:true})).toBeVisible();}
async function family(page:Page){await page.getByLabel('Your parent name',{exact:true}).fill('Fictional Parent');await page.getByLabel('Family name',{exact:true}).fill('Fictional Family');await page.getByRole('button',{name:'Create my family workspace',exact:true}).click();await page.getByRole('button',{name:'Add my first child',exact:true}).click();await page.getByLabel('Child name',{exact:true}).fill('Fictional Family Ria');await page.getByLabel('Birth date (optional)',{exact:true}).fill('2018-04-12');await page.getByRole('button',{name:'Save child',exact:true}).click();await expect(page.getByRole('tab',{name:'Choose child Fictional Family Ria',exact:true})).toBeVisible();}

type Fixture = { classToday: boolean; kind: string | null; sends: string[]; fails: number };
// The three signal functions are simulated inside the page by e2e/support/parentBackend.ts; this sets the starting state.
async function signalServer(page: Page, options: { classToday: boolean; failSends?: number }) {
  await page.addInitScript(o => { (window as any).__signalFixture = JSON.parse(sessionStorage.getItem('__sig') ?? 'null') ?? { classToday: o.classToday, kind: null, changed_at: null, sends: [], fails: o.failSends ?? 0 }; }, options);
  return { sends: () => page.evaluate(() => ((window as any).__signalFixture as Fixture).sends) };
}
const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('QS-01/03/04/05/06 parent sends, changes, undoes and sees the signal after reload', async ({ page }) => {
  await parentBackend(page); const server = await signalServer(page, { classToday: true });
  await loginParent(page); await family(page);
  for (const name of ['Running late', 'Missing today', 'Dropped off']) await expect(btn(page, name)).toBeVisible();
  await btn(page, 'Running late').click();
  await expect(page.getByText(/Running late · sent to coach/)).toBeVisible();
  await btn(page, 'Missing today').click();
  await expect(page.getByText(/Missing today · sent to coach/)).toBeVisible();
  expect(await server.sends()).toEqual(['running_late', 'missing_today']);
  await page.reload(); await page.getByRole('tab', { name: 'Parent Home', exact: true }).click();
  await expect(page.getByText(/Missing today · sent to coach/)).toBeVisible();
  await btn(page, 'Undo').click();
  await expect(page.getByText('Tell your coach in one tap.')).toBeVisible();
});

test('QS-02 no class today shows a note and no buttons', async ({ page }) => {
  await parentBackend(page); await signalServer(page, { classToday: false });
  await loginParent(page); await family(page);
  await expect(page.getByText('No class today', { exact: true })).toBeVisible();
  await expect(btn(page, 'Running late')).toHaveCount(0);
});

test('QS-09 a failed send shows a retry message, is not marked sent, and retry creates one signal', async ({ page }) => {
  await parentBackend(page); const server = await signalServer(page, { classToday: true, failSends: 1 });
  await loginParent(page); await family(page);
  await btn(page, 'Dropped off').click();
  await expect(page.getByText(/sent to coach/)).toHaveCount(0);
  await expect(page.getByRole('alert').or(page.getByText(/try again/i)).first()).toBeVisible();
  await btn(page, 'Dropped off').click();
  await expect(page.getByText(/Dropped off · sent to coach/)).toBeVisible();
  expect(await server.sends()).toEqual(['dropped_off']);
});
