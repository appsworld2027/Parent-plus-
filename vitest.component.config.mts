import { defineConfig } from 'vitest/config';
// Browserless component tests: React Native components render through react-native-web + react-dom/server (no browser, no device).
export default defineConfig({
  resolve: { alias: {
    'react-native': 'react-native-web',
    'react-native-svg': new URL('./tests/support/svgStub.tsx', import.meta.url).pathname,
    'expo-font': new URL('./tests/support/expoFontStub.ts', import.meta.url).pathname,
  } },
  test: { include: ['tests/component/**/*.test.tsx'], environment: 'node', maxWorkers: 1, fileParallelism: false },
});
