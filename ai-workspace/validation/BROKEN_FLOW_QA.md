# Coach roster and Parent connection defect follow-up

19 November2026. Scope: user-reported broken flows, on canonical MM/development only. No main promotion, live account access, record mutation, email/phone send or Supabase update. User explicitly retained separate Coach approval after an intended-email invitation.

| Report | Confirmed evidence | Repair/remaining boundary |
| --- | --- | --- |
| Intermittently missing Coach batches | `loadRoster` pages every500rows for the requested academy; UI hides archived batches; all four roster reads must succeed | Expose load-all/status. Actual reported account's missing records not reproduced or inspected; do not attribute data loss to archiving without evidence |
| No load-all and duplicate names | Only generic refresh exists; batch upsert keys on UUID, with no name check | UX-BAT-01 explicit load-all including read-only archived rows; UX-BAT-02 loaded-academy normalized-name validation. Existing duplicates and concurrent/direct API uniqueness are not silently repaired |
| Random child names/contact does not verify Parent | Coach roster names are entered facts, not verified identity. Saving contact does not send an invitation; verified email + selected family child + Coach approval remain the gate | Do not restrict legitimate Unicode names or call a contact an authenticated guardian. Automated invitation delivery/phone verification is not part of this UI repair |
| Invitation returns approval to Coach |014 intentionally requires separate Coach approval; owner confirmed keeping this behaviour | Preserve it; show pending connection clearly and never release unapproved feedback |
| One Parent child receives another student's updates | Connect modal silently defaults to selected/first family child; new private child is not automatically created. Also any pending request replaces all approved feedback for that child | PAR-10 explicit target/create-different-child preserving invitation; PAR-11 pending notices beside approved updates. Existing live wrong links require explicit reviewed correction, never name-based reassignment |

## Acceptance/evidence

Preconditions: existing fictional roster and parent identity fixtures with two students/academies and one private family child. Executable cases provide exact steps and assertions.

- UX-BAT-01: `e2e/roster.spec.ts` load-all shows archived records with unavailable edit actions; active-only toggle restores filter. Initial browser RED observed: load-all button missing. A profile-route archive bypass found in independent review is also guarded; extended browser case verifies it. Final affected suite25/25PASS; strengthened archived-profile case PASS in an additional2-case run.
- UX-BAT-02: `tests/roster.test.ts` normalized Unicode/case/whitespace duplicate rules; same-ID edits/different names allowed. Initial RED: missing validateBatch. Browser regression confirms no second saved UUID. Model GREEN13/13 after missing-helper RED; browser RED observed absent duplicate alert; combined25-caseGREEN passed. Archived same-ID edit produced a failing model regression before the additional guard; final model13/13PASS.
- PAR-10: Parent invitation requires an explicit child target; create a different child without losing code; correct target persists after save/reload; no automatic invitation claim on profile creation. Initial browser RED observed; affected browser suite25/25PASS; exact final review/CI pending.
- PAR-11: approved academyA feedback stays visible while academyB is pending; no B feedback until separate approval. Initial browser RED observed; affected browser suite25/25PASS; exact final review/CI pending.

Independent implementation/review roles and exact commit/CI results will be recorded after verification. Browser fixtures are not live email/API acceptance. Existing real recovery-email and physical-device checks remain open; privately stored records in the reported account have not been read or changed.

Owner clarified that they are not sure whether the unexpected feedback concerns another child in their family or an unrecognized child. Treat the existing live mapping as a possible identity mismatch, unverified. No private account/student records were inspected, no links were changed and no absence-of-leak conclusion is established. UI repairs must not be presented as remediation of that existing mapping.

## Review and run evidence

Root implements roster; `/root/vercel_testing` implements Parent fixes/fixtures and runs browser cases; independent read-only `/root/flow_review` reviews the combined diff. Five initial missing-behaviour browser REDs were observed. Two further Parent REDs exposed frozen fields after definite rejection and invalid calendar dates; both are repaired. Exact draft/UUID is retained for uncertain saves; explicit validation/permission rejection unlocks correction. Calendar date round-trip applies before network. A new test initially expected an aria-selected attribute absent from RN-web; replaced with behavioral reload and sibling-switch isolation assertions, not weakened identity expectations.

Affected suite25/25PASS1.6minutes; the two strengthened pending/archived cases also PASS17.2seconds. Full automated/browser/export CI results are recorded after completion. Scope: no auth/RPC/grant/SQL changes; no real mail, guardian verification send or account data operation. Batch duplicate checking is a loaded-roster UX guard, not a concurrent database uniqueness guarantee. Existing wrong live links still need a separately scoped verified review. Root remains onMM/development; no main or production promotion is authorized.

Fresh full local verification: TypeScript and472/472automated tests across38files PASS79.80seconds. Final hosted CI, exact independent commit review and source identity are recorded after commit; no live deployment or existing account remediation is claimed.
