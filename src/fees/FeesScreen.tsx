import { prototypeColors as c, prototypeWeight } from '../ui/prototypeTheme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../ui/Typography';
import { whatsappLink, whatsappNumber } from '../observations/whatsapp';
import { supabase } from '../auth/client';
import { randomUUID } from 'expo-crypto';
import { localParts } from '../classes/model';
import { deviceStorage } from '../deviceStorage';
import { formatFee } from '../roster/model';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useFeedbackMessage } from '../ui/ActionFeedback';
import { reminder } from './reminder';
import { canReceipt, receiptNumber, receiptText } from './receipt';
import { billingOptions, invoiceStatus, operationSummary, paymentAmount, validDay, validMonth } from './model';
import type { FeeContext, FeeDetail, FeeOperation, Invoice, PendingFee } from './model';
import { createPendingFees } from './pending';
import { feeOverview, type StudentFee } from './summary';
import { allMonthInvoices, executeFee, feeFailure, feeRejected, getInvoice, listInvoices, loadFeeContext } from './service';

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
  academy: { id: string; timezone: string; name?: string }; owner: string; onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void; onViewChange: () => void;
}) {
  const today = localParts(new Date().toISOString(), academy.timezone).date;
  const [month, setMonth] = useState(today.slice(0, 7));
  const [filterMonth, setFilterMonth] = useState(month);
  const [context, setContext] = useState<FeeContext | null>(null);
  const [list, setList] = useState<Awaited<ReturnType<typeof listInvoices>> | null>(null);
  const [detail, setDetail] = useState<FeeDetail | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'collect'>('list');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false);
  const [enrolment, setEnrolment] = useState(''), [due, setDue] = useState(`${month}-10`);
  const [batchView, setBatchView] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [feeSearch, setFeeSearch] = useState('');
  const [feeFilter, setFeeFilter] = useState<'all'|'pending'|'paid'>('all');
  const [collectTarget, setCollectTarget] = useState<StudentFee | null>(null);
  const [form, setForm] = useState<'payment' | 'void' | 'reverse' | null>(null);
  const [amount, setAmount] = useState(''), [date, setDate] = useState(today);
  const [method, setMethod] = useState<'cash' | 'bank' | 'upi' | 'other'>('cash');
  const [receiptOpen, setReceiptOpen] = useState(''), [receiptNote, setReceiptNote] = useState(''), [receiptPhone, setReceiptPhone] = useState<string | null>(null);
  // Parent's WhatsApp number for the receipt (FR-10): first valid number on file; none means the button is not offered.
  async function phoneFor(enrolmentId: string): Promise<string | null> {
    try {
      const studentId = context?.enrolments.find(e => e.id === enrolmentId)?.student_id; if (!studentId || !supabase) return null;
      const r = await supabase.from('student_contacts').select('student_id,phone').eq('academy_id', academy.id).eq('student_id', studentId);
      if (r.error) return null;
      return ((r.data ?? []) as { phone: string | null }[]).find(c => c.phone && whatsappNumber(c.phone))?.phone ?? null;
    } catch { return null; }
  }
  async function remindParent(inv: Invoice) {
    const draft = reminder(academy.name ?? 'Your academy', inv, today); if (!draft) return;
    const phone = await phoneFor(inv.enrolment_id); const link = phone ? whatsappLink(phone, draft.text) : null;
    if (link) { setReceiptNote(''); void Linking.openURL(link); } else setReceiptNote('No parent phone number on file. Add one in Students to send a reminder.');
  }
  async function loadReceiptPhone(enrolmentId: string) {
    setReceiptPhone(null);
    try {
      const studentId = context?.enrolments.find(e => e.id === enrolmentId)?.student_id; if (!studentId || !supabase) return;
      const r = await supabase.from('student_contacts').select('student_id,phone').eq('academy_id', academy.id).eq('student_id', studentId);
      if (r.error) return;
      setReceiptPhone(((r.data ?? []) as { phone: string | null }[]).find(c => c.phone && whatsappNumber(c.phone))?.phone ?? null);
    } catch { /* No number means no WhatsApp button; sharing still works. */ }
  }
  const shareReceipt = async (message: string) => { try { await Share.share({ message }); setReceiptNote(''); } catch { setReceiptNote('Sharing is not available here. Copy the receipt text above or take a screenshot.'); } };
  const [reference, setReference] = useState(''), [reason, setReason] = useState(''), [payment, setPayment] = useState('');
  const [confirmation, setConfirmation] = useState<FeeOperation | null>(null);
  const [pending, setPending] = useState<PendingFee | null>(null), [storageBlocked, setStorageBlocked] = useState(true);
  const [pendingDurable, setPendingDurable] = useState(false);
  const [, error] = useFeedbackMessage('error', 'Fees need attention');
  const [, notice] = useFeedbackMessage('success', 'Saved to your workspace');
  const alive = useRef(true), lock = useRef(false), version = useRef(0);
  const disabled = busy || loading || storageBlocked || !!pending;
  const choices = context ? billingOptions(context, month) : [];
  const selected = choices.find(item => item.id === enrolment);
  const overview = context && list ? feeOverview(context,list.invoices,filterMonth,today) : null;
  const selectedBatch = overview?.batches.find(batch => batch.id === batchView);

  const reload = useCallback(async (targetMonth: string) => {
    const generation = ++version.current;
    setLoading(true); setList(null);
    try {
      const [data, invoices] = await Promise.all([loadFeeContext(academy.id), allMonthInvoices(academy.id, targetMonth)]);
      if (alive.current && generation === version.current) { setContext(data); setList({ invoices, more: false }); return true; }
    } catch (failure) { if (alive.current && generation === version.current) error(feeFailure(failure, 'Fees could not be loaded. Check your connection and retry.')); }
    finally { if (alive.current && generation === version.current) setLoading(false); }
    return false;
  }, [academy.id, error]);
  async function readPending() {
    setStorageBlocked(true);
    try {
      const saved = await pendingFees.read(owner, academy.id);
      if (alive.current) { setPending(saved); setPendingDurable(!!saved); setStorageBlocked(false); }
    } catch { error('The pending fee save on this device could not be read. New fee saves are paused to prevent duplicates. Retry reading it; ask your coding partner if it continues.'); }
  }
  useEffect(() => {
    alive.current = true; void readPending(); void reload(filterMonth);
    return () => { alive.current = false; version.current++; };
  }, [academy.id, owner, reload]);
  // A memory-only recovery request still needs the unsaved-change guard. Merely
  // showing the pending panel does not prove device persistence succeeded.
  useEffect(() => {
    onDirtyChange((dirty && !pending) || (!!pending && !pendingDurable));
    return () => onDirtyChange(false);
  }, [dirty, pending, pendingDurable, onDirtyChange]);
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
    if (view === 'collect' && collectTarget) {
      const paise=paymentAmount(amount,collectTarget.pending);
      if(paise===null || !validDay(date) || date>today){error('Enter a positive amount within the pending fee and a valid received date.');return;}
      setConfirmation({kind:'collection',id:randomUUID(),enrolment:collectTarget.enrolment,month:`${filterMonth}-01`,invoice:collectTarget.invoice?.id??null,
        fee:collectTarget.expected,amount:paise,date,method,reference:reference.trim()});
    } else if (view === 'create') {
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
    setPendingDurable(pendingDurable && JSON.stringify(pending) === JSON.stringify(snapshot));
    let sent = false, saved = false;
    try {
      await pendingFees.save(snapshot);
      if (alive.current) setPendingDurable(true);
      sent = true;
      const id = await executeFee(academy.id, snapshot.operation);
      saved = true;
      await pendingFees.clear(snapshot);
      if (!alive.current) return;
      setPending(null); setPendingDurable(false); setDirty(false); setForm(null); setDetail(null);
      const o = snapshot.operation;
      notice(o.kind === 'invoice' ? 'Invoice created. Its amount is fixed. No payment request was sent.'
        : (o.kind === 'payment' || o.kind === 'collection') ? 'Manual payment recorded. This app did not move money or verify a gateway payment.'
        : o.kind === 'reverse' ? 'Manual record reversed. The original entry and correction remain in history. No refund was made.'
        : 'Invoice voided. Its original details and reason remain in history.');
      setView('detail');
      try { const result = await getInvoice(academy.id, id); if (alive.current) setDetail(result); }
      catch (failure) { error(feeFailure(failure, 'The save is confirmed, but the updated invoice could not be loaded. Go back and refresh.')); }
    } catch (failure) {
      if (sent && !saved && feeRejected(failure)) {
        try { await pendingFees.clear(snapshot); if (alive.current) { setPending(null); setPendingDurable(false); } }
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
    <Text accessibilityRole="header" style={s.heading}>{view === 'create' ? 'Create an invoice' : view === 'detail' ? 'Fee details' : view === 'collect' ? 'Record fee received' : selectedBatch ? selectedBatch.name : 'Fees overview'}</Text>
    <Text style={s.body}>Your monthly fees at a glance. Open a batch to see each student’s fee and record payments received.</Text>
    {loading && <ActivityIndicator accessibilityLabel="Loading fees" color={c.sky} />}
    {storageBlocked && <Button label="Retry reading pending fee save" disabled={busy} soft onPress={() => { void readPending(); }} />}
    {pending && <View style={s.pending}>
      <Text style={s.title}>Resolve pending fee save</Text><Text style={s.body}>{operationSummary(pending.operation)}</Text>
      {'amount' in pending.operation && <Text style={s.title}>{formatFee(pending.operation.amount)}</Text>}
      <Text style={s.body}>{pendingDurable
        ? 'Retry this exact request before adding another. It may already be saved. This recovery record is retained on this device, including after sign-out, for this account only.'
        : 'This request is only in memory until device storage succeeds. Keep this screen open and retry; closing or reloading can lose these entries.'}</Text>
      <Button label="Retry pending fee save" disabled={busy || storageBlocked} onPress={() => { void run(pending); }} />
    </View>}
    <ConfirmDialog visible={!!confirmation} title={(confirmation?.kind === 'payment' || confirmation?.kind === 'collection') ? 'Record this manual payment?' : confirmation?.kind === 'invoice' ? 'Create this invoice?' : 'Confirm this correction?'}
      message={confirmation ? `${operationSummary(confirmation)}.${'amount' in confirmation ? ` Amount: ${formatFee(confirmation.amount)}.` : ` Reason: ${'reason' in confirmation ? confirmation.reason : ''}`}
${confirmation.kind === 'invoice' ? `${selected?.student ?? ''} · ${selected?.batch ?? ''}. The amount is fixed once created.` : (confirmation.kind === 'payment' || confirmation.kind === 'collection') ? 'Confirm you received this money outside the app. This is a manual record.' : 'This changes records only. No money is moved and no refund is made.'}` : ''}
      confirmLabel="Confirm fee save" cancelLabel="Keep editing" busy={busy} onCancel={() => setConfirmation(null)}
      onConfirm={() => { if (confirmation) void run({ version: 1, owner, academy: academy.id, operation: confirmation }); }} />
    <ConfirmDialog visible={discard} title="Discard unsaved fee entries?" message="This form is only on this screen. Keep editing to retain it, or discard it to go back."
      confirmLabel="Discard fee entries" cancelLabel="Keep editing" onConfirm={closeForm} onCancel={() => setDiscard(false)} />
    {view === 'list' ? <>
      <View style={s.monthRow}>
        <Field label="Billing month (YYYY-MM)" value={month} max={7} disabled={disabled} onChange={setMonth} />
        <Button label="Show month" soft disabled={disabled} onPress={() => {
          if (!validMonth(month)) { error('Enter a valid billing month as YYYY-MM.'); return; }
          setFilterMonth(month); setBatchView(null); void reload(month);
        }} />
      </View>
      {overview && <>
        <View style={s.summaryHero}>
          <Text style={s.heroLabel}>{filterMonth} · {selectedBatch ? selectedBatch.name : 'ALL BATCHES'}</Text>
          <Text style={s.heroAmount}>{formatFee((selectedBatch ?? overview).collected)}</Text><Text style={s.heroLabel}>Collected for this month</Text>
          <View style={s.metricRow}>
            <View><Text style={s.metricValue}>{(selectedBatch ?? overview).students}</Text><Text style={s.heroLabel}>Students</Text></View>
            <View><Text style={s.metricValue}>{formatFee((selectedBatch ?? overview).pending)}</Text><Text style={s.heroLabel}>Pending</Text></View>
          </View>
          <Text style={s.heroLabel}>Monthly fees: {formatFee((selectedBatch ?? overview).expected)}</Text>
        </View>
        <Text style={s.caption}>Received against {filterMonth} fees, including partial payments. Students are counted once overall; each batch has its own fee. Test payments are excluded.</Text>
        {selectedBatch ? <>
          <Button label="Back to fee overview" soft disabled={busy} onPress={() => {setBatchView(null);setFeeSearch('');setFeeFilter('all');}} />
          <Field label="Find student in fees" max={100} value={feeSearch} disabled={busy} onChange={setFeeSearch} />
          <View style={s.monthRow}>{(['all','pending','paid'] as const).map(filter => <Button key={filter} label={filter==='all'?'All students':filter==='pending'?'Pending fees':'Paid fees'} soft={feeFilter!==filter} disabled={busy} onPress={()=>setFeeFilter(filter)} />)}</View>
          {selectedBatch.rows.filter(row=>row.student.toLowerCase().includes(feeSearch.toLowerCase()) && (feeFilter==='all'||(feeFilter==='pending'?row.pending>0:row.expected>0&&row.pending===0))).map(row => <View key={row.enrolment} style={s.card}>
            <Text style={s.title}>{row.student}{row.archived?' · Archived':''}</Text>
            <Text style={s.body}>Monthly fee {formatFee(row.expected)} · Collected {formatFee(row.collected)}</Text>
            <Text style={s.badge}>{row.voided?'Cancelled fee':row.expected===0?'No fee due':row.pending===0?'Paid':`Pending ${formatFee(row.pending)}`}</Text>
            {row.pending>0 && <Button label={`Record fee for ${row.student}`} disabled={disabled} onPress={()=>{
              setCollectTarget(row);setView('collect');setAmount('');setDate(today);setMethod('cash');setReference('');setDirty(false);error('');notice('');
            }} />}
            {row.invoice && <Button label={`View fee history for ${row.student}`} soft disabled={busy} onPress={()=>{void openInvoice(row.invoice!.id);}} />}
          </View>)}
        </> : <>
          <Text style={s.title}>Batch-wise fees</Text>
          {!overview.batches.length && <Text style={s.body}>No students enrolled for this month. Add students to batches in Students to start tracking fees.</Text>}
          {overview.batches.map(batch=><View key={batch.id} style={s.card}>
            <View style={s.batchHeading}><Text style={s.title}>{batch.name}</Text><Text style={s.badge}>{batch.students} students</Text></View>
            <View style={s.metricRow}><View><Text style={s.moneyValue}>{formatFee(batch.collected)}</Text><Text style={s.caption}>Collected</Text></View>
              <View><Text style={s.moneyValue}>{formatFee(batch.pending)}</Text><Text style={s.caption}>Pending</Text></View></View>
            <Text style={s.body}>Monthly total {formatFee(batch.expected)}</Text>
            <Button label={`View fees for ${batch.name}`} soft disabled={busy} onPress={()=>{setBatchView(batch.id);setFeeSearch('');setFeeFilter('all');onViewChange();}} />
          </View>)}
        </>}
      </>}
      <Button label="Refresh fees" soft disabled={loading || busy} onPress={()=>{void reload(filterMonth);}} />
      <Button label={advanced?'Hide invoice history':'Invoice history and corrections'} soft disabled={busy} onPress={()=>setAdvanced(value=>!value)} />
      {advanced && <>
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
      </>}
    </> : view === 'create' ? <View style={s.card}>
      <Text style={s.title}>Billing month: {month}</Text>
      <Text style={s.body}>Choose one enrolment active during this month. The full current monthly batch fee is used; there is no automatic proration.</Text>
      {!choices.length && <Text style={s.body}>No eligible enrolments. Add a student to a batch first.</Text>}
      {choices.map(choice => <Button key={choice.id} label={`${choice.student} · ${choice.batch} · ${formatFee(choice.amount)}${enrolment === choice.id ? ' · selected' : ''}`}
        disabled={disabled || choice.amount < 1} soft={enrolment !== choice.id} onPress={() => { setEnrolment(choice.id); setDirty(true); }} />)}
      <Field label="Due date (YYYY-MM-DD)" value={due} disabled={disabled} onChange={text => { setDue(text); setDirty(true); }} />
      <Text style={s.body}>Later batch-fee changes will not change this invoice. Correct an unpaid invoice by voiding it with a reason, then creating a replacement.</Text>
      <Button label="Review invoice" disabled={disabled} onPress={review} />
      <Button label="Back to fees" soft disabled={busy} onPress={back} />
    </View> : view === 'collect' && collectTarget ? <View style={s.card}>
      <Text style={s.title}>{collectTarget.student}</Text><Text style={s.body}>{collectTarget.batch} · {filterMonth}</Text>
      <Text style={s.title}>Pending: {formatFee(collectTarget.pending)}</Text>
      <Field label="Amount received (₹)" money max={13} value={amount} disabled={disabled} onChange={value=>{setAmount(value);setDirty(true);}} />
      <Field label="Received date (YYYY-MM-DD)" value={date} disabled={disabled} onChange={value=>{setDate(value);setDirty(true);}} />
      <Text style={s.label}>Received via</Text>
      {(['cash','bank','upi','other'] as const).map(value=><Button key={value} label={`${value.toUpperCase()}${method===value?' · selected':''}`} soft={method!==value} disabled={disabled} onPress={()=>{setMethod(value);setDirty(true);}} />)}
      <Field label="Receipt reference (optional)" max={120} value={reference} disabled={disabled} onChange={value=>{setReference(value);setDirty(true);}} />
      <Text style={s.body}>Record money already received outside the app. The monthly charge and receipt are saved together; you do not need to create an invoice first.</Text>
      <Button label="Review fee received" disabled={disabled} onPress={review} />
      <Button label="Back to batch fees" soft disabled={busy} onPress={back} />
    </View> : <>
      {!invoice && <Button label="Back to fees" soft disabled={busy} onPress={back} />}
      {invoice && <View style={s.card}>
        <Text style={s.title}>{invoice.student_name}</Text><Text style={s.body}>{invoice.batch_name} · {invoice.billing_month.slice(0, 7)}</Text>
        <Text style={s.badge}>{invoiceStatus(invoice, today)}</Text>
        <Text style={s.body}>Monthly fee: {formatFee(invoice.amount_paise)} · Due {invoice.due_on}</Text>
        <Text style={s.title}>{invoice.voided_at ? 'Voided invoice' : `Outstanding: ${formatFee(invoice.balance_paise)}`}</Text>
        {reminder('', invoice, today) && <Button label="Remind parent on WhatsApp" soft onPress={() => { void remindParent(invoice); }} />}
        {!!receiptNote && !receiptOpen && <Text style={s.caption}>{receiptNote}</Text>}
        <Text style={s.body}>Recorded received: {formatFee(invoice.paid_paise)}. Manual entries are not gateway verified.</Text>
        {invoice.test_paise > 0 && <Text style={s.body}>Test payment records: {formatFee(invoice.test_paise)}. Excluded from real balance.</Text>}
        {invoice.excess_paise > 0 && <Text style={s.warning}>Excess received: {formatFee(invoice.excess_paise)}. Review required; no automatic refund.</Text>}
        {advanced && <Text selectable style={s.caption}>Ledger reference: {invoice.id}</Text>}
        {advanced && <Text style={s.caption}>Created {invoice.created_at.slice(0,10)} · {invoice.created_by === owner ? 'by you' : 'legacy record / other authorized actor'}</Text>}
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
        <Button label={form ? 'Cancel fee entry' : 'Back to fees'} soft disabled={busy} onPress={back} />
      </View>}
      {detail && !form && <View style={s.card}>
        <Text style={s.title}>Payment history</Text>
        {!detail.payments.length && <Text style={s.body}>No payments recorded.</Text>}
        {detail.payments.map(entry => <View key={entry.id} style={s.ledger}>
          <Text style={s.title}>{formatFee(entry.amount_paise)} · {entry.source === 'manual' ? 'Manual record' : entry.mode === 'test' ? 'Gateway' : 'Gateway · verified'}{entry.mode === 'test' ? ' · TEST' : ''}</Text>
          <Text style={s.body}>{entry.paid_on ?? entry.recorded_at.slice(0, 10)} · {entry.method?.toUpperCase() ?? entry.mode}</Text>
          {!!entry.reference && <Text style={s.body}>Reference: {entry.reference}</Text>}
          <Text style={s.caption}>Recorded {entry.recorded_at} · {entry.recorded_by === owner ? 'by you' : entry.source === 'gateway' ? 'by payment service' : 'legacy record'}</Text>
          {canReceipt(entry) && invoice && <Button label={receiptOpen === entry.id ? 'Hide receipt' : 'View receipt'} soft onPress={() => { const open = receiptOpen === entry.id; setReceiptOpen(open ? '' : entry.id); setReceiptNote(''); if (!open) void loadReceiptPhone(invoice.enrolment_id); }} />}
          {receiptOpen === entry.id && canReceipt(entry) && invoice && <View style={s.ledger}>
            <Text selectable style={s.body}>{receiptText(academy.name ?? 'Your academy', invoice, entry)}</Text>
            <Button label={`Share receipt ${receiptNumber(entry)}`} soft onPress={() => { void shareReceipt(receiptText(academy.name ?? 'Your academy', invoice, entry)); }} />
            {receiptPhone ? <Button label="Send receipt on WhatsApp" soft onPress={() => { const link = whatsappLink(receiptPhone, receiptText(academy.name ?? 'Your academy', invoice, entry)); if (link) void Linking.openURL(link); }} />
              : <Text style={s.caption}>No parent phone number on file. Use Share, or add a number in Students.</Text>}
            {!!receiptNote && <Text style={s.caption}>{receiptNote}</Text>}
          </View>}
          {entry.reversal ? <Text style={s.warning}>Reversed {entry.reversal.reversed_at}. Reason: {entry.reversal.reason}</Text>
            : entry.source === 'manual' && !invoice?.voided_at && <Button label={`Correct manual record ${formatFee(entry.amount_paise)}`} soft disabled={disabled} onPress={() => beginForm('reverse', entry.id)} />}
        </View>)}
      </View>}
    </>}
  </View>;
}
const s = StyleSheet.create({
  summaryHero:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,padding:14,borderRadius:18,gap:12},heroLabel:{color:c.muted,fontSize:12,lineHeight:18},heroAmount:{color:c.text,fontSize:24,letterSpacing:-0.8,fontWeight:'700'},metricRow:{flexDirection:'row',justifyContent:'space-between',gap:12,flexWrap:'wrap'},metricValue:{color:c.text,fontSize:19,letterSpacing:-0.6,fontWeight:'700'},moneyValue:{color:c.text,fontSize:19,fontWeight:'700'},monthRow:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},batchHeading:{gap:6},
  root:{gap:16},kicker:{color:c.sky,fontSize:10,fontWeight:'800',letterSpacing:1.5},heading:{color:c.text,fontSize:30,lineHeight:31.5,letterSpacing:-1.2,fontWeight:'700'},title:{color:c.text,fontSize:15.5,fontWeight:'700',letterSpacing:-0.2},
  body:{color:c.muted,fontSize:13,lineHeight:20},caption:{color:c.muted,fontSize:11.5,lineHeight:17},card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,padding:14,borderRadius:18,gap:14},
  pending:{backgroundColor:c.raised,padding:14,borderRadius:18,gap:12,borderWidth:1,borderColor:c.sun},warning:{color:c.sun,fontSize:13,lineHeight:20},badge:{color:c.sky,fontWeight:'800',fontSize:13},field:{gap:7},label:{color:c.muted,fontSize:12,fontWeight:prototypeWeight(750)},
  input:{minHeight:44,borderWidth:1,borderColor:c.border,borderRadius:12,paddingVertical:10,paddingHorizontal:11,color:c.text,backgroundColor:c.raised,fontSize:13},
  button:{minHeight:44,paddingVertical:13,paddingHorizontal:16,borderRadius:14,backgroundColor:c.white,alignItems:'center',justifyContent:'center'},buttonText:{color:c.black,fontSize:13.5,fontWeight:'800'},soft:{backgroundColor:c.raised},softText:{color:c.text},
  ledger:{gap:10,borderTopWidth:1,borderColor:c.border,paddingTop:14},
});
