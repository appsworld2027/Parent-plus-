import { describe, expect, it } from 'vitest';
import { createSessionStorage, type StorageDriver } from '../src/auth/storage';
import { parseAuthLink, validateAuth } from '../src/auth/rules';

function memory() {
  const values = new Map<string, string>();
  const driver: StorageDriver = {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async key => { values.delete(key); },
  };
  return { driver, values };
}
describe('secure session adapter', () => {
  it('round-trips long Unicode sessions using small ASCII chunks', async () => {
    const { driver, values } = memory();
    const store = createSessionStorage(driver);
    const data = JSON.stringify({ metadata: 'नमस्ते 👨‍👩‍👧'.repeat(500), token: 'fictional-test-token' });
    await store.setItem('session', data);
    expect(await store.getItem('session')).toBe(data);
    expect([...values.values()].every(x => x.length <= 1500)).toBe(true);
  });
  it('keeps the old session if a refresh write fails', async () => {
    const { driver } = memory();
    const store = createSessionStorage(driver);
    await store.setItem('session', 'old session');
    const original = driver.setItem;
    driver.setItem = async (key, value) => { if (key.endsWith('.1')) throw new Error('Storage unavailable'); await original(key, value); };
    await expect(store.setItem('session', 'x'.repeat(3000))).rejects.toThrow('Storage unavailable');
    expect(await store.getItem('session')).toBe('old session');
  });
  it('serializes concurrent writes and removes previous session chunks', async () => {
    const { driver, values } = memory();
    const store = createSessionStorage(driver);
    await Promise.all([store.setItem('session', 'first'), store.setItem('session', 'second')]);
    expect(await store.getItem('session')).toBe('second');
    expect(values.size).toBe(2);
    await store.removeItem('session');
    expect(await store.getItem('session')).toBe(null);
    expect(values.size).toBe(0);
  });
  it('fails explicitly on incomplete storage instead of returning a partial token', async () => {
    const { driver, values } = memory();
    const store = createSessionStorage(driver);
    await store.setItem('session', 'data');
    for (const key of values.keys()) if (key !== 'session') values.delete(key);
    await expect(store.getItem('session')).rejects.toThrow('Session storage incomplete');
  });
  it('rejects malformed manifests and oversized sessions', async () => {
    const { driver, values } = memory();
    const store = createSessionStorage(driver);
    values.set('session', JSON.stringify({ version: 1, count: 1_000_000, generation: '../unsafe' }));
    await expect(store.getItem('session')).rejects.toThrow('Invalid session manifest');
    values.clear();
    await expect(store.setItem('session', 'x'.repeat(300001))).rejects.toThrow('Session storage limit exceeded');
  });
});

describe('email and recovery guardrails', () => {
  it('validates email and new passwords without rejecting valid existing shorter passwords', () => {
    expect(validateAuth('login', 'wrong', 'password', '')).toContain('email');
    expect(validateAuth('login', 'coach@example.test', 'older', '')).toBe(null);
    expect(validateAuth('signup', 'coach@example.test', 'short', 'short')).toContain('10');
    expect(validateAuth('signup', 'coach@example.test', 'longpassword', 'different')).toContain('match');
    expect(validateAuth('recover', 'coach@example.test', '', '')).toBe(null);
    expect(validateAuth('updatePassword', '', 'longpassword', 'longpassword')).toBe(null);
  });
  it('accepts only owned callback routes and one-time code exchanges', () => {
    expect(parseAuthLink('parentplus-coach://auth/recovery?code=one-time')).toEqual({ code: 'one-time', recovery: true, error: false });
    expect(parseAuthLink('https://app.example/auth/callback?code=code', 'https://app.example')?.code).toBe('code');
    expect(parseAuthLink('https://evil.example/auth/callback?code=code', 'https://app.example')).toBe(null);
    expect(parseAuthLink('other-app://auth/recovery?code=code')).toBe(null);
    expect(parseAuthLink('parentplus-coach://evil/recovery?code=code')).toBe(null);
    expect(parseAuthLink('parentplus-coach://auth/callback#access_token=untrusted')?.code).toBe('');
    expect(parseAuthLink('parentplus-coach://auth/recovery?error=expired')?.error).toBe(true);
  });
});
