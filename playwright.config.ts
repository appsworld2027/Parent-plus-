import { defineConfig } from '@playwright/test';

// Hosted checks exercise the deployed bundle with the same fictional transport.
// Keep the default local runner unchanged when no external URL is provided.
const hostedURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  forbidOnly: true,
  retries: 0,
  outputDir: 'test-results/browser',
  reporter: [['list'], ['junit', { outputFile: 'test-results/browser-junit.xml' }]],
  fullyParallel: false,
  use: {
    baseURL: hostedURL ?? 'http://127.0.0.1:18081',
    viewport: { width: 412, height: 915 },
    trace: process.env.PLAYWRIGHT_TRACE === 'off' ? 'off' : 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: hostedURL ? undefined : {
    command: 'npm run web -- --host localhost --port 18081 --clear',
    url: 'http://127.0.0.1:18081',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1', EXPO_PUBLIC_APP_ENV: 'test',
      EXPO_PUBLIC_ENABLE_PARENT_ATTENDANCE: 'true',
      // Fixtures only: all authentication tests intercept this domain.
      EXPO_PUBLIC_SUPABASE_URL: 'https://testprojectref123456.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_public_test_key',
      EXPO_PUBLIC_SUPABASE_PROJECT_REF: 'testprojectref123456',
    },
  },
});
