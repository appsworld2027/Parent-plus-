import publicClient from '../config/public-client.json';

export type AppEnvironment = 'development' | 'test' | 'production';
export type PublicSettings = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  EXPO_PUBLIC_SUPABASE_PROJECT_REF?: string;
  EXPO_PUBLIC_APP_ENV?: string;
};

export function readConfig(settings: PublicSettings) {
  // Fail closed: an unset or misspelled environment must not expose developer controls.
  const environment: AppEnvironment = settings.EXPO_PUBLIC_APP_ENV === 'development'
    ? 'development' : settings.EXPO_PUBLIC_APP_ENV === 'test' ? 'test' : 'production';
  let validUrl = false;
  let actualProjectRef: string | undefined;
  try {
    const url = new URL(settings.EXPO_PUBLIC_SUPABASE_URL ?? '');
    validUrl = url.protocol === 'https:' && !url.username && !url.password
      && url.pathname === '/' && !url.search && !url.hash;
    if (url.hostname.endsWith('.supabase.co')) actualProjectRef = url.hostname.slice(0, -'.supabase.co'.length);
  } catch { /* Missing configuration is a supported startup state. */ }
  const key = settings.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  const publishableKey = key.startsWith('sb_publishable_') && key.length > 20;
  const expectedProjectRef = settings.EXPO_PUBLIC_SUPABASE_PROJECT_REF;
  const validProjectRef = expectedProjectRef === undefined
    || (/^[a-z0-9]{20}$/.test(expectedProjectRef) && actualProjectRef === expectedProjectRef);
  return {
    environment,
    configured: validUrl && publishableKey && validProjectRef,
    publishableKey: publishableKey ? key : undefined,
    url: validUrl ? settings.EXPO_PUBLIC_SUPABASE_URL : undefined,
    projectRef: actualProjectRef,
    missing: [!validUrl && 'Project URL', !publishableKey && 'Publishable key', !validProjectRef && 'Project reference does not match URL'].filter(Boolean) as string[],
  };
}

// EXPO_PUBLIC values and bundled defaults are visible to every app user. Never
// put server credentials here. The URL selects the backend; the environment flag
// only controls app behavior and does not create a separate test database.
export const appConfig = readConfig({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || publicClient.supabaseUrl,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || publicClient.supabasePublishableKey,
  EXPO_PUBLIC_SUPABASE_PROJECT_REF: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF || publicClient.supabaseProjectRef,
});
