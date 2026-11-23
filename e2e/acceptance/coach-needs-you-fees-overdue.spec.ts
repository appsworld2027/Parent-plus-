// LOCKED acceptance tests for docs/product/needs-you-fees-overdue/ACCEPTANCE.md (AI Org AGENTS.md §7A).
// Written by Quinn (QA) before the feature exists. Only an `ai:contract` PR may change this file;
// a build PR must make these pass WITHOUT editing, skipping or deleting them (contract-lock enforces it).
import { expect, test, type Page } from '@playwright/test';
import { backend, login } from '../support/backend';
import { feesBackend } from '../support/feesBackend';

const RIA = '00000000-0000-0000-0000-000000000021'; // the fixture's ready-class student
const DAY = 24 * 60 * 60 * 1000;
const heading = (page: Page) => page.getByRole('heading', { name: 'Needs you', exact: true });
const feedbackItem = (page: Page) => page.getByRole('button', { name: /\d+ (child needs|children need) feedback/ });
const feesOverdueItem = (page: Page) => page.getByRole('button', { name: /\d+ fees? overdue/ });

async function openToday(page: Page, readyClass = true) {
  await backend(page, { academy: true, readyClass });
  await feesBackend(page);
  await login(page);
  await expect(heading(page)).toBeVisible();
}

// Leave and re-open Today so it loads fresh records after the test changes the fixture.
async function reopenToday(page: Page) {
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(heading(page)).toBeVisible();
}

async function addStudent(page: Page, student: { id: string; name: string; archived?: boolean; ended?: boolean }) {
  await page.evaluate(value => {
    const roster = window.__coachFixture.roster;
    roster.students.push({ id: value.id, name: value.name, age_years: 7, archived_at: value.archived ? '2026-01-01T00:00:00.000Z' : null });
    roster.enrolments.push({ id: `e-${value.id}`, student_id: value.id, batch_id: roster.batches[0].id,
      starts_on: '2020-01-01', ends_on: value.ended ? '2020-06-30' : null });
  }, student);
}

// Uses the real Feedback screen, exactly as a coach would.
async function writeFeedback(page: Page, student: string, kind: 'recorded' | 'draft') {
  await page.getByRole('button', { name: 'Write feedback for parents', exact: true }).click();
  await page.getByRole('button', { name: 'Write feedback', exact: true }).click();
  await page.getByRole('combobox', { name: 'Feedback batch', exact: true })
    .selectOption(await page.evaluate(() => window.__coachFixture.roster.batches[0].id));
  await page.getByRole('combobox', { name: 'Student for this feedback', exact: true }).selectOption(student);
  await page.getByLabel('Observation text', { exact: true }).fill('Fictional note: shaped a clay bowl with care.');
  if (kind === 'recorded') {
    await page.getByRole('button', { name: 'Save feedback', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Review WhatsApp message', exact: true })).toBeEnabled();
  } else {
    await page.getByRole('button', { name: 'Save draft to workspace', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__coachFixture.observations.map(o => o.status).join(','))).toBe('draft');
  }
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(heading(page)).toBeVisible();
}

async function expectAllCaughtUp(page: Page) {
  await expect(page.getByText('All caught up', { exact: true })).toBeVisible();
  await expect(page.getByText('New requests will show here', { exact: true })).toBeVisible();
  await page.waitForTimeout(1500); // must stay caught up after loading settles
  await expect(feedbackItem(page)).toHaveCount(0);
  await expect(feesOverdueItem(page)).toHaveCount(0);
}

async function addOverdueInvoices(page: Page, invoices: { studentId: string; billingMonth: string; dueDate: string; amountPaise: number; voided?: boolean }[]) {
  await page.evaluate(data => {
    const feeFixture = window.__feeFixture;
    const roster = window.__coachFixture.roster;
    for (const inv of data) {
      const enrolment = roster.enrolments.find(e => e.student_id === inv.studentId && !e.ends_on);
      if (!enrolment) continue;
      const batch = roster.batches.find(b => b.id === enrolment.batch_id);
      const student = roster.students.find(s => s.id === inv.studentId);
      if (!batch || !student) continue;
      feeFixture.invoices.push({
        id: crypto.randomUUID(),
        academy_id: 'academy-test',
        enrolment_id: enrolment.id as string,
        billing_month: inv.billingMonth,
        due_on: inv.dueDate,
        amount_paise: inv.amountPaise,
        student_name: student.name,
        batch_name: batch.name,
        created_by: '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString(),
        voided_at: inv.voided ? new Date().toISOString() : null,
        voided_by: inv.voided ? '00000000-0000-0000-0000-000000000001' : null,
        void_reason: inv.voided ? 'Fictional void' : null,
        paid_paise: 0,
        balance_paise: inv.amountPaise,
        test_paise: 0,
        excess_paise: 0,
      } satisfies import('../../src/fees/model').Invoice);
    }
    sessionStorage.setItem('__fictional_fees', JSON.stringify({ invoices: feeFixture.invoices, payments: feeFixture.payments }));
  }, invoices);
}

async function addTestReceipt(page: Page, invoiceId: string, amountPaise: number) {
  await page.evaluate(data => {
    const feeFixture = window.__feeFixture;
    feeFixture.payments.push({
      id: crypto.randomUUID(),
      invoice_id: data.invoiceId,
      request_id: `test-${data.invoiceId}`,
      amount_paise: data.amountPaise,
      source: 'manual',
      mode: 'test',
      paid_on: '2026-11-01',
      method: null,
      reference: null,
      recorded_at: new Date().toISOString(),
      recorded_by: '00000000-0000-0000-0000-000000000001',
      reversal: null,
    });
    sessionStorage.setItem('__fictional_fees', JSON.stringify({ invoices: feeFixture.invoices, payments: feeFixture.payments }));
  }, { invoiceId, amountPaise });
}

async function addLivePayment(page: Page, invoiceId: string, amountPaise: number) {
  await page.evaluate(data => {
    const feeFixture = window.__feeFixture;
    feeFixture.payments.push({
      id: crypto.randomUUID(),
      invoice_id: data.invoiceId,
      request_id: `live-${data.invoiceId}`,
      amount_paise: data.amountPaise,
      source: 'manual',
      mode: 'live',
      paid_on: '2026-11-01',
      method: 'cash',
      reference: '',
      recorded_at: new Date().toISOString(),
      recorded_by: '00000000-0000-0000-0000-000000000001',
      reversal: null,
    });
    sessionStorage.setItem('__fictional_fees', JSON.stringify({ invoices: feeFixture.invoices, payments: feeFixture.payments }));
  }, { invoiceId, amountPaise });
}

async function expectFeesOverdueItem(page: Page, count: number, amountPaise: number) {
  const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amountPaise / 100);
  const expectedText = count === 1 ? `1 fee overdue` : `${count} fees overdue`;
  await expect(feesOverdueItem(page)).toHaveCount(1);
  await expect(feesOverdueItem(page)).toContainText(expectedText);
  await expect(feesOverdueItem(page)).toContainText(formattedAmount);
  await expect(feesOverdueItem(page).locator('..').getByTestId('wallet-icon')).toBeVisible();
  await expect(feesOverdueItem(page).locator('..').getByTestId('chevron-icon')).toBeVisible();
}

async function tapFeesOverdueAndExpectOverdueSection(page: Page) {
  await feesOverdueItem(page).click();
  await expect(page.getByRole('heading', { name: 'Fees overview', exact: true })).toBeVisible();
  // The Overdue section should be at the top
  await expect(page.getByRole('heading', { name: 'Overdue', exact: true })).toBeVisible();
  // Each row should have student, batch, billing month(s), amount due
  const overdueRows = page.getByRole('row', { name: /Fictional/ });
  await expect(overdueRows.first()).toBeVisible();
}

test.describe.configure({ retries: 0 });

test('AC-01 Today shows "2 fees overdue" with "₹5,500 pending" wallet icon and chevron', async ({ page }) => {
  await openToday(page);
  // Add two students with overdue invoices
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000023', name: 'Fictional Kabir' });
  await reopenToday(page);

  // Add overdue invoices for both students (last month)
  const lastMonth = '2026-10-01';
  const today = new Date().toISOString().split('T')[0];
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 350000 },
    { studentId: '10000000-0000-0000-0000-000000000023', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 200000 },
  ]);
  await reopenToday(page);

  await expectFeesOverdueItem(page, 2, 550000);
});

test('AC-02 Today shows BOTH items: feedback (star, grape) then fees (wallet, rose)', async ({ page }) => {
  await openToday(page);
  // Add two students with overdue invoices
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000023', name: 'Fictional Kabir' });
  await reopenToday(page);

  const lastMonth = '2026-10-01';
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 350000 },
    { studentId: '10000000-0000-0000-0000-000000000023', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 200000 },
  ]);
  await reopenToday(page);

  // Add feedback needed for one student
  await writeFeedback(page, RIA, 'recorded');
  await page.evaluate(age => {
    const old = new Date(Date.now() - age).toISOString();
    for (const row of window.__coachFixture.observations) { row.created_at = old; row.updated_at = old; row.recorded_at = old; }
  }, 8 * DAY);
  await reopenToday(page);

  // Both items should appear in order: feedback first, then fees
  await expect(feedbackItem(page)).toHaveCount(1);
  await expect(feesOverdueItem(page)).toHaveCount(1);
  // Check order: feedback item appears before fees item
  const feedbackBox = await feedbackItem(page).boundingBox();
  const feesBox = await feesOverdueItem(page).boundingBox();
  expect(feedbackBox!.y).toBeLessThan(feesBox!.y);
});

test('AC-03 Tapping "N fees overdue" opens Fees with Overdue section at top listing all overdue students from ANY month', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000023', name: 'Fictional Kabir' });
  await reopenToday(page);

  const lastMonth = '2026-10-01';
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 350000 },
    { studentId: '10000000-0000-0000-0000-000000000023', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 200000 },
  ]);
  await reopenToday(page);

  await expectFeesOverdueItem(page, 2, 550000);
  await tapFeesOverdueAndExpectOverdueSection(page);
});

test('AC-16 Student with only last-month overdue shows on Today AND in Fees Overdue section', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await reopenToday(page);

  // Only last month overdue (no current month)
  const lastMonth = '2026-10-01';
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 250000 },
  ]);
  await reopenToday(page);

  await expectFeesOverdueItem(page, 1, 250000);
  await feesOverdueItem(page).click();
  await expect(page.getByRole('heading', { name: 'Fees overview', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overdue', exact: true })).toBeVisible();
  // The student should appear in the Overdue section with last month's billing month visible
  await expect(page.getByRole('row', { name: /Fictional Zoya/ })).toContainText('Oct 2026');
});

test('AC-04 No overdue invoices, no feedback needed shows "All caught up"', async ({ page }) => {
  await openToday(page);
  await expectAllCaughtUp(page);
});

test('AC-05 Overdue invoice but enrolment ended shows "All caught up"', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya', ended: true });
  await reopenToday(page);

  const lastMonth = '2026-10-01';
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 250000 },
  ]);
  await reopenToday(page);

  await expectAllCaughtUp(page);
});

test('AC-06 Overdue invoice for archived student shows "All caught up"', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya', archived: true });
  await reopenToday(page);

  const lastMonth = '2026-10-01';
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 250000 },
  ]);
  await reopenToday(page);

  await expectAllCaughtUp(page);
});

test('AC-07 Device offline shows "Needs you list could not load. Reference: <ref>"', async ({ page }) => {
  await openToday(page);
  // Simulate offline by failing both fees and feedback loads
  await page.evaluate(() => {
    window.__coachFixture.failStudent = true;
    window.__feeFixture.failRead = true;
  });
  await reopenToday(page);

  await expect(page.getByText(/Needs you list could not load\. Reference: .+/)).toBeVisible();
});

test('AC-08 Data loading shows "Checking…" muted line in Needs you card', async ({ page }) => {
  await openToday(page);
  // Hold the responses to simulate loading
  await page.evaluate(() => {
    window.__coachFixture.holdObservation = true;
    window.__feeFixture.hold = true;
  });
  // Navigate away and back to trigger loading
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByRole('tab', { name: 'Today', exact: true }).click();

  await expect(page.getByText('Checking…')).toBeVisible();
});

test('AC-17 Fees load fails, feedback loads OK shows feedback item plus "Fees could not load. Reference: <ref>"', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await reopenToday(page);

  const lastMonth = '2026-10-01';
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 250000 },
  ]);
  await reopenToday(page);

  // Make fees fail to load
  await page.evaluate(() => {
    window.__feeFixture.failRead = true;
  });
  await reopenToday(page);

  // Feedback should still show
  await expect(feedbackItem(page)).toHaveCount(1);
  // Fees error line should show
  await expect(page.getByText(/Fees could not load\. Reference: .+/)).toBeVisible();
  // No whole-card error
  await expect(page.getByText(/Needs you list could not load/)).toHaveCount(0);
});

test('AC-18 Feedback loads fail, fees load OK shows fees item plus "Feedback could not load. Reference: <ref>"', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await reopenToday(page);

  const lastMonth = '2026-10-01';
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 250000 },
  ]);
  await reopenToday(page);

  // Make feedback fail to load
  await page.evaluate(() => {
    window.__coachFixture.failObservation = true;
  });
  await reopenToday(page);

  // Fees should still show
  await expect(feesOverdueItem(page)).toHaveCount(1);
  // Feedback error line should show
  await expect(page.getByText(/Feedback could not load\. Reference: .+/)).toBeVisible();
  // No whole-card error
  await expect(page.getByText(/Needs you list could not load/)).toHaveCount(0);
});

test('AC-09 600 students with overdue invoices across 4 batches shows "600 fees overdue" with "₹4,23,00,000 pending"', async ({ page }) => {
  await openToday(page);
  const batchIds = [
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000033',
    '00000000-0000-0000-0000-000000000034',
  ];

  await page.evaluate(data => {
    const roster = window.__coachFixture.roster;
    const feeFixture = window.__feeFixture;
    const studentsPerBatch = 150;
    const lastMonth = '2026-10-01';

    for (let b = 0; b < 4; b++) {
      const batchId = data.batchIds[b];
      roster.batches.push({ id: batchId, name: `Fictional Batch ${b + 1}`, room: `Room ${b + 1}`, monthly_fee_paise: 705000, archived_at: null });
      for (let i = 0; i < studentsPerBatch; i++) {
        const studentId = `20000000-0000-0000-0000-${String(b * studentsPerBatch + i).padStart(12, '0')}`;
        roster.students.push({ id: studentId, name: `Fictional Student ${b * studentsPerBatch + i}`, age_years: 7, archived_at: null });
        roster.enrolments.push({ id: `e-${studentId}`, student_id: studentId, batch_id: batchId, starts_on: '2020-01-01', ends_on: null });
        feeFixture.invoices.push({
          id: crypto.randomUUID(),
          academy_id: 'academy-test',
          enrolment_id: `e-${studentId}`,
          billing_month: lastMonth,
          due_on: '2026-10-15',
          amount_paise: 705000,
          student_name: `Fictional Student ${b * studentsPerBatch + i}`,
          batch_name: `Fictional Batch ${b + 1}`,
          created_by: '00000000-0000-0000-0000-000000000001',
          created_at: new Date().toISOString(),
          voided_at: null,
          voided_by: null,
          void_reason: null,
          paid_paise: 0,
          balance_paise: 705000,
          test_paise: 0,
          excess_paise: 0,
        });
      }
    }
    sessionStorage.setItem('__fictional_fees', JSON.stringify({ invoices: feeFixture.invoices, payments: feeFixture.payments }));
    sessionStorage.setItem('__fictional_roster', JSON.stringify(roster));
  }, { batchIds });

  await reopenToday(page);

  await expectFeesOverdueItem(page, 600, 423000000);
});

test('AC-10 Student with both overdue invoice AND needs feedback shows BOTH items, each tappable', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await reopenToday(page);

  const lastMonth = '2026-10-01';
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 250000 },
  ]);
  await reopenToday(page);

  // Add old feedback for the student (feedback needed)
  await writeFeedback(page, '10000000-0000-0000-0000-000000000022', 'recorded');
  await page.evaluate(age => {
    const old = new Date(Date.now() - age).toISOString();
    for (const row of window.__coachFixture.observations) { row.created_at = old; row.updated_at = old; row.recorded_at = old; }
  }, 8 * DAY);
  await reopenToday(page);

  // Both items should appear
  await expect(feedbackItem(page)).toHaveCount(1);
  await expect(feesOverdueItem(page)).toHaveCount(1);

  // Tap feedback item
  await feedbackItem(page).click();
  await expect(page.getByRole('heading', { name: 'Feedback for parents', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(heading(page)).toBeVisible();

  // Tap fees item
  await feesOverdueItem(page).click();
  await expect(page.getByRole('heading', { name: 'Fees overview', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overdue', exact: true })).toBeVisible();
});

test('AC-11 1 student with overdue invoice shows "1 fee overdue" with "₹1,500 pending" (singular)', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await reopenToday(page);

  const lastMonth = '2026-10-01';
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 150000 },
  ]);
  await reopenToday(page);

  await expectFeesOverdueItem(page, 1, 150000);
});

test('AC-12 Invoice due TODAY (due_on = today Asia/Kolkata) is NOT overdue', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await reopenToday(page);

  // Invoice due today (not overdue)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: '2026-11-01', dueDate: today, amountPaise: 250000 },
  ]);
  await reopenToday(page);

  await expectAllCaughtUp(page);
});

test('AC-13 Overdue invoice but voided is excluded', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await reopenToday(page);

  const lastMonth = '2026-10-01';
  await addOverdueInvoices(page, [
    { studentId: '10000000-0000-0000-0000-000000000022', billingMonth: lastMonth, dueDate: '2026-10-15', amountPaise: 250000, voided: true },
  ]);
  await reopenToday(page);

  await expectAllCaughtUp(page);
});

test('AC-14 Overdue invoice paid only by TEST receipt (mode = test) shows full amount pending', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await reopenToday(page);

  const lastMonth = '2026-10-01';
  const invoices = await page.evaluate(async () => {
    const feeFixture = window.__feeFixture;
    const roster = window.__coachFixture.roster;
    const enrolment = roster.enrolments.find(e => e.student_id === '10000000-0000-0000-0000-000000000022' && !e.ends_on)!;
    const batch = roster.batches.find(b => b.id === enrolment.batch_id)!;
    const student = roster.students.find(s => s.id === '10000000-0000-0000-0000-000000000022')!;
    const invoice = {
      id: crypto.randomUUID(),
      academy_id: 'academy-test',
      enrolment_id: enrolment.id as string,
      billing_month: lastMonth,
      due_on: '2026-10-15',
      amount_paise: 250000,
      student_name: student.name,
      batch_name: batch.name,
      created_by: '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      voided_at: null,
      voided_by: null,
      void_reason: null,
      paid_paise: 0,
      balance_paise: 250000,
      test_paise: 0,
      excess_paise: 0,
    } satisfies import('../../src/fees/model').Invoice;
    feeFixture.invoices.push(invoice);
    sessionStorage.setItem('__fictional_fees', JSON.stringify({ invoices: feeFixture.invoices, payments: feeFixture.payments }));
    return invoice;
  });

  // Add a TEST receipt (mode = 'test') for the full amount
  await addTestReceipt(page, invoices.id, 250000);
  await reopenToday(page);

  // Should still show as overdue with full amount (TEST receipts don't count as paid)
  await expectFeesOverdueItem(page, 1, 250000);
});

test('AC-15 Student with 2 overdue invoices (₹2,000 + ₹3,000) partly paid leaving ₹500 + ₹1,000 shows "1 fee overdue" with "₹1,500 pending"', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: '10000000-0000-0000-0000-000000000022', name: 'Fictional Zoya' });
  await reopenToday(page);

  const lastMonth = '2026-10-01';
  const invoices = await page.evaluate(async () => {
    const feeFixture = window.__feeFixture;
    const roster = window.__coachFixture.roster;
    const enrolment = roster.enrolments.find(e => e.student_id === '10000000-0000-0000-0000-000000000022' && !e.ends_on)!;
    const batch = roster.batches.find(b => b.id === enrolment.batch_id)!;
    const student = roster.students.find(s => s.id === '10000000-0000-0000-0000-000000000022')!;

    const inv1 = {
      id: crypto.randomUUID(),
      academy_id: 'academy-test',
      enrolment_id: enrolment.id as string,
      billing_month: lastMonth,
      due_on: '2026-10-15',
      amount_paise: 200000,
      student_name: student.name,
      batch_name: batch.name,
      created_by: '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      voided_at: null,
      voided_by: null,
      void_reason: null,
      paid_paise: 0,
      balance_paise: 200000,
      test_paise: 0,
      excess_paise: 0,
    } satisfies import('../../src/fees/model').Invoice;
    const inv2 = {
      id: crypto.randomUUID(),
      academy_id: 'academy-test',
      enrolment_id: enrolment.id as string,
      billing_month: '2026-09-01', // previous month
      due_on: '2026-09-15',
      amount_paise: 300000,
      student_name: student.name,
      batch_name: batch.name,
      created_by: '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      voided_at: null,
      voided_by: null,
      void_reason: null,
      paid_paise: 0,
      balance_paise: 300000,
      test_paise: 0,
      excess_paise: 0,
    } satisfies import('../../src/fees/model').Invoice;
    feeFixture.invoices.push(inv1, inv2);
    sessionStorage.setItem('__fictional_fees', JSON.stringify({ invoices: feeFixture.invoices, payments: feeFixture.payments }));
    return [inv1, inv2];
  });

  // Add live payments that partially pay both invoices (leaving ₹500 and ₹1,000 balance)
  await addLivePayment(page, invoices[0].id, 150000); // pays ₹1,500 of ₹2,000, leaving ₹500
  await addLivePayment(page, invoices[1].id, 200000); // pays ₹2,000 of ₹3,000, leaving ₹1,000
  await reopenToday(page);

  // Should count student once and sum remaining balances (500 + 1000 = 1500)
  await expectFeesOverdueItem(page, 1, 150000);
});