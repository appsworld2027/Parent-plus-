export type ApVerseBatch = { id: string; name: string; courseName: string };
export type ApVerseEnrollment = { id: string; batchId: string; batchName: string; status: 'active' | 'paused' | 'completed' | 'withdrawn'; version: number };
export type ApVerseStudent = { id: string; name: string; enrollments: ApVerseEnrollment[] };
export type ApVerseRoster = { batches: ApVerseBatch[]; students: ApVerseStudent[]; canManageEnrollments: boolean };
export type ApVerseEnrollmentReceipt = { id: string; status: 'active' | 'paused' | 'completed' | 'withdrawn'; version: number };

type BatchArgs = { p_workspace_id: string };
type PageArgs = { p_workspace_id: string; p_batch_id?: string; p_after: string | null };
type SaveArgs = { p_workspace_id: string; p_batch_id: string; p_child_id: string; p_request_id: string };
export type ApVerseRosterRpc = (
  name: 'app_enrollment_batches' | 'app_batch_enrollments' | 'app_enrollment_candidates' | 'app_save_enrollment',
  args: BatchArgs | PageArgs | SaveArgs,
) => Promise<{ data: unknown; error: unknown | null }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 50;
const MAX_PAGES = 100;
const MAX_BATCHES = 1000;
const MAX_PARALLEL_BATCHES = 5;
const STATUSES = new Set(['active', 'paused', 'completed', 'withdrawn']);

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some(item => !record(item))) throw new Error('Invalid APVerse roster response');
  return value as Record<string, unknown>[];
}

function uuid(value: unknown): value is string { return typeof value === 'string' && UUID.test(value); }
function text(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }

function parseBatches(value: unknown): ApVerseBatch[] {
  const result = rows(value).map((row): ApVerseBatch => {
    if (!uuid(row.batch_id) || !text(row.batch_name) || !text(row.course_name)) throw new Error('Invalid APVerse roster response');
    return { id: row.batch_id, name: row.batch_name.trim(), courseName: row.course_name.trim() };
  });
  if (result.length > MAX_BATCHES || new Set(result.map(item => item.id)).size !== result.length) throw new Error('Invalid APVerse roster response');
  return result;
}

function parseCandidates(value: unknown) {
  return rows(value).map(row => {
    if (!uuid(row.child_id) || !text(row.child_name)) throw new Error('Invalid APVerse roster response');
    return { id: row.child_id, name: row.child_name.trim() };
  });
}

function parseEnrollments(value: unknown, batch: ApVerseBatch) {
  return rows(value).map(row => {
    if (!uuid(row.enrollment_id) || !uuid(row.child_id) || !text(row.child_name)
      || typeof row.status !== 'string' || !STATUSES.has(row.status)
      || !Number.isInteger(row.version) || Number(row.version) < 1) throw new Error('Invalid APVerse roster response');
    return {
      id: row.enrollment_id,
      childId: row.child_id,
      childName: row.child_name.trim(),
      enrollment: { id: row.enrollment_id, batchId: batch.id, batchName: batch.name, status: row.status as ApVerseEnrollment['status'], version: Number(row.version) },
    };
  });
}

async function readPages<T>(
  rpc: ApVerseRosterRpc,
  name: 'app_batch_enrollments' | 'app_enrollment_candidates',
  workspaceId: string,
  batchId: string | undefined,
  parse: (value: unknown) => T[],
  id: (item: T) => string,
): Promise<T[]> {
  const result: T[] = [];
  const seen = new Set<string>();
  let after: string | null = null;
  for (let pageCount = 0; pageCount < MAX_PAGES; pageCount += 1) {
    const args: PageArgs = batchId
      ? { p_workspace_id: workspaceId, p_batch_id: batchId, p_after: after }
      : { p_workspace_id: workspaceId, p_after: after };
    const response = await rpc(name, args);
    if (response.error) throw response.error;
    const page = parse(response.data);
    if (page.length > PAGE_SIZE) throw new Error('Invalid APVerse roster response');
    for (const item of page) {
      const itemId = id(item);
      if (seen.has(itemId) || (after !== null && itemId <= after)) throw new Error('Invalid APVerse roster cursor');
      seen.add(itemId);
      result.push(item);
    }
    if (page.length < PAGE_SIZE) return result;
    const next = id(page[page.length - 1]);
    if (next === after) throw new Error('APVerse roster pagination did not advance');
    after = next;
  }
  throw new Error('APVerse roster exceeded the supported size');
}

function isManagerDenied(error: unknown): boolean {
  return record(error) && error.code === '42501';
}

/** Reads the authenticated workspace view; server RPCs enforce membership and batch assignment. */
export async function loadApVerseRoster(workspaceId: string, rpc: ApVerseRosterRpc): Promise<ApVerseRoster> {
  if (!uuid(workspaceId)) throw new Error('Invalid APVerse workspace');
  const batchResult = await rpc('app_enrollment_batches', { p_workspace_id: workspaceId });
  if (batchResult.error) throw batchResult.error;
  const batches = parseBatches(batchResult.data);

  const enrollmentRows: ReturnType<typeof parseEnrollments> = [];
  for (let offset = 0; offset < batches.length; offset += MAX_PARALLEL_BATCHES) {
    const group = batches.slice(offset, offset + MAX_PARALLEL_BATCHES);
    const values = await Promise.all(group.map(batch => readPages(
      rpc, 'app_batch_enrollments', workspaceId, batch.id,
      value => parseEnrollments(value, batch), item => item.id,
    )));
    enrollmentRows.push(...values.flat());
  }

  let canManageEnrollments = true;
  let candidates: ReturnType<typeof parseCandidates> = [];
  const candidateRpc = await readPages(rpc, 'app_enrollment_candidates', workspaceId, undefined, parseCandidates, item => item.id)
    .then(value => ({ value, error: null as unknown | null }))
    .catch(error => ({ value: null, error }));
  if (candidateRpc.error !== null) {
    if (!isManagerDenied(candidateRpc.error)) throw candidateRpc.error;
    canManageEnrollments = false;
  } else candidates = candidateRpc.value ?? [];

  const studentMap = new Map<string, ApVerseStudent>();
  for (const child of candidates) studentMap.set(child.id, { ...child, enrollments: [] });
  for (const value of enrollmentRows) {
    let student = studentMap.get(value.childId);
    if (!student) {
      student = { id: value.childId, name: value.childName, enrollments: [] };
      studentMap.set(student.id, student);
    } else if (student.name !== value.childName) throw new Error('Invalid APVerse roster response');
    student.enrollments.push(value.enrollment);
  }
  const students = [...studentMap.values()].sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  for (const student of students) student.enrollments.sort((left, right) => left.batchName.localeCompare(right.batchName) || left.id.localeCompare(right.id));
  return { batches, students, canManageEnrollments };
}

export async function addConnectedChildToBatch(
  workspaceId: string,
  batchId: string,
  childId: string,
  requestId: string,
  rpc: ApVerseRosterRpc,
): Promise<ApVerseEnrollmentReceipt> {
  if (![workspaceId, batchId, childId, requestId].every(uuid)) throw new Error('Invalid APVerse enrollment request');
  const result = await rpc('app_save_enrollment', {
    p_workspace_id: workspaceId, p_batch_id: batchId, p_child_id: childId, p_request_id: requestId,
  });
  if (result.error) throw result.error;
  const values = rows(result.data);
  const row = values[0];
  if (values.length !== 1 || !record(row) || !uuid(row.enrollment_id)
    || typeof row.status !== 'string' || !STATUSES.has(row.status)
    || !Number.isInteger(row.version) || Number(row.version) < 1) throw new Error('Invalid APVerse enrollment response');
  return { id: row.enrollment_id, status: row.status as ApVerseEnrollmentReceipt['status'], version: Number(row.version) };
}
