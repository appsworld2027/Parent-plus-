import type { StorageDriver } from '../auth/storage';
import type { FeeOperation, PendingFee } from './model';
import { validDay } from './model';

const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value);
const money = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 100000000000;
export function parsePending(raw: string | null, owner: string, academy: string): PendingFee | null {
  if (raw === null) return null;
  if (raw.length > 5000) throw new Error('Invalid pending fee save');
  const value = JSON.parse(raw), o = value?.operation;
  if (value?.version !== 1 || value.owner !== owner || value.academy !== academy || !o || !identifier(o.id)) throw new Error('Invalid pending fee save');
  let operation: FeeOperation;
  if (o.kind === 'invoice' && identifier(o.enrolment) && validDay(o.month) && o.month.endsWith('-01') && validDay(o.due) && money(o.amount)) {
    operation = { kind: 'invoice', id: o.id, enrolment: o.enrolment, month: o.month, due: o.due, amount: o.amount };
  } else if (o.kind === 'payment' && identifier(o.invoice) && money(o.amount) && validDay(o.date)
    && ['cash', 'bank', 'upi', 'other'].includes(o.method) && typeof o.reference === 'string' && o.reference.length <= 120) {
    operation = { kind: 'payment', id: o.id, invoice: o.invoice, amount: o.amount, date: o.date, method: o.method, reference: o.reference };
  } else if (['void', 'reverse'].includes(o.kind) && identifier(o.invoice) && typeof o.reason === 'string' && o.reason.trim().length > 0 && o.reason.length <= 500) {
    if (o.kind === 'reverse') {
      if (!identifier(o.payment)) throw new Error('Invalid pending fee save');
      operation = { kind: 'reverse', id: o.id, invoice: o.invoice, payment: o.payment, reason: o.reason };
    } else operation = { kind: 'void', id: o.id, invoice: o.invoice, reason: o.reason };
  } else throw new Error('Invalid pending fee save');
  // Whitelist persisted fields. Never include student names or a raw API error.
  return { version: 1, owner, academy, operation };
}
export function createPendingFees(storage: StorageDriver) {
  const key = (owner: string, academy: string) => {
    if (!identifier(owner) || !identifier(academy)) throw new Error('Invalid scope');
    return `parentplus.coach.fee-pending.v1.${owner}.${academy}`;
  };
  return {
    read: async (owner: string, academy: string) => parsePending(await storage.getItem(key(owner, academy)), owner, academy),
    async save(value: PendingFee) {
      const clean = parsePending(JSON.stringify(value), value.owner, value.academy);
      if (!clean) throw new Error('Invalid pending fee save');
      const current = await this.read(value.owner, value.academy);
      if (current && JSON.stringify(current) !== JSON.stringify(clean)) throw new Error('Resolve pending fee save first');
      await storage.setItem(key(value.owner, value.academy), JSON.stringify(clean));
    },
    async clear(value: PendingFee) {
      const current = await this.read(value.owner, value.academy);
      if (JSON.stringify(current) !== JSON.stringify(value)) throw new Error('Pending fee save changed');
      await storage.removeItem(key(value.owner, value.academy));
    },
  };
}
