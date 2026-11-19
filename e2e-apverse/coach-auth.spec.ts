import { expect, test } from '@playwright/test';
import { backend, login } from '../e2e/support/backend';

const north='00000000-0000-0000-0000-000000000011';
const south='00000000-0000-0000-0000-000000000012';

test('Coach chooses one of multiple APVerse workspaces and configures a missing time zone',async({page})=>{
  await backend(page,{coachWorkspaces:[
    {id:north,name:'Fictional North Studio',time_zone:null},
    {id:south,name:'Fictional South Studio',time_zone:'Asia/Kolkata'},
  ]});
  await login(page);

  await expect(page.getByRole('heading',{name:'Where would you like to work?'})).toBeVisible();
  await page.getByRole('button',{name:'Open Fictional North Studio'}).click();
  await expect(page.getByRole('heading',{name:'Set the workspace time zone.'})).toBeVisible();
  await page.getByRole('button',{name:'Use Asia/Kolkata'}).click();
  await expect(page.getByRole('tab',{name:'Students'})).toBeVisible();

  const state=await page.evaluate(()=>({calls:window.__coachFixture.calls,workspaces:window.__coachFixture.coachWorkspaces}));
  expect(state.calls).toContain('/rest/v1/rpc/app_today_academies');
  expect(state.calls).toContain('/rest/v1/rpc/configure_private_workspace_zone');
  expect(state.calls).not.toContain('/rest/v1/academies');
  expect(state.workspaces.find(row=>row.id===north)?.time_zone).toBe('Asia/Kolkata');
});

test('new APVerse workspace setup retries the same idempotent request after a lost time-zone step',async({page})=>{
  await backend(page);
  await login(page);
  await expect(page.getByRole('heading',{name:'Your Coach workspace.'})).toBeVisible();
  await page.getByRole('textbox',{name:'Workspace name'}).fill('Fictional Coach Studio');
  await page.evaluate(()=>{window.__coachFixture.failWorkspaceZone=true;});
  await page.getByRole('button',{name:'Create my workspace'}).click();
  await expect(page.getByRole('alert')).toContainText('Your request is saved');
  await expect(page.getByRole('textbox',{name:'Workspace name'})).toHaveAttribute('readonly');

  await page.evaluate(()=>{window.__coachFixture.failWorkspaceZone=false;});
  await page.getByRole('button',{name:'Create my workspace'}).click();
  await expect(page.getByRole('tab',{name:'Students'})).toBeVisible();
  const calls=await page.evaluate(()=>window.__coachFixture.workspaceCreateCalls);
  expect(calls).toHaveLength(2);
  expect(calls[0].p_request_id).toBe(calls[1].p_request_id);
  expect(calls[0].p_name).toBe('Fictional Coach Studio');
  const workspaces=await page.evaluate(()=>window.__coachFixture.coachWorkspaces);
  expect(workspaces).toHaveLength(1);
  expect(workspaces[0].time_zone).toBe('Asia/Kolkata');
});

test('APVerse workspace lookup failure blocks Coach routes and shows a safe message',async({page})=>{
  await backend(page,{failWorkspaceList:true});
  await login(page);
  await expect(page.getByRole('heading',{name:'Let’s reconnect.'})).toBeVisible();
  await expect(page.getByRole('tab',{name:'Students'})).toHaveCount(0);
  await expect(page.getByRole('alert')).not.toContainText('Fictional workspace list failure');
});
