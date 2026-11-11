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
  await page.getByRole('button', { name: 'Run safe error check' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  const remaining = await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.includes('auth-token') && !key.includes('code-verifier')));
  expect(remaining).toEqual([]);
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

test('a recovery code opens password update and removes the code from browser history', async ({ page }) => {
  await backend(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('coach@example.test');
  await page.getByRole('button', { name: 'Send recovery email' }).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
  await page.goto('/auth/recovery?code=fictional-one-time-code');
  await expect(page.getByRole('heading', { name: 'Choose a new password.' })).toBeVisible();
  await expect(page).toHaveURL('http://127.0.0.1:18081/');
  await page.getByLabel('New password', { exact: true }).fill('fictional-new-password');
  await page.getByLabel('Confirm password', { exact: true }).fill('fictional-new-password');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('heading', { name: 'Your academy, your way.' })).toBeVisible();
});
