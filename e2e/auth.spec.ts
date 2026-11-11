import { expect, test, type Page } from '@playwright/test';

const user = { id: '00000000-0000-0000-0000-000000000001', email: 'coach@example.test',
  aud: 'authenticated', role: 'authenticated', email_confirmed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {}, identities: [] };
declare global {
  interface Window {
    __coachFixture: { academy: boolean; failCreate: boolean; calls: string[]; pkceMethods: string[] };
  }
}
async function backend(page: Page, options: { academy?: boolean; failLogin?: boolean; failAcademy?: boolean; unverified?: boolean } = {}) {
  // A transport fixture installed before the real app/SDK loads. No Supabase
  // request can leave this browser; authentication and storage code are unchanged.
  await page.addInitScript(({ user, options }) => {
    window.__coachFixture = { academy: options.academy ?? false, failCreate: false, calls: [], pkceMethods: [] };
    const account = options.unverified ? { ...user, email_confirmed_at: null } : user;
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, window.location.origin);
      if (!url.hostname.endsWith('.supabase.co')) {
        if (url.origin === window.location.origin) return original(input, init);
        throw new Error('External network is disabled in authentication tests');
      }
      const state = window.__coachFixture;
      state.calls.push(url.pathname);
      let data: unknown = {};
      let status = 200;
      if (url.pathname.endsWith('/token')) {
        if (options.failLogin) {
          status = 400; data = { code: 'invalid_credentials', msg: 'Raw backend detail must not display' };
        } else {
          const expires = Math.floor(Date.now() / 1000) + 3600;
          const part = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
          data = { access_token: `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: user.id, exp: expires })}.fictional_signature`,
            token_type: 'bearer', expires_in: 3600, expires_at: expires, refresh_token: 'fictional-refresh-token', user: account };
        }
      } else if (url.pathname.endsWith('/user')) data = account;
      else if (url.pathname.endsWith('/signup') || url.pathname.endsWith('/recover')) {
        const body = JSON.parse(String(init?.body ?? '{}'));
        state.pkceMethods.push(body.code_challenge_method ?? 'missing');
        data = url.pathname.endsWith('/signup') ? { user, session: null } : {};
      }
      else if (url.pathname.endsWith('/logout')) status = 204;
      else if (url.pathname.endsWith('/academies')) {
        status = options.failAcademy ? 500 : 200;
        data = options.failAcademy ? { message: 'private schema failure' } : state.academy
          ? [{ id: 'academy-test', name: 'Fictional Test Academy', timezone: 'Asia/Kolkata', currency: 'INR' }] : [];
      } else if (url.pathname.endsWith('/rpc/create_academy')) {
        if (state.failCreate) { status = 500; data = { message: 'Internal private database text' }; }
        else { state.academy = true; data = { id: 'academy-test' }; }
      } else { status = 400; data = { message: 'Unexpected fixture request' }; }
      return new Response(status === 204 ? null : JSON.stringify(data), { status,
        headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } });
    };
  }, { user, options });
}
async function login(page: Page) {
  await page.goto('/');
  await page.screenshot({ path: '/tmp/parentplus-login.png', fullPage: true });
  await page.getByRole('textbox', { name: 'Email address' }).fill('coach@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fictional-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

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
