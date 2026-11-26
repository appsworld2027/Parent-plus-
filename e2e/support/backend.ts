import type { Observation } from '../../src/observations/model';
import type { Page } from '@playwright/test';
import type { Roster } from '../../src/roster/model';
import type { ClassSession, Marks } from '../../src/classes/model';

const user = { id: '00000000-0000-0000-0000-000000000001', email: 'coach@example.test',
  aud: 'authenticated', role: 'authenticated', email_confirmed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {}, identities: [] };
declare global {
  interface Window {
    __coachFixture: { academy: boolean; failCreate: boolean; calls: string[]; pkceMethods: string[]; roster: Roster; failStudent: boolean; loseStudentResponse: boolean; classes: ClassSession[]; attendance: Record<string, Marks>; failAttendance: boolean; loseAttendanceResponse: boolean; failClass: boolean; failArchive: boolean; holdAttendance: boolean; observations: Observation[]; observationRecipients: Record<string, string[]>; observationVersions: Record<string, { revision: number; note: string; status: string; saved_at: string }[]>; failObservation: boolean; loseObservationResponse: boolean; holdObservation: boolean; coachWorkspaces: { id: string; name: string; time_zone: string | null }[]; failWorkspaceList: boolean; failWorkspaceZone: boolean; workspaceCreateCalls: { p_name: string; p_type: string; p_request_id: string }[]; workspaceCreationReceipts: Record<string,string>; apVerseRole: 'manager'|'coach'; failApVerseRoster: boolean; loseApVerseSaveResponse:boolean; apVerseCandidates: {child_id:string;child_name:string}[]; apVerseBatches: {batch_id:string;batch_name:string;course_name:string}[]; apVerseEnrollments: {enrollment_id:string;child_id:string;child_name:string;batch_id:string;status:string;version:number}[]; apVerseSaveCalls: {p_workspace_id:string;p_batch_id:string;p_child_id:string;p_request_id:string}[] };
  }
}
export async function backend(page: Page, options: { academy?: boolean; failLogin?: boolean; failAcademy?: boolean; unverified?: boolean; secondaryAccount?:boolean; missingRosterMigration?: boolean; readyClass?: boolean; missingClassMigration?: boolean; missingObservationMigration?: boolean; coachWorkspaces?:{id:string;name:string;time_zone:string|null}[];failWorkspaceList?:boolean;apVerseRole?:'manager'|'coach';failApVerseRoster?:boolean } = {}) {
  // A transport fixture installed before the real app/SDK loads. No Supabase
  // request can leave this browser; authentication and storage code are unchanged.
  await page.addInitScript(({ user, options }) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const batchId = '00000000-0000-0000-0000-000000000031';
    const studentId = '00000000-0000-0000-0000-000000000021';
    const classId = '00000000-0000-0000-0000-000000000051';
    const roster = JSON.parse(sessionStorage.getItem('__fictional_roster') ?? 'null') ?? (options.readyClass
      ? { students: [{ id: studentId, name: 'Fictional Ria', age_years: 6, archived_at: null }], contacts: [],
          batches: [{ id: batchId, name: 'Fictional Clay Class', room: 'Room 1', monthly_fee_paise: 250000, archived_at: null }],
          enrolments: [{ id: '00000000-0000-0000-0000-000000000041', student_id: studentId, batch_id: batchId, starts_on: '2020-01-01', ends_on: null }] }
      : { students: [], contacts: [], batches: [], enrolments: [] });
    const teaching = JSON.parse(sessionStorage.getItem('__fictional_classes') ?? 'null') ?? {
      classes: options.readyClass ? [{ id: classId, batch_id: batchId, starts_at: `${today}T10:30:00.000Z`, ends_at: `${today}T11:30:00.000Z`, room: 'Room 1', status: 'scheduled', attendance_revision: 0 }] : [], attendance: {} };
    const notes = JSON.parse(sessionStorage.getItem('__fictional_observations') ?? 'null') ?? { observations: [], recipients: {}, versions: {} };
    window.__coachFixture = { academy: options.academy ?? false, failCreate: false, calls: [], pkceMethods: [], roster, failStudent: false, loseStudentResponse: false, classes: teaching.classes, attendance: teaching.attendance, failAttendance: false, loseAttendanceResponse: false, failClass: false, failArchive: false, holdAttendance: false, observations: notes.observations, observationRecipients: notes.recipients, observationVersions: notes.versions, failObservation: false, loseObservationResponse: false, holdObservation: false, coachWorkspaces: options.coachWorkspaces ?? [], failWorkspaceList: options.failWorkspaceList ?? false, failWorkspaceZone: false, workspaceCreateCalls: [], workspaceCreationReceipts: {}, apVerseRole: options.apVerseRole ?? 'manager', failApVerseRoster: options.failApVerseRoster ?? false, loseApVerseSaveResponse:false, apVerseCandidates: [{child_id:'00000000-0000-0000-0000-000000000030',child_name:'Fictional Asha'},{child_id:'00000000-0000-0000-0000-000000000031',child_name:'Fictional Ravi'}], apVerseBatches:[{batch_id:'00000000-0000-0000-0000-000000000020',batch_name:'Fictional Studio A',course_name:'Art'}], apVerseEnrollments:[{enrollment_id:'00000000-0000-0000-0000-000000000040',child_id:'00000000-0000-0000-0000-000000000030',child_name:'Fictional Asha',batch_id:'00000000-0000-0000-0000-000000000020',status:'active',version:1}], apVerseSaveCalls:[] };
    const selectedAccount=options.secondaryAccount?{...user,id:'00000000-0000-0000-0000-000000000002',email:'second@example.test'}:user;
    const account = options.unverified ? { ...selectedAccount, email_confirmed_at: null } : selectedAccount;
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
      const pageRows=(values:{id?:string}[])=>{
        const filter=url.searchParams.get('id');
        let rows=[...values];
        if(filter?.startsWith('gt.'))rows=rows.filter(row=>!!row.id&&row.id>filter.slice(3));
        if(url.searchParams.get('order')?.startsWith('id.'))rows.sort((a,b)=>(a.id??'').localeCompare(b.id??''));
        const offset=Number(url.searchParams.get('offset')??0);
        return rows.slice(offset,offset+Math.min(1000,Number(url.searchParams.get('limit')??1000)));
      };
      const persistRoster = () => sessionStorage.setItem('__fictional_roster', JSON.stringify(state.roster));
      const persistClasses = () => sessionStorage.setItem('__fictional_classes', JSON.stringify({ classes: state.classes, attendance: state.attendance }));
      state.calls.push(url.pathname);
      let data: unknown = {};
      let status = 200;
      if (url.pathname.endsWith('/token')) {
        if (options.failLogin) {
          status = 400; data = { code: 'invalid_credentials', msg: 'Raw backend detail must not display' };
        } else {
          const expires = Math.floor(Date.now() / 1000) + 3600;
          const part = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
          data = { access_token: `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: account.id, exp: expires })}.fictional_signature`,
            token_type: 'bearer', expires_in: 3600, expires_at: expires, refresh_token: 'fictional-refresh-token', user: account };
        }
      } else if (url.pathname.endsWith('/user')) data = account;
      else if (url.pathname.endsWith('/signup') || url.pathname.endsWith('/recover')) {
        const body = JSON.parse(String(init?.body ?? '{}'));
        state.pkceMethods.push(body.code_challenge_method ?? 'missing');
        data = url.pathname.endsWith('/signup') ? { user, session: null } : {};
      }
      else if (url.pathname.endsWith('/logout')) status = 204;
      else if (url.pathname.endsWith('/rpc/app_today_academies')) {
        if (state.failWorkspaceList) { status = 500; data = { message: 'Fictional workspace list failure' }; }
        else {
          const after=typeof payload.p_after==='string'?payload.p_after:null;
          const rows=state.coachWorkspaces.filter(row=>!after||row.id>after).sort((a,b)=>a.id.localeCompare(b.id));
          const page=rows.slice(0,50);
          data={academies:page.map(row=>({workspace_id:row.id,name:row.name,time_zone:row.time_zone})),next_after:rows.length>50?page.at(-1)?.id??null:null};
        }
      } else if (url.pathname.endsWith('/rpc/app_enrollment_batches')) {
        if (state.failApVerseRoster) { status = 500; data = { message: 'Private roster read failed' }; }
        else data = state.apVerseRole === 'coach' ? state.apVerseBatches : state.apVerseBatches;
      } else if (url.pathname.endsWith('/rpc/app_batch_enrollments')) {
        if (state.failApVerseRoster) { status = 500; data = { message: 'Private roster read failed' }; }
        else data = state.apVerseEnrollments.filter(row=>row.batch_id===payload.p_batch_id&&(!payload.p_after||row.enrollment_id>payload.p_after)).sort((a,b)=>a.enrollment_id.localeCompare(b.enrollment_id));
      } else if (url.pathname.endsWith('/rpc/app_enrollment_candidates')) {
        if (state.apVerseRole === 'coach') { status=403; data={code:'42501',message:'Not authorized'}; }
        else if(state.failApVerseRoster){status=500;data={message:'Private roster read failed'};}
        else data=state.apVerseCandidates.filter(row=>!payload.p_after||row.child_id>payload.p_after).sort((a,b)=>a.child_id.localeCompare(b.child_id));
      } else if (url.pathname.endsWith('/rpc/app_save_enrollment')) {
        state.apVerseSaveCalls.push(payload);
        let saved=state.apVerseEnrollments.find(row=>row.child_id===payload.p_child_id&&row.batch_id===payload.p_batch_id);
        if(!saved){const child=state.apVerseCandidates.find(row=>row.child_id===payload.p_child_id);if(!child){status=403;data={code:'42501',message:'Not authorized'};}else{saved={enrollment_id:'00000000-0000-0000-0000-000000000041',child_id:child.child_id,child_name:child.child_name,batch_id:payload.p_batch_id,status:'active',version:1};state.apVerseEnrollments.push(saved);}}
        if(status===200){data=[{enrollment_id:saved!.enrollment_id,status:saved!.status,version:saved!.version}];if(state.loseApVerseSaveResponse){state.loseApVerseSaveResponse=false;throw new TypeError('Simulated lost APVerse enrollment response');}}
      } else if (url.pathname.endsWith('/rpc/create_workspace')) {
        state.workspaceCreateCalls.push(payload);
        if (state.failCreate) { status = 500; data = { message: 'Internal private database text' }; }
        else {
          let id=state.workspaceCreationReceipts[payload.p_request_id];
          if(!id){id='00000000-0000-0000-0000-000000000099';state.workspaceCreationReceipts[payload.p_request_id]=id;state.coachWorkspaces.push({id,name:payload.p_name,time_zone:null});}
          data=id;
        }
      } else if (url.pathname.endsWith('/rpc/configure_private_workspace_zone')) {
        if(state.failWorkspaceZone){status=500;data={message:'Fictional workspace-zone failure'};}
        else {
          const row=state.coachWorkspaces.find(value=>value.id===payload.p_workspace_id);
          if(!row){status=403;data={code:'42501',message:'Workspace zone access denied'};}
          else {row.time_zone=payload.p_zone;data=null;}
        }
      }
      else if (url.pathname.endsWith('/academies')) {
        status = options.failAcademy ? 500 : 200;
        data = options.failAcademy ? { message: 'private schema failure' } : state.academy
          ? [{ id: 'academy-test', name: 'Fictional Test Academy', timezone: 'Asia/Kolkata', currency: 'INR' }] : [];
      } else if (url.pathname.endsWith('/rpc/create_academy')) {
        if (state.failCreate) { status = 500; data = { message: 'Internal private database text' }; }
        else { state.academy = true; data = { id: 'academy-test' }; }
      } else if ((url.pathname.endsWith('/rpc/save_student') || url.pathname.endsWith('/rpc/save_student_profile'))) {
        if (state.failStudent) { status = 500; data = { message: 'Fictional private server error' }; }
        else {
          const student = { id: payload.target_student, name: payload.student_name, age_years: payload.age_years, archived_at: null, proficiency_level: payload.student_level ?? 'unassessed' };
          const index = state.roster.students.findIndex(s => s.id === student.id);
          if (index < 0) state.roster.students.push(student); else state.roster.students[index] = student;
          state.roster.contacts = state.roster.contacts.filter(c => c.student_id !== student.id);
          if (payload.guardian_name) state.roster.contacts.push({ student_id: student.id, name: payload.guardian_name, email: payload.guardian_email || null, phone: payload.guardian_phone || null });
          for (const batch of payload.batch_ids) if (!state.roster.enrolments.some(e => e.student_id === student.id && e.batch_id === batch))
            state.roster.enrolments.push({ id: crypto.randomUUID(), student_id: student.id, batch_id: batch, starts_on: '2026-11-12', ends_on: null });
          persistRoster(); data = student.id;
          if (state.loseStudentResponse) { state.loseStudentResponse = false; throw new TypeError('Simulated response lost after commit'); }
        }
      } else if (url.pathname.endsWith('/rpc/add_batch_students')) {
        for(const id of payload.student_ids) if(!state.roster.enrolments.some(e=>e.batch_id===payload.target_batch&&e.student_id===id)) state.roster.enrolments.push({id:crypto.randomUUID(),student_id:id,batch_id:payload.target_batch,starts_on:today,ends_on:null});
        persistRoster();data=payload.student_ids.length;
      } else if (url.pathname.endsWith('/rpc/archive_student')) {
        if (state.failArchive) return new Response(JSON.stringify({ message: 'Fictional private archive failure' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        const student = state.roster.students.find(s => s.id === payload.target_student);
        if (student) student.archived_at = new Date().toISOString();
        persistRoster(); data = true;
      } else if (url.pathname.endsWith('/rpc/get_coach_parent_requests')) { data = []; } else if (url.pathname.endsWith('/rpc/save_class_session')) {
        const index = state.classes.findIndex(c => c.id === payload.target_session);
        if (state.failClass) { status = 500; data = { message: 'Private class backend failure' }; }
        else if (index >= 0 && state.classes[index].attendance_revision > 0 && (state.classes[index].starts_at !== payload.begins_at || state.classes[index].ends_at !== payload.finishes_at || state.classes[index].batch_id !== payload.target_batch)) {
          status = 400; data = { code: '22023', message: 'Attendance protects class timing' };
        } else {
          const value = { id: payload.target_session, batch_id: payload.target_batch, starts_at: payload.begins_at, ends_at: payload.finishes_at, room: payload.class_room, status: payload.class_status, attendance_revision: index < 0 ? 0 : state.classes[index].attendance_revision };
          if (index < 0) state.classes.push(value); else state.classes[index] = value;
          persistClasses(); data = value.id;
        }
      } else if (url.pathname.endsWith('/rpc/save_class_attendance_checked')) {
        while (state.holdAttendance) await new Promise(resolve => { setTimeout(resolve, 20); });
        const session = state.classes.find(c => c.id === payload.target_session);
        if (state.failAttendance) { status = 500; data = { message: 'Private attendance backend failure' }; }
        else if (!session || session.status === 'cancelled') { status = 400; data = { code: '22023', message: 'Unavailable class' }; }
        else if ([session.batch_id, new Date(session.starts_at).toISOString(), new Date(session.ends_at).toISOString(), session.status].join('|') !== payload.expected_context || session.attendance_revision !== payload.expected_revision) { status = 400; data = { code: '40001', message: 'Changed attendance' }; }
        else if (payload.marks.length !== state.roster.students.filter(student => !student.archived_at && state.roster.enrolments.some(e => e.student_id === student.id && e.batch_id === session.batch_id)).length) { status = 400; data = { code: '40001', message: 'Changed roster' }; }
        else {
          state.attendance[session.id] = Object.fromEntries(payload.marks.map((m: { student_id: string; status: string }) => [m.student_id, m.status]));
          session.attendance_revision++; data = session.attendance_revision; persistClasses();
          if (state.loseAttendanceResponse) { state.loseAttendanceResponse = false; throw new TypeError('Simulated lost response after attendance commit'); }
        }
      } else if (url.pathname.endsWith('/rpc/save_observation')) {
        while (state.holdObservation) await new Promise(resolve => { setTimeout(resolve, 20); });
        const existing = state.observations.find(row => row.id === payload.target_observation);
        if (state.failObservation) { status = 500; data = { message: 'Private note backend failure' }; }
        else {
          const same = existing && existing.note === payload.note_text && existing.status === payload.desired_status
            && existing.batch_id === payload.target_batch && existing.session_id === payload.target_session
            && existing.audience === payload.audience_kind && [...state.observationRecipients[existing.id]].sort().join(',') === [...payload.recipient_ids].sort().join(',');
          if (existing && !same && existing.revision !== payload.expected_revision) { status = 400; data = { code: '40001', message: 'Changed note' }; }
          else {
            const now = new Date().toISOString();
            const value = same ? existing! : { id: payload.target_observation, academy_id: payload.target_academy,
              batch_id: payload.target_batch, session_id: payload.target_session, note: payload.note_text,
              status: payload.desired_status, audience: payload.audience_kind, author_id: user.id,
              revision: (existing?.revision ?? 0) + 1, created_at: existing?.created_at ?? now,
              updated_at: now, recorded_at: existing?.recorded_at ?? (payload.desired_status === 'recorded' ? now : null) };
            if (!same) {
              state.observations = state.observations.filter(row => row.id !== value.id).concat(value);
              state.observationRecipients[value.id] = payload.recipient_ids;
              state.observationVersions[value.id] = [{ revision: value.revision, note: value.note, status: value.status, saved_at: now }, ...(state.observationVersions[value.id] ?? [])];
              sessionStorage.setItem('__fictional_observations', JSON.stringify({ observations: state.observations, recipients: state.observationRecipients, versions: state.observationVersions }));
            }
            data = value;
            if (state.loseObservationResponse) { state.loseObservationResponse = false; throw new TypeError('Simulated lost note response after commit'); }
          }
        }
      } else if (url.pathname.endsWith('/observations')) {
        if (options.missingObservationMigration) { status = 400; data = { code: '42703', message: 'Missing note column' }; }
        else {
          const id = url.searchParams.get('id')?.replace(/^eq\./, '');
          let rows = state.observations.filter(row => !id || row.id === id).sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
          const cursor = url.searchParams.get('or')?.match(/created_at\.eq\.([^,]+),id\.lt\.([0-9a-f-]+)/);
          if (cursor) rows = rows.filter(row => row.created_at < cursor[1] || (row.created_at === cursor[1] && row.id < cursor[2]));
          data = id ? rows[0] ?? null : rows.slice(0,Number(url.searchParams.get('limit') ?? 30));
        }
      } else if (url.pathname.endsWith('/observation_recipients')) {
        const filter = url.searchParams.get('observation_id');
        const ids = filter?.startsWith('eq.') ? new Set([filter.slice(3)])
          : filter?.startsWith('in.(') ? new Set(filter.slice(4, -1).split(',').map(value => value.replace(/^"|"$/g, '')))
          : null;
        data = Object.entries(state.observationRecipients).filter(([key]) => !ids || ids.has(key)).flatMap(([observation_id, students]) => students.map(student_id => ({ observation_id, student_id })));
      } else if (url.pathname.endsWith('/observation_versions')) {
        const id = url.searchParams.get('observation_id')?.replace(/^eq\./, '') ?? '';
        data = (state.observationVersions[id] ?? []).slice(0,5);
      } else if (url.pathname.endsWith('/class_sessions')) {
        if (options.missingClassMigration) { status = 400; data = { code: '42703', message: 'Missing class column' }; }
        else {
          const filter = url.searchParams.get('id');
          const id = filter?.startsWith('eq.')?filter.slice(3):null;
          const times = url.searchParams.getAll('starts_at');
          const from = times.find(t => t.startsWith('gte.'))?.slice(4);
          const until = times.find(t => t.startsWith('lt.'))?.slice(3);
          const rows = state.classes.filter(c => (!id || c.id === id) && (!from || Date.parse(c.starts_at) >= Date.parse(from)) && (!until || Date.parse(c.starts_at) < Date.parse(until)));
          if (id && !rows.length) { status = 406; data = { message: 'Class not found' }; } else data = id ? rows[0] : pageRows(rows);
        }
      } else if (url.pathname.endsWith('/attendance')) {
        const id = url.searchParams.get('session_id')?.replace(/^eq\./, '') ?? '';
        data = Object.entries(state.attendance[id] ?? {}).map(([student_id, status]) => ({ student_id, status }));
      } else if (url.pathname.endsWith('/students')) data = pageRows(state.roster.students);
      else if (url.pathname.endsWith('/student_contacts')) {
        status = options.missingRosterMigration ? 400 : 200;
        data = options.missingRosterMigration ? { code: '42703', message: 'Fictional missing column' } : state.roster.contacts;
      } else if (url.pathname.endsWith('/enrolments')) data = pageRows(state.roster.enrolments.map((row,index)=>({...row,id:row.id??`eeeeeeee-0000-0000-0000-${String(index).padStart(12,'0')}`})));
      else if (url.pathname.endsWith('/batches')) {
        if (method === 'POST') {
          const batch = { ...payload, archived_at: null };
          const index = state.roster.batches.findIndex(b => b.id === batch.id);
          if (index < 0) state.roster.batches.push(batch); else state.roster.batches[index] = batch;
          persistRoster();
        }
        data = pageRows(state.roster.batches);
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

