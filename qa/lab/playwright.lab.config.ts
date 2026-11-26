import base from '../../playwright.config';
import { defineConfig } from '@playwright/test';
export default defineConfig({ ...base, testDir: '.', testMatch: /persona-journeys\.spec\.ts|qa-probes\.spec\.ts/, outputDir: '../../qa-results/lab-artifacts',
  reporter: [['json', { outputFile: '../../qa-results/lab-ui.json' }], ['html', { outputFolder: '../../qa-results/lab-html', open: 'never' }], ['line']],
  use: { ...base.use, screenshot: 'only-on-failure', trace: 'retain-on-failure' } });
