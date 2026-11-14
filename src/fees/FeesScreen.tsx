import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { localParts } from '../classes/model';
import { deviceStorage } from '../deviceStorage';
import { formatFee } from '../roster/model';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useFeedbackMessage } from '../ui/ActionFeedback';
import { billingOptions, invoiceStatus, operationSummary, paymentAmount, validDay, validMonth } from './model';
import type { FeeContext, FeeDetail, FeeOperation, PendingFee } from './model';
import { createPendingFees } from './pending';
import { executeFee, feeFailure, feeRejected, getInvoice, listInvoices, loadFeeContext } from './service';

const pendingFees = createPendingFees(deviceStorage);
function Button({ label, onPress, disabled = false, soft = false }: { label: string; onPress: () => void; disabled?: boolean; soft?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[s.button, soft && s.soft, disabled && { opacity: 0.5 }]}><Text style={[s.buttonText, soft && s.softText]}>{label}</Text></Pressable>;
}
function Field({ label, value, onChange, disabled, money = false, max = 10 }: { label: string; value: string; onChange: (text: string) => void; disabled: boolean; money?: boolean; max?: number }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
    editable={!disabled} maxLength={max} autoCorrect={false} autoCapitalize="none" keyboardType={money ? 'decimal-pad' : 'default'} style={s.input} /></View>;
}

export function FeesScreen({ academy, owner, onDirtyChange, onBusyChange, onViewChange }: {
  academy: { id: string; timezone: string }; owner: string; onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void; onViewChange: () => void;
}) {
  const today = localParts(new Date().toISOString(), academy.timezone).date;
  const [month, setMonth] = useState(today.slice(0, 7));
  const [filterMonth, setFilterMonth] = useState(month);
  const [context, setContext] = useState<FeeContext | null>(null);
  const [list, setList] = useState<Awaited<ReturnType<typeof listInvoices>> | null>(null);
  const [detail, setDetail] = useState<FeeDetail | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false);
  const [enrolment, setEnrolment] = useState(''), [due, setDue] = useState(`${month}-10`);
  const [form, setForm] = useState<'payment' | 'void' | 'reverse' | null>(null);
  const [amount, setAmount] = useState(''), [date, setDate] = useState(today);
  const [method, setMethod] = useState<'cash' | 'bank' | 'upi' | 'other'>('cash');
  const [reference, setReference] = useState(''), [reason, setReason] = useState(''), [payment, setPayment] = useState('');
  const [confirmation, setConfirmation] = useState<FeeOperation | null>(null);
  const [pending, setPending] = useState<PendingFee | null>(null), [storageBlocked, setStorageBlocked] = useState(true);
  const [, error] = useFeedbackMessage('error', 'Fees need attention');
  const [, notice] = useFeedbackMessage('success', 'Saved to your workspace');
  const alive = useRef(true), lock = useRef(false), version = useRef(0);
  const disabled = busy || loading || storageBlocked || !!pending;
  const choices = context ? billingOptions(context, month) : [];
  const selected = choices.find(item => item.id === enrolment);

  const reload = useCallback(async (targetMonth: string) => {
    const generation = ++version.current;
    setLoading(true); setList(null);
    try {
      const [data, invoices] = await Promise.all([loadFeeContext(academy.id), listInvoices(academy.id, targetMonth)]);
      if (alive.current && generation === version.current) { setContext(data); setList(invoices); return true; }
    } catch (failure) { if (alive.current && generation === version.current) error(feeFailure(failure, 'Fees could not be loaded. Check your connection and retry.')); }
    finally { if (alive.current && generation === version.current) setLoading(false); }
    return false;
  }, [academy.id, error]);
  async function readPending() {
    setStorageBlocked(true);
    try {
      const saved = await pendingFees.read(owner, academy.id);
      if (alive.current) { setPending(saved); setStorageBlocked(false); }
    } catch { error('The pending fee save on this device could not be read. New fee saves are paused to prevent duplicates. Retry reading it; ask your coding partner if it continues.'); }
  }
  useEffect(() => {
    alive.current = true; void readPending(); void reload(filterMonth);
    return () => { alive.current = false; version.current++; };
  }, [academy.id, owner, reload]);
  useEffect(() => { onDirtyChange(dirty && !pending); return () => onDirtyChange(false); }, [dirty, pending, onDirtyChange]);
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
  useEffect(onViewChange, [view, form, onViewChange]);

  async function openInvoice(id: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); error('');
    try { const saved = await getInvoice(academy.id, id); if (alive.current) { setDetail(saved); setView('detail'); setForm(null); setDirty(false); } }
    catch (failure) { error(feeFailure(failure, 'The invoice could not be loaded. Retry before recording a payment.')); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  function back() {
    Keyboard.dismiss();
    if (dirty) { setDiscard(true); return; }
    closeForm();
  }
  function closeForm() {
    setDiscard(false); setDirty(false);
    if (form) setForm(null); else { setDetail(null); setView('list'); void reload(filterMonth); }
  }
  function review() {
    error(''); Keyboard.dismiss();
    if (view === 'create') {
      if (!validMonth(month) || !selected || !selected.id || selected.amount < 1 || !validDay(due)) {
        error('Choose a student and batch with a positive monthly fee. Enter the billing month as YYYY-MM and due date as YYYY-MM-DD.'); return;
      }
      setConfirmation({ kind: 'invoice', id: randomUUID(), enrolment, month: `${month}-01`, due, amount: selected.amount });
    } else if (detail && form === 'payment') {
      const paise = paymentAmount(amount, detail.invoice.balance_paise);
      if (paise === null || !validDay(date) || date > today || reference.length > 120) {
        error('Enter a positive amount within the outstanding balance and a valid received date no later than today.'); return;
      }
      setConfirmation({ kind: 'payment', id: randomUUID(), invoice: detail.invoice.id, amount: paise, date, method, reference: reference.trim() });
    } else if (detail && (form === 'void' || form === 'reverse')) {
      if (!reason.trim() || reason.length > 500) { error('Enter a correction reason, up to 500 characters.'); return; }
      setConfirmation(form === 'void' ? { kind: 'void', id: randomUUID(), invoice: detail.invoice.id, reason: reason.trim() }
        : { kind: 'reverse', id: randomUUID(), invoice: detail.invoice.id, payment, reason: reason.trim() });
    }
  }
  // Persist the complete immutable request before sending it. An uncertain
  // response freezes this request across navigation/restart until an exact retry
  // confirms it. New amounts never reuse its idempotency ID.
  async function run(snapshot: PendingFee) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setConfirmation(null); error(''); notice(''); setPending(snapshot);
    let sent = false, saved = false;
    try {
      await pendingFees.save(snapshot);
      sent = true;
      const id = await executeFee(academy.id, snapshot.operation);
      saved = true;
      await pendingFees.clear(snapshot);
      if (!alive.current) return;
      setPending(null); setDirty(false); setForm(null); setDetail(null);
      const o = snapshot.operation;
      notice(o.kind === 'invoice' ? 'Invoice created. Its amount is fixed. No payment request was sent.'
        : o.kind === 'payment' ? 'Manual payment recorded. This app did not move money or verify a gateway payment.'
        : o.kind === 'reverse' ? 'Manual record reversed. The original entry and correction remain in history. No refund was made.'
        : 'Invoice voided. Its original details and reason remain in history.');
      setView('detail');
      try { const result = await getInvoice(academy.id, id); if (alive.current) setDetail(result); }
      catch (failure) { error(feeFailure(failure, 'The save is confirmed, but the updated invoice could not be loaded. Go back and refresh.')); }
    } catch (failure) {
      if (sent && !saved && feeRejected(failure)) {
        try { await pendingFees.clear(snapshot); if (alive.current) setPending(null); }
        catch { error('The request was rejected, but its device record could not be cleared. Retry the pending save to resolve it safely.'); return; }
        error(feeFailure(failure, 'The save was rejected. Your form is retained. Refresh and review the saved records.'));
      } else error(saved ? 'The save succeeded, but its device record could not be cleared. Retry this same pending save to finish safely.'
        : !sent ? 'The fee request could not be saved safely on this device. No request was sent. Keep this screen open and retry the pending save.'
        : feeFailure(failure, 'The save could not be confirmed. Retry the pending fee save; it uses the same request to prevent duplicates.'));
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  function beginForm(next: 'payment' | 'void' | 'reverse', target = '') {
    setForm(next); setPayment(target); setReason(''); setAmount(''); setDate(today); setMethod('cash'); setReference(''); setDirty(false); error(''); notice('');
  }
  async function more() {
    if (!list || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const result = await listInvoices(academy.id, filterMonth, list.invoices.at(-1));
      if (alive.current) setList({ invoices: [...list.invoices, ...result.invoices.filter(row => !list.invoices.some(old => old.id === row.id))], more: result.more });
    } catch (failure) { error(feeFailure(failure, 'More invoices could not be loaded. Retry.')); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  const invoice = detail?.invoice;
  return <View style={s.root}>
    <Text style={s.kicker}>FEES, WITH A CLEAR RECORD</Text>
    <Text accessibilityRole="header" style={s.heading}>{view === 'create' ? 'Create an invoice' : view === 'detail' ? 'Invoice details' : 'Your invoices'}</Text>
    <Text style={s.body}>Record invoices and payments received outside this app. Online collection and payment links are not enabled.</Text>
    {loading && <ActivityIndicator accessibilityLabel="Loading fees" color="#1F6F6B" />}
    {storageBlocked && <Button label="Retry reading pending fee save" disabled={busy} soft onPress={() => { void readPending(); }} />}
    {pending && <View style={s.pending}>
      <Text style={s.title}>Resolve pending fee save</Text><Text style={s.body}>{operationSummary(pending.operation)}</Text>
      {'amount' in pending.operation && <Text style={s.title}>{formatFee(pending.operation.amount)}</Text>}
      <Text style={s.body}>Retry this exact request before adding another. It may already be saved. This recovery record is retained on this device, including after sign-out, for this account only.</Text>
      <Button label="Retry pending fee save" disabled={busy || storageBlocked} onPress={() => { void run(pending); }} />
    </View>}
    <ConfirmDialog visible={!!confirmation} title={confirmation?.kind === 'payment' ? 'Record this manual payment?' : confirmation?.kind === 'invoice' ? 'Create this invoice?' : 'Confirm this correction?'}
      message={confirmation ? `${operationSummary(confirmation)}.${'amount' in confirmation ? ` Amount: ${formatFee(confirmation.amount)}.` : ` Reason: ${confirmation.reason}`}
${confirmation.kind === 'invoice' ? `${selected?.student ?? ''} · ${selected?.batch ?? ''}. The amount is fixed once created.` : confirmation.kind === 'payment' ? 'Confirm you received this money outside the app. This is a manual record.' : 'This changes records only. No money is moved and no refund is made.'}` : ''}
      confirmLabel="Confirm fee save" cancelLabel="Keep editing" busy={busy} onCancel={() => setConfirmation(null)}
      onConfirm={() => { if (confirmation) void run({ version: 1, owner, academy: academy.id, operation: confirmation }); }} />
    <ConfirmDialog visible={discard} title="Discard unsaved fee entries?" message="This form is only on this screen. Keep editing to retain it, or discard it to go back."
      confirmLabel="Discard fee entries" cancelLabel="Keep editing" onConfirm={closeForm} onCancel={() => setDiscard(false)} />
    {view === 'list' ? <>
      <Field label="Billing month (YYYY-MM)" value={month} max={7} disabled={disabled} onChange={setMonth} />
      <Button label="Show month" soft disabled={disabled} onPress={() => {
        if (!validMonth(month)) { error('Enter a valid billing month as YYYY-MM.'); return; }
        setFilterMonth(month); void reload(month);
      }} />
      <Button label="Refresh invoices" soft disabled={loading || busy} onPress={() => { void reload(filterMonth); }} />
      <Button label="Create invoice" disabled={disabled || !list || month !== filterMonth} onPress={() => {
        setView('create'); setEnrolment(''); setDue(`${filterMonth}-10`); setDirty(false); error(''); notice('');
      }} />
      {month !== filterMonth && <Text style={s.body}>Select Show month to update the list. Currently showing {filterMonth}.</Text>}
      {list && <Text style={s.caption}>Billing month: {filterMonth}. Includes voided invoices so corrections remain visible.</Text>}
      {list && !list.invoices.length && <Text style={s.body}>No invoices for this billing month.</Text>}
      {list?.invoices.map(row => <View key={row.id} style={s.card}>
        <Text style={s.title}>{row.student_name}</Text><Text style={s.body}>{row.batch_name} · {row.billing_month.slice(0, 7)}</Text>
        <Text style={s.badge}>{invoiceStatus(row, today)}</Text>
        <Text style={s.body}>Invoice {formatFee(row.amount_paise)} · {row.voided_at ? 'Voided' : `Outstanding ${formatFee(row.balance_paise)}`}</Text>
        <Button label={`Open invoice for ${row.student_name}`} soft disabled={busy} onPress={() => { void openInvoice(row.id); }} />
      </View>)}
      {list?.more && <Button label="Load more invoices" soft disabled={loading || busy} onPress={() => { void more(); }} />}
    </> : view === 'create' ? <View style={s.card}>
      <Text style={s.title}>Billing month: {month}</Text>
      <Text style={s.body}>Choose one enrolment active during this month. The full current monthly batch fee is used; there is no automatic proration.</Text>
      {!choices.length && <Text style={s.body}>No eligible enrolments. Add a student to a batch first.</Text>}
      {choices.map(choice => <Button key={choice.id} label={`${choice.student} · ${choice.batch} · ${formatFee(choice.amount)}${enrolment === choice.id ? ' · selected' : ''}`}
        disabled={disabled || choice.amount < 1} soft={enrolment !== choice.id} onPress={() => { setEnrolment(choice.id); setDirty(true); }} />)}
      <Field label="Due date (YYYY-MM-DD)" value={due} disabled={disabled} onChange={text => { setDue(text); setDirty(true); }} />
      <Text style={s.body}>Later batch-fee changes will not change this invoice. Correct an unpaid invoice by voiding it with a reason, then creating a replacement.</Text>
      <Button label="Review invoice" disabled={disabled} onPress={review} />
      <Button label="Back to invoices" soft disabled={busy} onPress={back} />
    </View> : <>
      {!invoice && <Button label="Back to invoices" soft disabled={busy} onPress={back} />}
      {invoice && <View style={s.card}>
        <Text style={s.title}>{invoice.student_name}</Text><Text style={s.body}>{invoice.batch_name} · {invoice.billing_month.slice(0, 7)}</Text>
        <Text style={s.badge}>{invoiceStatus(invoice, today)}</Text>
        <Text style={s.body}>Invoice: {formatFee(invoice.amount_paise)} · Due {invoice.due_on}</Text>
        <Text style={s.title}>{invoice.voided_at ? 'Voided invoice' : `Outstanding: ${formatFee(invoice.balance_paise)}`}</Text>
        <Text style={s.body}>Recorded received: {formatFee(invoice.paid_paise)}. Manual entries are not gateway verified.</Text>
        {invoice.test_paise > 0 && <Text style={s.body}>Test gateway records: {formatFee(invoice.test_paise)}. Excluded from real balance.</Text>}
        {invoice.excess_paise > 0 && <Text style={s.warning}>Excess received: {formatFee(invoice.excess_paise)}. Review required; no automatic refund.</Text>}
        <Text selectable style={s.caption}>Invoice reference: {invoice.id}</Text>
        <Text style={s.caption}>Created {invoice.created_at} · {invoice.created_by === owner ? 'by you' : 'legacy record / other authorized actor'}</Text>
        {invoice.voided_at && <Text style={s.body}>Voided {invoice.voided_at}. Reason: {invoice.void_reason}</Text>}
        {form === 'payment' ? <>
          <Text style={s.title}>Record a manual payment</Text>
          <Field label="Amount received (₹)" money max={13} value={amount} disabled={disabled} onChange={text => { setAmount(text); setDirty(true); }} />
          <Field label="Received date (YYYY-MM-DD)" value={date} disabled={disabled} onChange={text => { setDate(text); setDirty(true); }} />
          <Text style={s.label}>Received via</Text>
          {(['cash', 'bank', 'upi', 'other'] as const).map(value => <Button key={value} label={`${value.toUpperCase()}${method === value ? ' · selected' : ''}`} soft={method !== value} disabled={disabled} onPress={() => { setMethod(value); setDirty(true); }} />)}
          <Field label="Receipt reference (optional)" max={120} value={reference} disabled={disabled} onChange={text => { setReference(text); setDirty(true); }} />
          <Text style={s.body}>Only record money you have already received. This app does not collect or independently verify it.</Text>
          <Button label="Review manual payment" disabled={disabled} onPress={review} />
        </> : form === 'void' || form === 'reverse' ? <>
          <Text style={s.title}>{form === 'void' ? 'Void unpaid invoice' : 'Correct manual payment record'}</Text>
          <Text style={s.body}>{form === 'void' ? 'The original invoice will remain in history. A replacement can then be created for the same month.' : 'Reverse the mistaken record, then add the correct entry. This does not refund money.'}</Text>
          <Field label="Correction reason" max={500} value={reason} disabled={disabled} onChange={text => { setReason(text); setDirty(true); }} />
          <Button label="Review correction" disabled={disabled} onPress={review} />
        </> : <>
          {!invoice.voided_at && invoice.balance_paise > 0 && <Button label="Record manual payment" disabled={disabled} onPress={() => beginForm('payment')} />}
          {!invoice.voided_at && detail.payments.every(p => !!p.reversal) && <Button label="Void unpaid invoice" soft disabled={disabled} onPress={() => beginForm('void')} />}
          <Button label="Refresh invoice" soft disabled={busy || loading} onPress={() => { void openInvoice(invoice.id); }} />
        </>}
        <Button label={form ? 'Cancel fee entry' : 'Back to invoices'} soft disabled={busy} onPress={back} />
      </View>}
      {detail && !form && <View style={s.card}>
        <Text style={s.title}>Payment history</Text>
        {!detail.payments.length && <Text style={s.body}>No payments recorded.</Text>}
        {detail.payments.map(entry => <View key={entry.id} style={s.ledger}>
          <Text style={s.title}>{formatFee(entry.amount_paise)} · {entry.source === 'manual' ? 'Manual record' : entry.mode === 'test' ? 'Gateway · TEST' : 'Gateway · verified'}</Text>
          <Text style={s.body}>{entry.paid_on ?? entry.recorded_at.slice(0, 10)} · {entry.method?.toUpperCase() ?? entry.mode}</Text>
          {!!entry.reference && <Text style={s.body}>Reference: {entry.reference}</Text>}
          <Text style={s.caption}>Recorded {entry.recorded_at} · {entry.recorded_by === owner ? 'by you' : entry.source === 'gateway' ? 'by payment service' : 'legacy record'}</Text>
          {entry.reversal ? <Text style={s.warning}>Reversed {entry.reversal.reversed_at}. Reason: {entry.reversal.reason}</Text>
            : entry.source === 'manual' && !invoice?.voided_at && <Button label={`Correct manual record ${formatFee(entry.amount_paise)}`} soft disabled={disabled} onPress={() => beginForm('reverse', entry.id)} />}
        </View>)}
      </View>}
    </>}
  </View>;
}
const s = StyleSheet.create({
  root: { gap: 16 }, kicker: { color: '#1F6F6B', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  heading: { color: '#22303A', fontSize: 30, fontWeight: '700' }, title: { color: '#22303A', fontSize: 17, fontWeight: '700' },
  body: { color: '#5C6B73', fontSize: 14, lineHeight: 22 }, caption: { color: '#63756F', fontSize: 11, lineHeight: 18 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E8E2', padding: 18, borderRadius: 18, gap: 14 },
  pending: { backgroundColor: '#F8EBC6', padding: 18, borderRadius: 18, gap: 12 }, warning: { color: '#88411D', fontSize: 14, lineHeight: 22 },
  badge: { color: '#1F6F6B', fontWeight: '700', fontSize: 15 }, field: { gap: 7 }, label: { color: '#22303A', fontSize: 13, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#C8D3CB', borderRadius: 11, padding: 12, color: '#22303A', backgroundColor: '#fff', fontSize: 16 },
  button: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: '#1F6F6B', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' }, soft: { backgroundColor: '#EDF1EC' }, softText: { color: '#22303A' },
  ledger: { gap: 10, borderTopWidth: 1, borderColor: '#E3E8E2', paddingTop: 14 },
});
