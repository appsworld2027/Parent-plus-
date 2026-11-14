# Current owner steps

Candidate **0.6.0** implements the requested student profiles, age/proficiency, batch rosters, two-way assignment, clearer monthly fees and both kinds of photo upload. The [Vercel preview](https://parent-plus-varcel-git-codex-coach-foundation-appsworld2027.vercel.app) follows the branch; check version0.6.0 before reviewing. Publication/testing status is in [progress](../PROGRESS.md).

Existing Supabase updates001–006 are installed. Do not repeat them. The new features require only [the combined007/008 update](UPDATE_007_008.md), prepared as one transaction with two success-marker rows. This has not been applied to the live project. The coding partner will guide this one step at a time when the build is ready. No repeat anonymous-access check is needed without a relevant permission change.

After that update, use fictional records to check save/reopen, a student in two batches, a direct fee receipt, and private profile/observation photos. Automated fixture tests do not establish real database or photo-storage acceptance. Keep login credentials out of chat. Online payments, refunds and parent delivery remain inactive; manual fee recording does not move money.

Windows-emulator setup and physical-phone automation can wait. The previous0.5.0 APK and hosted test report are historical for this review.
