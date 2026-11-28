// Browser tests for docs/product/web-push (WPN-01..07) with a faked browser push API (no real push service is contacted).
import { expect, test, type Page } from '@playwright/test';
import { parentBackend } from './support/parentBackend';
import { backend, login } from './support/backend';

async function loginParent(page: Page) { await page.goto('/parent'); await expect(page.getByText('YOUR FAMILY WORKSPACE', { exact: true })).toBeVisible(); await page.getByLabel('Email address', { exact: true }).fill('coach@example.test'); await page.getByLabel('Password', { exact: true }).fill('FictionalParentPassword123'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page.getByLabel('Your parent name', { exact: true })).toBeVisible(); }
async function family(page: Page) { await page.getByLabel('Your parent name', { exact: true }).fill('Fictional Parent'); await page.getByLabel('Family name', { exact: true }).fill('Fictional Family'); await page.getByRole('button', { name: 'Create my family workspace', exact: true }).click(); await page.getByRole('button', { name: 'Add my first child', exact: true }).click(); await page.getByLabel('Child name', { exact: true }).fill('Fictional Family Ria'); await page.getByLabel('Birth date (optional)', { exact: true }).fill('2018-04-12'); await page.getByRole('button', { name: 'Save child', exact: true }).click(); await expect(page.getByRole('tab', { name: 'Choose child Fictional Family Ria', exact: true })).toBeVisible(); }
// Fakes Notification / serviceWorker / PushManager so the real subscribe flow runs without a push service.
async function fakePush(page: Page, permission: 'default' | 'denied' | 'granted', answer: 'granted' | 'denied' = 'granted', supported = true) {
  await page.addInitScript(([perm, ans, ok]) => {
    if (!ok) { delete (window as unknown as { PushManager?: unknown }).PushManager; return; }
    let state = perm as string, sub: { endpoint: string; toJSON: () => unknown; unsubscribe: () => Promise<boolean> } | null = null;
    const N = function () {} as unknown as { permission: string; requestPermission: () => Promise<string> };
    Object.defineProperty(N, 'permission', { get: () => state });
    N.requestPermission = async () => { if (state === 'default') state = ans as string; return state; };
    (window as unknown as { Notification: unknown }).Notification = N;
    (window as unknown as { PushManager: unknown }).PushManager = function () {};
    const reg = { pushManager: { getSubscription: async () => sub, subscribe: async () => { sub = { endpoint: 'https://push.example.test/send/fictional-device-endpoint', toJSON: () => ({ endpoint: 'https://push.example.test/send/fictional-device-endpoint', keys: { p256dh: 'fictional-p256dh-key', auth: 'fictional-auth-secret' } }), unsubscribe: async () => { sub = null; return true; } }; return sub; } } };
    Object.defineProperty(navigator, 'serviceWorker', { value: { register: async () => reg, getRegistration: async () => reg, ready: Promise.resolve(reg) }, configurable: true });
  }, [permission, answer, supported] as const);
}
const fixture = (page: Page) => page.evaluate(() => (window as unknown as { __pushFixture?: { calls: { action?: string; batch_id?: string; message?: string }[]; subs: string[] } }).__pushFixture ?? { calls: [], subs: [] });

test('WPN-01/02/06 parent turns alerts on, then off', async ({ page }) => {
  await fakePush(page, 'default'); await parentBackend(page); await loginParent(page); await family(page);
  await expect(page.getByText('Get alerts from your coach', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Turn on notifications', exact: true }).click();
  await expect(page.getByText('Alerts are on for this device', { exact: true })).toBeVisible();
  expect((await fixture(page)).subs).toEqual(['https://push.example.test/send/fictional-device-endpoint']);
  await page.getByRole('button', { name: 'Turn off notifications', exact: true }).click();
  await expect(page.getByText('Get alerts from your coach', { exact: true })).toBeVisible();
  expect((await fixture(page)).subs).toEqual([]);
});
test('WPN-03 denied permission shows guidance and saves nothing', async ({ page }) => {
  await fakePush(page, 'default', 'denied'); await parentBackend(page); await loginParent(page); await family(page);
  await page.getByRole('button', { name: 'Turn on notifications', exact: true }).click();
  await expect(page.getByText('Alerts are blocked', { exact: true })).toBeVisible();
  expect((await fixture(page)).subs).toEqual([]);
});
test('WPN-05 unsupported browser shows no card', async ({ page }) => {
  await fakePush(page, 'default', 'granted', false); await parentBackend(page); await loginParent(page); await family(page);
  await page.waitForTimeout(1500);
  await expect(page.getByText('Get alerts from your coach', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Turn on notifications', exact: true })).toHaveCount(0);
});
test('WPN-07 a coach announcement asks the server to push to that batch', async ({ page }) => {
  await backend(page, { academy: true, readyClass: true }); await login(page);
  await page.getByLabel('Announcement message', { exact: true }).fill('Fictional: no class on Monday');
  await page.getByRole('button', { name: 'Post announcement', exact: true }).click();
  await expect(page.getByText(/Posted to/)).toBeVisible();
  await expect.poll(async () => (await fixture(page)).calls.length).toBeGreaterThan(0);
  const call = (await fixture(page)).calls[0]; expect(call.message).toBe('Fictional: no class on Monday'); expect(call.batch_id).toMatch(/^[0-9a-f-]{36}$/);
});
