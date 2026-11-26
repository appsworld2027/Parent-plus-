// LOCKED acceptance tests for docs/product/login-signout-change-password/ACCEPTANCE.md (AI Org AGENTS.md §7A).
// Written by Quinn (QA) before the feature exists. Only an `ai:contract` PR may change this file;
// a build PR must make these pass WITHOUT editing, skipping or deleting them (contract-lock enforces it).
//
// UI contract measured here (from the approved contract and the QA brief):
// - Settings: reached from the signed-in coach app through a button named "Settings" (or "Open settings"),
//   either in the header or inside the existing "Open support and diagnostics" menu. It shows a heading
//   containing "Settings". The coach app has no Settings screen yet (sign-out lives in the support menu).
// - Settings has a "Sign out of all devices" button; it opens a confirmation showing M19 with a Cancel
//   button and a confirm button named "Sign out of all devices" or "Sign out everywhere".
// - Settings has "Change password" with fields labelled "Current password", "New password" and
//   "Confirm password", saved with a button named "Save", "Save password" or "Save new password".
// - Decision D2: before saving, the app checks the current password by signing in with it. A wrong
//   current password shows M20 and nothing is saved. The service-side refusal case is therefore
//   "not applicable by design".
//
// Simulation notes (all fictional, no request leaves the browser):
// - ../support/backend answers data requests. `authServer` sits on top of it and keeps one fictional
//   auth service in Node, shared by every page and browser context of a test, so another device sees
//   the same accounts, passwords and sessions. It issues a distinct session and refresh token per sign-in,
//   refuses refresh for ended sessions, ends other sessions when a password changes (as the real service
//   does), and applies /logout scopes (global, local, others).
// - "Another device" is a separate browser context sharing no storage. Its renewal is forced by moving
//   its stored token expiry into the past; the token lifetime left at that moment is recorded as evidence
//   (fictional 3600 s fixture token; the real lifetime must be measured on a disposable test project).
// - Offline: every auth-service request from that device throws a network error.
// - Coach B (second@example.test) has its own empty academy; any data request made with B's token is
//   answered with B's data only, so anything of coach A on screen came from the device, not the service.
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { backend } from '../support/backend';

const M03 = 'Choose a password with at least 15 characters. A few unrelated words work well.';
const M04 = 'The passwords do not match.';
const M08 = 'Check your email and password, then try again.';
const M14 = 'Your new password was saved. Other devices will need to sign in again.';
const M18 = 'Your session ended. Please sign in again.';
const M19 = 'Sign out of all devices? You will need to sign in again everywhere. Unsent drafts on this device will be removed.';
const M20 = 'Your current password was not accepted. Nothing was changed.';
const M21 = 'Choose a password up to 72 bytes long. Letters in other scripts use more than one byte each.';
const OLD_PASSWORD = 'fictional-password';
const NEW_PASSWORD = 'fictional clay bowl window river';
const B_PASSWORD = 'second fictional coach password';
const A_EMAIL = 'coach@example.test';
const B_EMAIL = 'second@example.test';
const A_ID = '00000000-0000-0000-0000-000000000001';
const B_ID = '00000000-0000-0000-0000-000000000002';
const ACADEMY = 'Fictional Test Academy';
const B_ACADEMY = 'Fictional Second Academy';
const RIA = 'Fictional Ria';
const CLASS = 'Fictional Clay Class';
const NOTE = 'Fictional child practised shaping a clay bowl.';
const OBS_DRAFT = 'parentplus.coach.observation-draft.';
const ATT_DRAFT = 'parentplus.coach.attendance-draft.';
const WARNING = 'Remove unsent device drafts and sign out?';
const WELCOME = 'Welcome back.';
const HINDI = 'क'; // 3 bytes in UTF-8
const bytes = (value: string) => Buffer.byteLength(value, 'utf8');

type Session = { device: string; user: string; revoked: boolean };
type Account = { id: string; email: string; password: string };
type ServerState = {
  accounts: Account[]; sessions: Record<string, Session>; refresh: Record<string, string>;
  passwordSaves: number; refreshRejected: number; logouts: string[];
  logins: { device: string; email: string; password: string; ok: boolean }[]; requests: string[];
};
declare global { interface Window { __so: (op: string, arg?: unknown) => Promise<any>; __soSuccess: string[] } }

function newServer(): ServerState {
  return { accounts: [{ id: A_ID, email: A_EMAIL, password: OLD_PASSWORD }, { id: B_ID, email: B_EMAIL, password: B_PASSWORD }],
    sessions: {}, refresh: {}, passwordSaves: 0, refreshRejected: 0, logouts: [], logins: [], requests: [] };
}
const passwordOf = (server: ServerState, id = A_ID) => server.accounts.find(a => a.id === id)!.password;
const liveSessions = (server: ServerState, device: string) => Object.values(server.sessions).filter(s => s.device === device && !s.revoked);

let counter = 0;
async function authServer(page: Page, server: ServerState, device: string) {
  await page.exposeFunction('__so', (op: string, arg: any) => {
    if (op === 'log') { server.requests.push(`${device} ${arg}`); return null; }
    if (op === 'login') {
      const account = server.accounts.find(a => a.email === String(arg.email ?? '').toLowerCase());
      const ok = !!account && account.password === arg.password;
      server.logins.push({ device, email: arg.email, password: arg.password, ok });
      if (!ok) return null;
      const sid = `session-${device}-${++counter}`;
      server.sessions[sid] = { device, user: account!.id, revoked: false };
      return { sid, user: account!.id, email: account!.email };
    }
    if (op === 'rt') { const rt = `fictional-refresh-${++counter}`; server.refresh[rt] = arg; return rt; }
    if (op === 'refresh') {
      const sid = server.refresh[arg];
      if (!sid || server.sessions[sid]?.revoked) { server.refreshRejected++; return null; }
      delete server.refresh[arg];
      const account = server.accounts.find(a => a.id === server.sessions[sid].user)!;
      return { sid, user: account.id, email: account.email };
    }
    if (op === 'who') {
      const session = server.sessions[arg];
      if (!session || session.revoked) return null;
      const account = server.accounts.find(a => a.id === session.user)!;
      return { user: account.id, email: account.email };
    }
    if (op === 'update') {
      const session = server.sessions[arg.sid];
      if (!session || session.revoked) return false;
      server.accounts.find(a => a.id === session.user)!.password = arg.password; server.passwordSaves++;
      for (const [sid, s] of Object.entries(server.sessions)) if (sid !== arg.sid && s.user === session.user) s.revoked = true;
      return true;
    }
    if (op === 'logout') {
      server.logouts.push(`${device}:${arg.scope}`);
      const user = server.sessions[arg.sid]?.user;
      for (const [sid, s] of Object.entries(server.sessions)) {
        if (s.user !== user) continue;
        if (arg.scope === 'others' ? sid !== arg.sid : arg.scope === 'local' ? sid === arg.sid : true) s.revoked = true;
      }
      return null;
    }
    return null;
  });
  await page.addInitScript(({ ids, academy }) => {
    const inner = window.fetch;
    const json = (data: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(data), { status,
      headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } });
    const part = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const userObject = (id: string, email: string) => ({ id, email, aud: 'authenticated', role: 'authenticated',
      email_confirmed_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {}, identities: [] });
    const token = async (who: { sid: string; user: string; email: string }) => {
      const expires = Math.floor(Date.now() / 1000) + 3600;
      return json({ token_type: 'bearer', expires_in: 3600, expires_at: expires, refresh_token: await window.__so('rt', who.sid),
        access_token: `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: who.user, exp: expires, session_id: who.sid })}.fictional_signature`,
        user: userObject(who.user, who.email) });
    };
    window.fetch = async (input, init) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, window.location.origin);
      if (!url.hostname.endsWith('.supabase.co')) return inner(input, init);
      if (sessionStorage.getItem('__so_offline')) throw new TypeError('Failed to fetch');
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      let body: Record<string, any> = {};
      try { body = init?.body ? JSON.parse(String(init.body)) : {}; } catch { /* not JSON */ }
      const bearer = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).get('Authorization') ?? '';
      let claims: { sub?: string; session_id?: string } = {};
      try { claims = JSON.parse(atob(bearer.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { /* publishable key only */ }
      const grant = url.searchParams.get('grant_type') ?? '';
      await window.__so('log', `${method} ${url.pathname}${grant ? `?${grant}` : ''} sub=${claims.sub ?? ''}`);
      if (url.pathname.endsWith('/token')) {
        if (grant === 'password') {
          const who = await window.__so('login', { email: body.email, password: body.password });
          return who ? token(who) : json({ code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
        }
        if (grant === 'refresh_token') {
          const who = await window.__so('refresh', body.refresh_token);
          return who ? token(who) : json({ code: 'refresh_token_not_found', error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' }, 400);
        }
        return inner(input, init);
      }
      if (url.pathname.endsWith('/auth/v1/user')) {
        const who = await window.__so('who', claims.session_id ?? '');
        if (!who) return json({ code: 'session_not_found', error_code: 'session_not_found', msg: 'Session from session_id claim in JWT does not exist' }, 403);
        if (method === 'PUT' && typeof body.password === 'string'
          && !(await window.__so('update', { sid: claims.session_id, password: body.password })))
          return json({ code: 'session_not_found', error_code: 'session_not_found', msg: 'Session not found' }, 403);
        return json(userObject(who.user, who.email));
      }
      if (url.pathname.endsWith('/logout')) {
        await window.__so('logout', { sid: claims.session_id ?? '', scope: url.searchParams.get('scope') ?? 'global' });
        return json(null, 204);
      }
      // Coach B owns only an empty academy: everything B is shown must come from B's own data.
      if (claims.sub === ids.b && url.pathname.includes('/rest/v1/')) {
        if (url.pathname.endsWith('/academies')) return json([{ id: 'academy-second', name: academy, timezone: 'Asia/Kolkata', currency: 'INR' }]);
        return json([]);
      }
      return inner(input, init);
    };
    // Records any claim that sign-out succeeded (catches brief toasts).
    window.__soSuccess = [];
    const scan = () => {
      const text = document.body?.innerText ?? '';
      const match = text.match(/signed out|have been cleared|sessions? (were|was|have been) ended/i);
      if (match) window.__soSuccess.push(match[0]);
    };
    document.addEventListener('DOMContentLoaded', () => { scan(); new MutationObserver(scan).observe(document.documentElement, { subtree: true, childList: true, characterData: true }); });
  }, { ids: { b: B_ID }, academy: B_ACADEMY });
}

async function device(page: Page, server: ServerState, name = 'A') {
  await backend(page, { academy: true, readyClass: true });
  await authServer(page, server, name);
}
async function otherDevice(browser: Browser, baseURL: string | undefined, server: ServerState, name: string): Promise<[BrowserContext, Page]> {
  const context = await browser.newContext({ baseURL, viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  await device(page, server, name);
  return [context, page];
}
const emailField = (page: Page) => page.getByRole('textbox', { name: 'Email address' });
async function signIn(page: Page, email = A_EMAIL, password = OLD_PASSWORD) {
  if (!(await emailField(page).isVisible())) await page.goto('/');
  await emailField(page).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function signedIn(page: Page, email = A_EMAIL, password = OLD_PASSWORD) {
  await signIn(page, email, password);
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
}
const SETTINGS_ENTRY = /^(Open )?settings$/i;
async function openSettings(page: Page) {
  if (!(await page.getByRole('button', { name: SETTINGS_ENTRY }).first().isVisible()))
    await page.getByRole('button', { name: 'Open support and diagnostics', exact: true }).click();
  await page.getByRole('button', { name: SETTINGS_ENTRY }).first().click();
  await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible();
}
const allDevicesButton = (page: Page) => page.getByRole('button', { name: 'Sign out of all devices', exact: true });
const confirmation = (page: Page) => page.getByRole('alert').filter({ hasText: 'Sign out of all devices?' });
async function openAllDevicesConfirmation(page: Page) {
  await openSettings(page);
  await allDevicesButton(page).click();
  await expect(confirmation(page)).toBeVisible();
}
async function openChangePassword(page: Page) {
  await openSettings(page);
  const current = page.getByLabel('Current password', { exact: true });
  if (!(await current.isVisible())) await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(current).toBeVisible();
}
async function changePassword(page: Page, current: string, next: string, confirm = next) {
  await openChangePassword(page);
  await page.getByLabel('Current password', { exact: true }).fill(current);
  await page.getByLabel('New password', { exact: true }).fill(next);
  await page.getByLabel('Confirm password', { exact: true }).fill(confirm);
  await page.getByRole('button', { name: /^Save( new)?( password)?$/ }).click();
}
async function signOutHere(page: Page) {
  await page.getByRole('button', { name: 'Open support and diagnostics', exact: true }).click();
  const here = page.getByRole('button', { name: 'Sign out', exact: true });
  if (!(await here.first().isVisible())) await openSettings(page);
  await here.first().click();
}
async function makeDrafts(page: Page) {
  // Feedback draft with a selected child, then an attendance draft (same steps as SS-05..SS-08).
  await page.getByRole('tab', { name: 'Feedback', exact: true }).click();
  await page.getByRole('button', { name: 'Write feedback', exact: true }).click();
  await page.getByRole('combobox', { name: 'Feedback batch', exact: true }).selectOption(await page.evaluate(() => window.__coachFixture.roster.batches[0].id));
  await page.getByRole('combobox', { name: 'Student for this feedback', exact: true }).selectOption(await page.evaluate(() => window.__coachFixture.roster.students[0].id));
  await page.getByRole('textbox', { name: 'Observation text', exact: true }).fill(NOTE);
  await expect(page.getByText('Draft saved on this device. Not yet saved to your workspace.', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByRole('button', { name: `Attendance for ${CLASS} at 16:00`, exact: true }).click();
  await page.getByRole('button', { name: 'Mark all present', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved on this device');
}
async function viewStudents(page: Page) {
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await expect(page.getByText(RIA).first()).toBeVisible();
}
const draftKeys = (page: Page) => page.evaluate(([o, a]) => [...Object.keys(sessionStorage), ...Object.keys(localStorage)]
  .filter(k => k.startsWith(o) || k.startsWith(a)), [OBS_DRAFT, ATT_DRAFT]);
const storedSessionKeys = (page: Page) => page.evaluate(() => [...Object.keys(sessionStorage), ...Object.keys(localStorage)]
  .filter(key => key.includes('auth-token') && !key.includes('code-verifier')));
// App-owned device storage (fixture keys start with "__") that mentions any of the given private values.
const storageMentions = (page: Page, values: string[]) => page.evaluate(values => {
  const out: string[] = [];
  for (const store of [sessionStorage, localStorage]) for (const key of Object.keys(store)) {
    if (key.startsWith('__')) continue;
    let value = `${key} ${store.getItem(key) ?? ''}`;
    try { value = decodeURIComponent(value); } catch { /* keep raw */ }
    for (const v of values) if (value.includes(v)) out.push(`${key} contains ${v}`);
  }
  return out;
}, values);
const pageText = (page: Page) => page.evaluate(() => document.body.textContent ?? '');
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
// The other device tries to renew; it must be refused and land on sign-in with M18.
async function expectRenewalRefused(page: Page, server: ServerState, label: string) {
  const lifetime = (await storedExpiry(page)) - Math.floor(Date.now() / 1000);
  test.info().annotations.push({ type: 'evidence',
    description: `${label}: the other device's current access token had ${lifetime}s left when its sessions were ended (fictional fixture token; the real lifetime must be measured on a disposable test project).` });
  const before = server.refreshRejected;
  await moveSessionExpiry(page, -10);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByText(M18)).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
  expect(server.refreshRejected, 'the other device must have tried and failed to renew').toBeGreaterThan(before);
}
async function expectNoPrivateData(page: Page) {
  await expect(page.getByRole('heading', { name: WELCOME, exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toHaveCount(0);
  const text = await pageText(page);
  for (const value of [ACADEMY, RIA, CLASS, NOTE]) expect(text, `"${value}" still on screen`).not.toContain(value);
  await expect.poll(() => storedSessionKeys(page)).toEqual([]);
  await expect.poll(() => draftKeys(page)).toEqual([]);
  expect(await storageMentions(page, [ACADEMY, RIA, CLASS, NOTE, A_ID])).toEqual([]);
}
async function expectStillSignedIn(page: Page) {
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
  expect((await storedSessionKeys(page)).length).toBeGreaterThan(0);
}

test('SO-01 signing out on this device leaves no private data or session, also after Back, reload and reopen', async ({ page }) => {
  const server = newServer();
  await device(page, server);
  await signedIn(page);
  await viewStudents(page);
  await makeDrafts(page);
  await signOutHere(page);
  const remove = page.getByRole('button', { name: 'Remove drafts and sign out', exact: true });
  if (await remove.isVisible().catch(() => false)) await remove.click();
  await expectNoPrivateData(page);
  expect(liveSessions(server, 'A'), 'the session must be ended on the service').toEqual([]);
  await page.goBack().catch(() => null);
  // Back may leave the app (the app was the first page in this tab); then Forward returns to it.
  if (!page.url().startsWith('http')) await page.goForward().catch(() => null);
  if (!page.url().startsWith('http')) await page.goto('/');
  await expectNoPrivateData(page);
  await page.reload();
  await expectNoPrivateData(page);
  await page.goto('about:blank');
  await page.goto('/');
  await expectNoPrivateData(page);
});

test('SO-02 signing out with unsent drafts shows the warning first and changes nothing yet', async ({ page }) => {
  const server = newServer();
  await device(page, server);
  await signedIn(page);
  await makeDrafts(page);
  const drafts = await draftKeys(page);
  expect(drafts.length).toBeGreaterThan(0);
  await signOutHere(page);
  await expect(page.getByText(WARNING, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep editing', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove drafts and sign out', exact: true })).toBeVisible();
  expect(server.logouts).toEqual([]);
  expect(await draftKeys(page)).toEqual(drafts);
  expect(liveSessions(server, 'A').length).toBeGreaterThan(0);
});

test('SO-03 Settings has "Sign out of all devices"', async ({ page }) => {
  const server = newServer();
  await device(page, server);
  await signedIn(page);
  await openSettings(page);
  await expect(allDevicesButton(page)).toBeVisible();
});

test('SO-04 "Sign out of all devices" shows M19, and Cancel changes nothing', async ({ page, browser, baseURL }) => {
  const server = newServer();
  const [phone, other] = await otherDevice(browser, baseURL, server, 'B');
  try {
    await signedIn(other);
    await device(page, server, 'A');
    await signedIn(page);
    await makeDrafts(page);
    const drafts = await draftKeys(page);
    await openAllDevicesConfirmation(page);
    const sentences = M19.split(/(?<=[?.])\s+/).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    await expect(confirmation(page)).toHaveText(new RegExp(sentences.join('\\s*')));
    await expect(confirmation(page).getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
    await expect(confirmation(page).getByRole('button', { name: /^Sign out (of all devices|everywhere)$/ })).toBeVisible();
    await confirmation(page).getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(confirmation(page)).toHaveCount(0);
    expect(server.logouts).toEqual([]);
    expect(Object.values(server.sessions).every(s => !s.revoked), 'no session may end on Cancel').toBe(true);
    expect(await draftKeys(page)).toEqual(drafts);
    await page.getByRole('tab', { name: 'Students', exact: true }).click();
    await expectStillSignedIn(page);
    await page.reload();
    await expectStillSignedIn(page);
    await expectStillSignedIn(other);
  } finally { await phone.close(); }
});

test('SO-05 confirming signs out every device: this one is cleared and another device cannot renew', async ({ page, browser, baseURL }) => {
  const server = newServer();
  const [phone, other] = await otherDevice(browser, baseURL, server, 'B');
  try {
    await signedIn(other);
    await device(page, server, 'A');
    await signedIn(page);
    await viewStudents(page);
    await makeDrafts(page);
    await openAllDevicesConfirmation(page);
    await confirmation(page).getByRole('button', { name: /^Sign out (of all devices|everywhere)$/ }).click();
    await expectNoPrivateData(page);
    await expect.poll(() => Object.values(server.sessions).every(s => s.revoked), { message: 'every session must be ended on the service' }).toBe(true);
    await expectRenewalRefused(other, server, 'SO-05');
    await page.reload();
    await expectNoPrivateData(page);
  } finally { await phone.close(); }
});

test('SO-06 signing out offline either clears this device or says it did not complete, never a false success', async ({ page }) => {
  const server = newServer();
  await device(page, server);
  await signedIn(page);
  await viewStudents(page);
  await makeDrafts(page);
  await page.evaluate(() => { sessionStorage.setItem('__so_offline', '1'); window.__soSuccess = []; });
  await signOutHere(page);
  const remove = page.getByRole('button', { name: 'Remove drafts and sign out', exact: true });
  if (await remove.isVisible().catch(() => false)) await remove.click();
  const notCompleted = page.getByText(/could not|couldn.t|did not|didn.t|not complete|was not/i);
  await expect(page.getByRole('heading', { name: WELCOME, exact: true }).or(notCompleted).first()).toBeVisible();
  await page.waitForTimeout(1500); // let any late success message or clean-up settle
  const cleared = (await storedSessionKeys(page)).length === 0 && (await draftKeys(page)).length === 0
    && (await page.getByRole('tab', { name: 'Students', exact: true }).count()) === 0;
  test.info().annotations.push({ type: 'evidence', description: `SO-06 outcome offline: ${cleared ? 'this device was cleared' : 'reported not completed'}` });
  if (cleared) {
    await expectNoPrivateData(page);
    await page.reload();
    await expectNoPrivateData(page);
  } else {
    await expect(notCompleted.first()).toBeVisible();
    expect(await page.evaluate(() => window.__soSuccess), 'sign-out claimed success while data remained').toEqual([]);
  }
});

test('SO-07 coach B signing in after coach A on one device sees none of A’s data, cache, drafts or child selection', async ({ page }) => {
  const server = newServer();
  await device(page, server);
  await signedIn(page);
  await viewStudents(page);
  await makeDrafts(page); // includes the child selected for feedback
  await signOutHere(page);
  const remove = page.getByRole('button', { name: 'Remove drafts and sign out', exact: true });
  if (await remove.isVisible().catch(() => false)) await remove.click();
  await expect(page.getByRole('heading', { name: WELCOME, exact: true })).toBeVisible();
  const requestsBefore = server.requests.length;
  await signedIn(page, B_EMAIL, B_PASSWORD);
  await expect(page.getByText(B_ACADEMY).first()).toBeVisible();
  for (const tab of ['Today', 'Schedule', 'Feedback', 'Students', 'Fees']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await page.waitForTimeout(500);
    const text = await pageText(page);
    for (const value of [ACADEMY, RIA, CLASS, NOTE]) expect(text, `${tab} shows coach A's "${value}"`).not.toContain(value);
    await expect(page.getByRole('button', { name: /^Resume (attendance|observation) draft$/ })).toHaveCount(0);
  }
  expect(await storageMentions(page, [ACADEMY, RIA, CLASS, NOTE, A_ID])).toEqual([]);
  expect(await draftKeys(page)).toEqual([]);
  const asA = server.requests.slice(requestsBefore).filter(r => r.includes(`sub=${A_ID}`));
  expect(asA, 'no request after B signed in may use coach A’s session').toEqual([]);
});

test('SO-08 Settings has "Change password" with current, new and confirm fields', async ({ page }) => {
  const server = newServer();
  await device(page, server);
  await signedIn(page);
  await openSettings(page);
  await expect(page.getByRole('button', { name: 'Change password', exact: true })
    .or(page.getByRole('heading', { name: 'Change password', exact: true })).first()).toBeVisible();
  await openChangePassword(page);
  for (const label of ['Current password', 'New password', 'Confirm password']) {
    const field = page.getByLabel(label, { exact: true });
    await expect(field).toBeVisible();
    await expect(field).toHaveAttribute('type', 'password');
  }
  expect(server.passwordSaves).toBe(0);
});

test('SO-09 (D2) a wrong current password shows M20 and nothing changes', async ({ page, browser, baseURL }) => {
  const server = newServer();
  const [phone, other] = await otherDevice(browser, baseURL, server, 'B');
  try {
    await signedIn(other);
    await device(page, server, 'A');
    await signedIn(page);
    await changePassword(page, 'not the fictional current password', NEW_PASSWORD);
    await expect(page.getByText(M20, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(M14, { exact: true })).toHaveCount(0);
    expect(server.logins.some(l => l.device === 'A' && l.password === 'not the fictional current password' && !l.ok),
      'D2: the app must check the current password by signing in with it').toBe(true);
    expect(server.requests.filter(r => r.startsWith('A PUT /auth/v1/user'))).toEqual([]);
    expect(server.passwordSaves).toBe(0);
    expect(passwordOf(server)).toBe(OLD_PASSWORD);
    expect(server.logouts).toEqual([]);
    await page.getByRole('tab', { name: 'Students', exact: true }).click();
    await expectStillSignedIn(page);
    // Nothing changed for the other device either: it still renews.
    const rejected = server.refreshRejected;
    await moveSessionExpiry(other, 30);
    await page.waitForTimeout(1500);
    await expectStillSignedIn(other);
    expect(server.refreshRejected).toBe(rejected);
  } finally { await phone.close(); }
});

test('SO-10 a valid change shows M14, the old password fails, the new one works and this device stays signed in', async ({ page, browser, baseURL }) => {
  const server = newServer();
  await device(page, server, 'A');
  await signedIn(page);
  const start = server.requests.length;
  await changePassword(page, OLD_PASSWORD, NEW_PASSWORD);
  await expect(page.getByText(M14, { exact: true }).first()).toBeVisible();
  expect(passwordOf(server), 'the new password must be saved unchanged').toBe(NEW_PASSWORD);
  const flow = server.requests.slice(start);
  const verified = flow.findIndex(r => r.startsWith('A POST /auth/v1/token?password'));
  const saved = flow.findIndex(r => r.startsWith('A PUT /auth/v1/user'));
  expect(verified, 'D2: the current password is checked by signing in').toBeGreaterThanOrEqual(0);
  expect(verified, 'D2: the check happens before the save').toBeLessThan(saved);
  expect(server.logins.some(l => l.device === 'A' && l.password === OLD_PASSWORD && l.ok)).toBe(true);
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await expectStillSignedIn(page);
  expect(liveSessions(server, 'A').length).toBeGreaterThan(0);
  await page.reload();
  await expectStillSignedIn(page);
  const [laptop, fresh] = await otherDevice(browser, baseURL, server, 'C');
  try {
    await signIn(fresh, A_EMAIL, OLD_PASSWORD);
    await expect(fresh.getByText(M08).first()).toBeVisible();
    await expect(fresh.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
    await signedIn(fresh, A_EMAIL, NEW_PASSWORD);
  } finally { await laptop.close(); }
  await expectStillSignedIn(page);
});

test('SO-11 after a valid change another device cannot renew its session', async ({ page, browser, baseURL }) => {
  const server = newServer();
  const [phone, other] = await otherDevice(browser, baseURL, server, 'B');
  try {
    await signedIn(other);
    await device(page, server, 'A');
    await signedIn(page);
    await changePassword(page, OLD_PASSWORD, NEW_PASSWORD);
    // Given "a valid change": SO-10 owns the M14 wording; here only the saved change matters.
    await expect.poll(() => server.passwordSaves).toBe(1);
    await expectRenewalRefused(other, server, 'SO-11');
    await page.getByRole('tab', { name: 'Students', exact: true }).click();
    await expectStillSignedIn(page);
  } finally { await phone.close(); }
});

for (const [kind, next, confirm, message] of [
  ['14 characters', 'fourteen-chars', 'fourteen-chars', M03],
  ['a different confirmation', NEW_PASSWORD, `${NEW_PASSWORD}x`, M04],
  ['25 Hindi letters (75 bytes)', HINDI.repeat(25), HINDI.repeat(25), M21],
  ['73 ASCII characters', 'b'.repeat(73), 'b'.repeat(73), M21],
] as const) {
  test(`SO-12 a new password of ${kind} shows the exact message and nothing changes`, async ({ page }) => {
    if (message === M03) expect(next.length).toBe(14);
    if (message === M21) expect(bytes(next)).toBeGreaterThan(72);
    const server = newServer();
    await device(page, server, 'A');
    await signedIn(page);
    await changePassword(page, OLD_PASSWORD, next, confirm);
    await expect(page.getByText(message, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(M14, { exact: true })).toHaveCount(0);
    expect(server.requests.filter(r => r.startsWith('A PUT /auth/v1/user'))).toEqual([]);
    expect(server.passwordSaves).toBe(0);
    expect(passwordOf(server)).toBe(OLD_PASSWORD);
    expect(Object.values(server.sessions).every(s => !s.revoked), 'no session may end').toBe(true);
    await expect(page.getByLabel('New password', { exact: true })).toHaveValue(next);
    await page.getByRole('tab', { name: 'Students', exact: true }).click();
    await expectStillSignedIn(page);
  });
}
