import { describe, expect, it } from 'vitest';
import { createSessionStorage, createWebAuthStorage, type StorageDriver } from '../src/auth/storage';
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
  it('can explicitly discard a corrupt index and save a fresh session', async () => {
    const { driver } = memory();
    const store = createSessionStorage(driver);
    await driver.setItem('session', 'corrupt-index');
    await expect(store.getItem('session')).rejects.toThrow();
    await store.removeItem('session');
    expect(await store.getItem('session')).toBeNull();
    await store.setItem('session', 'fresh-token');
    expect(await store.getItem('session')).toBe('fresh-token');
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
    expect(validateAuth('signup', 'coach@example.test', 'short', 'short')).toContain('15');
    expect(validateAuth('signup', 'coach@example.test', 'a-long-passphrase-ok', 'different')).toContain('match');
    expect(validateAuth('signup', 'coach@example.test', 'a'.repeat(14), 'a'.repeat(14))).toContain('15');
    expect(validateAuth('signup', 'coach@example.test', 'a'.repeat(15), 'a'.repeat(15))).toBe(null);
    expect(validateAuth('recover', 'coach@example.test', '', '')).toBe(null);
    expect(validateAuth('updatePassword', '', 'a-long-passphrase-ok', 'a-long-passphrase-ok')).toBe(null);
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

describe('web email-link storage',()=>{
 const key='sb-fictional-auth-token',flow='a'.repeat(32),verifierKey=`${key}-flow-${flow}-code-verifier`;
 it('shares only short-lived email verifiers between tabs and keeps sessions in their own tab',async()=>{
  const first=memory(),second=memory(),shared=memory();
  const a=createWebAuthStorage(first.driver,shared.driver,key),b=createWebAuthStorage(second.driver,shared.driver,key);
  await a.setItem(key,'fictional-session-token');await a.setItem(verifierKey,'"fictional-verifier/recovery"');
  expect(await b.getItem(verifierKey)).toBe('"fictional-verifier/recovery"');expect(await b.getItem(key)).toBe(null);
  expect([...shared.values.values()].join('')).not.toContain('fictional-session-token');
  await b.removeItem(verifierKey);expect(await b.getItem(verifierKey)).toBe(null);expect(await a.getItem(verifierKey)).toBe(null);
 });
 it('expires verifier copies in both storage locations',async()=>{
  const tab=memory(),shared=memory();let time=1000;
  const store=createWebAuthStorage(tab.driver,shared.driver,key,{now:()=>time,ttlMs:100});
  await store.setItem(verifierKey,'"proof"');time=1101;
  expect(await store.getItem(verifierKey)).toBe(null);expect(shared.values.size).toBe(0);
  expect(await store.getItem(verifierKey)).toBe(null);
 });
 it('never shares other projects or arbitrary keys with a verifier-looking suffix',async()=>{
  const tab=memory(),shared=memory(),store=createWebAuthStorage(tab.driver,shared.driver,key);
  await store.setItem('sb-other-auth-token-code-verifier','"other"');await store.setItem(`${key}-flow-invalid-code-verifier`,'"invalid"');
  expect(shared.values.size).toBe(0);
 });
 it('keeps same-tab email recovery available when shared browser storage is unavailable',async()=>{
  const tab=memory(),unavailable:StorageDriver={getItem:async()=>{throw Error('blocked');},setItem:async()=>{throw Error('blocked');},removeItem:async()=>{throw Error('blocked');}};
  const store=createWebAuthStorage(tab.driver,unavailable,key);
  await store.setItem(verifierKey,'"proof"');expect(await store.getItem(verifierKey)).toBe('"proof"');await store.removeItem(verifierKey);expect(await store.getItem(verifierKey)).toBe(null);
 });
 it('can read an existing same-tab verifier from before the storage upgrade',async()=>{
  const tab=memory(),shared=memory();await createSessionStorage(tab.driver).setItem(`${key}-code-verifier`,'"existing-proof/recovery"');
  expect(await createWebAuthStorage(tab.driver,shared.driver,key).getItem(`${key}-code-verifier`)).toBe('"existing-proof/recovery"');
 });
 it('preserves and validates the email flow identifier before clearing URL history',()=>{
  expect(parseAuthLink(`https://app.example/auth/recovery?code=one&sb_flow_id=${flow}`,'https://app.example')).toMatchObject({code:'one',flowId:flow,error:false});
  expect(parseAuthLink('https://app.example/auth/recovery?code=one&sb_flow_id=invalid','https://app.example')?.error).toBe(true);
 });
 it('isolates SDK notification channels while preserving each tab’s persisted session and shared email proof',async()=>{
  const first=memory(),second=memory(),shared=memory();
  const a=createWebAuthStorage(first.driver,shared.driver,`${key}-context-first`,{projectStorageKey:key});
  const b=createWebAuthStorage(second.driver,shared.driver,`${key}-context-second`,{projectStorageKey:key});
  await a.setItem(`${key}-context-first`,'fictional-session');await a.setItem(`${key}-context-first-flow-${flow}-code-verifier`,'"proof"');
  expect(await b.getItem(`${key}-context-second`)).toBe(null);
  expect(await b.getItem(`${key}-context-second-flow-${flow}-code-verifier`)).toBe('"proof"');
  const reload=createWebAuthStorage(first.driver,shared.driver,`${key}-context-reloaded`,{projectStorageKey:key});
  expect(await reload.getItem(`${key}-context-reloaded`)).toBe('fictional-session');
 });
 it('keeps cleanup ownership and legacy fallback local to the requesting tab',async()=>{
  const first=memory(),second=memory(),shared=memory(),a=createWebAuthStorage(first.driver,shared.driver,key),b=createWebAuthStorage(second.driver,shared.driver,key);
  await a.setItem(`${key}-flows-code-verifier`,JSON.stringify([flow]));await a.setItem(`${key}-code-verifier`,'"proof/recovery"');await a.setItem(verifierKey,'"proof/recovery"');
  expect(await b.getItem(`${key}-flows-code-verifier`)).toBe(null);expect(await b.getItem(`${key}-code-verifier`)).toBe(null);
  await b.removeItem(`${key}-flows-code-verifier`);await b.removeItem(`${key}-code-verifier`);
  expect(await b.getItem(verifierKey)).toBe('"proof/recovery"');
  expect(shared.values.size).toBe(1);
 });
 it('does not inherit cleanup ownership when a browser clones a tab’s storage',async()=>{
  const first=memory(),cloned=memory(),shared=memory(),firstKey=`${key}-context-original`,secondKey=`${key}-context-clone`;
  const a=createWebAuthStorage(first.driver,shared.driver,firstKey,{projectStorageKey:key});
  await a.setItem(`${firstKey}-flows-code-verifier`,JSON.stringify([flow]));
  for(const [name,value] of first.values)cloned.values.set(name,value);
  const b=createWebAuthStorage(cloned.driver,shared.driver,secondKey,{projectStorageKey:key});
  expect(await b.getItem(`${secondKey}-flows-code-verifier`)).toBe(null);
 });
});
