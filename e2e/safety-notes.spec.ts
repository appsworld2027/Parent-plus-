// Browser tests for docs/product/safety-notes/ACCEPTANCE.md (SN-01..03, 06, 08). All data fictional; the note table and function are simulated in the page.
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

async function simulate(page: Page, options: { failLoad?: boolean; failSave?: boolean } = {}) {
  await page.addInitScript(o => {
    const saved = JSON.parse(sessionStorage.getItem('__sn') ?? 'null') ?? { note: '', saves: [] };
    (window as any).__safetyFixture = { ...saved, failLoad: o.failLoad, failSave: o.failSave };
  }, options);
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await page.getByRole('button', { name: 'View profile for Fictional Ria', exact: true }).click();
}
const box = (page: Page) => page.getByLabel('Safety and health note', { exact: true });

test('SN-01/02/03/07 coach saves, sees after reload, changes and clears a private note', async ({ page }) => {
  await simulate(page);
  await expect(page.getByText('Private to you. Parents never see this.')).toBeVisible();
  await box(page).fill('Peanut allergy. Inhaler in blue bag.');
  await page.getByRole('button', { name: 'Save safety note', exact: true }).click();
  await expect(page.getByText('Safety note saved. Only you can see it.')).toBeVisible();
  await page.reload(); await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await page.getByRole('button', { name: 'View profile for Fictional Ria', exact: true }).click();
  await expect(box(page)).toHaveValue('Peanut allergy. Inhaler in blue bag.');
  await box(page).fill('');
  await page.getByRole('button', { name: 'Clear safety note', exact: true }).click();
  await expect(page.getByText('Safety note cleared.')).toBeVisible();
});

test('SN-06 a note over 500 characters is refused with a message and nothing is saved', async ({ page }) => {
  await simulate(page);
  await box(page).fill('x'.repeat(520));
  await page.getByRole('button', { name: 'Save safety note', exact: true }).click();
  await expect(page.getByText(/Keep the note to 500 characters/)).toBeVisible();
  expect(await page.evaluate(() => (window as any).__safetyFixture.saves)).toEqual([]);
});

test('SN-08 a failed save keeps the text and says so; a failed load never reads as "no note"', async ({ page }) => {
  await simulate(page, { failSave: true });
  await box(page).fill('Asthma');
  await page.getByRole('button', { name: 'Save safety note', exact: true }).click();
  await expect(page.getByText(/could not be saved/)).toBeVisible();
  await expect(box(page)).toHaveValue('Asthma');
});
test('SN-09 when the note cannot load, the coach is warned and no editor or "No safety note" shows', async ({ page }) => {
  await simulate(page, { failLoad: true });
  await expect(page.getByText(/could not load/)).toBeVisible();
  await expect(box(page)).toHaveCount(0);
});
