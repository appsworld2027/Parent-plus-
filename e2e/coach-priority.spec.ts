import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';

test('Today creates a no-fee batch and schedules a class directly from its roster', async ({ page }, info) => {
  await backend(page, { academy: true }); await login(page);
  await page.getByRole('button', { name: 'Create a batch', exact: true }).click();
  await page.getByLabel('Batch name', { exact: true }).fill('Fictional Beginners');
  await page.getByLabel('Room or location', { exact: true }).fill('Art room');
  await page.getByRole('button', { name: 'Save batch', exact: true }).click();
  await page.getByRole('button', { name: 'Schedule a class for this batch', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Class batch', exact: true })).toHaveValue(await page.evaluate(() => window.__coachFixture.roster.batches[0].id));
  await expect(page.getByLabel('Class room or location', { exact: true })).toHaveValue('Art room');
  await expect(page.getByLabel('End date (YYYY-MM-DD)', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Class status scheduled', exact: true })).toHaveCount(0);
  const date = await page.getByLabel('Start date (YYYY-MM-DD)', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Save class', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Class saved');
  expect(await page.evaluate(() => window.__coachFixture.roster.batches[0].monthly_fee_paise)).toBe(0);
  await page.reload();
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByLabel('Class date (YYYY-MM-DD)', { exact: true }).fill(date);
  await page.getByRole('button', { name: 'Show date', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit class Fictional Beginners at 16:00', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('simple-class.png'), fullPage: true });
});

test('empty schedule creates a batch inline without leaving or losing the class date', async ({ page }) => {
  await backend(page, { academy: true }); await login(page);
  await page.getByRole('button', { name: 'Schedule a class', exact: true }).click();
  await page.getByLabel('Start date (YYYY-MM-DD)', { exact: true }).fill('2027-01-14');
  await page.getByRole('button', { name: 'Create a batch here', exact: true }).click();
  await page.getByLabel('New teaching batch name', { exact: true }).fill('Fictional New Batch');
  await page.getByRole('button', { name: 'Create batch and use for class', exact: true }).click();
  await expect(page.getByLabel('Start date (YYYY-MM-DD)', { exact: true })).toHaveValue('2027-01-14');
  await page.getByRole('button', { name: 'Save class', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Class saved');
  await expect(page.getByRole('button', { name: 'Edit class Fictional New Batch at 16:00', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__coachFixture.classes[0].ends_at.slice(0, 10))).toBe('2027-01-14');
});

test('Today opens the real class directly and saved attendance prepares reviewed feedback for present students', async ({page}) => {
  await backend(page,{academy:true,readyClass:true});await login(page);
  await page.getByRole('button',{name:'Open attendance for Fictional Clay Class at 16:00',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Class attendance',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Mark all present',exact:true}).click();
  await page.getByRole('button',{name:'Save attendance to class',exact:true}).click();
  const feedback=page.getByRole('button',{name:'Write feedback for this class',exact:true});
  await expect(feedback).toBeEnabled();await feedback.click();
  await expect(page.getByRole('heading',{name:'Feedback for parents',exact:true})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Linked class (optional)',exact:true})).toHaveValue(await page.evaluate(()=>window.__coachFixture.classes[0].id));
  await expect(page.getByText('Selected students: 1',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.__coachFixture.observations.length)).toBe(0);
});

async function recordedFeedback(page: Page) {
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.evaluate(() => {
    const state = window.__coachFixture;
    state.roster.contacts.push({ student_id: state.roster.students[0].id, name: 'Fictional Parent', email: null, phone: '+919876543210' });
    state.roster.students.push({ id: '00000000-0000-0000-0000-000000000099', name: 'Unrelated Child', age_years: 8, archived_at: null });
    state.roster.contacts.push({ student_id: '00000000-0000-0000-0000-000000000099', name: 'Unrelated Parent', email: null, phone: '+919999999999' });
  });
  await page.getByRole('button', { name: 'Write feedback for parents', exact: true }).click();
  await page.getByRole('button', { name: 'Write feedback', exact: true }).click();
  await page.getByRole('combobox',{name:'Feedback batch',exact:true}).selectOption(await page.evaluate(()=>window.__coachFixture.roster.batches[0].id));
  await page.getByRole('combobox',{name:'Student for this feedback',exact:true}).selectOption(await page.evaluate(()=>window.__coachFixture.roster.students[0].id));
  await page.getByLabel('Observation text', { exact: true }).fill('Excellent work on the clay bowl. Practise shaping at home.');
  await page.getByRole('button', { name: 'Save feedback', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review WhatsApp message', exact: true })).toBeEnabled();
}

test('saved feedback previews only the intended parent and requires confirmation before WhatsApp', async ({ page }, info) => {
  await recordedFeedback(page);
  await page.getByRole('button', { name: 'Review WhatsApp message', exact: true }).click();
  const parents = page.getByRole('combobox', { name: 'Parent for this feedback', exact: true });
  await expect(parents.locator('option')).toHaveCount(1);
  await expect(parents).toContainText('Fictional Ria — Fictional Parent');
  await expect(page.getByLabel('Parent feedback message preview', { exact: true })).toHaveValue(/Feedback for Fictional Ria/);
  await expect(page.getByRole('link', { name: 'Open WhatsApp to review and send', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'I checked the parent number and message', exact: true }).click();
  const link = page.getByRole('link', { name: 'Open WhatsApp to review and send', exact: true });
  await expect(link).toHaveAttribute('href', /^https:\/\/wa.me\/919876543210\?text=/);
  await page.screenshot({ path: info.outputPath('whatsapp-review.png'), fullPage: true });
  await page.getByLabel('Parent feedback message preview', { exact: true }).fill('Edited feedback for this parent only.');
  await expect(link).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'I checked the parent number and message', exact: true }).click();
  expect(new URL((await link.getAttribute('href'))!).searchParams.get('text')).toBe('Edited feedback for this parent only.');
  expect(await page.evaluate(() => window.__coachFixture.calls.some(value => /wa.me|whatsapp|notification/.test(value)))).toBe(false);
});

test('unsaved feedback changes block sharing and local numbers cannot silently select a country', async ({ page }) => {
  await recordedFeedback(page);
  await page.getByRole('button', { name: 'Review WhatsApp message', exact: true }).click();
  await page.getByLabel('WhatsApp parent number with country code', { exact: true }).fill('9876543210');
  await page.getByRole('checkbox', { name: 'I checked the parent number and message', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open WhatsApp to review and send', exact: true })).toHaveCount(0);
  await page.getByLabel('Observation text', { exact: true }).fill('Unrecorded private change.');
  await expect(page.getByRole('button', { name: 'Review WhatsApp message', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Parent feedback message preview', { exact: true })).toHaveCount(0);
});
