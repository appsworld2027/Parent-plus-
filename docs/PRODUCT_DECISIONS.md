# Product decisions and assumptions

Recorded/reviewed: 12 November 2026. This captures existing choices and their consequences, not new feature authorization. Requirements remain in [PRD.md](../PRD.md); implementation evidence remains in [PROGRESS.md](../PROGRESS.md).

| ID | Current decision | Reason and consequence | State / evidence |
| --- | --- | --- | --- |
| PD-01 | Build the coach module before the larger parent app | A coach can manage teaching without waiting for family accounts. Guardian contacts do not automatically become users or receive notifications. | Owner direction; PRD sections 1–2 |
| PD-02 | Native Android first, using React Native/Expo | Delivers an installable app and a possible later cross-platform path. Android device acceptance is required; browser success alone is insufficient. | Existing APK installed; iOS is not verified |
| PD-03 | Email/password first | Provides the initial account flow without adding a phone/WhatsApp provider. Recovery/email limits still need production review; phone/WhatsApp login is not implemented. | PRD AUTH-01; owner reports confirmation/login |
| PD-04 | One academy owned per account in the current model | Keeps the first ownership boundary understandable. Staff roles and multiple owned academies require an explicit future model/product decision. | Current schema unique owner; live two-account tests still pending |
| PD-05 | Save a student, primary guardian and enrolments in one trusted transaction | Avoids partial records and duplicate identities after a lost response. Requires migration 002; UI supports additive memberships, not ending/restarting enrolment periods. | Implemented and locally tested; deployment unconfirmed |
| PD-06 | Hosted payment links with backend verification for the pilot | A guardian can pay without a parent app; app redirects alone must not mark invoices paid. Provider eligibility/merchant approval and server configuration remain required. | Planned PRD PAY-01–03; integration not built |
| PD-07 | Establish reliable current modules and documentation before more features | The observed Android failure demonstrates the need for device evidence and clearer diagnostics. Documentation/readability work is authorized; feature development remains paused. | Latest owner direction; 0.2.1 repair needs phone confirmation |
| PD-08 | Refresh technical docs at meaningful changes; consolidate product/progress review daily | Keeps the next developer oriented without duplicating every implementation event into the PRD. Important blockers and changed requirements are recorded immediately. | Owner working agreement; DEVELOPER_GUIDE.md section 7 |

For a new material decision, record: date, problem, recommendation, user benefit, cost/complexity, owner decision if required, affected requirement IDs, acceptance evidence and remaining uncertainty. Revisit assumptions when evidence changes. Do not silently reduce required pilot scope or promise a launch date before the remaining gates are assessed.
