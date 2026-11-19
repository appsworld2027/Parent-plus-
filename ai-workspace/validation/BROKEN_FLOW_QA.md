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
- PAR-10: Parent invitation requires an explicit child target; create a different child without losing code; correct target persists after save/reload; no automatic invitation claim on profile creation. Initial browser RED observed; affected browser suite25/25PASS; final source review and CI PASS.
- PAR-11: approved academyA feedback stays visible while academyB is pending; no B feedback until separate approval. Initial browser RED observed; affected browser suite25/25PASS; final source review and CI PASS.

Independent implementation/review roles and exact commit/CI results are recorded below. Browser fixtures are not live email/API acceptance. Existing real recovery-email and physical-device checks remain open; privately stored records in the reported account have not been read or changed.

Owner clarified that they are not sure whether the unexpected feedback concerns another child in their family or an unrecognized child. Treat the existing live mapping as a possible identity mismatch, unverified. No private account/student records were inspected, no links were changed and no absence-of-leak conclusion is established. UI repairs must not be presented as remediation of that existing mapping.

## Review and run evidence

Root implements roster; `/root/vercel_testing` implements Parent fixes/fixtures and runs browser cases; independent read-only `/root/flow_review` reviews the combined diff. Five initial missing-behaviour browser REDs were observed. Two further Parent REDs exposed frozen fields after definite rejection and invalid calendar dates; both are repaired. Exact draft/UUID is retained for uncertain saves; explicit validation/permission rejection unlocks correction. Calendar date round-trip applies before network. A new test initially expected an aria-selected attribute absent from RN-web; replaced with behavioral reload and sibling-switch isolation assertions, not weakened identity expectations.

Affected suite25/25PASS1.6minutes; the two strengthened pending/archived cases also PASS17.2seconds. Complete canonical CI PASS is recorded below. Scope: no auth/RPC/grant/SQL changes; no real mail, guardian verification send or account data operation. Batch duplicate checking is a loaded-roster UX guard, not a concurrent database uniqueness guarantee. Existing wrong live links still need a separately scoped verified review. Root remains onMM/development; no main or production promotion is authorized.

Fresh full local verification: TypeScript and472/472automated tests across38files PASS79.80seconds. No live deployment or existing account remediation is claimed.

## Final source and CI

Implementation commit`1d9d9be958edb843549933a830143afbbce3cc25`; integrated/pushed canonical source`9e2a534d46a13a05a884ac2eb234d03610562f06`. A concurrent documentation-only commit`9eccad3` was preserved by a normal merge after push rejected safely. The one developer-guide conflict retained the relocated canonical guide and the new repair note; old paths remain corrected relative redirects. Independent reviewer verified no runtime/test/SQL/script/workflow/package difference between implementation and merge, all56corrected redirect targets, and unchanged relocated metadata blobs. No force push, rebase or main promotion.

[Fresh full canonical CI44427814989](https://github.com/appsworld2027/Parent-plus-/actions/runs/44427814989) SUCCESS on9e2a534: TypeScript,472automated checks/38files,102browser cases(3.0minutes),29PostgreSQL transaction cases and web/Android exports. Local affected25/25plus strengthened2/2cases passed; local full472/472passed79.80seconds. Reviewer `/root/flow_review` found no unresolved material source findings at exact9e2a534; review was read-only, not a real-provider/account test.

Root made no main write. A final read observed main independently advanced to`74de4bbb105641fb0ea3872d32e64296e407407d` with documentation changes only; its app/test/SQL/workflow/package diff from priorf858aad is empty. This does not release these MM repairs. Existing production remains the earlier runtime, not candidate0.13.3/Parent0.3.1. Do not repeat the new UI tests against the old production and call expected missing fixes a new deployment result.

Known inherited nonblocking documentation follow-up: two prototype HTML compatibility stubs from the other session retain repo-root relative targets; their full prototype files exist under founders/prototypes and are not app runtime. No unrelated prototype rewrite is included.
