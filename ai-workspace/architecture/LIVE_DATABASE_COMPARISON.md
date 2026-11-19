**Current delta, 19 November 2026:** MM retains the tested Parent reader migration `20261117090944` (3 functions, no new application tables). APVerse now has additive migration `20261119014723_parent_private_family_records`: `parent_family_moments`, `parent_family_todos`, `parent_family_events`, one child-owner authorization helper, three indexes and three owner-only RLS policies. Live grants were verified; no rows were copied/deleted and MM was untouched. Current APVerse inventory is 44 public application tables / 102 routines / 98 indexes / 7 policies; MM remains 25 public + 6 private tables / 55 routines / 75 indexes / 27 policies. The owner permits deletion of AM/source records only after destination behavior no longer depends on them. This is one schema slice, not feature parity: the APVerse Parent screen does not yet use the new tables. The detailed object/body comparison remains the 17 November snapshot pending a regenerated diff. See [current progress](../../PROGRESS.md#consolidation-retirement-snapshot--19-november-2026) and [Parent attendance activation evidence](../features/PARENT_ATTENDANCE_INTEGRATION.md#live-destination-activation--17-november-2026).

# Live Supabase comparison and destination gaps

Inventory baseline: 17 November 2026. Source/AM: `fmavpazczahxeusqbxuh`; destination/MM: `zcgcnycnanqkbdlwojln`. All repository work belongs on `AM/consolidated`; APVerse Git remains read-only. The separately authorized APVerse ACL migration is recorded above and no application data was moved or deleted. MM's schema, storage and app were not changed.

## Scope and limits

Earlier work compared tables/columns/constraints and function identities; it was not a full database audit. This pass captures columns/defaults, constraints, indexes, views, function signatures/result types/security/grants/body fingerprints, noninternal triggers, policies, table/column grants, installed extensions/enums/domains/sequences, managed roles, Realtime publications, bucket settings, migration registries and Edge Function metadata. Detailed table/function/policy/trigger/index scope is public, coach_private, auth and storage; extension/platform implementation schemas are not independently security-audited. Raw snapshots and exact source-only/destination-only lists are under `ai-workspace/architecture/snapshots/live-*-database-audit.json` and `live-object-differences.json`.

Function body hashes establish equality/difference, not correctness. Full semantic security review, real-provider behavior, restore tests and query-plan/load tests remain separate. Edge source was read without invoking OCR/provider APIs. Only aggregate Auth account/provider counts were read; no emails, tokens, personal account records or stored objects were exported. Auth management settings (SMTP, redirect allowlist, provider enable flags, JWT/session policy, rate limits, hook configuration and signup restrictions) are not exposed by the available connector and remain unverified in this pass. Email identity records do not prove current email provider configuration.

## Inventory

| Application objects in public + coach_private | Source | Destination |
| --- | --- | --- |
| Tables |41 (public) |31 (25 public + 6 private) |
| Columns |289 |248 |
| Constraints |236 |200 |
| Indexes (including PK/unique) |95 |75 |
| Functions (including shared platform rls_auto_enable helper) |101 |52 |
| Table triggers |4 |4 |
| RLS policies |4 |27 |
| Views |0 |3 |
| Custom business enums/domains/sequences |0/0/0 |0/0/0 |

Both have 27 managed Auth tables and 10 managed Storage tables in the inspected schemas. Including those managed tables, table totals are 78 and 68; do not confuse those with application table counts. Seven event triggers exist on each project with matching definitions. Their grant_pg_cron/pg_net handlers do not mean those extensions are installed.

### Full-schema sweep and hidden MM application objects — 17 November 2026

The inventory was repeated across every non-system schema, not only `public`. All MM application tables are in `public` and `coach_private`; no additional product tables were found in `auth`, `storage`, `realtime`, `vault`, `extensions`, `graphql`, `graphql_public` or migration schemas. The six MM `coach_private` tables are `roster_scan_usage`, `roster_imports`, `vision_scan_months`, `feedback_review_requests`, `parent_link_invites` and `schema_migrations`. The last is MM's private application migration ledger, not a product table to copy. Its 15 entries cover MM versions `001`–`014` and the standalone Parent reader. APVerse has no `coach_private` schema/tables; its 41 application tables are all in `public`.

MM also has three public views (`fee_invoice_balances`, `coach_media_consents`, `parent_feedback_feed`), 16 `coach_private` routines (15 `SECURITY DEFINER`), six Storage policies and two private buckets. These helpers and policies refer to MM's academy/student/link and object-path model, so they cannot be copied verbatim into APVerse. Its two Edge Functions are `scan-roster` and `clever-processor`; APVerse has none. Both projects have the same five installed extensions. Supabase-managed Auth, Storage, Realtime, Vault, extension and migration objects are platform infrastructure, not application schema sync targets.

MM's `coach_private` tables have RLS enabled and no direct table grants to `anon`, `authenticated` or `service_role`; some private helper functions have narrowly granted authenticated execution. Storage policies call those helpers and bind to MM's two buckets. Preserve the no-direct-table-access boundary and port each required operation only after adapting its workspace, child and guardian authority checks.

Owner branch rule: `AM/*` branches are intended to use APVerse; every non-AM branch stays on MM. The current AM app's checked-in fallback URL still points to MM while APVerse feature compatibility is incomplete. Do not switch that runtime endpoint until the APVerse adapters and complete Coach/Parent regression pass; this avoids sending the currently MM-shaped app to an incompatible schema.

Parent academic reader parity: APVerse exposes authenticated `app_parent_sessions` scoped to child + workspace and backed by active guardian/workspace-child/enrollment authority. MM uses `get_parent_attendance_sessions` over its private-family and approved-link model and aggregates across academies. A tested local adapter enumerates authorized APVerse workspaces, merges session pages globally, normalizes the shared workspace contract and preserves AP-only `excused`/`make_up` statuses. It is not wired into the app yet; AP child/private-family profile integration and remaining Coach/Parent adapters are still required before AM runtime routing can safely point at APVerse. No live child/session was read or changed during this pass.

Only `public.profiles` and `public.batches` share table names, and both differ. There are 39 source-only and 29 destination-only qualified application table names. Only `public.rls_auto_enable()` shares an application-schema function signature; 100 source-only signatures are not 100 missing product features. Many are private helpers, recovery protocols or compatibility/testing controls.

## Source table groups absent by name from the live destination

| Source-only tables | Meaning and destination action |
| --- | --- |
| workspaces; workspace_memberships | Real live capability gap: accepted multi-academy memberships and scoped staff authority. Destination has academies.owner_id plus undeployed F1/F2 candidates. Complete destination-native conversion, not table-name copying. |
| workspace_creation_controls; workspace_creation_fences; workspace_creation_receipts | Creation gating and idempotency/recovery. Port the necessary guarantees; do not import founder-testing switches as production permissions. |
| children; guardianships; parent_child_read_controls | Different child/guardian model. Destination uses family_children, parent_families, students and approved links. Retain destination IDs/private boundaries; read controls are not a reason for blind schema duplication. |
| child_creation_controls; child_creation_fences; child_creation_history; child_creation_intents | Source creation workflow controls/history/recovery. Review against destination upsert/identity/retry behavior per scenario. |
| workspace_children; connection_requests; connection_events; connection_request_receipts; family_invites | Different connection/audit model. Destination has parent_connection_requests/parent_coach_links/private invites and stronger intended-email/Coach match gate. Preserve gate; add missing two-way initiation/audit semantics deliberately. |
| courses; schedule_sessions; batch_coach_assignments; batch_coach_mutation_requests | Course model, assigned staff, recurring schedule and assignment mutation recovery. Destination uses batches/class_sessions; live courses and assignment authority are missing. |
| class_setup_begin_requests; class_setup_controls; class_setup_intent_history; class_setup_intents; class_setup_next_requests; class_setup_requests; class_setup_session_series; class_setup_workspace_versions | Source's multistep setup/weekly recurrence/versioned recovery protocol. Adopt required user outcomes and retries in Expo; do not replicate every historical workflow table without need. |
| enrollments; enrollment_events; enrollment_request_receipts | Destination enrolments has date boundaries but lacks source pending/active/paused/completed/withdrawn/cancelled state, versioned lifecycle/events/receipts. Trial is not in the observed source state CHECK either. |
| attendance_sheets; attendance_records; attendance_record_events; attendance_request_receipts | Destination attendance/class revision provides partial equivalents. Missing source-style event/receipt history must be designed against actual recovery requirements. Source allows excused/make_up; destination live CHECK permits present/late/absent only. |
| parent_signals; parent_signal_request_receipts; parent_items | Genuine live gaps: report-only signals/recovery and typed Parent items. Destination reviewed handoffs are a different contract. AM attendance API/UI is only a development candidate and is not installed live. |

## Destination-only capabilities to retain

The 29 destination-only application tables cover academies/students/contacts/enrolments/class_sessions/attendance; private families/children/events/todos/moments; observations/versions/recipients; reviewed Parent handoffs/links/approval requests/invites; class media/photo/consent; invoices/payments/reversals; OCR import/quota and custom migration tracking. Full qualified names are in the exact-difference JSON. Source does not supply replacement implementations for those destination features.

Source batches has workspace_id, course_id, created_by and creation_request_id. Destination batches has academy_id, room, monthly_fee_paise, archived_at and created_at. Source profiles allows a null display_name and has updated_at; destination requires display_name and has no updated_at. Equal names are not compatible definitions.

## Auth and login

Both share the inspected Supabase-managed Auth table names and 12 managed enum definitions/labels. Aggregate snapshot: source 5 accounts / 5 email identities; destination 4 accounts / 4 email identities; all observed accounts have confirmed email, none are anonymous or soft-deleted. Counts do not establish that accounts represent distinct people or should be merged.

Source has `auth.users.on_auth_user_created` → `public.handle_new_auth_user()`, inserting a profiles row with ID only. Destination has no auth.users trigger; `create_academy()` upserts the profile/display name during onboarding. Absence of this trigger does not mean Auth signup is missing. Copying the source hook unchanged would conflict with destination's non-null display_name. Define a unified profile lifecycle before implementing an equivalent.

Repository evidence: source uses email OTP and founder-test controls; destination uses email/password, verification and PKCE recovery. Provider objects are not login UX. Keep destination Auth IDs and working login; never import dummy OTP into real usage or automatically merge users by email/name.

Supabase advisors currently report leaked-password protection disabled on both. Relevant remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . This is especially relevant to destination password login. Other current Auth settings require a supported read of management configuration or owner inspection; no values/secrets should be pasted into chat.

## Functions, triggers and indexes

All exact function identities, grants and MD5 body fingerprints are captured in the snapshots. Source-only API families include create_workspace, app_begin/complete/recover class setup, app_issue/accept_family_invite, app_save/change_enrollment, app_attendance_sheet/save/request_status, app_parent_sessions/attendance_week/items, app_send_parent_signal/request_status and app_session_parent_signals. Destination has its own save_student/profile/class/attendance, observation/review, guardian approval, consent/media, ledger and OCR functions. This is contract-level redesign, not a missing-function installation script.

Source application triggers:
- child_creation_intents.archive_child_creation_intent
- workspaces.workspace_creation_tombstone
- workspaces.guard_fenced_workspace_creation
- schedule_sessions.attendance_session_lifecycle

Destination application triggers:
- academies.validate_academy_timezone
- parent_families.parent_family_timezone
- parent_feedback_handoffs.publish_linked_parent_feedback
- family_children.linked_child_archive

These 4 + 4 triggers implement different lifecycles. Source's additional Auth profile trigger is the managed-schema difference described above. Both have the same 7 event-trigger definitions.

Source 95 indexes versus destination 75 includes indexes created by PK/unique constraints.93 source index names are absent in destination;73 destination names are absent in source. This is not evidence that 93 indexes should be added. Source indexes reference absent entities (workspace/enrolment receipts/signals/items) and must be translated after schema design. Exact definitions are retained in JSON. Source has 27 and destination 23 indexes not named by captured constraints; this is an inventory classification, not a performance verdict.

Performance advisors report 46 source and 56 destination unindexed-FK findings, plus 10 and 3 unused-index findings respectively. Destination additionally has 3 auth-RLS-initplan and 2 multiple-permissive-policy warnings. Verify workload/query plans and foreign-key locking costs before adding/removing indexes; unused statistics alone do not justify deletion.

## RLS, grants and privileged functions

All application tables in both snapshots have RLS enabled. Source has 4 policies on 3 public tables; much of its API uses privileged checked functions with direct client grants restricted. Destination has 27 application policies plus 6 Storage policies; private tables have no client grants. More policies is not automatically better protection.

The earlier anonymous security-definer advisory for APVerse's `rls_auto_enable` was cleared by revoking client execution; current advisors report no anonymous-definer finding. Authenticated security-definer advisories report 40 APVerse / 31 MM findings; 38 / 6 RLS-enabled tables lack policies. Treat these as per-object authorization-review items, not proof of exploitable access from counts alone. Documentation: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable .

Source 38 and destination 6 RLS-without-policy advisories largely correspond to private/RPC-only tables; combine policy inspection with effective grants. Source 4 policies and destination 27 are not portable substitutes. No policy/grant was changed by this inspection.

## Edge Functions, Storage and Realtime

Source has 0 deployed Edge Functions and 0 Storage buckets. Destination has 2 active functions:
- scan-roster v2, verify_jwt=false. Retrieved code manually calls /auth/v1/user, checks the requested academy against that caller's ownership, then uses server-side quota/provider credentials. Gateway setting alone does not establish an unauthenticated OCR bypass.
- clever-processor v1, verify_jwt=true. Retrieved source files are byte-identical to scan-roster; this appears to be a duplicate deployment. Determine callers/operational purpose before retiring it; do not delete on name alone.

Destination private buckets are parentplus-coach-photos (5MB; JPEG/PNG/WebP) and parentplus-class-media (25MB; image/video types). Destination 6 Storage policies implement owner/approved-media paths. No source Edge Function/bucket is missing in destination. We did not invoke a provider, inspect secret values, download media or verify OCR delivery/quotas end to end.

Both have supabase_realtime publication but no publication tables. No source Realtime subscription table is missing. Realtime enabled at project level is not an implemented notification/push service.

## Extensions, enums and migrations

Both installed extensions match exactly:
- plpgsql 1.0
- pg_stat_statements 1.11
- uuid-ossp 1.1
- pgcrypto 1.3
- supabase_vault 0.3.1

All 12 managed enums match, including 9 Auth types, 2 Realtime types and Storage buckettype. Neither app uses a custom business PostgreSQL enum; statuses are text CHECK constraints. No custom domain or application sequence gap was found. Both have the managed Auth refresh-token sequence. No pg_cron/pg_net/pg_vector extension was observed in either installed extension list; do not install merely because an event-trigger name mentions it.

Source standard migration registry contains 53 entries. Destination's standard registry contains the Parent reader entry `20261117090944`; its separate `coach_private.schema_migrations` ledger records the earlier Coach/Parent updates. These are independent histories. Destination's F1/F2 and later Parent API candidates are not in the live table/function inventories. Standardize future migration execution/history without reapplying historical scripts or falsely marking source 001–053 as installed.

## Recommended next actions

1. Keep the destination project; preserve its Auth/resource UUIDs, approved guardian links, consent, family, media and ledger/OCR features.
2. Finish workspace/membership/assignment API+policy+Storage conversion and explicit context selection; private Git candidates are not live authority.
3. Finish destination-native courses/recurrence and enrolment lifecycle; add Parent signals/weekly facts/typed delivery with reviewed privacy/recovery rules.
4. Define profile creation/update lifecycle and reconcile source hook semantics without copying its incompatible insert.
5. Review real Auth management configuration and password protection; test real verification/recovery/session/account changes in authorized staging.
6. Review privileged functions, Storage/OCR authority, the duplicate Edge deployment and evidence-backed index improvements.
7. Rehearse exact destination migrations and restore, then seek live activation approval. Retire source connections only after data disposition and destination-only acceptance pass.

This is a much broader catalog/service comparison than the initial review. It is still not an exhaustive semantic security certification, provider-settings audit, backup verification or a completed sync.


For a readable list of all 100 source-only application function signatures and 93 index definitions, see [the exact object appendix](snapshots/live-source-only-objects.md).
