import { readFile, mkdir, writeFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../config/public-client.json', import.meta.url), 'utf8'));
const result = { checkedAt: new Date().toISOString(), reachable: false, keyAccepted: false,
  emailEnabled: false, confirmationRequired: false, anonymousRecordsBlocked: false };
try {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: config.supabasePublishableKey }, signal: AbortSignal.timeout(20_000),
  });
  result.reachable = true; result.keyAccepted = response.ok;
  if (response.ok) {
    const settings = await response.json();
    result.emailEnabled = settings.external?.email === true;
    result.confirmationRequired = settings.mailer_autoconfirm === false;
    const records = await fetch(`${config.supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: config.supabasePublishableKey }, signal: AbortSignal.timeout(20_000),
    });
    // Do not read or log records even if a policy is accidentally too broad.
    result.anonymousRecordsBlocked = [401, 403].includes(records.status);
    await records.body?.cancel();
  }
} catch { /* Emit only safe boolean outcomes; no response bodies, keys, or records. */ }
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/live-auth-check.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
if (!result.reachable || !result.keyAccepted || !result.emailEnabled || !result.confirmationRequired || !result.anonymousRecordsBlocked) process.exitCode = 1;
