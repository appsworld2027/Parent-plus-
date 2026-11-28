// LOCKED acceptance tests for docs/product/coach-spotlight/ACCEPTANCE.md (M2-18). Build must pass them WITHOUT editing, skipping or deleting.
// Hooks: heading "Spotlight today"; testID `spotlight-row` per child (a button); line "Spotlight could not load. Reference: …";
// muted line "Everyone in today's classes has a note today".
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from '../support/backend';

const RIA = '00000000-0000-0000-0000-000000000021'; // the fixture's ready-class student (always enrolled, in Fictional Clay Class)
const CLAY = 'Fictional Clay Class';
const DAY = 24 * 60 * 60 * 1000;
const sid = (n: number) => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const spotlight = (page: Page) => page.getByRole('heading', { name: 'Spotlight today', exact: true });
const rows = (page: Page) => page.getByTestId('spotlight-row');

declare global { interface Window { __spotNet: { failNotes: boolean } } }

async function openToday(page: Page) {
  await backend(page, { academy: true, readyClass: true });
  await page.addInitScript(() => {
    window.__spotNet = { failNotes: false };
    const inner = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
      if (window.__spotNet.failNotes && url.hostname.endsWith('.supabase.co') && /\/(observations|observation_recipients)$/.test(url.pathname))
        return new Response(JSON.stringify({ message: 'Fictional notes failure' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      return inner(input, init);
    };
  });
  await login(page);
  await expect(page.getByRole('heading', { name: 'Needs you', exact: true })).toBeVisible();
}
async function reopenToday(page: Page) {
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Needs you', exact: true })).toBeVisible();
}
async function addStudent(page: Page, s: { id: string; name: string; archived?: boolean; ended?: boolean; batch?: string }) {
  await page.evaluate(v => {
    const roster = window.__coachFixture.roster;
    roster.students.push({ id: v.id, name: v.name, age_years: 7, archived_at: v.archived ? '2026-01-01T00:00:00.000Z' : null });
    roster.enrolments.push({ id: `e-${v.id}`, student_id: v.id, batch_id: v.batch ?? roster.batches[0].id, starts_on: '2020-01-01', ends_on: v.ended ? '2020-06-30' : null });
  }, s);
}
// A note for these students, recorded `daysAgo` days ago (or a draft).
async function addNote(page: Page, ids: string[], daysAgo: number, status: 'recorded' | 'draft' = 'recorded') {
  await page.evaluate(v => {
    const state = window.__coachFixture, at = new Date(Date.now() - v.daysAgo * v.day).toISOString(), id = crypto.randomUUID();
    state.observations.push({ id, academy_id: 'academy-test', batch_id: state.roster.batches[0].id, session_id: null, note: 'Fictional note.',
      status: v.status, audience: 'student', revision: 1, author_id: '00000000-0000-0000-0000-000000000001', created_at: at, updated_at: at,
      recorded_at: v.status === 'recorded' ? at : null });
    state.observationRecipients[id] = v.ids;
  }, { ids, daysAgo, status, day: DAY });
}
async function addClass(page: Page, batchId: string | null, status: 'scheduled' | 'cancelled' = 'scheduled') {
  await page.evaluate(v => {
    const state = window.__coachFixture, today = state.classes[0].starts_at.slice(0, 10);
    state.classes.push({ id: crypto.randomUUID(), batch_id: v.batch ?? state.roster.batches[0].id, starts_at: `${today}T11:30:00.000Z`, ends_at: `${today}T12:30:00.000Z`, room: 'Room 2', status: v.status, attendance_revision: 0 });
  }, { batch: batchId, status });
}
async function addBatch(page: Page, id: string, name: string) {
  await page.evaluate(v => { window.__coachFixture.roster.batches.push({ id: v.id, name: v.name, room: 'Room 9', monthly_fee_paise: 100000, archived_at: null }); }, { id, name });
}
const names = async (page: Page) => (await rows(page).allInnerTexts()).map(t => t.split('\n')[0].trim());
test.describe.configure({ retries: 0 });
test.setTimeout(60000);

test('SP-01 a class today with enrolled children shows the "Spotlight today" heading', async ({ page }) => {
  await openToday(page);
  await expect(spotlight(page)).toBeVisible();
});

test('SP-02 a never-noted child shows the child, the class and "No note yet"', async ({ page }) => {
  await openToday(page);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText('Fictional Ria');
  await expect(rows(page).first()).toContainText(CLAY);
  await expect(rows(page).first()).toContainText('No note yet');
});

test('SP-03 five candidates: the 2 never-noted by name, then the child noted longest ago; only 3 shown', async ({ page }) => {
  await openToday(page);
  await addNote(page, [RIA], 2);
  for (const [n, name] of [[1, 'Fictional Aarav'], [2, 'Fictional Bela'], [3, 'Fictional Chirag'], [4, 'Fictional Dev']] as const) await addStudent(page, { id: sid(n), name });
  await addNote(page, [sid(3)], 9); await addNote(page, [sid(4)], 20);
  await reopenToday(page);
  await expect(rows(page)).toHaveCount(3);
  const list = await names(page);
  expect(list[0]).toContain('Aarav'); expect(list[1]).toContain('Bela'); expect(list[2]).toContain('Dev');
  await expect(rows(page).nth(2)).toContainText('Last note 20 days ago');
});

test('SP-04 wording: 3 days ago, 1 day ago, today', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: sid(1), name: 'Fictional Aarav' }); await addStudent(page, { id: sid(2), name: 'Fictional Bela' });
  await addNote(page, [RIA], 3); await addNote(page, [sid(1)], 1); await addNote(page, [sid(2)], 0);
  await reopenToday(page);
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByTestId('spotlight-section')).toContainText('Last note 3 days ago');
  await expect(page.getByTestId('spotlight-section')).toContainText('Last note 1 day ago');
  await expect(page.getByTestId('spotlight-section')).toContainText('Last note today');
});

test('SP-05 a child in a batch with no class today is not listed', async ({ page }) => {
  await openToday(page);
  await addBatch(page, '30000000-0000-0000-0000-000000000009', 'Fictional Other Batch');
  await addStudent(page, { id: sid(1), name: 'Fictional Aarav', batch: '30000000-0000-0000-0000-000000000009' });
  await addNote(page, [RIA], 1);
  await reopenToday(page);
  await expect(page.getByTestId('spotlight-section')).not.toContainText('Aarav');
});

test('SP-06 when today\'s only class is cancelled there is no Spotlight card', async ({ page }) => {
  await openToday(page);
  await page.evaluate(() => { window.__coachFixture.classes[0].status = 'cancelled'; });
  await reopenToday(page);
  await page.waitForTimeout(1000);
  await expect(spotlight(page)).toHaveCount(0);
});

test('SP-07 an archived child and a child whose enrolment ended are not listed', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: sid(1), name: 'Fictional Archived', archived: true });
  await addStudent(page, { id: sid(2), name: 'Fictional Ended', ended: true });
  await reopenToday(page);
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByTestId('spotlight-section')).not.toContainText('Archived');
  await expect(page.getByTestId('spotlight-section')).not.toContainText('Ended');
});

test('SP-08 a draft note does not count', async ({ page }) => {
  await openToday(page);
  await addNote(page, [RIA], 0, 'draft');
  await reopenToday(page);
  await expect(rows(page).first()).toContainText('No note yet');
});

test('SP-09 tapping a row opens "Feedback for parents"', async ({ page }) => {
  await openToday(page);
  await rows(page).first().click();
  await expect(page.getByRole('heading', { name: 'Feedback for parents', exact: true })).toBeVisible();
});

test('SP-10 with no class today there is no Spotlight card', async ({ page }) => {
  await openToday(page);
  await page.evaluate(() => { window.__coachFixture.classes.length = 0; });
  await reopenToday(page);
  await page.waitForTimeout(1000);
  await expect(spotlight(page)).toHaveCount(0);
});

test('SP-11 when everyone has a note today a muted line replaces the rows', async ({ page }) => {
  await openToday(page);
  await addNote(page, [RIA], 0);
  await reopenToday(page);
  await expect(page.getByText("Everyone in today's classes has a note today", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
});

test('SP-12 if notes cannot be read one error line shows and the rest of Today still works', async ({ page }) => {
  await openToday(page);
  await page.evaluate(() => { window.__spotNet.failNotes = true; });
  await reopenToday(page);
  await expect(page.getByText(/Spotlight could not load\. Reference: .+/)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Today’s classes', { exact: true })).toBeVisible();
});

test('SP-13 a child in two classes today is listed once', async ({ page }) => {
  await openToday(page);
  await addClass(page, null);
  await reopenToday(page);
  await expect(rows(page)).toHaveCount(1);
});

test('SP-14 600 candidates, 580 never noted: exactly the first 3 never-noted by name', async ({ page }) => {
  await openToday(page);
  await page.evaluate(() => {
    const roster = window.__coachFixture.roster;
    for (let i = 0; i < 600; i++) {
      const id = `20000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
      roster.students.push({ id, name: `Fictional S${String(i).padStart(3, '0')}`, age_years: 7, archived_at: null });
      roster.enrolments.push({ id: `e-${id}`, student_id: id, batch_id: roster.batches[0].id, starts_on: '2020-01-01', ends_on: null });
    }
  });
  await addNote(page, Array.from({ length: 20 }, (_, i) => `20000000-0000-0000-0000-${String(i).padStart(12, '0')}`), 5);
  await addNote(page, [RIA], 5);
  await reopenToday(page);
  await expect(rows(page)).toHaveCount(3);
  const list = await names(page);
  expect(list[0]).toContain('S020'); expect(list[1]).toContain('S021'); expect(list[2]).toContain('S022');
});
