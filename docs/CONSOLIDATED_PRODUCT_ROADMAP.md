# Consolidated product roadmap and source inventory

Status: integration planning, 17 November 2026. This inventory preserves all 58 source catalogue requirements; inclusion does not mean implemented, approved for release, or tested in MM. Canonical destination acceptance remains in `PRD.md`, `docs/PARENT_PRD.md`, and the multi-workspace contracts. Source snapshot: `380adba9f73b3021a787dff72074df57f2a53634`; destination baseline: `d3b1d68244e4678fd0aeb71280806428c2c656a0`.

## Recommended sequence

### Shared product strategy

Serve parents and independent coaches/academies through one account system with distinct private workspaces. The primary useful loop is: Coach creates a class and enrols a student → Parent establishes an explicitly approved child connection → Coach records attendance and reviews a child-specific update → Parent sees the permitted result. Private family plans and memories remain the Parent's own data. Employer/academy roles do not expose a person's other affiliations or private family space.

Retain MM's mobile-first Expo implementation and its reviewed-feedback/consent controls. Adopt AM's child-scoped attendance visibility, report-only signals, explicit enrolment lifecycle and requirement/evidence discipline through destination-native design. Broader AI, discovery, notification delivery and payments remain distinct features with their own acceptance and provider gates. A stored reminder is not a delivered notification; a guardian contact is not an authenticated guardian; a passing fixture is not real-provider acceptance.

The first acceptance outcome is a complete Coach-to-Parent loop through ordinary verified accounts with save/reopen/retry and wrong-account denial, followed by mobile/device acceptance. Do not assign a launch date, capacity or adoption target without measured evidence. Product metrics to define and measure during that pilot are completion of the connection/class/update loop, failed saves and recovery, time to first permitted Parent update, and support incidents; no analytics collection is installed by this document.

1. Preserve existing Coach and Aurora Parent journeys, verified guardian approval and consent. Retain MM migration history 001–014.
2. Complete destination authorization foundation F2 and its permission/compatibility gates before activating multi-workspace access; F1 remains an isolated candidate.
3. Design and implement the Parent attendance projection and report-only signals against destination links and session records. Preserve source semantics and add destination authorization and recovery tests.
4. Integrate remaining source-only capabilities in small reviewed slices. Gate real notifications, AI, payments and guardian expansion on their provider/privacy decisions and acceptance evidence.

## Catalogue preservation

The source status text below is historical catalogue evidence. Newer source checkpoint sections supersede stale rows for attendance/Today/signals. In particular source PR #7 implements parent attendance and reports; source's generic feature register predates it. No row below is a claim of MM implementation.

| Source ID | Requirement | Original priority | Integration disposition |
| --- | --- | --- | --- |
| M2-01 | Batches and recurring schedule | P0 | MM dated sessions exist; source recurrence requires separate reviewed transfer |
| M2-02 | Guardians and multi-child families | P0 | MM private family children exist; multi-guardian authority remains blocked |
| M2-03 | Enrolment lifecycle (trial, active, paused, left) | P1 | Source has a versioned lifecycle; trial remains unimplemented catalogue intent. Adopt through compatible destination enrolments (C07). |
| M2-04 | Next-class reminder (auto-drafted) | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-05 | Schedule changes (cancel, restore, move, extra class, holiday) | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-06 | Parent quick signals (running late, missing today, dropped off) | P0 | Adopt source report-only signals through a destination-native API after authorization design |
| M2-07 | Holiday and break calendar | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-08 | Rain check for outdoor classes | P2 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-52 | Family calendar sync and clash flags | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-09 | Fast attendance with smart defaults | P0 | Combine Coach attendance semantics; Parent projection requires destination-native implementation |
| M2-10 | Auto-attendance from signals (suggest, coach confirms) | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-11 | Safe drop-off and pick-up log | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-12 | Attendance patterns and drop-out alerts | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-13 | Auto-drafted class update (from the session plan) | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-14 | Voice-to-update (speak, don't type) | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-15 | Photo captions from the session plan | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-16 | AI polish and parent preview | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-17 | End-of-day review queue | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-47 | Try-at-home activity | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-18 | Spotlight rotation (who to observe today) | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-19 | Quick child observations | P0 | MM observation editor/model and reviewed feedback; retain destination implementation |
| M2-20 | AI-written personal note for each parent | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-21 | Child progress timeline | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-22 | Focus and growth-area patterns | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-23 | Monthly progress report | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-24 | Parent reactions and check-ins | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-49 | Student directory and child snapshot | P0 | MM roster/student profile exists; preserve destination IDs and views |
| M2-25 | Consent manager (per child, per media type) | P0 | MM class-media consent and guardian permission flows; retain destination implementation |
| M2-26 | Quick capture during class | P0 | MM class media capture; preserve current consent gates |
| M2-27 | Tag children and share safely | P0 | MM reviewed per-child feedback/media; preserve all-subject checks |
| M2-28 | 'Then and now' comparisons | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-29 | Memory book | P1 | MM private family moments; compare richer media-book scope later |
| M2-30 | Media storage and retention rules | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-48 | Milestone moments ('firsts') | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-31 | Fee plans and automatic dues | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-32 | Fee tracker and earnings view | P0 | MM manual fee records exist; fee collection remains shelved |
| M2-33 | Pay by UPI link or QR (no fees) | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-34 | Gentle reminder ladder (professional, not greedy) | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-35 | Digital receipts and fee statements | P0 | MM manual receipt/history exists; do not imply payment gateway |
| M2-36 | Fair adjustments and make-up credits | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-37 | Prefill-and-approve engine (AI drafting) | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-38 | Privacy-safe AI (names removed before sending) | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-39 | Parent message helper (AI inbox) | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-40 | Notification engine and channels | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-41 | Coach 'Today' and 'Needs you' list | P0 | MM real-record Today/classes exist; compare richer Needs you later |
| M2-50 | Class announcements | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-51 | Parent messaging with quick replies | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-42 | Offline capture and sync | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-43 | Child safety and health notes | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-44 | Academy accounts, rooms and staff roles | P1 | MM multi-workspace F1 candidate/F2–F5 planned; no live staff roles claimed |
| M2-45 | Free-tier stack with swappable adapters | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-46 | Event bus and links to other modules | P0 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-58 | Typed parent items (UI-agnostic delivery contract) | P0 | Source typed-item reader/fallback concept; design compatibility with MM reviewed feed |
| M2-53 | Trial requests: accept, suggest a time, enrol | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-54 | Listing and live availability | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-55 | Featured placement in Explore | P2 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-56 | Coach insights | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |
| M2-57 | Coach plan and billing | P1 | Catalogue intent; no complete Source implementation found in the code audit. Retain the requirement; see system comparison for partial Destination features and release gates. |

## Evidence and gaps

AM branch implementation update: `PARENT_ATTENDANCE_INTEGRATION.md` records the isolated Parent attendance projection, staging-only API, account-checked service and development/test native panel. Local SQL/contract and browser tests pass; production defaults off and no live SQL was applied. Source signals, weekly facts, complete scenario coverage and staging/provider/device acceptance remain unfinished.

This is a complete source catalogue inventory, not exhaustive code or edge-case coverage. Destination evidence entrypoints: `PROGRESS.md`, `docs/VALIDATION.md`, `docs/MULTI_WORKSPACE_VALIDATION.md`, `tests/`, and `e2e/`. Source evidence entrypoints at the pinned snapshot: `docs/BUILD_PROGRESS.md`, `docs/QUALITY_EVIDENCE.md`, `quality/requirements.json`, and `docs/quality/2026-11-10-parent-attendance-checkpoint.md`.

Missing before full consolidation can be accepted: exact cross-repository scenario-to-test mapping; full schema/function/grant comparison; destination-native feature implementation; isolated migration/rollback and concurrency verification; real Supabase staging/provider acceptance; branch-protection configuration and validation; source connection cleanup. Vercel and GitLab remain deferred by owner instruction. Existing destination product/privacy decisions take precedence over historical source catalogue priorities.

Code audit refresh, 17 November 2026: [system comparison sections 5–8](PARENTPLUS_SYSTEM_COMPARISON.md#5-code-gap-audit--refreshed-17-november-2026) classify implemented Source behavior, Destination equivalents/candidates, Destination-only preservation and common backlog. The 58 rows preserve requirements, not 58 delivered Source features. The latest acceptance/test procedure is Developer Guide section 10.
