import { expect, test } from '@playwright/test';
import { backend, login } from '../e2e/support/backend';

const workspace='00000000-0000-0000-0000-000000000010';
const batch='00000000-0000-0000-0000-000000000020';
const child='00000000-0000-0000-0000-000000000031';

async function openRoster(page: import('@playwright/test').Page) {
  await login(page);
  const before=await page.evaluate(()=>window.__coachFixture.calls.length);
  await page.getByRole('tab',{name:'Students'}).click();
  return before;
}

test('APVerse workspace shows connected children and groups without legacy roster reads',async({page})=>{
  await backend(page,{coachWorkspaces:[{id:workspace,name:'Fictional APVerse Studio',time_zone:'Asia/Kolkata'}]});
  const before=await openRoster(page);
  await expect(page.getByRole('heading',{name:'Connected students'})).toBeVisible();
  await expect(page.getByText('Fictional Asha',{exact:true})).toBeVisible();
  await expect(page.getByText('Fictional Studio A · active')).toBeVisible();
  await page.getByRole('button',{name:'Groups'}).click();
  await expect(page.getByRole('button',{name:'Open Fictional Studio A'})).toBeVisible();
  const calls=await page.evaluate(count=>window.__coachFixture.calls.slice(count),before);
  expect(calls).toContain('/rest/v1/rpc/app_enrollment_batches');
  expect(calls).toContain('/rest/v1/rpc/app_batch_enrollments');
  expect(calls).toContain('/rest/v1/rpc/app_enrollment_candidates');
  expect(calls.some(path=>/\/rest\/v1\/(students|batches|student_contacts|academies)$/.test(path))).toBe(false);
});

test('workspace manager enrolls only an already-connected child into an existing group',async({page})=>{
  await backend(page,{coachWorkspaces:[{id:workspace,name:'Fictional APVerse Studio',time_zone:'Asia/Kolkata'}]});
  await openRoster(page);
  await page.getByRole('button',{name:'Groups'}).click();
  await page.getByRole('button',{name:'Open Fictional Studio A'}).click();
  await page.getByRole('button',{name:'Choose this child'}).click();
  await page.getByRole('button',{name:'Add Fictional Ravi'}).click();
  await expect(page.getByTestId('workspace-scroll').getByText('Child added to the group.')).toBeVisible();
  await expect(page.getByText('Fictional Ravi')).toBeVisible();
  const result=await page.evaluate(()=>({calls:window.__coachFixture.apVerseSaveCalls,enrollments:window.__coachFixture.apVerseEnrollments}));
  expect(result.calls).toHaveLength(1);
  expect(result.calls[0]).toMatchObject({p_workspace_id:workspace,p_batch_id:batch,p_child_id:child});
  expect(result.calls[0].p_request_id).toMatch(/^[0-9a-f-]{36}$/i);
  expect(result.enrollments.filter(row=>row.child_id===child&&row.batch_id===batch)).toHaveLength(1);
});

test('lost enrollment response retries once with the same identity and no duplicate membership',async({page})=>{
  await backend(page,{coachWorkspaces:[{id:workspace,name:'Fictional APVerse Studio',time_zone:'Asia/Kolkata'}]});
  await openRoster(page);
  await page.getByRole('button',{name:'Groups'}).click();
  await page.getByRole('button',{name:'Open Fictional Studio A'}).click();
  await page.getByRole('button',{name:'Choose this child'}).click();
  await page.evaluate(()=>{window.__coachFixture.loseApVerseSaveResponse=true;});
  await page.getByRole('button',{name:'Add Fictional Ravi'}).click();
  await expect(page.getByTestId('workspace-scroll').getByText('The change could not be confirmed. Your selection is kept; retry safely.')).toBeVisible();
  await page.getByRole('button',{name:'Add Fictional Ravi'}).click();
  await expect(page.getByTestId('workspace-scroll').getByText('Child added to the group.')).toBeVisible();
  const result=await page.evaluate(()=>({calls:window.__coachFixture.apVerseSaveCalls,enrollments:window.__coachFixture.apVerseEnrollments}));
  expect(result.calls).toHaveLength(2);
  expect(result.calls[0].p_request_id).toBe(result.calls[1].p_request_id);
  expect(result.enrollments.filter(row=>row.child_id===child&&row.batch_id===batch)).toHaveLength(1);
});

test('assigned coach sees authorized membership but no enrollment controls',async({page})=>{
  await backend(page,{apVerseRole:'coach',coachWorkspaces:[{id:workspace,name:'Fictional APVerse Studio',time_zone:'Asia/Kolkata'}]});
  await openRoster(page);
  await page.getByRole('button',{name:'Groups'}).click();
  await page.getByRole('button',{name:'Open Fictional Studio A'}).click();
  await expect(page.getByText('Fictional Asha')).toBeVisible();
  await expect(page.getByText('A workspace owner or admin manages enrollment.')).toBeVisible();
  await expect(page.getByText('Add a connected child')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__coachFixture.apVerseSaveCalls)).toEqual([]);
});

test('APVerse roster failure shows retry state and never reports an empty roster',async({page})=>{
  await backend(page,{failApVerseRoster:true,coachWorkspaces:[{id:workspace,name:'Fictional APVerse Studio',time_zone:'Asia/Kolkata'}]});
  await openRoster(page);
  await expect(page.getByTestId('workspace-scroll').getByText('Your connected students and groups could not be loaded. Check your connection and retry.')).toBeVisible();
  await expect(page.getByText('No family-connected children are available yet.')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Retry loading'})).toBeVisible();
});
