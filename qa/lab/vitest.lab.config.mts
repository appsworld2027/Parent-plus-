import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['qa/lab/**/*.test.ts'], testTimeout: 600000, hookTimeout: 180000, maxWorkers: 1, fileParallelism: false } });
