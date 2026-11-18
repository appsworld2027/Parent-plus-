# Coach workflow correction — 0.6.0

The owner reviewed0.5.0 and rejected its batch-edit-only and invoice-first journeys. The original saved plan calls for managing teaching groups and tracking fees; it does not justify hiding rosters or making invoice paperwork the main fee task. The notes name `ParentPlus_Coach_Tutor_App.html`, but that file is absent from the checkout/history. This revision follows the available original product notes and the owner's explicit feedback; exact visual parity with the missing HTML is not claimed.

| Coach task | 0.6.0 behavior |
| --- | --- |
| Open a student | A dedicated profile shows photo, age, proficiency, guardian details and enrolled batches, with Edit details and Add batch actions. |
| Add a student | Choose multiple existing batches; create a batch inside the form without losing student inputs; the new batch is automatically selected. |
| Open a batch | See its actual current student roster and count, location and monthly default fee. |
| Add students later | Select existing students from that batch page, or create a new student with the batch already selected. Membership-only writes preserve student/contact data and other batches. |
| Understand fees | Open monthly distinct-student, collected, pending and expected totals, then batch cards, then individual student fee rows and pending/paid filters. |
| Record a payment | Start from the student's row. A trusted monthly charge is created only if needed, atomically with the receipt; invoice creation is not a prerequisite. Existing charge snapshots and corrections remain intact. |
| Student profile photo | Add/replace/remove a private profile photo; choosing a photo can save a valid new profile automatically. Thumbnails load in the student and batch rosters. |
| Observation photo | Attach one private photo to a saved draft; choosing a photo saves the valid draft automatically. Recording locks that photo with the fixed audience. |

## Fee definitions

The selected month is a billing period. Collected means real-mode unreversed receipts credited to that period, not a cashbook grouped by receipt date. Pending includes eligible enrolments whose charge has not yet been issued. Expected uses current defaults for unissued fees and immutable amounts for issued charges. A voided charge is not automatically recreated as debt. Students are distinct across the overall view; a student in two batches contributes each batch fee. Existing archived-student charges remain visible for settlement, labelled archived. Test-mode receipts remain excluded. The receipt transaction validates current amount/balance/ownership on the server and persists an exact request locally before sending it.

## Photo protection and limits

Only selected JPEG/PNG/WebP images up to5MB are accepted; the byte signature is checked before upload. Expo's image library picker is image-only, with camera and microphone permissions disabled in configuration. The bucket is private, object insertion/read/deletion is academy/record scoped, objects cannot be overwritten, and photo metadata cannot be written directly by app clients. A metadata foreign key and row/key locks protect references during concurrent attach/delete. Signed preview URLs last60seconds. Browser/OS caching and an issued signed URL are not instantaneously revoked by signing out; no permanent public URL is generated.

Replacements use a new object path with an expected-old-path check. The client reconciles a lost attachment response before cleanup; the database prevents deleting a referenced object. Removing/replacing an object cleans up its old unreferenced object where possible. An interrupted client can leave an unreferenced private upload; automatic orphan-retention cleanup is not yet implemented. Photo content, paths, URLs and backend messages are not added to diagnostics. Recorded observation photos are immutable; a new observation is needed for different recorded media.

## Deployment

Updates007 (membership/direct collection) and008 (private photos) are prepared and tested separately from the already-installed001–006. Supply one consolidated missing-updates script after the app build is ready, not repeated setup. New private Storage byte operations, signed URLs and authenticated two-account API behavior still need acceptance on the actual project. Local Storage tests emulate metadata/RLS and do not replace that live gate. Existing histories and amounts are preserved.

The owner requests focused credit use and immediate notification if the active workspace disconnects. Reuse completed checks; do not repeat anonymous-access checks without a relevant permission/schema change. Environment status was checked after a reported ChatGPT indicator change and showed connected/running/no failure; fresh commands/tests succeeded. No cause of the intermittent client indicator was established.


## Student-profile clarification

The owner explicitly rejected hard-to-find age details, missing learning level, and cramped entry positioning. The profile is now a first-class route from both student cards and batch rosters. Student creation/editing groups student details, age, radio-based proficiency, guardian contact, batches and photo controls with consistent field spacing. Proficiency is coach-assessed (Not assessed, New learner, Beginner, Intermediate, Advanced); age is entered in whole years, not inferred from a name/photo. A birth date is not collected. The new save_student_profile operation extends the existing atomic student/contact/membership save; invalid levels or ages roll back all changes. Joining a batch from a profile uses membership-only writes. The pending007 update includes these columns/operations, so the owner still applies one consolidated007/008 update, not an extra migration.
