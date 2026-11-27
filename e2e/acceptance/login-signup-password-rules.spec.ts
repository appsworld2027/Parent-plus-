// LOCKED acceptance tests for docs/product/login-signup-password-rules/ACCEPTANCE.md (AI Org AGENTS.md §7A).
// Written by Quinn (QA) before the feature exists. Only an `ai:contract` PR may change this file;
// a build PR must make these pass WITHOUT editing, skipping or deleting them (contract-lock enforces it).
//
// Simulation notes (all fictional, no request leaves the browser):
// - ../support/backend answers every Supabase request. `signupServer` sits on top of it and keeps one
//   fictional auth service in Node for the test. It answers /signup the way the hosted service does:
//   a new email gets an unverified account and no session; an email that already has an account gets the
//   same-looking answer (no identities) and nothing changes; a listed common/breached password and any
//   password under 15 characters are refused with code `weak_password`; and, like bcrypt, it keeps only
//   the first 72 bytes of a password (so an app that sends a longer one has been cut silently).
// - The fictional service is deliberately case-SENSITIVE for email keys, so SU-09 proves the app itself
//   prevents a second account by letter case rather than relying on the service. The real service's own
//   case folding is a real-service check and is not run here.
// - Decision D1: a password is accepted up to 72 bytes of UTF-8; longer is refused with M21 before any
//   request and is never cut. Hindi letters such as "क" take 3 bytes, so 24 of them are exactly 72 bytes.
// - SU-12 (service refuses a 14-character password when the app is bypassed) needs a disposable real test
//   project; against this fixture it would only test the fixture, so it is `fixme` (= NOT RUN).
import { expect, test, type Page } from '@playwright/test';
import { backend } from '../support/backend';

const M01 = 'Enter a valid email address.';
const M03 = 'Choose a password with at least 15 characters. A few unrelated words work well.';
const M04 = 'The passwords do not match.';
const M05 = 'This password is too easy to guess or has appeared in a data leak. Choose a different one.';
const M07 = 'If this email can be registered, a confirmation message will arrive. Open it on this device. Already have an account? Sign in or reset your password.';
const M11_START = 'This request could not finish.';
const M21 = 'Choose a password up to 72 bytes long. Letters in other scripts use more than one byte each.';
const CHECK_EMAIL = 'Check your email';

const EMAIL = 'new-coach@example.test';
const EXISTING_EMAIL = 'coach@example.test';
const EXISTING_PASSWORD = 'existing fictional clay window words';
const GOOD_PASSWORD = 'fictional clay bowl river';
const COMMON_PASSWORD = 'passwordpassword1';
const HINDI = 'क'; // U+0915, 3 bytes in UTF-8

const bytes = (value: string) => Buffer.byteLength(value, 'utf8');
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type Account = { email: string; password: string; confirmed: boolean };
type ServerState = { accounts: Account[]; signups: { email: string; password: string }[]; common: string[] };
declare global { interface Window { __su: (op: string, arg?: unknown) => Promise<any> } }

function newServer(existing = false): ServerState {
  return { accounts: existing ? [{ email: EXISTING_EMAIL, password: EXISTING_PASSWORD, confirmed: true }] : [],
    signups: [], common: [COMMON_PASSWORD] };
}
// Keeps the first 72 bytes, as bcrypt does.
function cut72(value: string) {
  const buf = Buffer.from(value, 'utf8');
  return buf.length <= 72 ? value : buf.subarray(0, 72).toString('utf8');
}

async function signupServer(page: Page, server: ServerState) {
  await page.exposeFunction('__su', (op: string, arg: any) => {
    if (op !== 'signup') return null;
    server.signups.push({ email: arg.email, password: arg.password });
    if (typeof arg.password !== 'string' || [...arg.password].length < 15) return { kind: 'weak', reasons: ['length'] };
    if (server.common.includes(arg.password)) return { kind: 'weak', reasons: ['pwned'] };
    const existing = server.accounts.find(a => a.email === arg.email); // case-sensitive on purpose
    if (existing) return { kind: 'existing' };
    server.accounts.push({ email: arg.email, password: cut72(arg.password), confirmed: false });
    return { kind: 'created' };
  });
  await page.addInitScript(() => {
    const inner = window.fetch;
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status,
      headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } });
    window.fetch = async (input, init) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, window.location.origin);
      if (!url.hostname.endsWith('.supabase.co') || !url.pathname.endsWith('/signup')) return inner(input, init);
      let body: Record<string, any> = {};
      try { body = init?.body ? JSON.parse(String(init.body)) : {}; } catch { /* not JSON */ }
      const result = await window.__su('signup', { email: body.email, password: body.password });
      if (result.kind === 'weak') return json({ code: 'weak_password', error_code: 'weak_password',
        msg: 'Password is known to be weak and easy to guess, please choose a different one.',
        weak_password: { reasons: result.reasons } }, 422);
      const now = new Date().toISOString();
      const fake = crypto.randomUUID();
      return json({ id: fake, aud: 'authenticated', role: 'authenticated', email: body.email, phone: '',
        confirmation_sent_at: now, app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {},
        identities: result.kind === 'existing' ? [] : [{ identity_id: crypto.randomUUID(), id: fake, user_id: fake,
          identity_data: { email: body.email, sub: fake }, provider: 'email', created_at: now, updated_at: now }],
        created_at: now, updated_at: now, is_anonymous: false });
    };
  });
}

async function setup(page: Page, server: ServerState) {
  await backend(page);
  await signupServer(page, server);
}
async function openSignup(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible();
}
const emailField = (page: Page) => page.getByLabel('Email address', { exact: true });
const passwordField = (page: Page) => page.getByLabel('Password', { exact: true });
const confirmField = (page: Page) => page.getByLabel('Confirm password', { exact: true });
async function fillSignup(page: Page, email: string, password: string, confirm = password) {
  await emailField(page).fill(email);
  await passwordField(page).fill(password);
  await confirmField(page).fill(confirm);
}
async function submit(page: Page) {
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
}
// Pastes text the way a clipboard or password manager inserts it (one insertion, not typed keys).
async function paste(page: Page, field: ReturnType<typeof passwordField>, value: string) {
  await field.click();
  await field.press('ControlOrMeta+a');
  await page.keyboard.insertText(value);
}
async function expectNoPasswordLeftOnScreen(page: Page, password: string) {
  for (const field of [passwordField(page), confirmField(page)]) {
    if (await field.count()) await expect(field).toHaveValue('');
  }
  const values = await page.evaluate(() => [...document.querySelectorAll('input, textarea')].map(e => (e as HTMLInputElement).value));
  expect(values.filter(v => v.includes(password)), 'no field may still hold the password').toEqual([]);
}
async function expectCheckEmail(page: Page) {
  await expect(page.getByText(CHECK_EMAIL, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(M07, { exact: true }).first()).toBeVisible();
}

test('SU-01 a new email and a 15-character password show M07 on a "Check your email" panel, clear both password fields and create an unverified account', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await openSignup(page);
  const fifteen = 'clay bowl river';
  expect([...fifteen].length).toBe(15);
  await fillSignup(page, EMAIL, fifteen);
  await submit(page);
  await expectCheckEmail(page);
  await expect(page.getByRole('heading', { name: CHECK_EMAIL, exact: true })).toBeVisible();
  await expectNoPasswordLeftOnScreen(page, fifteen);
  expect(server.accounts).toEqual([{ email: EMAIL, password: fifteen, confirmed: false }]);
});

test('SU-02 a 14-character password shows M03, keeps the entries and sends nothing', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await openSignup(page);
  const fourteen = 'fourteen-chars';
  expect(fourteen.length).toBe(14);
  await fillSignup(page, EMAIL, fourteen);
  await submit(page);
  await expect(page.getByText(M03, { exact: true }).first()).toBeVisible();
  await expect(emailField(page)).toHaveValue(EMAIL);
  await expect(passwordField(page)).toHaveValue(fourteen);
  await expect(confirmField(page)).toHaveValue(fourteen);
  expect(server.signups).toEqual([]);
  expect(server.accounts).toEqual([]);
});

test('SU-03 exactly 15 lowercase letters with no digit or symbol are accepted', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await openSignup(page);
  const letters = 'abcdefghijklmno';
  expect(letters).toMatch(/^[a-z]{15}$/);
  await fillSignup(page, EMAIL, letters);
  await submit(page);
  await expectCheckEmail(page);
  await expect(page.getByText(M03, { exact: true })).toHaveCount(0);
  expect(server.signups).toEqual([{ email: EMAIL, password: letters }]);
  expect(server.accounts).toEqual([{ email: EMAIL, password: letters, confirmed: false }]);
});

test('SU-04 a mismatched confirmation shows M04 and sends nothing', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await openSignup(page);
  await fillSignup(page, EMAIL, GOOD_PASSWORD, `${GOOD_PASSWORD}x`);
  await submit(page);
  await expect(page.getByText(M04, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(M03, { exact: true })).toHaveCount(0);
  await expect(passwordField(page)).toHaveValue(GOOD_PASSWORD);
  await expect(confirmField(page)).toHaveValue(`${GOOD_PASSWORD}x`);
  expect(server.signups).toEqual([]);
});

for (const bad of ['new-coach@example', 'new-coach.example.test', 'new coach@example.test', 'new-coach@@example.test']) {
  test(`SU-05 a malformed email "${bad}" shows M01 and sends nothing`, async ({ page }) => {
    const server = newServer();
    await setup(page, server);
    await openSignup(page);
    await fillSignup(page, bad, GOOD_PASSWORD);
    await submit(page);
    await expect(page.getByText(M01, { exact: true }).first()).toBeVisible();
    await expect(emailField(page)).toHaveValue(bad);
    expect(server.signups).toEqual([]);
  });
}

for (const [kind, value] of [
  ['73 ASCII characters', 'a'.repeat(73)],
  ['25 Hindi letters (75 bytes)', HINDI.repeat(25)],
  ['a 15-character mix over 72 bytes', `${'😀'.repeat(14)}abcdefghijklmnopqrstuvwxyz`],
] as const) {
  test(`SU-06 (D1) a password of ${kind} shows M21, is not cut and creates no account`, async ({ page }) => {
    expect(bytes(value)).toBeGreaterThan(72);
    const server = newServer();
    await setup(page, server);
    await openSignup(page);
    await fillSignup(page, EMAIL, value);
    await expect(passwordField(page), 'the field must keep the whole value').toHaveValue(value);
    await submit(page);
    await expect(page.getByText(M21, { exact: true }).first()).toBeVisible();
    await expect(passwordField(page), 'nothing is cut').toHaveValue(value);
    await expect(confirmField(page)).toHaveValue(value);
    await expect(page.getByText(M07, { exact: true })).toHaveCount(0);
    expect(server.signups, 'an over-limit password must never be sent').toEqual([]);
    expect(server.accounts).toEqual([]);
  });
}

for (const [kind, value] of [
  ['72 ASCII characters', 'b'.repeat(72)],
  ['24 Hindi letters (72 bytes)', HINDI.repeat(24)],
  ['spaces and Unicode within 72 bytes', ' ünïcode wörds with spaces '],
] as const) {
  test(`SU-06 (D1) a password of ${kind} is accepted and sent unchanged`, async ({ page }) => {
    expect(bytes(value)).toBeLessThanOrEqual(72);
    expect([...value].length).toBeGreaterThanOrEqual(15);
    const server = newServer();
    await setup(page, server);
    await openSignup(page);
    await fillSignup(page, EMAIL, value);
    await submit(page);
    await expectCheckEmail(page);
    await expect(page.getByText(M21, { exact: true })).toHaveCount(0);
    expect(server.signups, 'never trimmed or cut').toEqual([{ email: EMAIL, password: value }]);
  });
}

test('SU-07 a pasted over-long value is kept whole (no silent cut at 200) so it can be refused with M21', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await openSignup(page);
  const long = `${'fictional pasted words '.repeat(11)}end`; // 256 characters
  expect(long.length).toBeGreaterThan(200);
  await emailField(page).fill(EMAIL);
  await paste(page, passwordField(page), long);
  await paste(page, confirmField(page), long);
  await expect(passwordField(page)).toHaveValue(long);
  await expect(confirmField(page)).toHaveValue(long);
  await submit(page);
  await expect(page.getByText(M21, { exact: true }).first()).toBeVisible();
  await expect(passwordField(page)).toHaveValue(long);
  expect(server.signups).toEqual([]);
  expect(server.accounts).toEqual([]);
});

test('SU-08 an email that already has an account gets the same screen and M07 as a new email, no second account and an unchanged password', async ({ page }) => {
  const server = newServer(true);
  await setup(page, server);
  const screen = async (email: string) => {
    await openSignup(page);
    await fillSignup(page, email, GOOD_PASSWORD);
    await submit(page);
    await expectCheckEmail(page);
    await expect(page.getByRole('alert')).toHaveCount(0);
    return {
      headings: await page.getByRole('heading').allInnerTexts(),
      buttons: await page.getByRole('button').allInnerTexts(),
      fields: await page.getByRole('textbox').count(),
      m07: await page.getByText(M07, { exact: true }).count(),
      connection: await page.getByText(M11_START).count(),
    };
  };
  const fresh = await screen(EMAIL);
  const existing = await screen(EXISTING_EMAIL);
  expect(existing).toEqual(fresh);
  expect(server.accounts.filter(a => a.email.toLowerCase() === EXISTING_EMAIL)).toEqual(
    [{ email: EXISTING_EMAIL, password: EXISTING_PASSWORD, confirmed: true }]);
});

test('SU-09 the same email in different letter case creates no second account', async ({ page }) => {
  const server = newServer(true);
  await setup(page, server);
  await openSignup(page);
  await fillSignup(page, 'Coach@Example.TEST', GOOD_PASSWORD);
  await submit(page);
  await expectCheckEmail(page);
  expect(server.accounts.filter(a => a.email.toLowerCase() === EXISTING_EMAIL), 'exactly one account for this email').toHaveLength(1);
  expect(server.accounts.find(a => a.email.toLowerCase() === EXISTING_EMAIL)!.password).toBe(EXISTING_PASSWORD);
});

test('SU-10 a breached or common password refused by the service (weak_password) shows M05, not "check your connection"', async ({ page }) => {
  test.info().annotations.push({ type: 'not run', description:
    'SU-10 real-service half: leaked-password protection on a disposable real test project is NOT run here; this test covers the app mapping of weak_password only.' });
  const server = newServer();
  await setup(page, server);
  await openSignup(page);
  await fillSignup(page, EMAIL, COMMON_PASSWORD);
  await submit(page);
  await expect(page.getByText(new RegExp(`^${escape(M05)}`)).first()).toBeVisible();
  await expect(page.getByText(M11_START)).toHaveCount(0);
  await expect(page.getByText(/check your connection/i)).toHaveCount(0);
  await expect(page.getByText(M07, { exact: true })).toHaveCount(0);
  await expect(page.getByText(/weak and easy to guess/)).toHaveCount(0); // raw service text never shown
  expect(server.signups).toHaveLength(1);
  expect(server.accounts).toEqual([]);
});

// Finds the Show/Hide password control(s); one control per field or one shared control both count.
const toggles = (page: Page, word: 'Show' | 'Hide') => page.getByRole('button', { name: new RegExp(`^${word}( confirm)? password$`, 'i') })
  .or(page.getByRole('switch', { name: new RegExp(`^${word}( confirm)? password$`, 'i') }))
  .or(page.getByRole('checkbox', { name: new RegExp(`^(${word}|Show)( confirm)? password$`, 'i') }));
const fieldType = (field: ReturnType<typeof passwordField>) => field.getAttribute('type');

async function expectRevealAndHide(page: Page, fields: ReturnType<typeof passwordField>[], value: string) {
  for (const field of fields) expect(await fieldType(field)).toBe('password');
  for (const field of fields) {
    if ((await fieldType(field)) === 'password') {
      await expect(toggles(page, 'Show').first(), 'a Show password control is required').toBeVisible();
      await toggles(page, 'Show').first().click();
    }
    expect(await fieldType(field), 'Show password reveals the field').toBe('text');
    await expect(field, 'revealing keeps the value').toHaveValue(value);
  }
  for (const field of fields) {
    if ((await fieldType(field)) !== 'password') {
      const hide = (await toggles(page, 'Hide').count()) ? toggles(page, 'Hide').first() : toggles(page, 'Show').first();
      await hide.click();
    }
    expect(await fieldType(field), 'tapping again hides the field').toBe('password');
    await expect(field).toHaveValue(value);
  }
}

test('SU-11 sign-up password fields: Show password reveals and hides, paste works and autofill hints are set', async ({ page }) => {
  const server = newServer();
  await setup(page, server);
  await openSignup(page);
  await emailField(page).fill(EMAIL);
  await paste(page, passwordField(page), GOOD_PASSWORD);
  await paste(page, confirmField(page), GOOD_PASSWORD);
  await expect(passwordField(page), 'paste works').toHaveValue(GOOD_PASSWORD);
  await expect(confirmField(page)).toHaveValue(GOOD_PASSWORD);
  expect(await emailField(page).getAttribute('autocomplete')).toMatch(/^(email|username)$/);
  expect(await passwordField(page).getAttribute('autocomplete'), 'password managers offer a new password').toBe('new-password');
  expect(await confirmField(page).getAttribute('autocomplete')).toBe('new-password');
  await expectRevealAndHide(page, [passwordField(page), confirmField(page)], GOOD_PASSWORD);
  await submit(page);
  await expectCheckEmail(page);
  expect(server.signups).toEqual([{ email: EMAIL, password: GOOD_PASSWORD }]);
});

test('SU-11 the sign-in password field: Show password reveals and hides, paste works and the autofill hint is current-password', async ({ page }) => {
  await setup(page, newServer(true));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await paste(page, passwordField(page), EXISTING_PASSWORD);
  await expect(passwordField(page)).toHaveValue(EXISTING_PASSWORD);
  expect(await emailField(page).getAttribute('autocomplete')).toMatch(/^(email|username)$/);
  expect(await passwordField(page).getAttribute('autocomplete')).toBe('current-password');
  await expectRevealAndHide(page, [passwordField(page)], EXISTING_PASSWORD);
});

test.fixme('SU-12 when the app is bypassed, the service refuses a 14-character password sent straight to it', async () => {
  // NOT RUN. This is a service-configuration check (minimum password length = 15 on the auth service).
  // Sending a request straight to the fictional fixture would test only the fixture, not the app or the
  // real service. It runs on a disposable real test project with the right settings (see ACCEPTANCE.md,
  // "Tests"): POST /auth/v1/signup with a 14-character password must be refused (weak_password) and create
  // no user. Never run it against the canonical development or live project.
});
