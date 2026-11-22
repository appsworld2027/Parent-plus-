// LOCKED acceptance tests for docs/product/coach-needs-you/ACCEPTANCE.md (AI Org AGENTS.md §7A).
// Written by Quinn (QA) before the feature exists. Only an `ai:contract` PR may change this file;
// a build PR must make these pass WITHOUT editing, skipping or deleting them (contract-lock enforces it).
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from '../support/backend';

const RIA = '00000000-0000-0000-0000-000000000021'; // the fixture's ready-class student
const DAY = 24 * 60 * 60 * 1000;
const heading = (page: Page) => page.getByRole('heading', { name: 'Needs you', exact: true });
const feedbackItem = (page: Page) => page.getByRole('button', { name: /\d+ (child needs|children need) feedback/ });

async function openToday(page: Page, readyClass = true) {
  await backend(page, { academy: true, readyClass });
  await login(page);
  await expect(heading(page)).toBeVisible();
}
// Leave and re-open Today so it loads fresh records after the test changes the fixture.
async function reopenToday(page: Page) {
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(heading(page)).toBeVisible();
}
async function addStudent(page: Page, student: { id: string; name: string; archived?: boolean; ended?: boolean }) {
  await page.evaluate(value => {
    const roster = window.__coachFixture.roster;
    roster.students.push({ id: value.id, name: value.name, age_years: 7, archived_at: value.archived ? '2026-01-01T00:00:00.000Z' : null });
    roster.enrolments.push({ id: `e-${value.id}`, student_id: value.id, batch_id: roster.batches[0].id,
      starts_on: '2020-01-01', ends_on: value.ended ? '2020-06-30' : null });
  }, student);
}
// Uses the real Feedback screen, exactly as a coach would.
async function writeFeedback(page: Page, student: string, kind: 'recorded' | 'draft') {
  await page.getByRole('button', { name: 'Write feedback for parents', exact: true }).click();
  await page.getByRole('button', { name: 'Write feedback', exact: true }).click();
  await page.getByRole('combobox', { name: 'Feedback batch', exact: true })
    .selectOption(await page.evaluate(() => window.__coachFixture.roster.batches[0].id));
  await page.getByRole('combobox', { name: 'Student for this feedback', exact: true }).selectOption(student);
  await page.getByLabel('Observation text', { exact: true }).fill('Fictional note: shaped a clay bowl with care.');
  if (kind === 'recorded') {
    await page.getByRole('button', { name: 'Save feedback', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Review WhatsApp message', exact: true })).toBeEnabled();
  } else {
    await page.getByRole('button', { name: 'Save draft to workspace', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__coachFixture.observations.map(o => o.status).join(','))).toBe('draft');
  }
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(heading(page)).toBeVisible();
}
async function expectAllCaughtUp(page: Page) {
  await expect(page.getByText('All caught up', { exact: true })).toBeVisible();
  await expect(page.getByText('New requests will show here', { exact: true })).toBeVisible();
  await page.waitForTimeout(1500); // must stay caught up after loading settles
  await expect(feedbackItem(page)).toHaveCount(0);
}

test('AC-01 Today shows a "Needs you" heading above "Your teaching workspace"', async ({ page }) => {
  await openToday(page);
  const needs = await heading(page).boundingBox();
  const workspace = await page.getByText('Your teaching workspace', { exact: true }).boundingBox();
  expect(needs).not.toBeNull(); expect(workspace).not.toBeNull();
  expect(needs!.y).toBeLessThan(workspace!.y);
});

test('AC-02 one enrolled child with no feedback shows "1 child needs feedback"', async ({ page }) => {
  await openToday(page);
  await expect(feedbackItem(page)).toHaveCount(1);
  await expect(feedbackItem(page)).toContainText('1 child needs feedback');
  await expect(feedbackItem(page)).toContainText('No update for over a week');
});

test('AC-03 two enrolled children without feedback show "2 children need feedback"', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await reopenToday(page);
  await expect(feedbackItem(page)).toContainText('2 children need feedback');
});

test('AC-04 a child with recorded feedback today is not counted', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await writeFeedback(page, RIA, 'recorded');
  await expect(feedbackItem(page)).toContainText('1 child needs feedback');
});

test('AC-05 when every child has recent recorded feedback, Today shows "All caught up"', async ({ page }) => {
  await openToday(page);
  await writeFeedback(page, RIA, 'recorded');
  await expectAllCaughtUp(page);
});

test('AC-06 a draft (not recorded) feedback does not count', async ({ page }) => {
  await openToday(page);
  await writeFeedback(page, RIA, 'draft');
  await expect(feedbackItem(page)).toContainText('1 child needs feedback');
});

test('AC-07 recorded feedback older than 7 days does not count', async ({ page }) => {
  await openToday(page);
  await writeFeedback(page, RIA, 'recorded');
  await page.evaluate(age => {
    const old = new Date(Date.now() - age).toISOString();
    for (const row of window.__coachFixture.observations) { row.created_at = old; row.updated_at = old; row.recorded_at = old; }
  }, 8 * DAY);
  await reopenToday(page);
  await expect(feedbackItem(page)).toContainText('1 child needs feedback');
});

test('AC-08 archived students and ended enrolments are not counted', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000023', name: 'Fictional Kabir', archived: true });
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000024', name: 'Fictional Meera', ended: true });
  await reopenToday(page);
  await expect(feedbackItem(page)).toContainText('1 child needs feedback');
});

test('AC-09 tapping the feedback item opens "Feedback for parents"', async ({ page }) => {
  await openToday(page);
  await feedbackItem(page).click();
  await expect(page.getByRole('heading', { name: 'Feedback for parents', exact: true })).toBeVisible();
});

test('AC-10 an academy with no students shows "All caught up"', async ({ page }) => {
  await openToday(page, false);
  await expectAllCaughtUp(page);
});
