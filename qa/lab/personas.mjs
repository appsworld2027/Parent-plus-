// Deterministic persona generator for the Parent Plus QA lab (fictional data only).
// Same seed => same 1,000 users every run, so failures are reproducible.
export const SEED = 20261122;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const FIRST = ['Aarav','Vivaan','Aditya','Ananya','Diya','Ishaan','Kabir','Meera','Riya','Saanvi','Zoya','Arjun','Navya','Reyansh','Tara','Ayaan','Kiara','Vihaan','Myra','Dev','Anika','Rohan','Sara','Neel','Ira','Lakshmi','Sai','Farhan','Gurpreet','Wei'];
const EDGE_NAMES = ['Ananya-Lakshmi Venkatasubramanian Iyer', 'José Ñúñez', 'अनन्या शर्मा', 'ரியா', 'Zoë O\'Brien', 'Aarav 🙂', '<b>Kabir</b>', 'Mary-Jane D\'Souza', 'Wei 李', 'X Æ'];
const LAST = ['Sharma','Iyer','Khan','Singh','Reddy','Das','Patel','Nair','Gupta','Fernandes','Mehta','Bose','Kapoor','Joshi','Rao'];
const CRAFTS = ['Clay','Skating','Chess','Piano','Art','Swimming','Robotics','Dance','Football','Abacus'];
const PREFIX = { c: 'c0', a: 'a0', b: 'b0', s: 'd0', o: 'e0', p: 'f0', f: 'f1', k: 'f2' };
const uuid = (kind, n) => `${PREFIX[kind]}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const COACH_ARCHETYPES = ['solo-tutor', 'small-academy', 'busy-academy', 'new-empty', 'all-caught-up', 'edge-data'];
export const PARENT_ARCHETYPES = ['one-child', 'siblings', 'two-coaches', 'pending-approval', 'rejected', 'unverified-email', 'no-connection'];

export function generate({ coaches = 100, parents = 900, seed = SEED } = {}) {
  const r = rng(seed), pick = a => a[Math.floor(r() * a.length)], int = (a, b) => a + Math.floor(r() * (b - a + 1));
  const name = edge => edge && r() < 0.5 ? pick(EDGE_NAMES) : `${pick(FIRST)} ${pick(LAST)}`;
  const users = [], academies = [];
  let sn = 0, bn = 0, on = 0;
  for (let i = 0; i < coaches; i++) {
    const archetype = COACH_ARCHETYPES[i % COACH_ARCHETYPES.length];
    const coach = { id: uuid('c', i + 1), role: 'coach', archetype, email: `coach${i + 1}@example.test`, name: name(false), verified: true };
    users.push(coach);
    const a = { id: uuid('a', i + 1), owner: coach.id, name: `${pick(CRAFTS)} Studio ${i + 1}`, archetype, batches: [], students: [], observations: [] };
    const batchCount = archetype === 'new-empty' ? 0 : archetype === 'solo-tutor' ? 1 : archetype === 'busy-academy' ? 4 : 2;
    for (let b = 0; b < batchCount; b++) a.batches.push({ id: uuid('b', ++bn), name: `${pick(CRAFTS)} ${['Juniors','Seniors','Weekend','Evening'][b]}` });
    const studentCount = archetype === 'new-empty' ? 0 : archetype === 'busy-academy' ? int(25, 40) : archetype === 'solo-tutor' ? int(3, 6) : int(6, 15);
    for (let s = 0; s < studentCount; s++) {
      const status = archetype === 'edge-data' ? pick(['active', 'active', 'archived', 'ended', 'future']) : 'active';
      const batches = a.batches.length ? [a.batches[s % a.batches.length].id].concat(archetype === 'busy-academy' && s % 5 === 0 ? [a.batches[(s + 1) % a.batches.length].id] : []) : [];
      a.students.push({ id: uuid('s', ++sn), name: name(archetype === 'edge-data'), age: int(4, 14), status, batches: [...new Set(batches)], guardianEmail: null });
    }
    for (const st of a.students.filter(x => x.status === 'active')) {
      const fresh = archetype === 'all-caught-up' ? true : r() < 0.4;
      if (fresh || r() < 0.3) a.observations.push({ id: uuid('o', ++on), student: st.id, batch: st.batches[0], ageDays: fresh ? int(0, 6) : int(8, 40), status: r() < 0.1 && !fresh ? 'draft' : 'recorded' });
    }
    academies.push(a);
  }
  const families = [];
  const linkable = academies.flatMap(a => a.students.filter(s => s.status === 'active').map(s => ({ a, s })));
  let li = 0;
  for (let p = 0; p < parents; p++) {
    const archetype = PARENT_ARCHETYPES[p % PARENT_ARCHETYPES.length];
    const parent = { id: uuid('p', p + 1), role: 'parent', archetype, email: `parent${p + 1}@example.test`, name: name(p % 13 === 0), verified: archetype !== 'unverified-email' };
    users.push(parent);
    const fam = { id: uuid('f', p + 1), owner: parent.id, archetype, name: `${parent.name.split(' ').at(-1)} family`, parentName: parent.name, children: [], connections: [] };
    const kids = archetype === 'siblings' ? 2 : 1;
    for (let k = 0; k < kids; k++) fam.children.push({ id: uuid('k', p * 3 + k + 1), name: name(p % 11 === 0), bornOn: `20${int(12, 21)}-0${int(1, 9)}-1${int(0, 9)}` });
    const want = archetype === 'no-connection' ? 0 : archetype === 'two-coaches' ? 2 : 1;
    const used = new Set();
    for (let w = 0; w < want && li < linkable.length; w++) {
      // Business rule: one child links to at most one student per academy, so a second coach must be a different academy.
      let j = li; while (j < linkable.length && used.has(linkable[j].a.id)) j++;
      if (j >= linkable.length) break;
      [linkable[li], linkable[j]] = [linkable[j], linkable[li]];
      const { a, s } = linkable[li++]; used.add(a.id);
      s.guardianEmail = parent.email;
      fam.connections.push({ academy: a.id, student: s.id, child: fam.children[w % fam.children.length].id,
        outcome: archetype === 'pending-approval' ? 'pending' : archetype === 'rejected' ? 'rejected' : archetype === 'unverified-email' ? 'blocked' : 'approved' });
    }
    families.push(fam);
  }
  return { seed, users, academies, families };
}

// Expected "Needs you" count per academy, from the contract definition (independent of app code).
export function expectedNeedsYou(a, now = Date.now()) {
  const week = 7 * 24 * 3600 * 1000;
  const fresh = new Set(a.observations.filter(o => o.status === 'recorded' && o.ageDays * 24 * 3600 * 1000 < week).map(o => o.student));
  return a.students.filter(s => s.status === 'active' && s.batches.length && !fresh.has(s.id)).length;
}
