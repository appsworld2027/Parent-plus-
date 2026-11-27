// Fictional provider-verification service shared by C1.2 and C1.3 browser tests. Holds ONE state in Node so a coach page,
// a second device and an admin page all see the same records. No request leaves the browser. Row-level security is proven
// separately on a disposable database (tests/provider-verification-database.test.ts); this fake only mirrors the wire shape.
import type { BrowserContext, Page } from '@playwright/test';
import { backend } from './backend';

export type Role = 'coach' | 'other' | 'admin';
export const ids: Record<Role, string> = { coach: '00000000-0000-0000-0000-000000000001', other: '00000000-0000-0000-0000-000000000002', admin: '00000000-0000-0000-0000-000000000003' };
type Doc = { kind: 'photo_id' | 'qualification'; path: string; file_name: string };
export type Profile = { name: string; phone: string; bio: string; sports: string[]; experience: number | null; status: 'draft' | 'pending' | 'verified' | 'rejected';
  reason: string | null; submitted_at: string | null; decided_at: string | null; docs: Doc[] };
export type Store = { profiles: Record<string, Profile>; objects: string[]; signed: { path: string; expiresIn: number; by: string }[];
  decisions: { user: string; decision: string; reason: string | null; by: string; at: string }[]; publicRequests: number; uploads: number; now: string; calls: string[];
  extra: Record<string, any> };
export const NOW = '2026-11-27T10:00:00.000Z';
export function newStore(): Store { return { profiles: {}, objects: [], signed: [], decisions: [], publicRequests: 0, uploads: 0, now: NOW, calls: [], extra: {} }; }
export const blank = (): Profile => ({ name: '', phone: '', bio: '', sports: [], experience: null, status: 'draft', reason: null, submitted_at: null, decided_at: null, docs: [] });
export const complete = (status: Profile['status'] = 'pending'): Profile => ({ name: 'Fictional Coach', phone: '9876543210', bio: 'Fictional bio of a coach with real experience.', sports: ['Cricket'],
  experience: 6, status, reason: null, submitted_at: NOW, decided_at: status === 'verified' || status === 'rejected' ? NOW : null,
  docs: [{ kind: 'photo_id', path: 'x/photo_id/id.png', file_name: 'id.png' }, { kind: 'qualification', path: 'x/qualification/cert.pdf', file_name: 'cert.pdf' }] });

const refuse = (code: string, message: string, status = 400) => ({ status, body: { code, message } });
export function serve(store: Store, who: string, op: string, p: any): { status: number; body: any } {
  store.calls.push(`${who}:${op}`);
  const admin = who === ids.admin, mine = (store.profiles[who] ??= blank());
  const locked = mine.status === 'pending' || mine.status === 'verified';
  const view = () => ({ status: mine.status, reason: mine.reason, submitted_at: mine.submitted_at, decided_at: mine.decided_at, is_admin: admin,
    profile: { name: mine.name, phone: mine.phone, bio: mine.bio, sports: mine.sports, experience: mine.experience },
    documents: mine.docs.map(d => ({ kind: d.kind, file_name: d.file_name })) });
  if (op === 'public') { store.publicRequests++; return { status: 404, body: null }; }
  if (op === 'get') return { status: 200, body: view() };
  if (op === 'save') {
    if (locked) return refuse('42501', 'Profile is locked', 403);
    Object.assign(mine, { name: p.p_name, phone: p.p_phone, bio: p.p_bio, sports: p.p_sports, experience: p.p_experience }); return { status: 200, body: view() };
  }
  if (op === 'upload') {
    if (locked || !String(p.path).startsWith(`${who}/`)) return refuse('403', 'Denied', 403);
    store.uploads++; store.objects.push(p.path); return { status: 200, body: { Key: p.path } };
  }
  if (op === 'register') {
    if (locked || !store.objects.includes(p.p_path)) return refuse('42501', 'Denied', 403);
    mine.docs = [...mine.docs.filter(d => d.kind !== p.p_kind), { kind: p.p_kind, path: p.p_path, file_name: p.p_file_name }]; return { status: 200, body: view() };
  }
  if (op === 'submit') {
    const ok = mine.name && mine.phone && mine.bio && mine.sports.length && mine.experience !== null && mine.docs.length === 2;
    if (locked || !ok) return refuse('22023', 'Incomplete', 400);
    Object.assign(mine, { status: 'pending', reason: null, submitted_at: store.now }); return { status: 200, body: view() };
  }
  if (op === 'queue') {
    if (!admin) return refuse('42501', 'Admins only', 403);
    return { status: 200, body: Object.entries(store.profiles).filter(([, v]) => v.status === 'pending').map(([id, v]) => ({ user_id: id, name: v.name, phone: v.phone, bio: v.bio,
      sports: v.sports, experience: v.experience, submitted_at: v.submitted_at, documents: v.docs })) };
  }
  if (op === 'decide') {
    const target = store.profiles[p.p_user];
    if (!admin) return refuse('42501', 'Admins only', 403);
    if (!target || target.status !== 'pending' || (p.p_decision === 'reject' && !String(p.p_reason ?? '').trim())) return refuse('22023', 'Cannot decide', 400);
    Object.assign(target, p.p_decision === 'approve' ? { status: 'verified', reason: null } : { status: 'rejected', reason: p.p_reason }, { decided_at: store.now });
    store.decisions.push({ user: p.p_user, decision: p.p_decision, reason: p.p_reason ?? null, by: who, at: store.now }); return { status: 200, body: null };
  }
  if (op === 'sign') {
    const owner = Object.entries(store.profiles).find(([, v]) => v.docs.some(d => d.path === p.path))?.[0];
    if (!owner || (owner !== who && !admin)) return refuse('404', 'Object not found', 404);
    store.signed.push({ path: p.path, expiresIn: p.expiresIn, by: who });
    return { status: 200, body: { signedURL: `/object/sign/provider-documents/${p.path}?token=fictional` } };
  }
  return refuse('PGRST202', 'Unknown', 404);
}

export async function providerBackend(page: Page, store: Store, role: Role, options: { context?: BrowserContext } = {}) {
  await backend(page, { academy: true, readyClass: true });
  await page.exposeFunction('__pv', (op: string, p: unknown) => serve(store, ids[role], op, p));
  await (options.context ?? page.context()).route('**/object/sign/provider-documents/**', route => route.fulfill({ status: 200, contentType: 'text/plain', body: 'fictional document' }));
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, location.origin), path = url.pathname;
      if (!url.hostname.endsWith('.supabase.co')) return original(input, init);
      const rpc = path.match(/\/rest\/v1\/rpc\/(get_my_provider_profile|save_provider_profile|register_provider_document|submit_provider_profile|list_provider_review_queue|decide_provider_profile)$/);
      const sign = path.match(/\/storage\/v1\/object\/sign\/provider-documents\/(.+)$/), put = path.match(/\/storage\/v1\/object\/provider-documents\/(.+)$/);
      if (path.includes('/object/public/') && path.includes('provider-documents')) await (window as any).__pv('public', {});
      if (!rpc && !sign && !put) return original(input, init);
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      let body: any = {}; try { body = init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch { /* not JSON */ }
      const names: Record<string, string> = { get_my_provider_profile: 'get', save_provider_profile: 'save', register_provider_document: 'register', submit_provider_profile: 'submit',
        list_provider_review_queue: 'queue', decide_provider_profile: 'decide' };
      const result = rpc ? await (window as any).__pv(names[rpc[1]], body) : sign ? await (window as any).__pv('sign', { path: decodeURIComponent(sign[1]), expiresIn: body.expiresIn })
        : method === 'POST' || method === 'PUT' ? await (window as any).__pv('upload', { path: decodeURIComponent(put![1]) }) : { status: 404, body: { message: 'Not found' } };
      return new Response(result.status === 204 || result.body === null ? null : JSON.stringify(result.body), { status: result.body === null && result.status === 200 ? 204 : result.status,
        headers: { 'Content-Type': 'application/json' } });
    };
  });
}
