# Feature Contract: Fee receipts

Status: DRAFT — founder standing permission to take recommended options. Source: docs/product/BACKLOG.md "fee-receipts".

## Why
A parent who pays cash or UPI expects proof. Today the coach only has a ledger row. One tap should produce a clear receipt to send.

## Recommended design (assumed)
Coach-side, no database change. On each valid payment in an invoice's Payment history the coach can tap "View receipt" and then "Share receipt" (device share sheet; if unavailable, the receipt stays on screen to screenshot). Receipt number is derived from the payment id.

## In / Out
- In: plain-text receipt: academy, receipt no., student, batch, month, amount, method, date, reference, balance after the invoice.
- Out: PDF, automatic sending without the coach tapping send, tax invoices, parent-side receipt list, gateway payments' provider receipts.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| FR-01 | an invoice with a recorded payment | coach opens Payment history | that payment has a "View receipt" button |
| FR-02 | coach taps View receipt | — | receipt shows academy, receipt no., student, batch, month, amount, method, date, reference |
| FR-03 | a payment with no reference | views receipt | no reference line (no blank or "undefined") |
| FR-04 | a reversed payment | opens history | no receipt button |
| FR-05 | a TEST gateway payment | opens history | no receipt button |
| FR-06 | two payments on one invoice | views each | different receipt numbers; same payment always the same number |
| FR-07 | amounts | views receipt | formatted in ₹ with Indian grouping |
| FR-08 | receipt open | taps Hide receipt | it closes |
| FR-10 | a valid parent WhatsApp number on file | coach opens a receipt | "Send receipt on WhatsApp" opens WhatsApp to that number with the receipt text prefilled; with no number, a note explains and Share still works |
| FR-09 | share not supported on the device | taps Share | receipt stays visible; a clear note says to copy or screenshot |

## Agents may decide alone
Wording, layout, number format. Must ask founder for: PDF generation services, auto-sending, hosted DB changes.

## Tests
Pure rules tests/fee-receipts.test.ts (FR-02,03,04,05,06,07); browser spec e2e/fee-receipts.spec.ts (FR-01,02,08). FR-10 e2e/fee-receipts.spec.ts (link opens; no-number note). FR-09 is NOT RUN on a real device.
