// QA lab — headless browser journeys driven by generated personas.
// Each persona walks the REAL screens from first sign-in. Every step is a named Playwright step
// with a screenshot, and every screen is checked against the product documents (PRD / contract)
// for its purpose, expected content and honest states. IDs map to testing/qa-scenarios.csv.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from '../../e2e/support/backend';
// @ts-ignore — shared deterministic generator
import { generate } from './personas.mjs';

const data: any = generate();
const coachesByArchetype = (k: string) => data.academies.filter((a: any) => a.archetype === k);

async function shot(page: Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
}
// "Screen relevance" check: the screen shows its documented purpose and no fake numbers.
async function screenMatchesDocs(page: Page, spec: { heading: RegExp | string; must?: (string | RegExp)[]; mustNot?: (string | RegExp)[] }) {
  await expect(page.getByRole('heading', { name: spec.heading }).first()).toBeVisible();
  for (const m of spec.must ?? []) await expect(page.getByText(m).first()).toBeVisible();
  for (const m of spec.mustNot ?? []) await expect(page.getByText(m)).toHaveCount(0);
}

test.describe('QA-LAB-UI coach onboarding journeys (persona-driven)', () => {
  for (const archetype of ['solo-tutor', 'small-academy', 'edge-data']) {
    const a = coachesByArchetype(archetype)[0];
    test(`QA-LAB-UI-01 ${archetype}: brand-new coach onboards, creates batches and students, and Today stays honest`, async ({ page }) => {
      test.setTimeout(180000);
      const owner: any = data.users.find((u: any) => u.id === a.owner);
      await test.step('1. Sign in as a brand-new coach → onboarding screen (PRD C1: provider onboarding)', async () => {
        await backend(page, {});
        await login(page);
        await screenMatchesDocs(page, { heading: 'Your academy, your way.', must: ['Starting with INR and Asia/Kolkata.'] });
        await shot(page, '01-onboarding');
      });
      await test.step('2. Validation: empty form is refused with a clear message (no silent failure)', async () => {
        await page.getByRole('button', { name: 'Create my workspace' }).click();
        await expect(page.getByRole('alert')).toContainText('Enter your name');
      });
      await test.step(`3. Create the academy "${a.name}"`, async () => {
        await page.getByLabel('Your name', { exact: true }).fill(owner.name);
        await page.getByLabel('Academy name', { exact: true }).fill(a.name);
        await page.getByRole('button', { name: 'Create my workspace' }).click();
        await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
        await shot(page, '03-today-empty');
      });
      await test.step('4. Today on an empty academy: Needs you is honest and no fake metrics are shown (PRD P2/C4: "no hard-coded values")', async () => {
        await expect(page.getByRole('heading', { name: 'Needs you', exact: true })).toBeVisible();
        await expect(page.getByText('All caught up', { exact: true })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/91%|86%|Parents engaged/)).toHaveCount(0); // prototype sample numbers must never appear
      });
      for (const [i, b] of a.batches.slice(0, 2).entries()) {
        await test.step(`5.${i + 1} Create batch "${b.name}" from Students → Batches`, async () => {
          await page.getByRole('tab', { name: 'Students', exact: true }).click();
          await page.getByRole('button', { name: 'Batches', exact: true }).click();
          await page.getByRole('button', { name: 'Create a batch', exact: true }).click();
          await page.getByRole('textbox', { name: 'Batch name', exact: true }).fill(b.name);
          await page.getByRole('button', { name: 'Save batch', exact: true }).click();
          await expect(page.getByRole('status')).toContainText('Batch saved');
        });
      }
      const active = a.students.filter((s: any) => s.batches.length).slice(0, 4);
      for (const [i, s] of active.entries()) {
        await test.step(`6.${i + 1} Add student "${s.name}" (${s.status}) and enrol`, async () => {
          await page.getByRole('tab', { name: 'Students', exact: true }).click();
          await page.getByRole('button', { name: 'Students', exact: true }).click().catch(() => undefined);
          await page.getByRole('button', { name: 'Add a student', exact: true }).click();
          await page.getByRole('textbox', { name: 'Student name', exact: true }).fill(s.name.slice(0, 100));
          await page.getByRole('textbox', { name: 'Age (optional)' }).fill(String(s.age));
          const box = page.getByRole('checkbox').first();
          if (await box.count()) await box.check();
          await page.getByRole('button', { name: 'Save student', exact: true }).click();
          await expect(page.getByRole('status')).toContainText(/saved/i);
          // Persona names with HTML or emoji must render as plain text
          await expect(page.getByText(s.name.slice(0, 100), { exact: true }).first()).toBeVisible();
        });
      }
      await test.step('7. Back on Today, Needs you counts exactly the enrolled students without recent feedback (contract AC-02/03)', async () => {
        await page.getByRole('tab', { name: 'Today', exact: true }).click();
        const n = active.length;
        const label = n === 1 ? '1 child needs feedback' : `${n} children need feedback`;
        await expect(page.getByRole('button', { name: label })).toBeVisible({ timeout: 15000 });
        await shot(page, '07-today-needs-you');
      });
      await test.step('8. Tap the item → Feedback for parents (AC-09) and the screen explains its purpose', async () => {
        await page.getByRole('button', { name: /needs? feedback/ }).click();
        await screenMatchesDocs(page, { heading: 'Feedback for parents', must: [/review and share it to the Parent app or WhatsApp/] });
        await shot(page, '08-feedback');
      });
      await test.step('9. Everything the coach entered reached the backend exactly once (no duplicates, no losses)', async () => {
        const saved = await page.evaluate(() => ({ students: window.__coachFixture.roster.students.length, batches: window.__coachFixture.roster.batches.length }));
        expect(saved).toEqual({ students: active.length, batches: Math.min(a.batches.length, 2) });
        // NOTE (harness limit H-01): the in-browser test backend does not persist a newly created academy across reload,
        // so reload-after-onboarding is proven at database level instead (QA-LAB-DB-02) and by e2e/auth.spec.ts.
      });
    });
  }
});

test.describe('QA-LAB-UI screen relevance sweep (every Coach tab vs documentation)', () => {
  test('QA-LAB-UI-02 every Coach tab shows its documented purpose, a real heading and no prototype sample data', async ({ page }) => {
    await backend(page, { academy: true, readyClass: true });
    await login(page);
    const tabs: [string, RegExp | string, (string | RegExp)[]][] = [
      ['Today', /Good (morning|afternoon|evening)/, ['Needs you', 'Your teaching workspace']],
      ['Schedule', /Class/i, []],
      ['Feedback', 'Feedback for parents', ['Write feedback']],
      ['Students', /Students|Roster/i, ['Add a student']],
      ['Fees', 'Fees overview', []],
    ];
    for (const [tab, heading, must] of tabs) {
      await test.step(`${tab}: heading + purpose + no fake data`, async () => {
        await page.getByRole('tab', { name: tab, exact: true }).click();
        await screenMatchesDocs(page, { heading, must, mustNot: [/91%|86%|Parents engaged|Meera|PP-F\d\d/] });
        await shot(page, `tab-${tab}`);
      });
    }
  });
});
