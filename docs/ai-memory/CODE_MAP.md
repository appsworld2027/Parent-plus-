# Code map

- `App.tsx` — app shell, tab navigation (Today, Schedule, Feedback, Students, Fees), loads Needs-you data when Today opens (re-opening the tab reloads it).
- `src/today/NeedsYou.tsx`, `src/today/needsYou.ts`, `src/today/service.ts` — the Needs-you card: loading ("Checking…"), error ("Needs you list could not load. Reference: <ref>"), "All caught up" + "New requests will show here", feedback item. Data loaded in pages of 500 rows.
- `src/fees/FeesScreen.tsx`, `src/fees/model.ts`, `src/fees/service.ts` — Fees: month overview (heading "Fees overview", "Collected for this month"), batch views with All/Pending/Paid filters; invoices read from `fee_invoice_balances` 50 per page; `formatFee` in `src/roster/model.ts`.
- `src/ui/PrototypeIcon.tsx` — icons; it does not accept `testID`, so wrap an icon in a `View` with a `testID` when a test needs it.
- Error messages carry a support reference from `diagnostics.record(...)`.
