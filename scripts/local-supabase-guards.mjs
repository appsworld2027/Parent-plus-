import assert from 'node:assert/strict';

export const project = 'parentplus-local-test';
export const apiUrl = 'http://127.0.0.1:54321';
export const mailUrl = 'http://127.0.0.1:54324';

export function checkDockerHost(host) {
  assert.ok(typeof host === 'string' && /^unix:\/\/\//.test(host),
    'Local Docker socket required; remote Docker endpoints are refused.');
}

export function checkNetwork(network) {
  assert.equal(network.Name, project, 'Unexpected Docker network.');
  assert.equal(network.Labels?.['parentplus.local-test'], 'true', 'Foreign test network.');
  assert.equal(network.Internal, false, 'Use the supported local bridge network.');
  assert.equal(network.Options?.['com.docker.network.bridge.host_binding_ipv4'], '127.0.0.1',
    'Test services must bind to loopback.');
}

export function checkContainer(container) {
  assert.ok(container.Name?.startsWith('/supabase_') && container.Name.endsWith(`_${project}`),
    'Unexpected test container name.');
  assert.equal(container.Config?.Labels?.['com.supabase.cli.project'], project, 'Foreign container.');
  assert.deepEqual(Object.keys(container.NetworkSettings?.Networks ?? {}), [project],
    'Test container must use only its isolated network.');
  for (const [port, bindings] of Object.entries(container.HostConfig?.PortBindings ?? {})) {
    for (const binding of bindings ?? []) {
      // Empty is Docker's network-default binding, checked separately on the owned network.
      assert.ok(['', '127.0.0.1'].includes(binding.HostIp), 'Test port requests a nonlocal binding.');
    }
    if (container.State?.Running && bindings?.length) {
      assert.ok(container.NetworkSettings?.Ports?.[port]?.length, 'Running service port is not published.');
    }
  }
  for (const bindings of Object.values(container.NetworkSettings?.Ports ?? {})) {
    for (const binding of bindings ?? []) {
      assert.equal(binding.HostIp, '127.0.0.1', 'Effective test port is not restricted to loopback.');
    }
  }
}

export function checkVolume(volume) {
  assert.ok(volume.Name?.startsWith('supabase_') && volume.Name.endsWith(`_${project}`),
    'Unexpected test volume name.');
  assert.equal(volume.Labels?.['com.supabase.cli.project'], project, 'Foreign test volume.');
}

export function checkStatus(status) {
  assert.equal(status.API_URL, apiUrl, 'Unexpected Supabase API endpoint.');
  const mail = status.MAILPIT_URL ?? status.INBUCKET_URL;
  assert.equal(mail, mailUrl, 'Unexpected captured-mail endpoint.');
  assert.ok(typeof status.ANON_KEY === 'string' && status.ANON_KEY.length > 20, 'Missing local public key.');
  assert.ok(typeof status.SERVICE_ROLE_KEY === 'string' && status.SERVICE_ROLE_KEY.length > 20,
    'Missing local server key.');
}
