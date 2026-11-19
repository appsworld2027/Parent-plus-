import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-apverse',
  forbidOnly: true,
  retries: 0,
  outputDir: 'test-results/apverse_browser',
  reporter: [['list'], ['junit', { outputFile: 'test-results/apverse_browser-junit.xml' }]],
  fullyParallel: false,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:18082',
    viewport: { width: 412, height: 915 },
    trace: process.env.PLAYWRIGHT_TRACE === 'off' ? 'off' : 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run web -- --host localhost --port 18082 --clear',
    url: 'http://127.0.0.1:18082',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1', EXPO_PUBLIC_APP_ENV: 'test',
      EXPO_PUBLIC_ENABLE_PARENT_ATTENDANCE: 'true',
      EXPO_PUBLIC_SUPABASE_URL: 'https://fmavpazczahxeusqbxuh.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_public_test_key',
      EXPO_PUBLIC_SUPABASE_PROJECT_REF: 'fmavpazczahxeusqbxuh',
    },
  },
});
