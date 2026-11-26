// Independent QA probes (Quinn, exploratory) — NOT part of the locked contract.
// Each test checks a risk the existing suite does not cover. Results feed the QA workbook.
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { backend, login } from '../../e2e/support/backend';

const heading = (p: Page) => p.getByRole('heading', { name: 'Needs you', exact: true });
const item = (p: Page) => p.getByRole('button', { name: /\d+ (child needs|children need) feedback/ });

async function coach(page: Page, readyClass = true) { await backend(page, { academy: true, readyClass }); await login(page); }

// Delay or break one REST table in the fictional backend.
async function tamper(page: Page, path: string, mode: 'delay' | 'fail', ms = 4000) {
  await page.addInitScript(({ path, mode, ms }) => {
    const wrap = () => {
      const inner = window.fetch;
      window.fetch = async (input, init) => {
        const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (new URL(raw, location.origin).pathname.endsWith(path)) {
          if (mode === 'fail') return new Response(JSON.stringify({ message: 'probe failure' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
          await new Promise<void>(resolve => { setTimeout(resolve, ms); });
        }
        return inner(input, init);
      };
    };
    // Registered after backend(), so this wraps the fictional backend's fetch.
    wrap();
  }, { path, mode, ms });
}

test('QA-NY-LOAD Needs you never claims "All caught up" while data is still loading', async ({ page }) => {
  await backend(page, { academy: true, readyClass: true });
  await tamper(page, '/observations', 'delay', 5000);
  await login(page);
  await expect(heading(page)).toBeVisible();
  // One child has no feedback, so the honest end state is "1 child needs feedback".
  await expect(page.getByText('All caught up', { exact: true })).toHaveCount(0, { timeout: 1500 });
  await expect(item(page)).toContainText('1 child needs feedback', { timeout: 15000 });
});

test('QA-NY-ERR Needs you never claims "All caught up" when loading fails', async ({ page }) => {
  await backend(page, { academy: true, readyClass: true });
  await tamper(page, '/observation_recipients', 'fail');
  await login(page);
  await expect(heading(page)).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.getByText('All caught up', { exact: true })).toHaveCount(0);
});

test('QA-NY-PRIV Today does not download private feedback note text just to count', async ({ page }) => {
  await backend(page, { academy: true, readyClass: true });
  // The fixture answers inside the page, so record request URLs at the fetch layer (not the network).
  await page.addInitScript(() => {
    const inner = window.fetch; (window as any).__urls = [];
    window.fetch = (input, init) => { const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      (window as any).__urls.push(decodeURIComponent(raw)); return inner(input, init); };
  });
  await login(page);
  await expect(heading(page)).toBeVisible();
  await page.waitForTimeout(1500);
  const urls: string[] = await page.evaluate(() => (window as any).__urls);
  const obs = urls.filter(u => u.includes('/observations'));
  expect(obs.length, 'Today must query observations at all (probe sanity)').toBeGreaterThan(0);
  const withNote = obs.filter(u => /select=[^&]*\bnote\b/.test(u));
  expect(withNote, `queries selecting note: ${withNote.join(' | ')}`).toHaveLength(0);
});

test('QA-NY-FONT Needs you text uses the app font (Bricolage) like the rest of Today', async ({ page }) => {
  await coach(page);
  await expect(item(page)).toBeVisible();
  const font = await item(page).getByText(/needs? feedback/).evaluate(el => getComputedStyle(el).fontFamily);
  const ref = await heading(page).evaluate(el => getComputedStyle(el).fontFamily);
  expect(font).toBe(ref);
});

test('QA-NY-KBD the feedback item is reachable and operable with the keyboard', async ({ page }) => {
  await coach(page);
  await expect(item(page)).toBeVisible();
  await item(page).focus();
  await expect(item(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Feedback for parents', exact: true })).toBeVisible();
});

test('QA-NY-320 Needs you fits a 320px phone without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await coach(page);
  await expect(item(page)).toBeVisible();
  const box = await item(page).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('QA-NY-SCALE 600 students are all counted (no silent truncation)', async ({ page }) => {
  await coach(page);
  await page.evaluate(() => {
    const r = window.__coachFixture.roster;
    for (let i = 0; i < 600; i++) {
      const id = `20000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
      r.students.push({ id, name: `Fictional Child ${i}`, age_years: 7, archived_at: null });
      r.enrolments.push({ id: `e-${id}`, student_id: id, batch_id: r.batches[0].id, starts_on: '2020-01-01', ends_on: null });
    }
  });
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(item(page)).toContainText('601 children need feedback', { timeout: 15000 });
});

test('QA-NY-SWITCH Needs you is not shown in the Parent workspace (role isolation)', async ({ page }) => {
  await coach(page);
  await expect(heading(page)).toBeVisible();
  await page.goto('/parent');
  await page.waitForTimeout(2500);
  await expect(heading(page)).toHaveCount(0);
});

for (const [name, setup] of [
  ['Coach Today', async (p: Page) => { await coach(p); await expect(item(p)).toBeVisible(); }],
  ['Coach Students', async (p: Page) => { await coach(p); await p.getByRole('tab', { name: 'Students', exact: true }).click(); await p.waitForTimeout(1500); }],
  ['Coach Schedule', async (p: Page) => { await coach(p); await p.getByRole('tab', { name: 'Schedule', exact: true }).click(); await p.waitForTimeout(1500); }],
  ['Coach Feedback', async (p: Page) => { await coach(p); await p.getByRole('tab', { name: 'Feedback', exact: true }).click(); await p.waitForTimeout(1500); }],
  ['Coach Fees', async (p: Page) => { await coach(p); await p.getByRole('tab', { name: 'Fees', exact: true }).click(); await p.waitForTimeout(1500); }],
  ['Sign in', async (p: Page) => { await backend(p, {}); await p.goto('/'); await p.waitForTimeout(1500); }],
] as const) {
  test(`QA-A11Y ${name} has no serious or critical WCAG 2.1 AA violations (axe)`, async ({ page }, info) => {
    await setup(page);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const bad = result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    await info.attach('axe.json', { body: JSON.stringify(bad.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes[0]?.target })), null, 1), contentType: 'application/json' });
    expect(bad.map(v => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.help}`)).toEqual([]);
  });
}

test('QA-PERF Coach Today becomes usable within 5 s of sign-in on the local build', async ({ page }) => {
  await backend(page, { academy: true, readyClass: true });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email address' }).fill('coach@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fictional-password');
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(item(page)).toBeVisible({ timeout: 20000 });
  const ms = Date.now() - t0;
  test.info().annotations.push({ type: 'ms', description: String(ms) });
  expect(ms).toBeLessThan(5000);
});

test('QA-SEC-XSS student names with HTML/script are shown as text, never executed', async ({ page }) => {
  let dialog = false; page.on('dialog', d => { dialog = true; void d.dismiss(); });
  await coach(page);
  await page.evaluate(() => {
    const r = window.__coachFixture.roster;
    r.students[0].name = '<img src=x onerror=alert(1)>Ria';
  });
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /Refresh roster/ }).click().catch(() => undefined);
  await page.waitForTimeout(1500);
  expect(dialog).toBe(false);
  expect(await page.locator('img[src="x"]').count()).toBe(0);
});
