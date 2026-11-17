import { describe, expect, it } from 'vitest';
import { readConfig } from '../src/config';

const key = 'sb_publishable_example_public_test_key';
describe('safe startup configuration', () => {
  it('hides developer controls for unset or unrecognized environments', () => {
    expect(readConfig({}).environment).toBe('production');
    expect(readConfig({ EXPO_PUBLIC_APP_ENV: 'prodution' }).environment).toBe('production');
    expect(readConfig({ EXPO_PUBLIC_APP_ENV: 'development' }).environment).toBe('development');
  });
  it('starts with actionable missing settings instead of throwing', () => {
    expect(readConfig({})).toMatchObject({ configured: false, missing: ['Project URL', 'Publishable key'] });
  });
  it.each(['http://project.supabase.co', 'https://user:password@project.supabase.co', 'broken', 'https://project.supabase.co/rest/v1/', 'https://project.supabase.co?key=secret'])('rejects unsuitable endpoint %s', (url) => {
    expect(readConfig({ EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }).configured).toBe(false);
  });
  it('rejects server secrets as client configuration', () => {
    expect(readConfig({ EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_private' }).configured).toBe(false);
  });
  it('recognizes public configuration without claiming connectivity', () => {
    expect(readConfig({ EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key })).toMatchObject({ configured: true, missing: [] });
  });
});
