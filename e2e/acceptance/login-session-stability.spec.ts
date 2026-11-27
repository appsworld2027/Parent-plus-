// LOCKED acceptance tests for docs/product/login-session-stability/ACCEPTANCE.md (AI Org AGENTS.md §7A).
// Written by Quinn (QA) before the feature exists. Only an `ai:contract` PR may change this file;
// a build PR must make these pass WITHOUT editing, skipping or deleting them (contract-lock enforces it).
//
// Simulation notes (all fictional, no request leaves the browser):
// - Token renewal / session end: the stored session's expiry is moved inside the SDK refresh margin
//   (or into the past) and a `visibilitychange` event makes the real Supabase SDK recover and refresh.
//   `sessionControls` sits on top of ../support/backend to count or reject refresh-token grants.
// - Offline start: every Supabase request throws a network error after reload.
// - Second coach: `sessionControls` answers sign-in and user checks as a second fictional coach.
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from '../support/backend';

const OPENING = 'Opening your workspace…';
const M13 = 'This link could not be used. Request a new one from this device, then open the newest email here.';
const M18 = 'Your session ended. Please sign in again.';
const RECONNECT = 'Let’s reconnect.';
const NOTE = 'Fictional child practised shaping a clay bowl.';
const OBS_DRAFT = 'parentplus.coach.observation-draft.';
const ATT_DRAFT = 'parentplus.coach.attendance-draft.';

type Controls = { refreshes: number; failRefresh: boolean; account: 'first' | 'second'; seen: Record<string, boolean>; subs: string[] };
declare global { interface Window { __ss: Controls } }

// Extra transport control layered over the shared fixture (registered after it, so it wraps it).
async function sessionControls(page: Page) {
  await page.addInitScript(({ watch }) => {
    const inner = window.fetch;
    const controls: Controls = { refreshes: 0, failRefresh: false, account: 'first', seen: {}, subs: [] };
    window.__ss = controls;
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status,
      headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } });
    const second = { id: '00000000-0000-0000-0000-000000000002', email: 'second@example.test', aud: 'authenticated',
      role: 'authenticated', email_confirmed_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
      app_metadata: {}, user_metadata: {}, identities: [] };
    const part = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    window.fetch = async (input, init) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, window.location.origin);
      if (!url.hostname.endsWith('.supabase.co')) return inner(input, init);
      if (sessionStorage.getItem('__ss_offline')) throw new TypeError('Failed to fetch');
      while (url.pathname.endsWith('/user') && sessionStorage.getItem('__ss_hold_user')) await new Promise(r => setTimeout(r, 20));
      const bearer = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).get('Authorization') ?? '';
      try { const sub = JSON.parse(atob(bearer.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub; if (sub) controls.subs.push(sub); } catch { /* publishable key only */ }
      const grant = url.searchParams.get('grant_type');
      if (url.pathname.endsWith('/token') && grant === 'refresh_token') {
        controls.refreshes++;
        if (controls.failRefresh) return json({ code: 'refresh_token_not_found', error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' }, 400);
      }
      if (controls.account === 'second' && url.pathname.endsWith('/user')) return json(second);
      if (controls.account === 'second' && url.pathname.endsWith('/token')) {
        const expires = Math.floor(Date.now() / 1000) + 3600;
        return json({ access_token: `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: second.id, exp: expires })}.fictional_signature`,
          token_type: 'bearer', expires_in: 3600, expires_at: expires, refresh_token: 'fictional-second-refresh', user: second });
      }
      return inner(input, init);
    };
    // Records whether an exact on-screen text ever appeared (catches brief flashes).
    const scan = () => { for (const text of watch) if (document.evaluate(`//*[normalize-space(text())='${text}']`, document, null, XPathResult.BOOLEAN_TYPE, null).booleanValue) controls.seen[text] = true; };
    document.addEventListener('DOMContentLoaded', () => { scan(); new MutationObserver(scan).observe(document.documentElement, { subtree: true, childList: true, characterData: true }); });
  }, { watch: [OPENING, 'Your academy, your way.'] });
}

async function signedInCoach(page: Page) {
  await backend(page, { academy: true, readyClass: true });
  await sessionControls(page);
  await login(page);
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
}
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
const storedToken = (page: Page) => page.evaluate(() => {
  const key = Object.keys(sessionStorage).find(k => /^sb-[a-z0-9]+-auth-token$/.test(k));
  if (!key) return '';
  const manifest = JSON.parse(sessionStorage.getItem(key)!);
  const raw = Array.from({ length: manifest.count }, (_, i) => sessionStorage.getItem(`${key}.${manifest.generation}.${i}`)).join('');
  const session = JSON.parse(decodeURIComponent(raw));
  return `${session.user?.id}|${session.access_token}`;
});
async function renewToken(page: Page) {
  const before = await storedToken(page);
  await page.waitForTimeout(1100); // the renewed token must differ (expiry has one-second resolution)
  await moveSessionExpiry(page, 60);
  const [user, token] = before.split('|');
  await expect.poll(async () => { const [u, t] = (await storedToken(page)).split('|'); return u === user && t !== token; },
    { message: 'fixture: a renewed token for the same user must be stored' }).toBe(true);
  await page.waitForTimeout(1500); // let any re-render triggered by the renewal settle
}
async function endSessionByService(page: Page) {
  await page.evaluate(() => { window.__ss.failRefresh = true; });
  await moveSessionExpiry(page, -10);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
}
async function composeFeedback(page: Page) {
  await page.getByRole('tab', { name: 'Feedback', exact: true }).click();
  await page.getByRole('button', { name: 'Write feedback', exact: true }).click();
  await page.getByRole('combobox', { name: 'Feedback batch', exact: true }).selectOption(await page.evaluate(() => window.__coachFixture.roster.batches[0].id));
  await page.getByRole('combobox', { name: 'Student for this feedback', exact: true }).selectOption(await page.evaluate(() => window.__coachFixture.roster.students[0].id));
  await page.getByRole('textbox', { name: 'Observation text', exact: true }).fill(NOTE);
  await expect(page.getByText('Draft saved on this device. Not yet saved to your workspace.', { exact: true })).toBeVisible();
}
async function attendanceDraft(page: Page) {
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByRole('button', { name: 'Attendance for Fictional Clay Class at 16:00', exact: true }).click();
  await page.getByRole('button', { name: 'Mark all present', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved on this device');
}
async function makeDrafts(page: Page) {
  await composeFeedback(page);
  await attendanceDraft(page);
}
const draftKeys = (page: Page) => page.evaluate(([o, a]) => Object.keys(sessionStorage).filter(k => k.startsWith(o) || k.startsWith(a)), [OBS_DRAFT, ATT_DRAFT]);
async function openSignOutDialog(page: Page) {
  await page.getByRole('button', { name: 'Open support and diagnostics', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByText('Remove unsent device drafts and sign out?', { exact: true })).toBeVisible();
}
async function signInOnScreen(page: Page, email: string) {
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('fictional-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
}

test('SS-01 a token renewal for the same coach keeps the half-filled form, the screen and never shows "Opening your workspace…"', async ({ page }) => {
  await signedInCoach(page);
  await composeFeedback(page);
  await page.evaluate(() => { window.__ss.seen = {}; });
  await renewToken(page);
  expect(await page.evaluate(t => !!window.__ss.seen[t], OPENING), `"${OPENING}" appeared during token renewal`).toBe(false);
  await expect(page.getByRole('textbox', { name: 'Observation text', exact: true })).toHaveValue(NOTE);
  await expect(page.getByRole('combobox', { name: 'Student for this feedback', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume observation draft', exact: true })).toHaveCount(0);
});

test('SS-02 an open dialog stays open when the token renews', async ({ page }) => {
  await signedInCoach(page);
  await attendanceDraft(page);
  await openSignOutDialog(page);
  await renewToken(page);
  await expect(page.getByText('Remove unsent device drafts and sign out?', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep editing', exact: true })).toBeVisible();
});

test('SS-03 a stored valid session shows "Opening your workspace…" and no workspace content until the user check passes', async ({ page }) => {
  await signedInCoach(page);
  await page.evaluate(() => sessionStorage.setItem('__ss_hold_user', '1'));
  await page.reload();
  await expect(page.getByText(OPENING, { exact: true })).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.getByText(OPENING, { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
  await expect(page.getByText('Fictional Test Academy', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Fictional Ria')).toHaveCount(0);
  await page.evaluate(() => sessionStorage.removeItem('__ss_hold_user'));
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
});

test('SS-04 when the service ends the session the coach sees M18 on the sign-in screen and no private data', async ({ page }) => {
  await signedInCoach(page);
  await endSessionByService(page);
  await expect(page.getByRole('heading', { name: 'Welcome back.', exact: true })).toBeVisible();
  await expect(page.getByText(M18)).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
  await expect(page.getByText('Fictional Test Academy', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Fictional Ria')).toHaveCount(0);
  await expect(page.getByText('Fictional Clay Class')).toHaveCount(0);
});

test('SS-05 after the session ended, the same coach signing in again gets the unsent drafts restored', async ({ page }) => {
  await signedInCoach(page);
  await makeDrafts(page);
  await endSessionByService(page);
  await signInOnScreen(page, 'coach@example.test');
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume attendance draft', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Feedback', exact: true }).click();
  await page.getByRole('button', { name: 'Resume observation draft', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Observation text', exact: true })).toHaveValue(NOTE);
});

test('SS-06 after the session ended, a different coach signing in sees none of the drafts and they are deleted', async ({ page }) => {
  await signedInCoach(page);
  await makeDrafts(page);
  await endSessionByService(page);
  await page.evaluate(() => { window.__ss.account = 'second'; });
  await signInOnScreen(page, 'second@example.test');
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Attendance for Fictional Clay Class at 16:00', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume attendance draft', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Feedback', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Write feedback', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume observation draft', exact: true })).toHaveCount(0);
  await expect(page.getByText(NOTE)).toHaveCount(0);
  await expect.poll(() => draftKeys(page)).toEqual([]);
});

test('SS-07 choosing Sign out then "Remove drafts and sign out" deletes the drafts and ends the session', async ({ page }) => {
  await signedInCoach(page);
  await makeDrafts(page);
  await openSignOutDialog(page);
  await page.getByRole('button', { name: 'Remove drafts and sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.', exact: true })).toBeVisible();
  await expect.poll(() => draftKeys(page)).toEqual([]);
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(k => k.includes('auth-token') && !k.includes('code-verifier')))).toEqual([]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back.', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
});

test('SS-08 choosing Sign out then "Keep editing" changes nothing', async ({ page }) => {
  await signedInCoach(page);
  await makeDrafts(page);
  const before = await draftKeys(page);
  await openSignOutDialog(page);
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByText('Remove unsent device drafts and sign out?', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
  expect(await draftKeys(page)).toEqual(before);
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(k => /^sb-[a-z0-9]+-auth-token$/.test(k)).length)).toBe(1);
  await page.getByRole('button', { name: 'Close support and diagnostics' }).or(page.getByRole('tab', { name: 'Feedback', exact: true })).first().click();
  await page.getByRole('tab', { name: 'Feedback', exact: true }).click();
  await page.getByRole('button', { name: 'Resume observation draft', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Observation text', exact: true })).toHaveValue(NOTE);
});

test('SS-09 opening offline shows "Let’s reconnect." with Retry and Sign out, never an empty workspace or academy setup', async ({ page }) => {
  await signedInCoach(page);
  await page.evaluate(() => sessionStorage.setItem('__ss_offline', '1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: RECONNECT, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Retry( connection)?$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => !!window.__ss.seen['Your academy, your way.']), 'academy setup appeared while offline').toBe(false);
  await page.evaluate(() => sessionStorage.removeItem('__ss_offline'));
  await page.getByRole('button', { name: /^Retry( connection)?$/ }).click();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
});

test('SS-10 a signed-in coach opening a bad or expired email link sees M13 and stays signed in', async ({ page }) => {
  await signedInCoach(page);
  await page.goto('/auth/recovery?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await expect(page.getByText(M13)).toBeVisible();
  await expect(page.getByRole('heading', { name: RECONNECT, exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
  await expect(page.getByText('Fictional Test Academy', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
});

test('SS-11 a second tab signing in as another coach does not change the first tab’s account or data', async ({ page, context }) => {
  await signedInCoach(page);
  const coach = '00000000-0000-0000-0000-000000000001';
  const other = await context.newPage();
  await backend(other, { academy: true, secondaryAccount: true });
  await login(other);
  await expect(other.getByRole('tab', { name: 'Students', exact: true })).toBeVisible();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.bringToFront();
  await page.evaluate(() => { window.__ss.subs = []; });
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await expect(page.getByText('Fictional Ria').first()).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Students', exact: true }).click();
  await expect(page.getByText('Fictional Ria').first()).toBeVisible();
  const subs = await page.evaluate(() => window.__ss.subs);
  expect(subs.length).toBeGreaterThan(0);
  expect([...new Set(subs)]).toEqual([coach]);
});

// Production bundle: the hosted run targets the deployed build; locally a production export is built and served.
function serve(dir: string): Promise<{ server: Server; url: string }> {
  const types: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf' };
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = join(dir, path);
    if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    resolve({ server, url: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}` });
  }));
}
test('SS-12 the production build sign-in screen has no developer preview button or preview data', async ({ page }, info) => {
  test.setTimeout(300_000);
  let origin = process.env.PLAYWRIGHT_BASE_URL;
  let server: Server | undefined;
  if (!origin) {
    const out = info.outputPath('production-web');
    const build = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', out], { encoding: 'utf8', timeout: 240_000,
      env: { ...process.env, EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1', EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_public_test_key' } });
    expect(build.status, `production web export failed: ${build.stderr?.slice(-2000)}`).toBe(0);
    ({ server, url: origin } = await serve(out));
  }
  try {
    await backend(page);
    await page.goto(new URL('/', origin).href);
    await expect(page.getByRole('heading', { name: 'Welcome back.', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /preview/i })).toHaveCount(0);
    await expect(page.getByText(/Development preview|interface preview/i)).toHaveCount(0);
    await expect(page.getByText(/Fictional|Demo|Sample/)).toHaveCount(0);
  } finally { server?.close(); }
});
