// Browser tests for docs/product/child-progress-timeline (CT-01..04). Pure rules: tests/progress-timeline.test.ts.
import { expect, test, type Page } from '@playwright/test';
import { parentBackend } from './support/parentBackend';

async function loginParent(page: Page) { await page.goto('/parent'); await expect(page.getByText('YOUR FAMILY WORKSPACE', { exact: true })).toBeVisible(); await page.getByLabel('Email address', { exact: true }).fill('coach@example.test'); await page.getByLabel('Password', { exact: true }).fill('FictionalParentPassword123'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page.getByLabel('Your parent name', { exact: true })).toBeVisible(); }
async function family(page: Page) { await page.getByLabel('Your parent name', { exact: true }).fill('Fictional Parent'); await page.getByLabel('Family name', { exact: true }).fill('Fictional Family'); await page.getByRole('button', { name: 'Create my family workspace', exact: true }).click(); await page.getByRole('button', { name: 'Add my first child', exact: true }).click(); await page.getByLabel('Child name', { exact: true }).fill('Fictional Family Ria'); await page.getByLabel('Birth date (optional)', { exact: true }).fill('2018-04-12'); await page.getByRole('button', { name: 'Save child', exact: true }).click(); await expect(page.getByRole('tab', { name: 'Choose child Fictional Family Ria', exact: true })).toBeVisible(); }
// Replaces only the feedback feed with fictional reviewed updates for the first child; everything else stays on the shared backend fixture.
async function feed(page: Page, dates: string[]) {
  await page.addInitScript(dates => {
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (raw.includes('/parent_feedback_feed')) {
        const kids = (JSON.parse(sessionStorage.getItem('__fictional_parent') ?? '{}').children ?? []) as { id: string }[];
        const rows = kids.length ? dates.map((d, i) => ({ id: `f${i}`, child_id: kids[0].id, reviewed_at: d,
          snapshot: { schema_version: 1, note: `Fictional update ${i + 1}`, academy_name: 'Fictional Academy', student_name: 'Fictional Ria', recorded_at: d, session_id: null, media_ids: [] } })) : [];
        return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return original(input, init);
    };
  }, dates);
}
async function open(page: Page, dates: string[]) {
  await parentBackend(page); await feed(page, dates); await loginParent(page); await family(page);
  await page.reload(); await expect(page.getByRole('tab', { name: 'Choose child Fictional Family Ria', exact: true })).toBeVisible();
}
test('CT-01/02/03 two months, newest first, with a count', async ({ page }) => {
  await open(page, ['2026-10-05T10:00:00Z', '2026-11-02T10:00:00Z', '2026-11-20T10:00:00Z']);
  await expect(page.getByText('3 updates from your coaches', { exact: true })).toBeVisible();
  const headings = page.getByRole('heading', { name: /^(November|October) 2026$/ });
  await expect(headings).toHaveText(['November 2026', 'October 2026']);
  await expect(page.getByText('Fictional update 3', { exact: true })).toBeVisible();
});
test('CT-04 no feedback shows no timeline headings or count', async ({ page }) => {
  await open(page, []);
  await page.waitForTimeout(1500);
  await expect(page.getByText(/updates? from your coaches/)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/ })).toHaveCount(0);
});
