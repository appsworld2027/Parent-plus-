# Coach0.11 / Parent0.1 verification —16November2026

Build: shared app0.11.0, Parent module0.1.0, Android versionCode14. Source/reference instructions are in PARENT_MODULE.md, COACH_FEEDBACK_RESET.md and docs/prototypes. Final GitHub/Vercel identities are recorded after publication in PROGRESS.md.

## Executed locally

- TypeScript passes on the final exported source.
- Full unit/database suite:201passed,27files,53.23seconds. Coverage includes existing authorisation/financial/class/observation guards plus guardian purpose-specific consent, atomic media finalisation, reviewed per-child snapshots, invitation expiry/hash/replay, family ownership/composite keys and Parent media access. Parent integration tests run the exact generated update_011_012.sql twice, not an unrelated schema fixture.
- Full browser regression:76passed in3.0minutes. Uses real browser/app/SDK with fictional transport; no real parent messages, DB writes or paid provider calls.
- New journeys include fee-free Today batch→preselected class→reload; inline class batch creation preserving date; direct Today attendance→present-student feedback; saved WhatsApp review with strict international recipient and no auto-send; class media permission before chooser/camera and fresh recheck after stale cached permission; identical upload retry after lost finish result; Parent approval retry/readback/cancel; family/child create/edit/switch, events/reminders/time/memory persistence; stable memory retry; explicit coach invite→differently named family child→reviewed feed; Parent guardian choices; Parent password recovery through existing callback; missing-new-schema fail-closed behavior.
- Web and Android JS bundle exports pass. A bundle export is not an installed APK or real-device acceptance.
- After the browser pass, only copyright/licence disclosure and removal of implementation copy changed; final TypeScript and both exports pass. Font licence is embedded in the app and served under public/licenses.
- `node scripts/prepare-parent-sql.mjs --check` confirms the delivered one-transaction owner SQL matches011/012. No existing001–010 setup is repeated.

## Independent review and corrections

The existing testing agent performed a read-only review of011/012 and src/parent. It found a stale-disconnect defect: a former parent's inactive link could cancel a replacement family's newer approvals. The function now locks/reloads the target link and returns without side effects if inactive; the database regression explicitly verifies the replacement feed survives the stale call. No further material access/consent bypass was found in that review. The agent ran no live SQL, provider calls or parent communication.

Browser checks also caught duplicate React sibling keys in feedback media/review panels and a first-click review-reset race; these were fixed with distinct stable keys and layout-synchronised reset. Missing-setup assertions were scoped to the actual activation error while the prior save confirmation modal finishes closing. The reminder checkbox test waits for server-confirmed state rather than treating a network save as synchronous.

## Limits, not claimed as passed

New011/012 is not installed on the real Supabase project by this workspace. Real account invitation/feedback/media/withdrawal persistence and independently authenticated live isolation remain owner acceptance. Fixtures do not prove email delivery, real handwriting accuracy, actual video decoding/formats/large uploads, physical native camera/keyboard/lifecycle behavior or storage retention/capacity. Existing Google key/function setup is retained and not rerun. Native Coach APK compilation is a separate CI result; a separate Parent APK has not been built. Vercel preview access is separate from Supabase login and may restrict external guardians. No public-release, native push, WhatsApp sent/delivered status, parent read receipt or complete Aurora feature coverage is claimed.


## Fictional mobile visual evidence

Root inspected the Aurora Home and received-feedback screenshots at412px width. New evidence is preserved in docs/images/011-*: [Parent Home](images/011-parent-home.png), [received coach feedback](images/011-parent-feedback.png), [class setup](images/011-class-setup.png), [WhatsApp review](images/011-whatsapp-review.png), [held Parent review](images/011-parent-review.png) and [class media](images/011-class-media.png). All names/records are test fixtures, not real family information.
