import type { Page } from '@playwright/test';
import type { Roster } from '../../src/roster/model';

const user = { id: '00000000-0000-0000-0000-000000000001', email: 'coach@example.test',
  aud: 'authenticated', role: 'authenticated', email_confirmed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {}, identities: [] };
declare global {
  interface Window {
    __coachFixture: { academy: boolean; failCreate: boolean; calls: string[]; pkceMethods: string[]; roster: Roster; failStudent: boolean; loseStudentResponse: boolean };
  }
}
export async function backend(page: Page, options: { academy?: boolean; failLogin?: boolean; failAcademy?: boolean; unverified?: boolean; missingRosterMigration?: boolean } = {}) {
  // A transport fixture installed before the real app/SDK loads. No Supabase
  // request can leave this browser; authentication and storage code are unchanged.
  await page.addInitScript(({ user, options }) => {
    const roster = JSON.parse(sessionStorage.getItem('__fictional_roster') ?? 'null') ?? { students: [], contacts: [], batches: [], enrolments: [] };
    window.__coachFixture = { academy: options.academy ?? false, failCreate: false, calls: [], pkceMethods: [], roster, failStudent: false, loseStudentResponse: false };
    const account = options.unverified ? { ...user, email_confirmed_at: null } : user;
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, window.location.origin);
      if (!url.hostname.endsWith('.supabase.co')) {
        if (url.origin === window.location.origin) return original(input, init);
        throw new Error('External network is disabled in authentication tests');
      }
      const state = window.__coachFixture;
      const payload = init?.body ? JSON.parse(String(init.body)) : {};
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      const persistRoster = () => sessionStorage.setItem('__fictional_roster', JSON.stringify(state.roster));
      state.calls.push(url.pathname);
      let data: unknown = {};
      let status = 200;
      if (url.pathname.endsWith('/token')) {
        if (options.failLogin) {
          status = 400; data = { code: 'invalid_credentials', msg: 'Raw backend detail must not display' };
        } else {
          const expires = Math.floor(Date.now() / 1000) + 3600;
          const part = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
          data = { access_token: `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: user.id, exp: expires })}.fictional_signature`,
            token_type: 'bearer', expires_in: 3600, expires_at: expires, refresh_token: 'fictional-refresh-token', user: account };
        }
      } else if (url.pathname.endsWith('/user')) data = account;
      else if (url.pathname.endsWith('/signup') || url.pathname.endsWith('/recover')) {
        const body = JSON.parse(String(init?.body ?? '{}'));
        state.pkceMethods.push(body.code_challenge_method ?? 'missing');
        data = url.pathname.endsWith('/signup') ? { user, session: null } : {};
      }
      else if (url.pathname.endsWith('/logout')) status = 204;
      else if (url.pathname.endsWith('/academies')) {
        status = options.failAcademy ? 500 : 200;
        data = options.failAcademy ? { message: 'private schema failure' } : state.academy
          ? [{ id: 'academy-test', name: 'Fictional Test Academy', timezone: 'Asia/Kolkata', currency: 'INR' }] : [];
      } else if (url.pathname.endsWith('/rpc/create_academy')) {
        if (state.failCreate) { status = 500; data = { message: 'Internal private database text' }; }
        else { state.academy = true; data = { id: 'academy-test' }; }
      } else if (url.pathname.endsWith('/rpc/save_student')) {
        if (state.failStudent) { status = 500; data = { message: 'Fictional private server error' }; }
        else {
          const student = { id: payload.target_student, name: payload.student_name, age_years: payload.age_years, archived_at: null };
          const index = state.roster.students.findIndex(s => s.id === student.id);
          if (index < 0) state.roster.students.push(student); else state.roster.students[index] = student;
          state.roster.contacts = state.roster.contacts.filter(c => c.student_id !== student.id);
          if (payload.guardian_name) state.roster.contacts.push({ student_id: student.id, name: payload.guardian_name, email: payload.guardian_email || null, phone: payload.guardian_phone || null });
          for (const batch of payload.batch_ids) if (!state.roster.enrolments.some(e => e.student_id === student.id && e.batch_id === batch))
            state.roster.enrolments.push({ student_id: student.id, batch_id: batch, starts_on: '2026-11-12', ends_on: null });
          persistRoster(); data = student.id;
          if (state.loseStudentResponse) { state.loseStudentResponse = false; throw new TypeError('Simulated response lost after commit'); }
        }
      } else if (url.pathname.endsWith('/rpc/archive_student')) {
        const student = state.roster.students.find(s => s.id === payload.target_student);
        if (student) student.archived_at = new Date().toISOString();
        persistRoster(); data = true;
      } else if (url.pathname.endsWith('/students')) data = state.roster.students;
      else if (url.pathname.endsWith('/student_contacts')) {
        status = options.missingRosterMigration ? 400 : 200;
        data = options.missingRosterMigration ? { code: '42703', message: 'Fictional missing column' } : state.roster.contacts;
      } else if (url.pathname.endsWith('/enrolments')) data = state.roster.enrolments;
      else if (url.pathname.endsWith('/batches')) {
        if (method === 'POST') {
          const batch = { ...payload, archived_at: null };
          const index = state.roster.batches.findIndex(b => b.id === batch.id);
          if (index < 0) state.roster.batches.push(batch); else state.roster.batches[index] = batch;
          persistRoster();
        }
        data = state.roster.batches;
      } else { status = 400; data = { message: 'Unexpected fixture request' }; }
      return new Response(status === 204 ? null : JSON.stringify(data), { status,
        headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } });
    };
  }, { user, options });
}
export async function login(page: Page) {
  await page.goto('/');
  await page.screenshot({ path: '/tmp/parentplus-login.png', fullPage: true });
  await page.getByRole('textbox', { name: 'Email address' }).fill('coach@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fictional-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

