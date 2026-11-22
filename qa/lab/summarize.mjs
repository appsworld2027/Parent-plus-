// Summarises the QA lab results for the GitHub run page and the nightly ai:fix issue.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const read = f => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
const db = read('qa-results/lab-db.json'), ui = read('qa-results/lab-ui.json'), rows = [];
for (const r of db?.testResults?.[0]?.assertionResults ?? []) rows.push([r.title.split(' ')[0], 'db', r.status]);
const walk = s => { for (const sp of s.specs ?? []) rows.push([sp.title.split(' ')[0], 'ui', sp.tests.at(-1).results.at(-1).status]); (s.suites ?? []).forEach(walk); };
(ui?.suites ?? []).forEach(walk);
const bad = rows.filter(r => r[2] !== 'passed');
mkdirSync('qa-results', { recursive: true });
const missing = !db || !ui ? `\n⚠️ Missing results: ${!db ? 'database lab ' : ''}${!ui ? 'browser lab' : ''} — the run itself failed.\n` : '';
writeFileSync('qa-results/summary.md', `### QA lab: ${rows.length - bad.length}/${rows.length} passed\n${missing}` +
  (bad.length ? bad.map(r => `- ❌ ${r[0]} (${r[1]})`).join('\n') : (missing ? '' : 'All green')) + `\n\nRun: ${process.env.RUN_URL ?? 'local'}\n`);
writeFileSync('qa-results/failed.txt', String(bad.length + (missing ? 1 : 0)));
console.log(readFileSync('qa-results/summary.md', 'utf8'));
