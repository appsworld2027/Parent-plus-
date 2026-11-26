// LOCKED acceptance tests for docs/product/login-recovery/ACCEPTANCE.md (AI Org AGENTS.md §7A).
// Written by Quinn (QA) before the feature exists. Only an `ai:contract` PR may change this file;
// a build PR must make these pass WITHOUT editing, skipping or deleting them (contract-lock enforces it).
//
// Simulation notes (all fictional, no request leaves the browser):
// - ../support/backend answers every Supabase request. `recoveryServer` sits on top of it and keeps one
//   fictional auth service in Node, shared by every page and browser context of a test, so a second
//   browser or device sees the same password and sessions. It tracks the current password, issues a
//   distinct session id and refresh token per sign-in, rejects listed recovery codes the way the service
//   does (expired, used, altered, superseded), and, like the real service, ends every other session when
//   the password changes. A sign-out (/logout) ends the session on the service.
// - "Different browser or device" (RC-08, RC-06) is a separate Playwright browser context: it shares no
//   storage with the requesting browser, exactly as another browser or phone would.
// - Real email delivery and a native app restart are not simulated here; they run on a disposable test
//   project (S/M level) and are reported separately. "Restart" below is the web app loading again in the
//   same tab after leaving it.
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { backend, login } from '../support/backend';
import { parseAuthLink } from '../../src/auth/rules';

const M03 = 'Choose a password with at least 15 characters. A few unrelated words work well.';
const M04 = 'The passwords do not match.';
const M08 = 'Check your email and password, then try again.';
const M12 = 'If an account exists, a recovery email will arrive. Open the newest link in this browser or on this device.';
const M13 = 'This link could not be used. Request a new one from this device, then open the newest email here.';
const M14 = 'Your new password was saved. Other devices will need to sign in again.';
const M18 = 'Your session ended. Please sign in again.';
const NEW_PASSWORD = 'fictional clay bowl window river';
const OLD_PASSWORD = 'fictional-password';
const ACADEMY = 'Fictional Test Academy';
const CHOOSE = 'Choose a new password.';

type Session = { device: string; revoked: boolean };
type ServerState = {
  password: string; sessions: Record<string, Session>; refresh: Record<string, string>;
  reject: Record<string, { status: number; body: object }>; passwordSaves: number; refreshRejected: number;
  pkce: string[]; logouts: string[]; requests: string[];
};
declare global { interface Window { __rc: (op: string, arg?: unknown) => Promise<any>; __rcSeen: Record<string, boolean> } }

function newServer(): ServerState {
  const err = (status: number, code: string, msg: string) => ({ status, body: { code, error_code: code, msg } });
  return { password: OLD_PASSWORD, sessions: {}, refresh: {}, passwordSaves: 0, refreshRejected: 0, pkce: [], logouts: [], requests: [],
    reject: {
      'fictional-used-code': err(404, 'flow_state_not_found', 'invalid flow state, no valid flow state found'),
      'fictional-altered-code': err(400, 'bad_code_verifier', 'code challenge does not match previously saved code verifier'),
      'fictional-superseded-code': err(403, 'otp_expired', 'Email link is invalid or has expired'),
    } };
}
let counter = 0;
async function recoveryServer(page: Page, server: ServerState, device: string) {
  await page.exposeFunction('__rc', (op: string, arg: any) => {
    if (op === 'log') { server.requests.push(arg); return null; }
    if (op === 'login') return arg === server.password;
    if (op === 'pkce') { server.pkce.push(arg); return server.reject[arg] ?? null; }
    if (op === 'issue') { const sid = `session-${device}-${++counter}`; server.sessions[sid] = { device: arg, revoked: false }; return sid; }
    if (op === 'rt') { const rt = `fictional-refresh-${++counter}`; server.refresh[rt] = arg; return rt; }
    if (op === 'refresh') {
      const sid = server.refresh[arg];
      if (!sid || server.sessions[sid]?.revoked) { server.refreshRejected++; return null; }
      delete server.refresh[arg]; return sid;
    }
    if (op === 'update') {
      if (!arg.sid || server.sessions[arg.sid]?.revoked) return false;
      server.password = arg.password; server.passwordSaves++;
      for (const [sid, s] of Object.entries(server.sessions)) if (sid !== arg.sid) s.revoked = true;
      return true;
    }
    if (op === 'logout') {
      server.logouts.push(`${arg.sid}:${arg.scope}`);
      for (const [sid, s] of Object.entries(server.sessions)) {
        if (arg.scope === 'others' ? sid !== arg.sid : arg.scope === 'local' ? sid === arg.sid : true) s.revoked = true;
      }
      return null;
    }
    return null;
  });
  await page.addInitScript(({ device, watch }) => {
    const inner = window.fetch;
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status,
      headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } });
    const part = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    window.fetch = async (input, init) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, window.location.origin);
      if (!url.hostname.endsWith('.supabase.co')) return inner(input, init);
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      let body: Record<string, any> = {};
      try { body = init?.body ? JSON.parse(String(init.body)) : {}; } catch { /* not JSON */ }
      const bearer = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).get('Authorization') ?? '';
      let sid = '';
      try { sid = JSON.parse(atob(bearer.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).session_id ?? ''; } catch { /* publishable key only */ }
      const grant = url.searchParams.get('grant_type') ?? '';
      await window.__rc('log', `${device} ${method} ${url.pathname}${grant ? `?${grant}` : ''} ${url.search.includes('access_token') || raw.includes('fictional-raw-access') ? 'RAW' : ''}${JSON.stringify(body).includes('fictional-raw-access') ? 'RAW' : ''}`);
      if (url.pathname.endsWith('/token')) {
        let renewed = '';
        if (grant === 'password' && !(await window.__rc('login', body.password)))
          return json({ code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
        if (grant === 'pkce') { const reject = await window.__rc('pkce', body.auth_code); if (reject) return json(reject.body, reject.status); }
        if (grant === 'refresh_token') {
          renewed = await window.__rc('refresh', body.refresh_token);
          if (!renewed) return json({ code: 'refresh_token_not_found', error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' }, 400);
        }
        const response = await inner(input, init);
        if (!response.ok) return response;
        const data = await response.json();
        const session = renewed || await window.__rc('issue', device);
        const expires = Math.floor(Date.now() / 1000) + 3600;
        return json({ ...data, expires_at: expires, expires_in: 3600, refresh_token: await window.__rc('rt', session),
          access_token: `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: data.user.id, exp: expires, session_id: session })}.fictional_signature` });
      }
      if (url.pathname.endsWith('/user') && method === 'PUT' && typeof body.password === 'string') {
        if (!(await window.__rc('update', { sid, password: body.password })))
          return json({ code: 'session_not_found', error_code: 'session_not_found', msg: 'Session not found' }, 403);
      }
      if (url.pathname.endsWith('/logout')) await window.__rc('logout', { sid, scope: url.searchParams.get('scope') ?? 'global' });
      return inner(input, init);
    };
    // Records whether an exact on-screen text ever appeared (catches brief flashes of the workspace).
    window.__rcSeen = {};
    const scan = () => { for (const text of watch) if (document.evaluate(`//*[normalize-space(text())='${text}']`, document, null, XPathResult.BOOLEAN_TYPE, null).booleanValue) window.__rcSeen[text] = true; };
    document.addEventListener('DOMContentLoaded', () => { scan(); new MutationObserver(scan).observe(document.documentElement, { subtree: true, childList: true, characterData: true }); });
  }, { device, watch: [ACADEMY] });
}

async function setup(page: Page, server: ServerState, device = 'A', academy = true) {
  await backend(page, { academy });
  await recoveryServer(page, server, device);
}
async function otherDevice(browser: Browser, baseURL: string | undefined, server: ServerState, device: string): Promise<[BrowserContext, Page]> {
  const context = await browser.newContext({ baseURL, viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  await setup(page, server, device);
  return [context, page];
}
const flowIds = (page: Page) => page.evaluate(() => Object.keys(localStorage)
  .map(key => key.match(/-flow-([a-zA-Z0-9_-]{8,64})-code-verifier$/)?.[1]).filter((id): id is string => !!id));
// Coach taps Forgot password?, enters the email and sends; returns the newest email flow id.
async function requestRecovery(page: Page, email = 'coach@example.test') {
  const before = await flowIds(page).catch(() => [] as string[]);
  if (!/\/auth\/recovery/.test(page.url())) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  }
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send recovery email', exact: true }).click();
  // Setup step only: RC-01 owns the exact M12 wording, so other criteria are measured independently.
  await expect(page.getByText(/^If an account exists, a recovery email will arrive\./).first()).toBeVisible();
  const after = await flowIds(page);
  const flow = after.find(id => !before.includes(id));
  expect(flow, 'fixture: the request must create a new email flow proof').toBeTruthy();
  return flow!;
}
async function openRecoveryLink(page: Page, flow: string, code = 'fictional-valid-recovery-code') {
  await page.goto(`/auth/recovery?code=${code}&sb_flow_id=${flow}&module=coach`);
  await expect(page.getByRole('heading', { name: CHOOSE, exact: true })).toBeVisible();
}
async function onNewPasswordScreen(page: Page, server: ServerState) {
  const flow = await requestRecovery(page);
  await openRecoveryLink(page, flow);
  await expectNoWorkspace(page);
  expect(server.passwordSaves).toBe(0);
}
async function expectNoWorkspace(page: Page) {
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toHaveCount(0);
  await expect(page.getByText(ACADEMY, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Your academy, your way.', exact: true })).toHaveCount(0);
  expect(await page.evaluate(t => !!window.__rcSeen[t], ACADEMY), 'the workspace appeared during recovery').toBe(false);
}
const storedSessionKeys = (page: Page) => page.evaluate(() => [...Object.keys(sessionStorage), ...Object.keys(localStorage)]
  .filter(key => key.includes('auth-token') && !key.includes('code-verifier')));
const storedExpiry = (page: Page) => page.evaluate(() => {
  const key = Object.keys(sessionStorage).find(k => /^sb-[a-z0-9]+-auth-token$/.test(k));
  if (!key) return 0;
  const manifest = JSON.parse(sessionStorage.getItem(key)!);
  const raw = Array.from({ length: manifest.count }, (_, i) => sessionStorage.getItem(`${key}.${manifest.generation}.${i}`)).join('');
  return Number(JSON.parse(decodeURIComponent(raw)).expires_at ?? 0);
});
// Rewrites the stored session's expiry, then wakes the SDK exactly as a tab regaining focus does.
async function moveSessionExpiry(page: Page, secondsFromNow: number) {
  await page.evaluate(seconds => {
    const key = Object.keys(sessionStorage).find(k => /^sb-[a-z0-9]+-auth-token$/.test(k));
    if (!key) throw new Error('No stored session to renew');
    const manifest = JSON.parse(sessionStorage.getItem(key)!);
    const chunk = (i: number) => `${key}.${manifest.generation}.${i}`;
    const session = JSON.parse(decodeURIComponent(Array.from({ length: manifest.count }, (_, i) => sessionStorage.getItem(chunk(i))).join('')));
    session.expires_at = Math.floor(Date.now() / 1000) + seconds;
    const encoded = encodeURIComponent(JSON.stringify(session));
    for (let i = 0; i < manifest.count; i++) sessionStorage.removeItem(chunk(i));
    manifest.count = Math.max(1, Math.ceil(encoded.length / 1500));
    for (let i = 0; i < manifest.count; i++) sessionStorage.setItem(chunk(i), encoded.slice(i * 1500, (i + 1) * 1500));
    sessionStorage.setItem(key, JSON.stringify(manifest));
  }, secondsFromNow);
  await page.evaluate(() => { window.dispatchEvent(new Event('visibilitychange')); });
}
async function fillNewPassword(page: Page, password: string, confirm = password) {
  await page.getByLabel('New password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(confirm);
  await page.getByRole('button', { name: /^Save( new password)?$/ }).click();
}
async function signIn(page: Page, password: string) {
  await page.getByRole('textbox', { name: 'Email address' }).fill('coach@example.test');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Open support and diagnostics', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.', exact: true })).toBeVisible();
}

test('RC-01 a known and an unknown email get the same screen and M12', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  const screen = async (email: string) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Send recovery email', exact: true }).click();
    await expect(page.getByText(M12, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    return {
      heading: await page.getByRole('heading').allInnerTexts(),
      buttons: await page.getByRole('button').allInnerTexts(),
      status: (await page.getByText(M12, { exact: true }).count()) > 0,
      field: await page.getByLabel('Email address', { exact: true }).count(),
    };
  };
  const known = await screen('coach@example.test');
  const unknown = await screen('nobody-fictional@example.test');
  expect(unknown).toEqual(known);
});

test('RC-02 the newest valid link in the same browser removes the code from the address bar and shows "Choose a new password."', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await requestRecovery(page);
  const newest = await requestRecovery(page);
  await page.goto(`/auth/recovery?code=fictional-newest-code&sb_flow_id=${newest}&module=coach`);
  await expect(page.getByRole('heading', { name: CHOOSE, exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/code=|sb_flow_id|fictional-newest-code/);
  expect(await page.evaluate(() => location.href)).not.toContain('fictional-newest-code');
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Confirm password', { exact: true })).toBeVisible();
  await expectNoWorkspace(page);
});

test('RC-03 reload keeps the new-password screen and never opens the workspace', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await onNewPasswordScreen(page, server);
  await page.reload();
  await expect(page.getByRole('heading', { name: CHOOSE, exact: true })).toBeVisible();
  await expectNoWorkspace(page);
});

test('RC-03 Back keeps the new-password screen and never opens the workspace', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await onNewPasswordScreen(page, server);
  await page.goBack().catch(() => null);
  await expect(page.getByRole('heading', { name: CHOOSE, exact: true })).toBeVisible();
  await expectNoWorkspace(page);
});

test('RC-03 opening the app again in the same tab keeps the new-password screen and never opens the workspace', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await onNewPasswordScreen(page, server);
  await page.goto('about:blank');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: CHOOSE, exact: true })).toBeVisible();
  await expectNoWorkspace(page);
});

test('RC-04 Cancel returns to sign-in with no session left', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await onNewPasswordScreen(page, server);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect.poll(() => storedSessionKeys(page)).toEqual([]);
  expect(Object.values(server.sessions).every(s => s.revoked), 'the recovery session must be ended on the service').toBe(true);
  expect(server.passwordSaves).toBe(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back.', exact: true })).toBeVisible();
  await expectNoWorkspace(page);
});

test('RC-05 a 15+ character password saves: M14, the workspace opens, the new password works and the old one fails', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await onNewPasswordScreen(page, server);
  await fillNewPassword(page, NEW_PASSWORD);
  await expect(page.getByText(M14, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
  expect(server.password).toBe(NEW_PASSWORD);
  await signOut(page);
  await signIn(page, OLD_PASSWORD);
  await expect(page.getByText(M08).first()).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
  await signIn(page, NEW_PASSWORD);
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
});

test('RC-05 exactly 15 characters, spaces and Unicode are accepted unchanged', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await onNewPasswordScreen(page, server);
  const fifteen = ' ünïcode wörds ';
  expect([...fifteen].length).toBe(15);
  await fillNewPassword(page, fifteen);
  await expect(page.getByText(M14, { exact: true }).first()).toBeVisible();
  expect(server.password, 'the password must not be trimmed or cut').toBe(fifteen);
});

test('RC-06 after a password change another device cannot renew its old session', async ({ page, browser, baseURL }) => {
  const server = newServer();
  const [phone, other] = await otherDevice(browser, baseURL, server, 'B');
  try {
    await login(other);
    await expect(other.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
    await setup(page, server, 'A');
    await onNewPasswordScreen(page, server);
    await fillNewPassword(page, NEW_PASSWORD);
    // Given "a password change succeeded": RC-05 owns the M14 wording; here only the saved change matters.
    await expect.poll(() => server.passwordSaves).toBe(1);
    await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
    const lifetime = (await storedExpiry(other)) - Math.floor(Date.now() / 1000);
    test.info().annotations.push({ type: 'evidence',
      description: `RC-06: the other device's current access token had ${lifetime}s left when the password changed (fictional fixture token; the real lifetime must be measured on a disposable test project).` });
    const before = server.refreshRejected;
    await moveSessionExpiry(other, -10);
    await expect(other.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(other.getByText(M18)).toBeVisible();
    await expect(other.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
    expect(server.refreshRejected, 'the old device must have tried and failed to renew').toBeGreaterThan(before);
    await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
  } finally { await phone.close(); }
});

for (const [kind, link] of [
  ['expired', (flow: string) => `/auth/recovery?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb_flow_id=${flow}`],
  ['used', (flow: string) => `/auth/recovery?code=fictional-used-code&sb_flow_id=${flow}&module=coach`],
  ['altered', (flow: string) => `/auth/recovery?code=fictional-altered-code&sb_flow_id=${flow}&module=coach`],
  ['superseded', (flow: string) => `/auth/recovery?code=fictional-superseded-code&sb_flow_id=${flow}&module=coach`],
] as const) {
  test(`RC-07 an ${kind} link changes nothing and shows M13 with a request-again button`, async ({ page }) => {
    const server = newServer();
    await setup(page, server);
    const flow = await requestRecovery(page);
    if (kind === 'superseded') await requestRecovery(page);
    await page.goto(link(flow));
    await expect(page.getByText(M13).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: CHOOSE, exact: true })).toHaveCount(0);
    await expectNoWorkspace(page);
    await expect.poll(() => storedSessionKeys(page)).toEqual([]);
    expect(server.passwordSaves).toBe(0);
    expect(server.password).toBe(OLD_PASSWORD);
    await expect(page).not.toHaveURL(/code=|error_code|sb_flow_id/);
    await page.getByRole('button', { name: /request|send (a )?new/i }).first().click();
    await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send recovery email', exact: true })).toBeVisible();
  });
}

test('RC-08 a link opened in a different browser or device changes nothing and shows M13', async ({ page, browser, baseURL }) => {
  const server = newServer();
  await setup(page, server);
  const flow = await requestRecovery(page);
  const [elsewhere, other] = await otherDevice(browser, baseURL, server, 'B');
  try {
    await other.goto(`/auth/recovery?code=fictional-valid-recovery-code&sb_flow_id=${flow}&module=coach`);
    await expect(other.getByText(M13).first()).toBeVisible();
    await expect(other.getByRole('heading', { name: CHOOSE, exact: true })).toHaveCount(0);
    await expectNoWorkspace(other);
    await expect.poll(() => storedSessionKeys(other)).toEqual([]);
    expect(Object.keys(server.sessions)).toEqual([]);
    expect(server.passwordSaves).toBe(0);
    // The requesting browser can still use its own newest link afterwards.
    await openRecoveryLink(page, flow);
  } finally { await elsewhere.close(); }
});

test('RC-09 a link carrying a raw access token is ignored', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const raw = `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: '00000000-0000-0000-0000-000000000001', exp: 4102444800, session_id: 'fictional-raw-access' })}.fictional-raw-access`;
  for (const address of [
    `/auth/recovery#access_token=${raw}&refresh_token=fictional-raw-access-refresh&expires_in=3600&token_type=bearer&type=recovery`,
    `/auth/recovery?access_token=${raw}&refresh_token=fictional-raw-access-refresh&type=recovery`,
    `/auth/callback#access_token=${raw}&refresh_token=fictional-raw-access-refresh&type=recovery`,
  ]) {
    await page.goto(address);
    await expect(page.getByRole('button', { name: /^(Sign in|Send recovery email)$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: CHOOSE, exact: true })).toHaveCount(0);
    await expectNoWorkspace(page);
    await expect.poll(() => storedSessionKeys(page)).toEqual([]);
  }
  expect(server.requests.filter(r => r.includes('RAW'))).toEqual([]);
  expect(Object.keys(server.sessions)).toEqual([]);
});

test('RC-09 a link with a foreign host is ignored', async ({ page, baseURL }) => {
  // Web browsers only hand the app its own address, so the receiving rule is checked directly as well.
  const origin = new URL(baseURL!).origin;
  for (const foreign of [
    'https://evil.example/auth/recovery?code=fictional-foreign-code',
    'https://example.supabase.co.evil.example/auth/recovery?code=fictional-foreign-code',
    'parentplus-coach://evil/recovery?code=fictional-foreign-code',
    'evilapp://auth/recovery?code=fictional-foreign-code',
  ]) expect(parseAuthLink(foreign, origin), foreign).toBeNull();
  const server = newServer();
  await setup(page, server);
  await page.goto(`/auth/recovery?redirect_to=${encodeURIComponent('https://evil.example/auth/recovery?code=fictional-foreign-code')}`);
  await expect(page.getByRole('heading', { name: CHOOSE, exact: true })).toHaveCount(0);
  await expectNoWorkspace(page);
  expect(server.pkce).toEqual([]);
  expect(Object.keys(server.sessions)).toEqual([]);
});

test('RC-10 a password under 15 characters shows M03, saves nothing and keeps the entries', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await onNewPasswordScreen(page, server);
  const fourteen = 'fourteen-chars';
  expect(fourteen.length).toBe(14);
  await fillNewPassword(page, fourteen);
  await expect(page.getByText(M03, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: CHOOSE, exact: true })).toBeVisible();
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue(fourteen);
  await expect(page.getByLabel('Confirm password', { exact: true })).toHaveValue(fourteen);
  expect(server.passwordSaves).toBe(0);
  expect(server.password).toBe(OLD_PASSWORD);
  await expectNoWorkspace(page);
});

test('RC-10 a mismatched confirmation shows M04, saves nothing and keeps the entries', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await onNewPasswordScreen(page, server);
  await fillNewPassword(page, NEW_PASSWORD, `${NEW_PASSWORD}x`);
  await expect(page.getByText(M04, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(M03, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: CHOOSE, exact: true })).toBeVisible();
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue(NEW_PASSWORD);
  await expect(page.getByLabel('Confirm password', { exact: true })).toHaveValue(`${NEW_PASSWORD}x`);
  expect(server.passwordSaves).toBe(0);
  await expectNoWorkspace(page);
});
