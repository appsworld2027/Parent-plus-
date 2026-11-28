// Browser tests for docs/product/parent-reactions/ACCEPTANCE.md (PR-01..04, 06). All data fictional; the two reaction functions are simulated in the page. Database rules: tests/parent-reactions-candidate.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { parentBackend } from './support/parentBackend';

async function loginParent(page: Page) { await page.goto('/parent'); await expect(page.getByText('YOUR FAMILY WORKSPACE', { exact: true })).toBeVisible(); await page.getByLabel('Email address', { exact: true }).fill('coach@example.test'); await page.getByLabel('Password', { exact: true }).fill('FictionalParentPassword123'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page.getByLabel('Your parent name', { exact: true })).toBeVisible(); }
async function family(page: Page) { await page.getByLabel('Your parent name', { exact: true }).fill('Fictional Parent'); await page.getByLabel('Family name', { exact: true }).fill('Fictional Family'); await page.getByRole('button', { name: 'Create my family workspace', exact: true }).click(); await page.getByRole('button', { name: 'Add my first child', exact: true }).click(); await page.getByLabel('Child name', { exact: true }).fill('Fictional Family Ria'); await page.getByLabel('Birth date (optional)', { exact: true }).fill('2018-04-12'); await page.getByRole('button', { name: 'Save child', exact: true }).click(); await expect(page.getByRole('tab', { name: 'Choose child Fictional Family Ria', exact: true })).toBeVisible(); }

async function setup(page: Page, failSends = 0) {
  await parentBackend(page);
  await page.addInitScript(fails => {
    const fx = (window as any).__reactionFixture = JSON.parse(sessionStorage.getItem('__rx') ?? 'null') ?? { current: null, sends: [] as string[], fails };
    const save = () => sessionStorage.setItem('__rx', JSON.stringify(fx));
    const original = window.fetch.bind(window);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    window.fetch = async (input, init) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (raw.includes('/parent_feedback_feed')) {
        const kids = (JSON.parse(sessionStorage.getItem('__fictional_parent') ?? '{}').children ?? []) as { id: string }[];
        const d = '2026-11-20T10:00:00Z';
        return json(kids.length ? [{ id: 'h1', child_id: kids[0].id, reviewed_at: d, snapshot: { schema_version: 1, note: 'Fictional update', academy_name: 'Fictional Academy', student_name: 'Fictional Ria', recorded_at: d, session_id: null, media_ids: [] } }] : []);
      }
      if (raw.includes('/feedback_reactions')) return json(fx.current ? [{ reaction: fx.current }] : []);
      if (raw.includes('/rpc/react_to_feedback')) { if (fx.fails > 0) { fx.fails--; save(); return json({ code: '500' }, 500); } const p = JSON.parse(String(init?.body)); fx.current = p.reaction_kind; fx.sends.push(p.reaction_kind); save(); return json(null, 200); }
      if (raw.includes('/rpc/remove_feedback_reaction')) { fx.current = null; save(); return json(null, 200); }
      return original(input, init);
    };
  }, failSends);
  await loginParent(page); await family(page);
  await page.reload(); await expect(page.getByText('Fictional update', { exact: true })).toBeVisible();
}
const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('PR-01/02/03/04 parent reacts, changes it, sees it after reload, and undoes it', async ({ page }) => {
  await setup(page);
  for (const n of ['Thank you', 'Helpful', 'We will try this']) await expect(btn(page, n)).toBeVisible();
  await btn(page, 'Thank you').click();
  await expect(page.getByText('Thank you · sent to coach', { exact: true })).toBeVisible();
  await btn(page, 'Helpful').click();
  await expect(page.getByText('Helpful · sent to coach', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__reactionFixture.sends)).toEqual(['thanks', 'helpful']);
  await page.reload(); await expect(page.getByText('Helpful · sent to coach', { exact: true })).toBeVisible();
  await btn(page, 'Undo reaction').click();
  await expect(page.getByText('Let your coach know:', { exact: true })).toBeVisible();
});

test('PR-06 a failed send shows a retry message and is not marked sent; retry works', async ({ page }) => {
  await setup(page, 1);
  await btn(page, 'Helpful').click();
  await expect(page.getByText('Your reaction could not be sent. Please try again.')).toBeVisible();
  await expect(page.getByText(/sent to coach/)).toHaveCount(0);
  await btn(page, 'Helpful').click();
  await expect(page.getByText('Helpful · sent to coach', { exact: true })).toBeVisible();
});
