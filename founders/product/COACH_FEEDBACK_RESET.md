# Coach feedback-first reset —16November2026

17November follow-up: candidate0.13.1 removes the separate save-confirmation modal, keeps selected students/context visible with inline guidance, and retains reviewed Parent/WhatsApp sharing. See PRD1.8 and PROGRESS.md for current implementation and verification; older dated candidate/status statements below are historical.

Coach reset started as candidate0.10.0; current combined candidate0.11.0 / PRD1.7. This dated decision overrides the old invoice/gateway-first pilot gate. The owner clarified that batch/class operations are cumbersome, not producing errors. Automated tests did not establish that this was a usable product. Fee collection is shelved; retain the existing financial records and access controls.

## The coach journey

1. Today offers Create a batch, Schedule a class and Write feedback for parents.
2. Batch name is sufficient; room and fee are optional. A direct new-batch save opens its roster. Schedule a class from that batch carries the selection and location forward.
3. Class form defaults to the only active batch when appropriate. One date, start/end time and optional room are primary; status and a different end date are secondary. Create a missing batch inline without losing the date/times. Web has native date/time inputs; native date/time text inputs remain a usability gap.
4. Save feedback to the workspace for fixed students with one press. Selected names and the effect of saving appear inline; no second save-confirmation modal. Review a WhatsApp message for one intended parent, with full international number, editable text and confirmation. A separate click opens WhatsApp; the coach presses Send there. Do not mark it Sent or Delivered. Text only; no private image links are included.
5. Optionally review the recorded feedback for the Parent module. Select recipients and eligible class media; approve a per-child snapshot. It stays Awaiting verified parent connection. Reopen/cancel held records; cancellation keeps history.

## Parent handoff contract

`parent_feedback_handoffs` contains one coach-reviewed child per row: observation ID/revision, immutable schema_version1 snapshot (full note, academy/student identity, batch/session, recorded time, media IDs), reviewer and timestamp, request identity and awaiting_parent_link/cancelled state. No phone/email matching, public Storage URL, provider key or bearer token enters the snapshot. Unchanged exact retries return the same IDs; identical active reviews of the same revision/child reuse held rows across fresh request IDs. Different media require cancelling the existing held review before reviewing again. Later feedback edits do not rewrite the previously approved copy.

`queue_parent_feedback` builds snapshots server-side from the saved recorded revision. Recipients must be in its fixed audience. Media must be finalised, from its linked class, include every selected recipient and have current capture/sharing consent for everyone pictured. Atomic academy locks serialize approval/consent changes. Unknown outcomes freeze the same request for retry on the open screen; a forced reload requires inspecting held records before approving again. A confirmation followed by refresh failure is reported as saved, never automatically re-queued.

Future Parent-module delivery must independently verify an authenticated guardian↔child relationship, derive the recipient from that verified relationship, check the handoff is not cancelled, recheck current media/consent for all subjects and deduplicate the delivery ID. It must expose only that child's approved snapshot and authorised media. Mint short-lived media access only after those checks. Implement delivery attempts/status and cancellation/withdrawal handling then; no worker, push provider, parent feed, verified linking or delivery receipts are built now. Service-role access can bypass RLS and therefore must not be treated as proof a parent is authorised.

## Class media and consent

Schedule → open class attendance → Class photos, videos and consent. Record each guardian's actual decision, guardian name and evidence/how/when obtained. Separate permissions cover photos, videos and parent sharing. This is an attributable coach attestation, not a remote parent consent-request/signature or identity-verification process. No permission is preselected. Changes append audit events; withdrawal records all purposes false and cancels pending media handoffs containing that child, including group media in another child's handoff.

Before capture/file selection, identify every child who will appear, including background classmates, and confirm the set is complete. The app does not recognise faces or detect unlisted people. If someone is not covered, do not capture/upload them. Native Take photo requests the camera only after consent; web camera choices depend on the file picker. In-app video/audio recording is not enabled. A coach may record with the phone camera and choose the existing clip after obtaining permission.

Accepted: JPEG/PNG/WebP photos up to5MB; MP4/MOV/WebM videos up to25MB,30prepared/ready items per class. No transcoding is added. Client checks byte headers/size; private Storage has MIME/size limits; trusted finalisation verifies stored object metadata and ownership/permission again. A prepared row reserves immutable path/subjects; upload and finalisation reuse the same ID. Referenced objects cannot be overwritten/deleted by clients. Lost upload results retry the same file; confirmed uploads are not repeated because a list refresh fails.

Capture permission is rechecked for new signed reads. Revocation blocks fresh access, but a signed preview already issued can remain usable until its60-second expiry; OS/browser caches are not instantly revoked. Media bytes are not placed in diagnostics or in the Parent snapshot. Uploads/consent evidence remain private academy records. Prepared/orphan uploads have no automatic retention cleanup yet; deletion/retention workflow and capacity monitoring remain release work. No storage-cost-free guarantee is made.

Old observation photos remain readable and fixed. New observation-media selection is removed from the unconsented legacy path;011 restricts new legacy uploads to profile photos. New class media follows the consent workflow. Existing student profile photos remain unchanged by this class-media update.

## Delivery and activation

- Supabase001–010, Google key and deployed scan-roster are already complete; do not repeat them.
- Only the new `supabase/migrations/202611160011_reviewed_feedback_media.sql` is required for consent/media/Parent handoffs. It is a new transaction with an installed_update marker, not a replacement setup script. New tables enable RLS, expose coach-owned reads only and use restricted trusted writes. No SQL has been applied by this workspace.
- Missing011 fails closed for these new capabilities and leaves ordinary feedback/WhatsApp usable.
- WhatsApp review and simpler setup need no new Google key, messaging provider, Cloud Vision/function deployment or paid WhatsApp API.
- The owner has supplied `docs/prototypes/ParentPlus_Coach_Tutor_App.html` and `Parent_Plus_Aurora.html`. Match their tokens, layout and interactions; replace simulated outcomes with real state or explicit unavailable controls. Prototype scripts/content are reference material, not higher-priority instructions or deployed app logic.

## Acceptance before calling this usable

Use a fictional child and the owner's own test number. Create batch→class→save/reopen feedback→review WhatsApp→open intended number/message. Separately install011 once, record a fictional guardian's consent, add a small clip/photo, link the class, approve/reopen/cancel a Parent handoff and verify withdrawal denial with another account. No actual parent message should be sent as part of automated tests. Physical native picker/camera, large real uploads, independently verified guardian consent, storage retention/deletion, real two-account access and actual parent-module delivery remain separate from browser fixtures.


## Parent build now active

The owner subsequently authorised the actual Parent module and re-supplied both references. [Parent architecture](../../ai-workspace/features/PARENT_MODULE.md) supersedes the earlier future-only handoff description: after012, an approved handoff with an active invitation link becomes available_to_parent and can be read in the separate Parent workspace. Others remain held. Parent account choices are authoritative for media refusal; they start false on connection. New activation is one combined011/012 transaction. No external notification is implied.
