// LOCKED acceptance tests for docs/product/login-signin-verification/ACCEPTANCE.md (AI Org AGENTS.md §7A).
// Written by Quinn (QA) before the feature exists. Only an `ai:contract` PR may change this file;
// a build PR must make these pass WITHOUT editing, skipping or deleting them (contract-lock enforces it).
//
// Simulation notes (all fictional, no request leaves the browser):
// - ../support/backend answers every Supabase request. `signinServer` sits on top of it and keeps one
//   fictional auth service in Node, shared by every page and browser context of a test. It holds accounts
//   (email, password, confirmed), answers password sign-in the way the hosted service does
//   (invalid_credentials for a wrong password AND an unknown email, email_not_confirmed, and 429
//   over_request_rate_limit once too many attempts were made), can drop the connection or hang, and can
//   fail with a raw 500 whose text must never be shown.
// - SIMULATED EMAIL DELIVERY (SI-09, SI-11, SI-12): no real inbox is used. When the app asks the service to
//   send a confirmation (/signup, or /resend type "signup" for an unconfirmed account), the fictional
//   service records a delivered email whose link is the app's own redirect address plus a one-time code,
//   exactly as the hosted service builds it after its verify step. "Opening the email" = the test opening
//   that recorded link; "the email is verified" = the service marking the account confirmed when the link
//   is used (as the hosted verify step does before redirecting). Real delivery, real inbox timing and
//   opening the link from a real mail app are NOT run here (S/M level on a disposable test project).
// - "Another device" is a separate Playwright browser context: it shares no storage with the browser that
//   asked for the email, as another phone or browser would.
// - Time: the 60-second Resend wait and the 15-second request limit use Playwright's page.clock, so no test
//   waits in real time. The clock keeps running across a reload of the same page.
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { backend } from '../support/backend';

const M01 = 'Enter a valid email address.';
const M02 = 'Enter your password.';
const M03 = 'Choose a password with at least 15 characters. A few unrelated words work well.';
const M08 = 'Check your email and password, then try again.';
const M09 = 'Open your confirmation email before signing in.';
const M10 = 'Too many attempts. Please wait a little before trying again.';
const M11 = 'This request could not finish. Check your connection and try again.';
const M16 = 'We could not sign you in from this link. Try signing in. If your email is not confirmed yet, request a new link.';
const M17 = 'If this email still needs confirming, a new message will arrive.';
const RESEND = /^Resend confirmation email/;
const REFERENCE = /Reference: [A-Za-z0-9][A-Za-z0-9-]{3,}/;
const SETUP = 'Your academy, your way.';
const CHECK_EMAIL = 'Check your email';

const COACH = 'coach@example.test';
const PASSWORD = 'fictional clay window river words';
const NEW_COACH = 'new-coach@example.test';
const UNVERIFIED = 'unverified-coach@example.test';
const RAW = 'Fictional raw service failure: relation auth.users lock timeout';
const RAW_PARTS = ['Invalid login credentials', 'Email not confirmed', 'invalid_credentials', 'email_not_confirmed',
  'over_request_rate_limit', 'Request rate limit reached', RAW, 'unexpected_failure', 'Failed to fetch', 'TypeError',
  'AbortError', 'signal is aborted', 'flow_state_not_found', 'code verifier', 'AuthApiError', 'AuthRetryableFetchError'];

type Account = { email: string; password: string; confirmed: boolean };
type Email = { to: string; link: string; code: string };
type ServerState = {
  accounts: Account[]; logins: { email: string; password: string }[]; sessions: number; failures: number;
  rateLimitAfter: number; mode: 'online' | 'offline' | 'hang' | 'fail500'; resendMode: 'online' | 'fail500';
  resends: string[]; emails: Email[]; codes: Record<string, { email: string; used: boolean }>;
};
declare global { interface Window { __si: (op: string, arg?: unknown) => Promise<any> } }

function newServer(accounts: Account[] = [{ email: COACH, password: PASSWORD, confirmed: true }]): ServerState {
  return { accounts: accounts.map(a => ({ ...a })), logins: [], sessions: 0, failures: 0, rateLimitAfter: 5,
    mode: 'online', resendMode: 'online', resends: [], emails: [], codes: {} };
}
let codeCounter = 0;
function deliver(server: ServerState, to: string, redirect: string) {
  const code = `fictional-confirm-code-${++codeCounter}`;
  const base = redirect || 'http://127.0.0.1:18081/auth/callback?module=coach';
  const link = `${base}${base.includes('?') ? '&' : '?'}code=${code}`;
  server.codes[code] = { email: to, used: false };
  server.emails.push({ to, link, code });
}
const emailsTo = (server: ServerState, to: string) => server.emails.filter(e => e.to === to);

async function signinServer(page: Page, server: ServerState) {
  await page.exposeFunction('__si', (op: string, arg: any) => {
    if (op === 'mode') return server.mode;
    if (op === 'login') {
      server.logins.push({ email: arg.email, password: arg.password });
      if (server.failures >= server.rateLimitAfter) return 'rate';
      const account = server.accounts.find(a => a.email === arg.email);
      if (!account || account.password !== arg.password) { server.failures++; return 'invalid'; }
      if (!account.confirmed) return 'unconfirmed';
      return 'ok';
    }
    if (op === 'issued') { server.sessions++; return null; }
    if (op === 'signup') {
      if (!server.accounts.some(a => a.email === arg.email)) {
        server.accounts.push({ email: arg.email, password: arg.password, confirmed: false });
        deliver(server, arg.email, arg.redirect);
      }
      return null;
    }
    if (op === 'resend') {
      server.resends.push(arg.email);
      if (server.resendMode === 'fail500') return 'fail';
      const account = server.accounts.find(a => a.email === arg.email);
      if (account && !account.confirmed && arg.type === 'signup') deliver(server, arg.email, arg.redirect);
      return 'ok';
    }
    if (op === 'pkce') {
      const issued = server.codes[arg];
      if (!issued || issued.used) return false;
      issued.used = true;
      const account = server.accounts.find(a => a.email === issued.email);
      if (account) account.confirmed = true;
      return true;
    }
    return null;
  });
  await page.addInitScript(() => {
    const inner = window.fetch;
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status,
      headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } });
    window.fetch = async (input, init) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, window.location.origin);
      if (!url.hostname.endsWith('.supabase.co')) return inner(input, init);
      const mode = await window.__si('mode');
      if (mode === 'offline') throw new TypeError('Failed to fetch');
      if (mode === 'hang') {
        return new Promise<Response>((_, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) reject(new DOMException('signal is aborted without reason', 'AbortError'));
          signal?.addEventListener('abort', () => reject(new DOMException('signal is aborted without reason', 'AbortError')));
        });
      }
      let body: Record<string, any> = {};
      try { body = init?.body ? JSON.parse(String(init.body)) : {}; } catch { /* not JSON */ }
      const grant = url.searchParams.get('grant_type') ?? '';
      const redirect = url.searchParams.get('redirect_to') ?? '';
      if (url.pathname.endsWith('/token')) {
        if (mode === 'fail500') return json({ code: 'unexpected_failure', error_code: 'unexpected_failure', msg: 'Fictional raw service failure: relation auth.users lock timeout' }, 500);
        if (grant === 'password') {
          const result = await window.__si('login', { email: body.email, password: body.password });
          if (result === 'rate') return json({ code: 'over_request_rate_limit', error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' }, 429);
          if (result === 'invalid') return json({ code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
          if (result === 'unconfirmed') return json({ code: 'email_not_confirmed', error_code: 'email_not_confirmed', msg: 'Email not confirmed' }, 400);
        }
        if (grant === 'pkce' && !(await window.__si('pkce', body.auth_code)))
          return json({ code: 'flow_state_not_found', error_code: 'flow_state_not_found', msg: 'invalid flow state, no valid flow state found' }, 404);
        const response = await inner(input, init);
        if (response.ok) await window.__si('issued');
        return response;
      }
      if (url.pathname.endsWith('/signup')) {
        await window.__si('signup', { email: body.email, password: body.password, redirect });
        const now = new Date().toISOString();
        const fake = crypto.randomUUID();
        return json({ id: fake, aud: 'authenticated', role: 'authenticated', email: body.email, phone: '',
          confirmation_sent_at: now, app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {},
          identities: [], created_at: now, updated_at: now, is_anonymous: false });
      }
      if (url.pathname.endsWith('/resend')) {
        const result = await window.__si('resend', { email: body.email, type: body.type, redirect });
        if (result === 'fail') return json({ code: 'unexpected_failure', error_code: 'unexpected_failure', msg: 'Fictional raw service failure: relation auth.users lock timeout' }, 500);
        return json({});
      }
      return inner(input, init);
    };
  });
}

async function setup(page: Page, server: ServerState, academy = false) {
  await backend(page, { academy });
  await signinServer(page, server);
}
async function newDevice(browser: Browser, baseURL: string | undefined, server: ServerState): Promise<[BrowserContext, Page]> {
  const context = await browser.newContext({ baseURL, viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  await setup(page, server);
  return [context, page];
}
const emailField = (page: Page) => page.getByLabel('Email address', { exact: true });
const passwordField = (page: Page) => page.getByLabel('Password', { exact: true });
const resendButton = (page: Page) => page.getByRole('button', { name: RESEND });
async function tapResend(page: Page) {
  await expect(resendButton(page).first(), 'a "Resend confirmation email" button is shown').toBeVisible();
  await resendButton(page).first().click();
}
const startsWith = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
async function signIn(page: Page, email: string, password: string) {
  if (!(await emailField(page).isVisible())) await page.goto('/');
  await emailField(page).fill(email);
  await passwordField(page).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function signUp(page: Page, email: string, password = PASSWORD) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await emailField(page).fill(email);
  await passwordField(page).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  // Setup step only: the sign-up contract (C1.1c) owns the panel wording.
  await expect(page.getByText(CHECK_EMAIL, { exact: true }).first()).toBeVisible();
}
const storedSessionKeys = (page: Page) => page.evaluate(() => [...Object.keys(sessionStorage), ...Object.keys(localStorage)]
  .filter(key => key.includes('auth-token') && !key.includes('code-verifier')));
async function expectNoWorkspace(page: Page) {
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: SETUP, exact: true })).toHaveCount(0);
}
async function expectNoSession(page: Page, server: ServerState) {
  await expectNoWorkspace(page);
  await expect.poll(() => storedSessionKeys(page)).toEqual([]);
  expect(server.sessions, 'no session may be issued').toBe(0);
}
async function expectSafeFailure(page: Page) {
  await expect(page.getByText(REFERENCE).first(), 'a failed request shows "Reference: <code>"').toBeVisible();
  const text = await page.locator('body').innerText();
  for (const part of RAW_PARTS) expect(text, `raw service text "${part}" must not show`).not.toContain(part);
}
// Visible screen, with the per-request reference code and any countdown digits made neutral.
async function screen(page: Page) {
  const tidy = (value: string) => value.replace(/Reference: \S+/g, 'Reference: X').replace(/\d+/g, 'N');
  return {
    headings: (await page.getByRole('heading').allInnerTexts()).map(tidy),
    buttons: (await page.getByRole('button').allInnerTexts()).map(tidy),
    alerts: await page.getByRole('alert').count(),
    text: tidy(await page.locator('body').innerText()),
  };
}
// Seconds shown by the Resend countdown, or null if no countdown is visible.
async function countdown(page: Page): Promise<number | null> {
  const text = await page.locator('body').innerText();
  const match = text.match(/(\d{1,2})\s*(?:s\b|sec\b|secs\b|seconds?\b)|0?(\d):(\d{2})/i);
  if (!match) return null;
  return match[1] !== undefined ? Number(match[1]) : Number(match[2]) * 60 + Number(match[3]);
}
async function expectWaiting(page: Page, atMost = 60) {
  await expect(resendButton(page).first()).toBeVisible();
  await expect(resendButton(page).first(), 'Resend is off during the wait').toBeDisabled();
  await expect.poll(() => countdown(page), 'a visible countdown in seconds').not.toBeNull();
  const seconds = (await countdown(page))!;
  expect(seconds).toBeGreaterThan(0);
  expect(seconds).toBeLessThanOrEqual(atMost);
  return seconds;
}

test('SI-01 a verified coach with correct credentials reaches the workspace', async ({ page }) => {
  const server = newServer();
  await setup(page, server, true);
  await signIn(page, COACH, PASSWORD);
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
  expect(server.sessions).toBe(1);
});

test('SI-01 a verified coach with no academy reaches academy setup', async ({ page }) => {
  const server = newServer();
  await setup(page, server, false);
  await signIn(page, COACH, PASSWORD);
  await expect(page.getByRole('heading', { name: SETUP, exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
});

test('SI-02 a wrong password and an unknown email show the identical M08 and create no session', async ({ page }) => {
  const server = newServer();
  await setup(page, server, true);
  await signIn(page, COACH, 'wrong fictional password words');
  await expect(page.getByText(startsWith(M08)).first()).toBeVisible();
  await expectNoSession(page, server);
  const wrong = await screen(page);
  await page.goto('/');
  await signIn(page, 'nobody-fictional@example.test', PASSWORD);
  await expect(page.getByText(startsWith(M08)).first()).toBeVisible();
  await expectNoSession(page, server);
  const unknown = await screen(page);
  expect(unknown).toEqual(wrong);
  await expect(page.getByText(M09)).toHaveCount(0);
  await expect(resendButton(page)).toHaveCount(0);
});

test('SI-03 an unverified account shows M09 with a working Resend action and opens no workspace', async ({ page }) => {
  const server = newServer([{ email: UNVERIFIED, password: PASSWORD, confirmed: false }]);
  await setup(page, server);
  await signIn(page, UNVERIFIED, PASSWORD);
  await expect(page.getByText(startsWith(M09)).first()).toBeVisible();
  await expectNoSession(page, server);
  await expect(resendButton(page).first(), 'Resend sits next to M09').toBeVisible();
  await expect(resendButton(page).first()).toBeEnabled();
  await tapResend(page);
  await expect(page.getByText(M17).first()).toBeVisible();
  await expect.poll(() => emailsTo(server, UNVERIFIED).length, 'the service was asked to send a new confirmation').toBe(1);
  await expectNoSession(page, server);
});

for (const length of [10, 14]) {
  test(`SI-04 an older account with a ${length}-character password signs in and is not forced to change it`, async ({ page }) => {
    const legacy = 'legacypass-fourteen'.slice(0, length);
    expect(legacy.length).toBe(length);
    const server = newServer([{ email: COACH, password: legacy, confirmed: true }]);
    await setup(page, server, true);
    await signIn(page, COACH, legacy);
    await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choose a new password.', exact: true })).toHaveCount(0);
    await expect(page.getByText(M03)).toHaveCount(0);
    expect(server.logins).toEqual([{ email: COACH, password: legacy }]);
  });
}

test('SI-05 an empty password shows M02 and sends nothing', async ({ page }) => {
  const server = newServer();
  await setup(page, server, true);
  await signIn(page, COACH, '');
  await expect(page.getByText(startsWith(M02)).first()).toBeVisible();
  await expect(emailField(page)).toHaveValue(COACH);
  await expect(page.getByText(M01)).toHaveCount(0);
  expect(server.logins).toEqual([]);
  await expectNoSession(page, server);
});

for (const kind of ['offline', 'hang'] as const) {
  test(`SI-06 a ${kind === 'offline' ? 'lost connection' : 'request taking over 15 seconds'} shows M11, keeps the entries, and retry works once online`, async ({ page }) => {
    const server = newServer();
    await page.clock.install();
    await setup(page, server, true);
    await page.goto('/');
    server.mode = kind;
    await signIn(page, COACH, PASSWORD);
    if (kind === 'hang') await page.clock.fastForward(16_000);
    await expect(page.getByText(startsWith(M11)).first()).toBeVisible();
    await expect(emailField(page)).toHaveValue(COACH);
    await expect(passwordField(page)).toHaveValue(PASSWORD);
    await expectNoSession(page, server);
    server.mode = 'online';
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
  });
}

test('SI-07 too many attempts show M10 and create no session, even with the right password', async ({ page }) => {
  const server = newServer();
  await setup(page, server, true);
  for (let i = 0; i < server.rateLimitAfter; i++) {
    await signIn(page, COACH, `wrong fictional attempt ${i}`);
    await expect(page.getByText(startsWith(M08)).first()).toBeVisible();
    await page.goto('/');
  }
  await signIn(page, COACH, PASSWORD);
  await expect(page.getByText(startsWith(M10)).first()).toBeVisible();
  await expect(page.getByText(startsWith(M08))).toHaveCount(0);
  await expectNoSession(page, server);
});

for (const [kind, prepare, message] of [
  ['wrong credentials', (s: ServerState) => s, M08],
  ['unverified email', (s: ServerState) => { s.accounts[0].confirmed = false; return s; }, M09],
  ['rate limit', (s: ServerState) => { s.rateLimitAfter = 0; return s; }, M10],
  ['lost connection', (s: ServerState) => { s.mode = 'offline'; return s; }, M11],
  ['raw 500 service error', (s: ServerState) => { s.mode = 'fail500'; return s; }, M11],
] as const) {
  test(`SI-08 a failed sign-in (${kind}) shows a reference code and no raw service error`, async ({ page }) => {
    const server = prepare(newServer());
    await setup(page, server, true);
    await signIn(page, COACH, kind === 'wrong credentials' ? 'wrong fictional password words' : PASSWORD);
    await expect(page.getByText(startsWith(message)).first()).toBeVisible();
    await expectSafeFailure(page);
    await expectNoSession(page, server);
  });
}

test('SI-08 a failed Resend request shows a reference code and no raw service error', async ({ page }) => {
  const server = newServer([{ email: UNVERIFIED, password: PASSWORD, confirmed: false }]);
  await setup(page, server);
  await signIn(page, UNVERIFIED, PASSWORD);
  await expect(page.getByText(startsWith(M09)).first()).toBeVisible();
  server.resendMode = 'fail500';
  await tapResend(page);
  await expect.poll(() => server.resends.length).toBe(1);
  await expect(page.getByText(startsWith(M11)).first()).toBeVisible();
  await expectSafeFailure(page);
});

test('SI-09 Resend on the Check-your-email panel sends a new email (simulated delivery), then waits 60 seconds with a countdown', async ({ page }) => {
  const server = newServer();
  await page.clock.install();
  await setup(page, server);
  await signUp(page, NEW_COACH);
  expect(emailsTo(server, NEW_COACH), 'sign-up delivered the first email (simulated)').toHaveLength(1);
  await expect(resendButton(page).first(), 'Resend is on the Check-your-email panel').toBeVisible();
  // Any wait started by the sign-up email itself is over after 61 seconds.
  await page.clock.fastForward(61_000);
  await expect(resendButton(page).first()).toBeEnabled();
  await tapResend(page);
  await expect(page.getByText(M17).first()).toBeVisible();
  await expect.poll(() => emailsTo(server, NEW_COACH).length, 'a new email arrives (simulated)').toBe(2);
  const start = await expectWaiting(page);
  expect(start).toBeGreaterThanOrEqual(55);
  await resendButton(page).first().click({ force: true });
  expect(server.resends, 'a tap during the wait sends nothing').toEqual([NEW_COACH]);
  await page.clock.fastForward(20_000);
  await expect.poll(() => countdown(page), 'the countdown goes down').toBeLessThanOrEqual(start - 15);
  await expectWaiting(page, 45);
  await page.clock.fastForward(41_000);
  await expect(resendButton(page).first(), 'Resend is on again after 60 seconds').toBeEnabled();
  await tapResend(page);
  await expect.poll(() => emailsTo(server, NEW_COACH).length).toBe(3);
  await expectWaiting(page);
});

test('SI-09 the Resend wait started at sign-in survives a reload', async ({ page }) => {
  const server = newServer([{ email: UNVERIFIED, password: PASSWORD, confirmed: false }]);
  await page.clock.install();
  await setup(page, server);
  await signIn(page, UNVERIFIED, PASSWORD);
  await expect(page.getByText(startsWith(M09)).first()).toBeVisible();
  await tapResend(page);
  await expect(page.getByText(M17).first()).toBeVisible();
  await expect.poll(() => emailsTo(server, UNVERIFIED).length, 'a new email arrives (simulated)').toBe(1);
  await expectWaiting(page);
  await page.clock.fastForward(20_000);
  await page.reload();
  await signIn(page, UNVERIFIED, PASSWORD);
  await expect(page.getByText(startsWith(M09)).first()).toBeVisible();
  const left = await expectWaiting(page, 41);
  expect(left, 'the wait continued, it did not restart').toBeGreaterThanOrEqual(30);
  await resendButton(page).first().click({ force: true });
  expect(server.resends).toEqual([UNVERIFIED]);
  await page.clock.fastForward(41_000);
  await expect(resendButton(page).first()).toBeEnabled();
  await tapResend(page);
  await expect.poll(() => emailsTo(server, UNVERIFIED).length).toBe(2);
});

test('SI-10 Resend after M09 shows the same neutral M17 whether the email is unverified, already verified or unknown', async ({ browser, baseURL }) => {
  const screens: Record<string, Awaited<ReturnType<typeof screen>>> = {};
  for (const kind of ['unverified', 'verified', 'unknown'] as const) {
    const server = newServer([{ email: UNVERIFIED, password: PASSWORD, confirmed: false }]);
    const [context, page] = await newDevice(browser, baseURL, server);
    try {
      await signIn(page, UNVERIFIED, PASSWORD);
      await expect(page.getByText(startsWith(M09)).first()).toBeVisible();
      // Between seeing M09 and tapping Resend the account is confirmed elsewhere, or no longer exists.
      if (kind === 'verified') server.accounts[0].confirmed = true;
      if (kind === 'unknown') server.accounts = [];
      await tapResend(page);
      await expect(page.getByText(M17, { exact: true }).first()).toBeVisible();
      await expect(page.getByText(REFERENCE)).toHaveCount(0);
      expect(server.resends).toEqual([UNVERIFIED]);
      screens[kind] = await screen(page);
    } finally { await context.close(); }
  }
  expect(screens.verified).toEqual(screens.unverified);
  expect(screens.unknown).toEqual(screens.unverified);
});

test('SI-10 Resend on the Check-your-email panel shows the same M17 for a new and an already verified email', async ({ browser, baseURL }) => {
  const screens: Record<string, Awaited<ReturnType<typeof screen>>> = {};
  for (const [kind, email] of [['new', NEW_COACH], ['verified', COACH]] as const) {
    const server = newServer();
    const [context, page] = await newDevice(browser, baseURL, server);
    try {
      await page.clock.install();
      await signUp(page, email);
      await page.clock.fastForward(61_000);
      await tapResend(page);
      await expect(page.getByText(M17, { exact: true }).first()).toBeVisible();
      expect(server.resends).toEqual([email]);
      screens[kind] = await screen(page);
      if (kind === 'verified') expect(emailsTo(server, COACH), 'a verified account gets no email').toEqual([]);
    } finally { await context.close(); }
  }
  expect(screens.verified).toEqual(screens.new);
});

test('SI-11 the confirmation link opened on the same device signs the coach in and reaches academy setup (simulated delivery)', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await signUp(page, NEW_COACH);
  const email = emailsTo(server, NEW_COACH).at(-1);
  expect(email, 'simulated delivery recorded the confirmation email').toBeTruthy();
  await page.goto(email!.link);
  await expect(page.getByRole('heading', { name: SETUP, exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/code=/);
  expect(server.accounts.find(a => a.email === NEW_COACH)!.confirmed).toBe(true);
  expect(server.sessions).toBe(1);
  await expect(page.getByText(M16)).toHaveCount(0);
});

// Sign in from M16 and land in academy setup (proves the account is verified and M16's button works).
async function signInFromM16(page: Page) {
  await expect(page.getByRole('button', { name: 'Sign in', exact: true }).first(), 'M16 offers a Sign in button').toBeVisible();
  if (!(await emailField(page).isVisible())) await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
  await signIn(page, NEW_COACH, PASSWORD);
  await expect(page.getByRole('heading', { name: SETUP, exact: true })).toBeVisible();
}
async function expectM16NeverClaimsUnverified(page: Page) {
  await expect(page.getByText(startsWith(M16)).first()).toBeVisible();
  const text = (await page.locator('body').innerText()).split(M16).join(' ');
  expect(text).not.toMatch(/unverified|not (yet )?(verified|confirmed)|verify your email|Open your confirmation email/i);
  await expect(page).not.toHaveURL(/code=|error_code|sb_flow_id/);
}

test('SI-12 a confirmation link opened on another device shows M16 with Sign in and never says the email is unverified', async ({ page, browser, baseURL }) => {
  const server = newServer();
  await setup(page, server);
  await signUp(page, NEW_COACH);
  const email = emailsTo(server, NEW_COACH).at(-1)!;
  const [phone, other] = await newDevice(browser, baseURL, server);
  try {
    // Simulated: the hosted verify step confirms the email before it redirects to the app.
    server.accounts.find(a => a.email === NEW_COACH)!.confirmed = true;
    await other.goto(email.link);
    await expectM16NeverClaimsUnverified(other);
    await expectNoWorkspace(other);
    expect(server.sessions).toBe(0);
    await signInFromM16(other);
  } finally { await phone.close(); }
});

test('SI-12 an expired confirmation link shows M16 with Sign in', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await signUp(page, NEW_COACH);
  const flow = new URL(emailsTo(server, NEW_COACH).at(-1)!.link).searchParams.get('sb_flow_id') ?? '';
  await page.goto(`/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired${flow ? `&sb_flow_id=${flow}` : ''}&module=coach`);
  await expect(page.getByText(startsWith(M16)).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true }).first()).toBeVisible();
  await expectNoSession(page, server);
  await expect(page).not.toHaveURL(/error_code|otp_expired|sb_flow_id/);
});

test('SI-12 an already used confirmation link shows M16 with Sign in and never says the email is unverified', async ({ page, context }) => {
  const server = newServer();
  await setup(page, server);
  await signUp(page, NEW_COACH);
  const email = emailsTo(server, NEW_COACH).at(-1)!;
  await page.goto(email.link);
  await expect(page.getByRole('heading', { name: SETUP, exact: true })).toBeVisible();
  const second = await context.newPage();
  await setup(second, server);
  await second.goto(email.link);
  await expectM16NeverClaimsUnverified(second);
  await expectNoWorkspace(second);
  expect(server.sessions).toBe(1);
  await signInFromM16(second);
});

test('Login-wide: no password, token or email code appears in console logs, diagnostics, storage, screen or page URL after failed sign-ins', async ({ page, browser, baseURL }) => {
  const secret = 'fictional-secret-password-Q7 words';
  const server = newServer([{ email: COACH, password: PASSWORD, confirmed: true }, { email: UNVERIFIED, password: secret, confirmed: false }]);
  const logs: string[] = [];
  const watch = (p: Page) => {
    p.on('console', message => logs.push(message.text()));
    p.on('pageerror', error => logs.push(`${error.message}\n${error.stack ?? ''}`));
  };
  watch(page);
  await setup(page, server, true);
  const urls: string[] = [];
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) urls.push(frame.url()); });
  await signIn(page, COACH, secret);                           // wrong password
  await expect(page.getByText(startsWith(M08)).first()).toBeVisible();
  await signIn(page, UNVERIFIED, secret);                      // unverified
  await expect(page.getByText(startsWith(M09)).first()).toBeVisible();
  server.mode = 'fail500';
  await signIn(page, COACH, secret);                           // raw service failure
  await expect(page.getByText(REFERENCE).first()).toBeVisible();
  server.mode = 'offline';
  await signIn(page, COACH, secret);                           // lost connection
  await expect(page.getByText(startsWith(M11)).first()).toBeVisible();
  server.mode = 'online';
  // A confirmation link that cannot sign in (another device): its one-time code must not be kept anywhere.
  server.accounts.push({ email: NEW_COACH, password: PASSWORD, confirmed: false });
  deliver(server, NEW_COACH, `${baseURL ?? 'http://127.0.0.1:18081'}/auth/callback?module=coach&sb_flow_id=fictionalflow0001`);
  const link = server.emails.at(-1)!;
  const [elsewhere, other] = await newDevice(browser, baseURL, server);
  watch(other);
  try {
    await other.goto(link.link);
    await expect(other.getByRole('button', { name: 'Sign in', exact: true }).first()).toBeVisible();
    await expect(other).not.toHaveURL(new RegExp(link.code));
    const history = await other.evaluate(() => location.href);
    expect(history).not.toContain(link.code);
    const otherStore = await other.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    expect(otherStore).not.toContain(link.code);
  } finally { await elsewhere.close(); }
  const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  const shown = await page.locator('body').innerText();
  const inputs = await page.evaluate(() => [...document.querySelectorAll('input')].filter(i => i.type !== 'password').map(i => i.value));
  for (const [where, value] of [['console logs', logs.join('\n')], ['stored diagnostics and storage', stored],
    ['screen text', shown], ['visible text fields', inputs.join('\n')], ['page URLs', [...urls, page.url()].join('\n')]] as const) {
    expect(value, `password in ${where}`).not.toContain(secret);
    expect(value, `email code in ${where}`).not.toContain(link.code);
    expect(value, `token in ${where}`).not.toMatch(/fictional-refresh-token|fictional_signature|access_token=/);
  }
  expect(logs.join('\n'), 'no email code in other-device logs').not.toContain(link.code);
});
