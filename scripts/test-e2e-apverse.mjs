import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cli = resolve(root, 'node_modules/@playwright/test/cli.js');
const result = spawnSync(process.execPath, [cli, 'test', '--config=playwright.apverse.config.ts'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
