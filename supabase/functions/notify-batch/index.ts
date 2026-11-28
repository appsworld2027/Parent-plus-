import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

// Parent Plus web push (deployed to parentplus-dev as notify-batch, verify_jwt on). Two jobs, signed-in users only:
//  {action:'key'}      -> public VAPID key (created on first use; the private half stays in public.push_settings, service role only)
//  {batch_id, message} -> the coach who owns the batch pushes a short message to linked parents' browsers
const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const b64u = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function vapid(admin: ReturnType<typeof createClient>) {
  const read = async () => {
    const r = await admin.from('push_settings').select('name,value').in('name', ['vapid_public', 'vapid_private']);
    if (r.error) throw r.error;
    const m = Object.fromEntries((r.data ?? []).map((x: { name: string; value: string }) => [x.name, x.value]));
    return m.vapid_public && m.vapid_private ? { pub: m.vapid_public, priv: m.vapid_private } : null;
  };
  const existing = await read(); if (existing) return existing;
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const raw = new Uint8Array([4, ...unb64u(jwk.x!), ...unb64u(jwk.y!)]);
  await admin.from('push_settings').upsert([{ name: 'vapid_public', value: b64u(raw) }, { name: 'vapid_private', value: jwk.d! }], { ignoreDuplicates: true, onConflict: 'name' });
  const final = await read(); if (!final) throw new Error('Push keys unavailable');
  return final;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const auth = req.headers.get('Authorization') ?? '';
  const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const who = await caller.auth.getUser();
  if (who.error || !who.data.user) return json({ error: 'Sign in first' }, 401);
  let body: { action?: string; batch_id?: string; message?: string };
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const admin = createClient(url, service);
  try {
    const keys = await vapid(admin);
    if (body.action === 'key') return json({ publicKey: keys.pub });
    const message = String(body.message ?? '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(String(body.batch_id ?? '')) || message.length < 1 || message.length > 500) return json({ error: 'Invalid request' }, 400);
    // Only the coach who owns this batch (row-level security on batches) may push to its families.
    const batch = await caller.from('batches').select('id,name').eq('id', body.batch_id!).maybeSingle();
    if (batch.error || !batch.data) return json({ error: 'Not available' }, 403);
    const targets = await admin.rpc('push_targets', { target_batch: body.batch_id });
    if (targets.error) throw targets.error;
    const list = ((targets.data ?? []) as { endpoint: string; p256dh: string; auth: string }[]).slice(0, 1000);
    webpush.setVapidDetails('https://github.com/appsworld2027/parent-plus-', keys.pub, keys.priv);
    const payload = JSON.stringify({ title: String(batch.data.name ?? 'Your coach'), body: message, url: '/parent' });
    let sent = 0, failed = 0;
    await Promise.all(list.map(async t => {
      try { await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, { TTL: 86400 }); sent++; }
      catch (e) { failed++; const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) await admin.rpc('push_forget', { dead_endpoint: t.endpoint }); }
    }));
    return json({ sent, failed });
  } catch { return json({ error: 'Could not send' }, 500); }
});
