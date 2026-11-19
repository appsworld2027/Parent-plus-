import {test} from 'node:test';
import assert from 'node:assert/strict';
import {project, apiUrl, mailUrl, checkDockerHost, checkNetwork, checkContainer, checkVolume, checkStatus} from '../../scripts/local-supabase-guards.mjs';

test('LOCAL-GUARD-01: remote Docker hosts are refused before provisioning', () => {
  checkDockerHost('unix:///var/run/docker.sock');
  for (const host of ['tcp://example.test:2375', 'ssh://example.test', '', undefined]) {
    assert.throws(() => checkDockerHost(host));
  }
});
test('LOCAL-GUARD-02: foreign or exposed networks are refused', () => {
  const network = {Name: project, Internal: false, Labels: {'parentplus.local-test': 'true'},
    Options: {'com.docker.network.bridge.host_binding_ipv4': '127.0.0.1'}};
  checkNetwork(network);
  for (const override of [{Name: 'foreign'}, {Internal: true}, {Labels: {}}, {Options: {}}]) {
    assert.throws(() => checkNetwork({...network, ...override}));
  }
});
test('LOCAL-GUARD-03: a matching name never authorizes foreign or exposed containers', () => {
  const container = {Name: `/supabase_db_${project}`, Config: {Labels: {'com.supabase.cli.project': project}},
    NetworkSettings: {Networks: {[project]: {}}},
    HostConfig: {PortBindings: {'5432/tcp': [{HostIp: '127.0.0.1', HostPort: '54322'}]}}};
  checkContainer(container);
  assert.throws(() => checkContainer({...container, Config: {Labels: {}}}));
  assert.throws(() => checkContainer({...container, Name: '/production'}));
  assert.throws(() => checkContainer({...container, NetworkSettings: {Networks: {[project]: {}, bridge: {}}}}));
  for (const HostIp of ['0.0.0.0', '::']) {
    assert.throws(() => checkContainer({...container, HostConfig: {PortBindings: {'80/tcp': [{HostIp}]}}}));
  }
  const inherited = {...container, State: {Running: true},
    HostConfig: {PortBindings: {'80/tcp': [{HostIp: '', HostPort: '54321'}]}},
    NetworkSettings: {Networks: {[project]: {}}, Ports: {'80/tcp': [{HostIp: '127.0.0.1'}]}}};
  checkContainer(inherited);
  assert.throws(() => checkContainer({...inherited, NetworkSettings: {Networks: {[project]: {}}, Ports: {'80/tcp': [{HostIp: '0.0.0.0'}]}}}));
  assert.throws(() => checkContainer({...inherited, NetworkSettings: {Networks: {[project]: {}}, Ports: {}}}));
});
test('LOCAL-GUARD-04: real-service tests reject hosted or alternative service endpoints', () => {
  const status = {API_URL: apiUrl, MAILPIT_URL: mailUrl, ANON_KEY: 'fictional-key-at-least-20-characters',
    SERVICE_ROLE_KEY: 'fictional-local-only-server-key-at-least-20'};
  checkStatus(status);
  for (const override of [{API_URL: 'https://example.supabase.co'}, {MAILPIT_URL: 'https://example.test'},
    {API_URL: 'http://127.0.0.1:1234'}, {SERVICE_ROLE_KEY: ''}]) {
    assert.throws(() => checkStatus({...status, ...override}));
  }
});
test('LOCAL-GUARD-05: a leftover volume is not owned merely because its name matches', () => {
  const volume = {Name: `supabase_db_${project}`, Labels: {'com.supabase.cli.project': project}};
  checkVolume(volume);
  assert.throws(() => checkVolume({...volume, Labels: {}}));
  assert.throws(() => checkVolume({...volume, Name: 'supabase_db_other'}));
});
