# Class feedback to Parent — same-login web journey

Published shared version0.12.0 / Parent0.2.0. Uses already installed database001–013; no SQL update, new provider or credential is required. There is no automatic external message or device push.

## Coach journey

1. Sign in to Coach with the existing verified Supabase account. A new Coach completes academy setup; then creates a batch, student and dated class if absent.
2. Today → open the class → mark attendance → Save attendance to class.
3. Write feedback for this class opens a draft carrying the class, batch and present/late students. Choose an individual student or review the selected group. Write the feedback.
4. Save feedback → Confirm save records the note privately. This alone does not publish it to Parent.
5. Review and share to Parent shows the saved text/revision, named recipients and optional consented media. Confirm the review checkbox, then Share approved feedback to Parent.
6. Per-child status shows either available in Parent or awaiting an explicit parent connection. Cancellation retains history and revokes feed access under existing database rules.

## Open the Parent result with the same account

For a shared child, press “Open [child]’s update in Parent”. This reads active links through the authenticated API before navigation.

- If this account already owns the connection, open Parent with that family child selected and highlight the shared snapshot. The selected child is remembered for this account/family in the current tab so refreshing does not switch to a sibling.
- If no parent is connected, issue the existing single-use invitation, keep it in this tab’s account-scoped session storage and open /parent. No invitation is put in a URL or referrer.
- Missing family/child profiles get a visible setup guide. Create the family, add a child, then Connect child and view update. Choose the family child from the dropdown, review the Coach/student identity, tick “This is the right coach and child”, and confirm. No name/phone auto-match or automatic family creation occurs.
- After successful claim and refreshed data, select the linked child and highlight “Your shared class update”. Only reviewed feedback is returned by the Parent feed; siblings remain separate. Clear the pending invitation after connection.
- A student already connected to another parent account cannot be opened or reassigned by this shortcut. That parent signs in with their own credentials. Coach can still issue ordinary private invitations from student profiles for unconnected students.

## Authentication and failure handling

Coach and Parent use the same verified Supabase session in the same browser tab. The Parent module skips academy onboarding. New accounts retain normal email verification, sign-in and recovery; selecting a role grants no permissions. Existing authentication/RLS and invitation claim functions determine ownership on the server.

The navigation intent is owner-scoped, expires within48hours, is rejected on account mismatch/malformed data, and is cleared on sign-out. The separate selected-child preference is also cleared on sign-out and is accepted only for an active child returned by the owned family query. It is a convenience hint, never evidence of guardian authority. Reloading during family setup preserves the guide while the same account remains signed in. An explicit sign-out clears that pending setup; reopen the saved Coach review to restart it.

A shared synchronous lock prevents simultaneous Open/Review/Cancel actions from replacing an in-flight intent. Approval unknown-outcome retries retain the same request. If approval succeeded but refresh failed, refresh saved status before doing anything else. Claim retries use existing database idempotency. Failed post-claim refresh keeps the pending guide until refreshed server links confirm success.

Class photos/videos still need current purpose-specific permission for every pictured child; first connection defaults media permission to deny. Text-only feedback needs no photo/video consent. WhatsApp remains a separate reviewed handoff requiring the user to press Send in WhatsApp.

## Verification boundary

Automated browser tests use fictional transport, not real contacts or messages. Real PostgreSQL tests exercise one account owning both profiles, explicit claim, approved feed visibility and unrelated-account denial. Owner live acceptance must still save and reopen a class update with their own account on Vercel. No private signed-in owner session is available in the development workspace, so live receipt is never inferred from fixture passes.

## Intended guardian and child identity — not yet guaranteed

Current Auth verifies account access, and claim verifies possession of a valid student-specific invitation plus ownership of the selected family child. It does not bind the invitation to the saved guardian contact or independently verify the real-world child match. A forwarded valid invitation can be claimed by an unintended signed-in account. Names/phones are not automatically matched, but explicit self-confirmation is not proof either.

Required before real-parent rollout: bind invitation to an intended verified guardian contact (verified email can reuse current Auth; phone OTP needs separate provider configuration), require Coach approval of the proposed child match, and release held feedback only after approval. These requirements are documented, not implemented. Existing same-login navigation is for the authorised test journey and must not be represented as guardian identity verification.

Published automated evidence: [CLASS_PARENT_HOSTED_QA.md](CLASS_PARENT_HOSTED_QA.md). Owner live save/reopen/receipt remains a distinct next step.
