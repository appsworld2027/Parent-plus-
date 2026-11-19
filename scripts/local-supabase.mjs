// Real services for synthetic integration tests. No hosted link/reset/push command exists here.
import {execFileSync, spawn} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, join} from 'node:path';
import assert from 'node:assert/strict';
import {project, apiUrl, mailUrl, resourceCandidates, checkDockerHost, checkNetwork, checkContainer, checkVolume, checkStatus} from './local-supabase-guards.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const state = join(root, '.local-supabase');
const command = process.argv[2];
assert.ok(['up', 'test', 'down', 'run'].includes(command), 'Use up | test | down | run.');
assert.equal(process.argv.length, 3, 'No endpoint, directory or credential overrides are accepted.');
assert.notEqual(process.platform, 'win32', 'Use Linux, macOS or WSL2; native Windows is not yet supported.');
const reportPath = join(root, 'test-results/local-supabase.json');
const lifecycle = {attemptId: randomUUID(), command, startedAt: new Date().toISOString(), stages: []};
function message(error) {
  return error instanceof assert.AssertionError ? error.message.split('\n')[0] :
    'Local test runner failed; inspect private local logs and Docker availability.';
}
function saveLifecycle() {
  mkdirSync(join(root, 'test-results'), {recursive: true});
  writeFileSync(join(root, 'test-results/local-supabase-lifecycle.json'), JSON.stringify(lifecycle, null, 2), {mode: 0o600});
}
function finishReport() {
  if (!existsSync(reportPath)) return;
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  report.lifecycle = lifecycle;
  for (const stage of lifecycle.stages.filter(stage => stage.status === 'failed')) {
    report.scenarios.push({id: `LOCAL-RUNNER-${stage.name.toUpperCase()}`, status: 'failed', reason: stage.reason});
  }
  report.summary = Object.fromEntries(['passed', 'failed', 'blocked'].map(status =>
    [status, report.scenarios.filter(row => row.status === status).length]));
  report.status = report.summary.failed ? 'failed' : report.summary.blocked ? 'blocked' :
    report.scenarios.length ? 'passed' : 'setup-only';
  writeFileSync(reportPath, JSON.stringify(report, null, 2), {mode: 0o600});
}
async function stage(name, action) {
  const result = {name, startedAt: new Date().toISOString(), status: 'running'};
  lifecycle.stages.push(result); saveLifecycle();
  try { await action(); result.status = 'passed'; }
  catch (error) { result.status = 'failed'; result.reason = message(error); throw error; }
  finally { result.finishedAt = new Date().toISOString(); saveLifecycle(); }
}
const env = {...process.env, SUPABASE_HOME: join(state, 'cli'), SUPABASE_NO_KEYRING: '1', SUPABASE_USE_SLIM_IMAGES: '1', DO_NOT_TRACK: '1'};
for (const key of Object.keys(env)) {
  if ((key.startsWith('SUPABASE_') && !['SUPABASE_HOME', 'SUPABASE_NO_KEYRING', 'SUPABASE_USE_SLIM_IMAGES'].includes(key)) ||
      key.startsWith('PG') || key.startsWith('EXPO_PUBLIC_')) delete env[key];
  if (/proxy/i.test(key)) delete env[key];
}
// Docker image pulls are performed by the daemon; service health and Auth calls must stay direct.
env.NO_PROXY = '127.0.0.1,localhost,::1,db,auth,rest,storage,kong,inbucket';
const cli = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'supabase.cmd' : 'supabase');
function docker(args) {
  return execFileSync('docker', args, {cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
}
function jsonDocker(args) { return JSON.parse(docker(args)); }
function ownedContainers() {
  return resourceCandidates(docker(['ps', '-a', '--format', '{{.Names}}']).split('\n').filter(Boolean),
    docker(['ps', '-a', '--filter', `label=com.supabase.cli.project=${project}`, '--format', '{{.Names}}']).split('\n').filter(Boolean))
    .map(name => jsonDocker(['inspect', name])[0]);
}
function assertOwned() {
  const networks = docker(['network', 'ls', '--format', '{{.Name}}']).split('\n');
  if (networks.includes(project)) checkNetwork(jsonDocker(['network', 'inspect', project])[0]);
  const containers = ownedContainers();
  containers.forEach(checkContainer);
  const volumes = resourceCandidates(docker(['volume', 'ls', '--format', '{{.Name}}']).split('\n').filter(Boolean),
    docker(['volume', 'ls', '--filter', `label=com.supabase.cli.project=${project}`, '--format', '{{.Name}}']).split('\n').filter(Boolean));
  for (const name of volumes) {
    checkVolume(jsonDocker(['volume', 'inspect', name])[0]);
  }
  return containers;
}
function localDocker() {
  const context = jsonDocker(['context', 'inspect'])[0];
  const host = env.DOCKER_CONTEXT ? context.Endpoints?.docker?.Host :
    env.DOCKER_HOST ?? context.Endpoints?.docker?.Host;
  checkDockerHost(host);
  // Docker config can inject host proxies into containers even when the CLI env is clean.
  // Use a private empty config and the already-validated local socket; do not copy login credentials.
  const config = join(state, 'docker');
  mkdirSync(config, {recursive: true, mode: 0o700});
  writeFileSync(join(config, 'config.json'), '{}', {mode: 0o600});
  env.DOCKER_CONFIG = config;
  env.DOCKER_HOST = host;
  delete env.DOCKER_CONTEXT;
}
function prepare() {
  mkdirSync(join(state, 'supabase', 'migrations'), {recursive: true, mode: 0o700});
  const expected = readFileSync(join(root, 'tests/local-supabase/config.toml'));
  const config = join(state, 'supabase/config.toml');
  if (existsSync(config)) assert.deepEqual(readFileSync(config), expected, 'Changed local config; inspect before continuing.');
  else writeFileSync(config, expected, {mode: 0o600});
  assert.ok(!existsSync(join(state, 'supabase/.temp/project-ref')), 'A linked project is forbidden here.');
  for (const filename of ['.env', '.env.local', 'supabase/.env', 'supabase/.env.local']) {
    assert.ok(!existsSync(join(state, filename)), 'Unexpected environment file in isolated project.');
  }
  const allNames = readdirSync(join(root, 'supabase/migrations')).filter(name => /^2026\d{8}_.+\.sql$/.test(name)).sort();
  assert.ok(allNames.includes('20261117090944_parent_attendance_read.sql'), 'Review the APVerse-only attendance migration boundary.');
  const names = allNames.filter(name => name !== '20261117090944_parent_attendance_read.sql');
  assert.equal(names.length, 14, 'Review deployed migration boundary before extending the service stack.');
  assert.equal(names.at(-1), '202611160014_verified_parent_connections.sql');
  const manifest = Object.fromEntries(names.map(name => {
    const bytes = readFileSync(join(root, 'supabase/migrations', name));
    const dest = join(state, 'supabase/migrations', name);
    if (existsSync(dest)) assert.deepEqual(readFileSync(dest), bytes, 'Migration copy changed; inspect disposable stack.');
    else writeFileSync(dest, bytes, {mode: 0o600});
    return [name, createHash('sha256').update(bytes).digest('hex')];
  }));
  assert.deepEqual(readdirSync(join(state, 'supabase/migrations')).sort(), names, 'Unexpected local migration file.');
  writeFileSync(join(state, 'migration-hashes.json'), JSON.stringify(manifest, null, 2), {mode: 0o600});
}
function captureCli(args) {
  return execFileSync(cli, [...args, '--workdir', state], {cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
}
async function loggedCli(args) {
  // CLI startup/status can contain disposable server keys. Keep complete logs private and ignored.
  const {openSync, closeSync} = await import('node:fs');
  const fd = openSync(join(state, 'cli.log'), 'a', 0o600);
  try {
    const code = await new Promise((done, fail) => {
      const child = spawn(cli, [...args, '--workdir', state], {cwd: root, env, stdio: ['ignore', fd, fd]});
      child.once('error', fail); child.once('exit', done);
    });
    assert.equal(code, 0, 'Local Supabase command failed; inspect ignored .local-supabase/cli.log.');
  } finally { closeSync(fd); }
}
async function up() {
  prepare();
  assert.equal(captureCli(['--version']).trim(), '3.2.0', 'Use the locked Supabase CLI.');
  localDocker();
  assertOwned();
  if (!docker(['network', 'ls', '--format', '{{.Name}}']).split('\n').includes(project)) {
    docker(['network', 'create', '--label', 'parentplus.local-test=true',
      '--opt', 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', project]);
  }
  console.log('Starting isolated local services; first image downloads can take several minutes.');
  await loggedCli(['start', '--network-id', project, '--exclude',
    'realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']);
  assertOwned();
  await status();
  console.log('Local Auth, REST, Storage and captured mail are ready. No hosted project is linked.');
}
async function status() {
  localDocker();
  const containers = assertOwned();
  for (const service of ['db', 'auth', 'rest', 'storage', 'kong', 'inbucket']) {
    assert.ok(containers.some(c => c.Name === `/supabase_${service}_${project}` && c.State?.Running),
      `Missing running local ${service} service.`);
  }
  const current = JSON.parse(captureCli(['status', '-o', 'json']));
  checkStatus(current);
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  const dirty = execFileSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'}).trim().length > 0;
  const path = join(state, 'test-config.json');
  writeFileSync(path, JSON.stringify({apiUrl, mailUrl, anonKey: current.ANON_KEY,
    serviceRoleKey: current.SERVICE_ROLE_KEY, sourceSha, dirty,
    migrations: JSON.parse(readFileSync(join(state, 'migration-hashes.json'), 'utf8'))}), {mode: 0o600});
  return path;
}
async function test() {
  prepare();
  const config = await status();
  const code = await new Promise((done, fail) => {
    // Host Node's proxy settings must not route local tokens/mail through an external proxy.
    const localEnv = Object.fromEntries(Object.entries(env).filter(([key]) =>
      !/proxy/i.test(key) && key !== 'NODE_USE_ENV_PROXY'));
    const child = spawn(process.execPath, [resolve(root, 'tests/local-supabase/journeys.mjs'), config],
      {cwd: root, env: localEnv, stdio: 'inherit'});
    child.once('error', fail); child.once('exit', done);
  });
  assert.equal(code, 0, 'Real local-service journey failed.');
}
async function down() {
  if (!existsSync(state)) return;
  prepare();
  localDocker();
  assertOwned();
  await loggedCli(['stop', '--no-backup']);
  assert.equal(ownedContainers().length, 0, 'Local test containers still exist.');
  if (docker(['network', 'ls', '--format', '{{.Name}}']).split('\n').includes(project)) {
    checkNetwork(jsonDocker(['network', 'inspect', project])[0]);
    docker(['network', 'rm', project]);
  }
  rmSync(join(state, 'test-config.json'), {force: true});
  console.log('Disposable test containers/data removed; downloaded images remain cached.');
}
try {
  if (command !== 'down') {
    mkdirSync(join(root, 'test-results'), {recursive: true});
    // Invalidate older green results before boot can fail. Never leave a stale pass after failure.
    writeFileSync(reportPath, JSON.stringify({schemaVersion: 1, environment: 'local-real-supabase',
      startedAt: lifecycle.startedAt, scenarios: [], summary: {passed: 0, failed: 0, blocked: 1},
      status: 'setup-running'}), {mode: 0o600});
  }
  if (command === 'run') {
    let failure;
    try { await stage('setup', up); await stage('journeys', test); } catch (error) { failure = error; }
    try { await stage('cleanup', down); } catch (error) { failure ??= error; }
    if (failure) throw failure;
  } else if (command === 'up') await stage('setup', up);
  else if (command === 'test') await stage('journeys', test);
  else await stage('cleanup', down);
} catch (error) {
  // Do not echo child output/requests: those can include local Auth credentials.
  console.error(message(error));
  process.exitCode = 1;
} finally {
  lifecycle.finishedAt = new Date().toISOString();
  saveLifecycle(); finishReport();
}
