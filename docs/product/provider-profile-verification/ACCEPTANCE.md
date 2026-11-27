# Feature Contract: Provider profile and verification (C1.2)

Status: APPROVED by founder in chat on 2026-11-27 ("Approved"), both contracts as drafted, including the C1.3 reading of D-03 (private publish). Recorded by Claude; not a GitHub /approve. First admin still to be named. No tests or code exist. Founder decision D-02: an admin approves by hand, needing one photo ID and one qualification. Source note: the founder's context file "C1 Onboarding and verification" (features 1.2-F1, 1.2-F2) was not in the repository; criteria are derived from the checkpoint and D-02. Roadmap: C1.2

## Why
Parents will trust a coach only if a real person has checked who they are. The coach fills in a profile, submits two documents, and an admin approves or rejects by hand.

## In / Out
- In: provider profile, document upload, submit for review, admin decision, status, resubmission, privacy of documents.
- Out: automated or third-party ID checks, payments, public visibility (D-03, see C1.3), email delivery (parked).

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| PV-01 | a signed-in, email-verified coach | opens Profile | a form for name, phone, bio, sport(s), experience shows, status "Not submitted" |
| PV-02 | required fields are empty or invalid | coach taps Save | nothing saves, the field errors show, entries stay |
| PV-03 | valid fields | coach taps Save | the profile persists after reload and on another device |
| PV-04 | profile saved | coach adds one photo ID and one qualification (JPG, PNG or PDF, up to 5 MB each) | both show as attached with file names |
| PV-05 | a wrong type, oversize or empty file | coach attaches it | it is refused with a clear message; nothing is stored |
| PV-06 | profile incomplete or either document missing | coach taps Submit for review | submit is refused and says what is missing |
| PV-07 | profile complete with both documents | coach taps Submit for review | status becomes "Pending review" and fields and documents lock |
| PV-08 | status is Pending | admin opens the review queue | sees the profile and both documents, and can Approve or Reject (reject needs a reason) |
| PV-09 | admin approves | coach reopens the app | status shows "Verified", with the approval date |
| PV-10 | admin rejects with a reason | coach reopens the app | status shows "Rejected" with the reason, and can edit and resubmit |
| PV-11 | any user who is not the owning coach or an admin | tries to read or download the profile documents | access is denied; document links are private and short-lived |
| PV-12 | a coach, not an admin | tries to approve their own or anyone's profile (UI or direct API call) | refused; status unchanged; every decision records who and when |

## Agents may decide alone
Form layout, file-storage mechanics, how the admin role is represented.

## Must ask the founder if
Who the first admin is, or if document storage needs a paid service or new hosted setting.

## Tests
Locked tests: e2e/acceptance/provider-profile-verification.spec.ts, plus a disposable-database test for PV-11/PV-12. Hosted-project storage setup is founder-gated and reported NOT RUN until done.
