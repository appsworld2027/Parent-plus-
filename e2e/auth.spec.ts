import { expect, test } from '@playwright/test';
import { backend, login } from './support/backend';

test('sign-in validates inputs without losing the form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('valid email');
  await page.getByRole('textbox', { name: 'Email address' }).fill('coach@example.test');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enter your password');
});

test('failed login shows a safe reference and retains email', async ({ page }) => {
  await backend(page, { failLogin: true });
  await login(page);
  await expect(page.getByRole('alert')).toContainText('Check your email and password');
  await expect(page.getByRole('alert')).toContainText('PP-');
  await expect(page.getByRole('alert')).not.toContainText('Raw backend detail');
  await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveValue('coach@example.test');
});

test('sign-up and recovery use neutral messages and return to sign-in', async ({ page }) => {
  await backend(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('coach@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fictional-password');
  await page.getByLabel('Confirm password', { exact: true }).fill('fictional-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('If registration is available');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByRole('button', { name: 'Send recovery email' }).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
  expect(await page.evaluate(() => window.__coachFixture.pkceMethods)).toEqual(['s256', 's256']);
});

test('a verified session loads its academy, survives reload, and clears on sign-out', async ({ page }) => {
  await backend(page, { academy: true });
  await login(page);
  await expect(page.getByText('Fictional Test Academy', { exact: true })).toBeVisible();
  const calls = await page.evaluate(() => window.__coachFixture.calls);
  expect(calls).toContain('/auth/v1/token');
  expect(calls).toContain('/auth/v1/user');
  expect(calls).toContain('/rest/v1/academies');
  await page.reload();
  await expect(page.getByText('Fictional Test Academy', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open support and diagnostics' }).click();
  await expect(page.getByText('Workspace loaded', { exact: true })).toBeVisible();
  if (process.env.PLAYWRIGHT_BASE_URL) {
    // Production deployments intentionally omit developer failure controls.
    await expect(page.getByRole('button', { name: 'Run safe error check' })).toHaveCount(0);
  } else {
    await page.getByRole('button', { name: 'Run safe error check' }).click();
  }
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  const remaining = await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.includes('auth-token') && !key.includes('code-verifier')));
  expect(remaining).toEqual([]);
  const retained = await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('parentplus.coach.diagnostics.')));
  expect(retained).toEqual([]);
});

test('new owners see onboarding and can safely retry failed academy creation', async ({ page }) => {
  await backend(page);
  await login(page);
  await expect(page.getByRole('heading', { name: 'Your academy, your way.' })).toBeVisible();
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter your name');
  await page.getByRole('textbox', { name: 'Your name' }).fill('Fictional Coach');
  await page.getByRole('textbox', { name: 'Academy name' }).fill('Fictional Academy');
  await page.evaluate(() => { window.__coachFixture.failCreate = true; });
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page.getByRole('alert')).toContainText('Your academy could not be saved');
  await expect(page.getByRole('textbox', { name: 'Academy name' })).toHaveValue('Fictional Academy');
  await expect(page.getByRole('alert')).not.toContainText('private database');
  await page.evaluate(() => { window.__coachFixture.failCreate = false; });
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page.getByText('Fictional Test Academy', { exact: true })).toBeVisible();
});

test('workspace loading failure cannot reveal the signed-in app', async ({ page }) => {
  await backend(page, { failAcademy: true });
  await login(page);
  await expect(page.getByRole('heading', { name: 'Let’s reconnect.' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Students' })).toHaveCount(0);
  await expect(page.getByRole('alert')).not.toContainText('private schema failure');
});

test('an unverified account cannot open the academy workspace', async ({ page }) => {
  await backend(page, { unverified: true, academy: true });
  await login(page);
  await expect(page.getByRole('alert')).toContainText('verify your email');
  await expect(page.getByRole('tab', { name: 'Students' })).toHaveCount(0);
});

test('a recovery code opens password update and removes the code from browser history', async ({ page, baseURL }) => {
  await backend(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('coach@example.test');
  await page.getByRole('button', { name: 'Send recovery email' }).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
  await page.goto('/auth/recovery?code=fictional-one-time-code');
  await expect(page.getByRole('heading', { name: 'Choose a new password.' })).toBeVisible();
  await expect(page).toHaveURL(new URL('/', baseURL!).href);
  await page.getByLabel('New password', { exact: true }).fill('fictional-new-password');
  await page.getByLabel('Confirm password', { exact: true }).fill('fictional-new-password');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('heading', { name: 'Your academy, your way.' })).toBeVisible();
});

test('a recovery email can open a new tab in the requesting browser',async({page,context})=>{
 await backend(page);await page.goto('/');
 await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
 await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');
 await page.getByRole('button',{name:'Send recovery email',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('If an account exists');
 const flow=await page.evaluate(()=>Object.keys(localStorage).map(key=>key.match(/-flow-([a-zA-Z0-9_-]{8,64})-code-verifier$/)?.[1]).find(Boolean));expect(flow).toBeTruthy();
 const recovery=await context.newPage();await backend(recovery);
 await recovery.goto(`/auth/recovery?code=fictional-recovery-new-tab&sb_flow_id=${flow}&module=coach`);
 await expect(recovery.getByRole('heading',{name:'Choose a new password.',exact:true})).toBeVisible();
 await expect(recovery).not.toHaveURL(/fictional-recovery-new-tab/);
});

test('recovery preserves its exact email flow after removing sensitive URL parameters',async({page})=>{
 await backend(page);await page.goto('/');await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
 await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');await page.getByRole('button',{name:'Send recovery email',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('If an account exists');
 const flow=await page.evaluate(()=>{
  let result='';
  for(const key of Object.keys(localStorage)){
   const match=key.match(/-flow-([a-zA-Z0-9_-]{8,64})-code-verifier$/);if(match)result=match[1];
   if(key.endsWith('-auth-token-code-verifier'))localStorage.removeItem(key);
  }
  return result;
 });
 expect(flow).toMatch(/^[a-f0-9]{32}$/);
 await page.goto(`/auth/recovery?code=fictional-exact-flow&sb_flow_id=${flow}`);
 await expect(page.getByRole('heading',{name:'Choose a new password.',exact:true})).toBeVisible();await expect(page).not.toHaveURL(/sb_flow_id|fictional-exact-flow/);
});

test('a Parent recovery email returns to Parent in a new tab',async({page,context})=>{
 await backend(page);await page.goto('/parent');await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
 await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');await page.getByRole('button',{name:'Send recovery email',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('If an account exists');
 const flow=await page.evaluate(()=>Object.keys(localStorage).map(key=>key.match(/-flow-([a-zA-Z0-9_-]{8,64})-code-verifier$/)?.[1]).find(Boolean));expect(flow).toBeTruthy();
 const recovery=await context.newPage();await backend(recovery);await recovery.goto(`/auth/recovery?code=fictional-parent-reset&sb_flow_id=${flow}&module=parent`);
 await expect(recovery.getByRole('heading',{name:'Choose a new password.',exact:true})).toBeVisible();await expect(recovery).toHaveURL(/\/parent$/);
});

test('the direct recovery address opens a usable email-request form without a broken-link error',async({page})=>{
 await backend(page);await page.goto('/auth/recovery');
 await expect(page.getByRole('heading',{name:'Let’s get you back in.',exact:true})).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
 await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');
 await page.getByRole('button',{name:'Send recovery email',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('If an account exists');
});

test('another account recovering in a second tab cannot replace this tab’s signed-in workspace',async({page,context})=>{
 await backend(page,{academy:true});await login(page);await expect(page.getByRole('tab',{name:'Students',exact:true})).toBeVisible();
 const recovery=await context.newPage();await backend(recovery,{secondaryAccount:true});await recovery.goto('/');
 await recovery.getByRole('button',{name:'Forgot password?',exact:true}).click();await recovery.getByLabel('Email address',{exact:true}).fill('second@example.test');
 await recovery.getByRole('button',{name:'Send recovery email',exact:true}).click();await expect(recovery.getByRole('status')).toContainText('If an account exists');
 await recovery.goto('/auth/recovery?code=fictional-second-account');
 await expect(recovery.getByRole('heading',{name:'Choose a new password.',exact:true})).toBeVisible();
 // Allow browser auth notifications and the resulting React render to settle.
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 await expect(page.getByRole('tab',{name:'Students',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('tab',{name:'Students',exact:true})).toBeVisible();
});

test('an earlier Coach recovery keeps Coach intent after a later Parent recovery request',async({page,baseURL})=>{
 await backend(page);await page.goto('/auth/recovery');
 await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');await page.getByRole('button',{name:'Send recovery email',exact:true}).click();await expect(page.getByRole('status')).toContainText('If an account exists');
 const flow=await page.evaluate(()=>Object.keys(localStorage).map(key=>key.match(/-flow-([a-zA-Z0-9_-]{8,64})-code-verifier$/)?.[1]).find(Boolean));
 expect(flow).toBeTruthy();await page.goto('/parent');await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
 await page.getByLabel('Email address',{exact:true}).fill('coach@example.test');await page.getByRole('button',{name:'Send recovery email',exact:true}).click();await expect(page.getByRole('status')).toContainText('If an account exists');
 await page.goto(`/auth/recovery?code=fictional-earlier-coach&sb_flow_id=${flow}&module=coach`);
 await expect(page.getByRole('heading',{name:'Choose a new password.',exact:true})).toBeVisible();await expect(page).toHaveURL(new URL('/',baseURL!).href);
});

test('signing out one tab cannot erase another tab’s pending recovery email proof',async({page,context})=>{
 await backend(page,{academy:true});await login(page);await expect(page.getByRole('tab',{name:'Students',exact:true})).toBeVisible();
 const request=await context.newPage();await backend(request);await request.goto('/auth/recovery');
 await request.getByLabel('Email address',{exact:true}).fill('coach@example.test');await request.getByRole('button',{name:'Send recovery email',exact:true}).click();await expect(request.getByRole('status')).toContainText('If an account exists');
 const flow=await request.evaluate(()=>Object.keys(localStorage).map(key=>key.match(/-flow-([a-zA-Z0-9_-]{8,64})-code-verifier$/)?.[1]).find(Boolean));expect(flow).toBeTruthy();
 await page.getByRole('button',{name:'Open support and diagnostics',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
 const recovery=await context.newPage();await backend(recovery);await recovery.goto(`/auth/recovery?code=fictional-preserved-email&sb_flow_id=${flow}`);
 await expect(recovery.getByRole('heading',{name:'Choose a new password.',exact:true})).toBeVisible();
});
