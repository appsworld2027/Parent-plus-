import { expect, test, type Page } from '@playwright/test';
import { backend, login } from './support/backend';
async function setup(page: Page) {
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.getByRole('tab', { name: 'Post', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Write an observation', exact: true })).toBeEnabled();
}
async function compose(page: Page) {
  await setup(page);
  await page.getByRole('button', { name: 'Write an observation', exact: true }).click();
  await page.getByRole('button', { name: 'Fictional Clay Class', exact: true }).click();
  await page.getByRole('button', { name: 'Fictional Ria', exact: true }).click();
  await page.getByRole('textbox', { name: 'Observation text', exact: true }).fill('Fictional child practised shaping a clay bowl.');
}
async function record(page: Page) {
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm save', exact: true }).click();
}
test('private note autosaves locally, survives restart, records and retains immutable students on text edits', async ({ page }, info) => {
  await compose(page);
  await expect(page.getByText('Draft saved on this device. Not yet saved to your workspace.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__coachFixture.observations.length)).toBe(0);
  await page.reload(); await page.getByRole('tab', { name: 'Post', exact: true }).click();
  await page.getByRole('button', { name: 'Resume observation draft', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Observation text' })).toHaveValue('Fictional child practised shaping a clay bowl.');
  await record(page);
  await expect(page.getByTestId('action-feedback')).toContainText('Observation recorded in your workspace. No parent message was sent.');
  await expect(page.getByRole('button', { name: 'Batch students', exact: true })).toHaveCount(0);
  await expect(page.getByText('Recent saved versions (up to 5)', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Observation text' }).fill('Fictional corrected note about the same child.');
  await page.getByRole('button', { name: 'Save recorded text', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm save', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Observation recorded in your workspace');
  await expect.poll(() => page.evaluate(() => window.__coachFixture.observations[0]?.revision)).toBe(2);
  await expect(page.getByRole('button', { name: 'Confirm save', exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('observation-recorded.png'), fullPage: true });
  expect(await page.evaluate(() => window.__coachFixture.observationRecipients[window.__coachFixture.observations[0].id].length)).toBe(1);
});
test('draft save is distinct from recording and widening an individual note needs confirmation', async ({ page }) => {
  await compose(page);
  await page.getByRole('button', { name: 'Batch students', exact: true }).click();
  await expect(page.getByText('Change to a batch observation?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Individual student · selected', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save draft to workspace', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Draft saved in your workspace');
  expect(await page.evaluate(() => window.__coachFixture.observations[0].status)).toBe('draft');
  expect(await page.evaluate(() => window.__coachFixture.calls.filter(value => value.includes('notification') || value.includes('message')))).toEqual([]);
});
test('lost record response restores the confirmed server copy without duplicate history', async ({ page }) => {
  await compose(page);
  await page.evaluate(() => { window.__coachFixture.loseObservationResponse = true; });
  await record(page);
  await expect(page.getByTestId('action-feedback')).toContainText('could not be confirmed');
  await page.reload(); await page.getByRole('tab', { name: 'Post', exact: true }).click();
  await page.getByRole('button', { name: 'Resume observation draft', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('already recorded');
  expect(await page.evaluate(() => window.__coachFixture.observations.length)).toBe(1);
  expect(await page.evaluate(() => Object.values(window.__coachFixture.observationVersions)[0].length)).toBe(1);
});
test('failure retains draft and shows safe persistent feedback; sign-out warns and removes it', async ({ page }) => {
  await compose(page);
  await page.evaluate(() => { window.__coachFixture.failObservation = true; });
  await record(page);
  await expect(page.getByRole('button', { name: 'Confirm save', exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('Your device draft is retained');
  await expect(page.getByRole('alert')).not.toContainText('Private note backend failure');
  await page.getByRole('button', { name: 'Back to observation history', exact: true }).click();
  await page.getByRole('button', { name: 'Open support and diagnostics', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByText('Remove unsent device drafts and sign out?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  expect(await page.evaluate(() => sessionStorage.getItem('parentplus.coach.observation-draft.v1'))).not.toBeNull();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Remove drafts and sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('parentplus.coach.observation-draft.v1'))).toBeNull();
});
test('changed server revision requires comparison and can copy device text to a new draft', async ({ page }) => {
  await compose(page);
  await page.getByRole('button', { name: 'Save draft to workspace', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Draft saved in your workspace');
  await page.getByRole('textbox', { name: 'Observation text' }).fill('Unsent fictional device change.');
  await expect(page.getByText('Draft saved on this device. Not yet saved to your workspace.', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const state = window.__coachFixture; state.observations[0].revision++; state.observations[0].note = 'Fictional change from another device.';
    sessionStorage.setItem('__fictional_observations', JSON.stringify({ observations: state.observations, recipients: state.observationRecipients, versions: state.observationVersions }));
  });
  await page.reload(); await page.getByRole('tab', { name: 'Post', exact: true }).click();
  await page.getByRole('button', { name: 'Resume observation draft', exact: true }).click();
  await expect(page.getByText('Compare before continuing', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Copy device text to a new draft', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Observation text' })).toHaveValue('Unsent fictional device change.');
  await record(page);
  await expect.poll(() => page.evaluate(() => window.__coachFixture.observations.length)).toBe(2);
});
test('missing database update explains setup without showing a false empty history', async ({ page }) => {
  await backend(page, { academy: true, readyClass: true, missingObservationMigration: true }); await login(page);
  await page.getByRole('tab', { name: 'Post', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('observations database update is needed');
  await expect(page.getByRole('button', { name: 'Write an observation', exact: true })).toBeDisabled();
  await expect(page.getByText('No observations saved yet.', { exact: true })).toHaveCount(0);
});
test('device storage failure never claims a saved draft or sends an unprotected request', async ({ page }) => {
  await compose(page);
  await expect(page.getByText('Draft saved on this device. Not yet saved to your workspace.', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) { if (key === 'parentplus.coach.observation-draft.v1') throw new Error('Fictional storage full'); return original.call(this,key,value); };
  });
  await page.getByRole('textbox', { name: 'Observation text' }).fill('Fictional newer text that must remain on screen.');
  await page.getByRole('button', { name: 'Save draft to workspace', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('Device draft could not be saved. Your text is still on this screen.');
  await expect(page.getByRole('textbox', { name: 'Observation text' })).toHaveValue('Fictional newer text that must remain on screen.');
  expect(await page.evaluate(() => window.__coachFixture.calls.filter(path => path.endsWith('/rpc/save_observation')))).toEqual([]);
});
test('an unreadable private draft blocks replacement until explicitly discarded', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => sessionStorage.setItem('parentplus.coach.observation-draft.v1','not-json'));
  await page.reload(); await page.getByRole('tab', { name: 'Post', exact: true }).click();
  await expect(page.getByTestId('action-feedback')).toContainText('could not be read');
  await expect(page.getByRole('button', { name: 'Write an observation', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Discard device observation draft', exact: true }).click();
  await page.getByRole('button', { name: 'Remove device draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Write an observation', exact: true })).toBeEnabled();
});
test('history pagination retains equal-timestamp notes and roster reads cross the response cap', async ({ page }) => {
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.evaluate(() => {
    const state = window.__coachFixture;
    const base = state.roster.students[0], enrolment = state.roster.enrolments[0];
    state.roster.students = Array.from({ length: 501 },(_,index) => ({ ...base, id: `10000000-0000-0000-0000-${String(index).padStart(12,'0')}`, name: `Fictional Student ${index}` }));
    state.roster.enrolments = state.roster.students.map(student => ({ ...enrolment, student_id: student.id }));
    state.observations = Array.from({ length: 31 },(_,index) => ({ id: `20000000-0000-0000-0000-${String(index).padStart(12,'0')}`, academy_id: 'academy-test', batch_id: enrolment.batch_id,
      session_id: null, note: `Fictional note ${index}`, status: 'draft', audience: 'student', revision: 1, author_id: '00000000-0000-0000-0000-000000000001',
      created_at: '2026-11-12T10:00:00.000Z', updated_at: '2026-11-12T10:00:00.000Z', recorded_at: null }));
  });
  await page.getByRole('tab', { name: 'Post', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open draft observation', exact: true })).toHaveCount(30);
  await page.getByRole('button', { name: 'Load older observations', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open draft observation', exact: true })).toHaveCount(31);
  await expect(page.getByRole('button', { name: 'Load older observations', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Write an observation', exact: true }).click();
  await page.getByRole('button', { name: 'Fictional Clay Class', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fictional Student 500', exact: true })).toBeVisible();
});
