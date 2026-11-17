# Consolidation acceptance ledger

Status: OPEN, 17 November 2026. This is the completion audit for the Master Mission and Addendum, not a completion certificate. Work continues only on `AM/consolidated` until the owner authorizes other merges. Source remains read-only; live SQL/infrastructure changes require separate approval. Every acceptance row needs exact commit/environment, dated execution evidence, remaining limitations, owner acceptance and a rollback/repair reference. Never accept a row merely because its document or test filename exists.

## Active build/sync loop and source-retirement tracker

Owner authorization, 17 November 2026: implement Destination AM code and DB changes, branch-wise Vercel previews, logging and automated FE/DB/browser/scenario checks. Source remains read-only; other-branch merges/deletion are not authorized. This supersedes earlier read-only/live-SQL pauses for reviewed Destination changes. Use the existing ledger rather than a parallel tracker.

**Loop:** choose the highest dependency → define narrow acceptance/security scenarios → reproduce failure → implement → run deterministic checks → inspect evidence/preview/live metadata → repair failures → update this ledger → continue. GitHub runs checks on pushes; no unattended Codex author/auto-merge daemon is installed. Failure stops the gate and the agent investigates; tests must not be suppressed.

| Gate / order | Current state and closure evidence |
| --- | --- |
| R01 Automated quality foundation | LOCAL PASS: Expo lint, AM/MM push triggers, actual runtime inventory,89 regression scenarios, source/run/JUnit evidence and full348 unit/89 browser/export loop implemented. HOSTED PASS at e174c3a/run44059620662: foundation, both PG17 jobs and final gate all succeeded; downloaded artifact identities/hashes/published Git modes verified. |
| R02 Destination additive DB safety and Parent reader | INSTALLED 20261117090944: standalone approved-parent reader after 014,24focused SQL cases and real PG passed; live catalog/grants/anonymous API verified and business counts unchanged. F1/F2 not activated; real signed-in/provider/device acceptance remains in R05. |
| R03 Branch preview delivery | READY at e174c3a: exact AM preview and stable branch alias verified. Git auto-deploy author/team authorization remains pending MM action. Hosted-preview browser access is blocked by automatic review rejecting public-share creation; local/CI headless tests passed. No protection was disabled. |
| R04 Missing product/API parity | OPEN: system comparison C02–C20 and 58-item roadmap retain every disposition. Staff authorization/context, recurrence/enrolment lifecycle, weekly facts/signals/typed delivery/locales remain separate reviewed slices. No table-name copying. |
| R05 Security/provider/native acceptance | OPEN: real distinct-account Auth/Storage/OCR, consent/revocation, all public/staff paths, device lifecycle/accessibility and relevant concurrency/load gates. Unit/browser fixtures alone do not close it. |
| R06 Source data disposition | REAL DATA CONFIRMED by owner on 17 November 2026. Source has 3 workspaces, 2 children and 1 class (aggregate inspection; no child records exported to Git). These must remain usable in ParentPlus; archival-only disposal is not acceptable. Read-only identity comparison found 3 Source record owners, no shared Auth UUIDs, one verified Destination email candidate, and two placeholder example.test identities (one owns a child). Account emails were hashed/masked for comparison; no real identities or child records were committed. Verified account/guardian/academy mapping is mandatory before migration; owner confirmation for the placeholders is pending. Never auto-merge accounts by email. |
| R07 Restore and destination-only rehearsal | OPEN: prove restore and exact migration/app compatibility; clean checkout build/Coach/Parent scenarios with Source Git/Supabase inaccessible. Preserve IDs/links/consent/media/finance evidence. |
| R08 Cutover and source disconnection | BLOCKED by R01–R07. Review exact Destination release and accepted deferrals; revoke only source-specific connections, verify Destination still works, retain historical archive. Do not delete Source. |

**When Source can be decommissioned:** after R01–R07 pass with exact evidence and R08 is accepted. There is no defensible calendar date yet; missing provider/native/restore/data-disposition evidence controls the date, not the number of merged files. Further independent feature development can continue on AM after its relevant quality gates pass; it does not require premature source retirement. Vercel is back in scope; GitLab remains deferred until resumed or explicitly waived at final closure.

## Twelve delivery steps to legacy retirement

These are 12 delivery steps grouped under the eight retirement gates above, not 12 commands or 12 commits. Each includes GPT-run verification, a GitHub-verified code checkpoint, clear gaps and repeated repair loops. Source Git and Supabase become eligible for retirement only after steps 1–11 pass or their nonblocking deferrals are explicitly accepted; step 12 performs the controlled cutover. Common future features not implemented in Source need an explicit disposition, not automatic implementation to retire Source.

| Step / deliverable | Status and exit criterion |
| --- | --- |
| 1. Automated build/test/evidence foundation (R01) | BASELINE PASS:348unit/DB,89browser, lint/types/exports, real-PG jobs and hosted final gate. Latest documentation checkpoint167b3d7/run44061920410 also passed. Extend scenarios with each change; gate failure blocks progression. |
| 2. Safe Destination DB baseline and Parent read (R02) | BASELINE INSTALLED:014plus20261117090944, checked grants/record totals and real-PG replay. App UI remains opt-in; real-provider acceptance is in step9. |
| 3. Complete shared authorization (R04/R05) | OPEN: convert public RPCs, direct grants, views, Storage and OCR to accepted memberships/assignments; retain owner/guardian/consent boundaries and revocation races. |
| 4. Workspace/context selection and onboarding (R04) | OPEN: multiple academy affiliations, explicit role context, account/academy-scoped drafts/caches/in-flight requests and native navigation without leaks or lost work. |
| 5. Courses, class setup and recurring schedules (R04) | IN PROGRESS: close class-read truncation first; then destination-native courses/weekly rules and setup/retry recovery, with timezone/DST and duplicate/lost-response tests. |
| 6. Enrolment and attendance lifecycle parity (R04) | OPEN: versioned states/events/recovery and agreed extra attendance statuses; preserve current history, fee and complete-roster safeguards. |
| 7. Remaining Parent delivery parity (R04) | OPEN: weekly saved facts, report-only signals, safe typed/versioned items and accepted bilingual surfaces. Preserve reviewed feedback/media consent; reports never confirm attendance or handover. |
| 8. Migrate real Source records (R06) | BLOCKED on verified owner mapping for two placeholder accounts, one owning a child. Preserve all 3 workspaces / 2 children / 1 class; reconcile actual Source dependencies, preserve provenance/relationships and verify counts/permissions. Never auto-merge accounts by email or silently approve guardian links. |
| 9. Full security, real-provider and native acceptance (R03/R05) | OPEN: direct API/Storage attacks, real accounts/email/recovery/OCR, devices/accessibility, relevant load/index checks, preview-browser authentication and resolved/accepted security findings. Source existing tests alone are not proof. |
| 10. Migration/rollback/restore rehearsal (R07) | OPEN: reconcile actual Destination migration history, reconstruct in disposable/staging environment, test compatibility after new writes, restore backup and verify protected relationships/financial/media evidence. |
| 11. Destination-only acceptance and documentation (R07) | OPEN: clean checkout with Source Git/DB unavailable, full accepted Coach/Parent scenarios, correct network destinations, current canonical docs and every mandatory Master/Addendum deliverable accepted; address or explicitly waive deferred GitLab scope. |
| 12. Controlled final promotion and retirement (R08) | NOT READY: present the exact release, obtain applicable final merge/cutover acceptance, archive recoverably, revoke only Source-specific dependencies, verify Destination again. Keep AM-only work until another target merge is explicitly instructed. Do not delete real Source records prematurely. |

Current position: steps 1–2 establish the baseline; step 5 has an independent correctness fix in progress while steps 3–4 require the broader authorization conversion. A completed baseline is not completion of the entire feature or provider gate. No calendar retirement date is promised until remaining mapping, implementation and acceptance dependencies are measured and closed.

## Master Mission final deliverables: all19 tracked

| ID / deliverable | Current state, evidence and closure requirement |
| --- | --- |
| D01 Complete source/destination audit | PARTIAL: refreshed code/domain/API/configuration/CI comparison C01–C20 and live database catalog audit exist. Finish semantic security/provider review, scenario closure and unresolved environment/access items; inventory is not acceptance. |
| D02 Product/engineering capability comparison | PARTIAL: all 58 source catalogue IDs retained; system comparison C01–C20 now distinguishes working Source code, Destination equivalents/candidates, Destination-only preservation and common backlog. Finish exact scenario-to-test closure and final acceptance; a disposition is not delivered parity. |
| D03 Architecture diagrams | PARTIAL: existing architecture docs and target relationship diagram. Reconcile diagrams with final implemented/runtime topology. |
| D04 Infrastructure inventory | PARTIAL: GitHub/Supabase refs known. Complete environments, configuration-name mapping, integration ownership and remaining external systems without secrets. |
| D05 Supabase schema comparison/migration plan | PARTIAL:41source/31destination tables, function identities, target design and private SQL tests. Fresh live snapshots now include policies/grants/indexes/triggers/extensions/enums/function identities and body hashes. Semantic function review, compatibility/races/staging and exact activation/repair remain. |
| D06 Vercel comparison | RESUMED: owner requested branch previews. Existing Destination project/team verified; MM-authorized AM preview READY. Final code preview/headless verification and automatic AM author/team authorization remain to close. |
| D07 GitLab backup verification | DEFERRED by owner. A configured mirror or successful Git sync does not prove database restore. Resume or explicitly waive. |
| D08 Consolidated engineering standards | PARTIAL: 15 skills and existing delivery guidance plus implemented lint,437unit/DB/browser mappings, source/run/report gate, AM/MM CI and full exports. Hosted e174c3a/run44059620662 passed all4jobs; branch protection/independent review remain separate pending controls. |
| D09 Consolidated product practices | PARTIAL:shared strategy/roadmap and existing PRDs. Resolve historical contradictions and publish one current acceptance/prioritization baseline. |
| D10 AI collaboration instructions | PARTIAL: AGENTS/skills/response reference plus existing-document ownership and mandatory acceptance/test/review procedure updated. Demonstrate a clean session follows them using Destination alone; instructions are not model retraining or automatic enforcement. |
| D11 Branch ownership/synchronization | PARTIAL:AM/consolidated exists; instructions/proposal recorded. Founder protection postponed; actual two-identity enforcement is not configured. |
| D12 Migration change log | PARTIAL:Git commits and isolated integration notes. Produce final source-to-destination change/disposition log, including retired prototypes and every applied/not-applied DB artifact. |
| D13 Automated test evidence | PARTIAL:AM attendance preview passes local338tests/35 files, TypeScript,89 browser cases and web/Android exports; see PARENT_ATTENDANCE_INTEGRATION.md. Bind required hosted CI/realPG/staging/device/security results to final reviewed head and retain downloadable artifacts. |
| D14 Security review | OPEN:retain014guardianship/consent and private-kernel tests. Complete direct API/function/grant/Storage/account lifecycle review, threat/negative/race scenarios and resolve or explicitly accept findings. |
| D15 Rollback plan | PARTIAL:design explains forward repair and staged compatibility. Demonstrate backup restore and exact app/schema compatibility after new-model writes; Git revert is insufficient. |
| D16 Updated roadmap | PARTIAL:58source requirements preserved and shared strategy defined. Map destination-only features too; make implemented/planned/deferred statuses precise with release gates. |
| D17 Founder progress report | AVAILABLE for current checkpoint through comparison/ledger. Final report must name authoritative repo/branch/projects and exact remaining waivers. |
| D18 Outstanding decisions/risks | OPEN:guardian expansion/consent/retention, F2–F5 integration, provider/device/restore validation, controls and deferred services remain. Assign owner/consequence; no silent deferrals. |
| D19 Destination integration PR | HISTORICAL PRs exist and earlier scope merged; later AM-only work is not approved for another merge. Present final reviewed AM diff, checks and outstanding decisions before requesting merge approval. |

## Cross-cutting Master requirements

| Requirement group | Acceptance test |
| --- | --- |
| Sections1–3: ownership, permissions, safety and baselines | Exact original/current refs, branch history, clean/known dirty scopes, access identities, recoverable checkpoints and verified backups recorded. Source unchanged; all mutations traceable to owner authorization. |
| Sections4/6: complete discovery and classification | Every important product/data/API/workflow capability covered with actual evidence, dependencies, impact/risk and disposition. Archived prototypes do not become implementation claims. |
| Section5: service audit | Both Supabase schemas/security/configuration and Vercel/GitLab comparisons accounted for; missing permissions and explicit waivers identified. No live data/secret copied to Git. |
| Sections7–8: migration proposal and controlled implementation | Each change has source evidence, affected destination files/systems, dependencies, owner, risk, verification and repair path. Review approved scope; run applicable lint/type/unit/integration/DB/RLS/security/build/E2E/migration checks or record explicit gaps. No unused candidate claimed live. |
| Sections9–10: collaboration and knowledge | Two founder identities, branch permissions/reviews/CI enforced and tested; clean destination-only agent session works; no duplicated/conflicting active roadmap or engineering authority. |
| Sections11–13: communication and closeout | Founder-readable facts, recommendations, changes, verification and precise approval boundary; all19deliverables and their limitations reviewed. |

## Addendum stage and cleanup acceptance

| Requirement | State and closure proof |
| --- | --- |
| Stage A: discover/compare/approve | Initial approval occurred, but broad comparison remains incomplete. Record final approved scope and all later scope changes. |
| Stage B: implement/verify/review | IN PROGRESS. Local/private tests do not close public endpoint/UI/live database integration. Present final PR and exact test results before acceptance. |
| Stage C: single active destination | NOT READY. Designate one repo/shared base, one Supabase dev project, one Vercel project, one roadmap/standard/AI system; demonstrate destination-only operation. |
| Source account/tool disconnect | NOT STARTED. Inventory scoped versus account-wide connections and revoke only source-specific access after acceptance. Verify destination access survives. Record exact manual actions where tools cannot disconnect. |
| Source-specific remotes/config/credentials | OPEN. Inspect active remotes, environment names, workspace settings, Auth profiles and CI integrations; remove/replace runtime source references without deleting historical attribution. No secrets in the report. |
| Final handover | OPEN. Publish active GitHub branch, Supabase, Vercel, transfer/retain summary, passed/failed/unrun tests, AM/MM workflow, connection cleanup and important remaining work/waivers. |

## How to prove the old Git/Supabase are no longer needed

1. **Knowledge completeness:** required product decisions, acceptance criteria, source attribution, architecture and unresolved risks are accessible in the destination. Retain immutable archival copies or a verified recoverable source snapshot where needed; routine developers should not need the old Git. Do not copy all old prose into conflicting active instructions.
2. **Feature disposition completeness:** every source capability is implemented/tested, deliberately superseded or explicitly deferred/waived. A backlog entry is not migrated functionality. Destination-only features have their own preservation evidence.
3. **Data disposition completeness:** inventory source Auth users, storage and business records using authorized aggregate/sanitized evidence. Decide whether source holds only disposable test data or records that must migrate. Schema comparison does not establish data disposition. If migration is required, prove consent/identity mapping, stable references, row totals and protected access; never auto-merge accounts by email/name.
4. **Destination-only rehearsal:** from a clean checkout, install/build/test with source Git/Supabase unavailable. Run ordinary verified Coach/Parent/academy journeys, negative API/Storage tests and migration reconstruction. Capture network destinations safely; prove runtime URLs and Auth/API/Storage connections point only to destination projects. Historical documentation links do not count as runtime dependency.
5. **Restore and integration proof:** restore a destination backup, test critical journeys and confirm CI/build/integration settings and provider identity work. Verify destination Auth IDs, family links, consent/media, receipts and finance totals after rehearsal.
6. **Accepted cutover:** owner accepts the exact release/environment and waivers, then source-specific connections are revoked/restricted and rechecked. Keep old repositories/projects as inactive historical references; do not delete them. Recheck destination after revocation. Revoke no account-wide connection blindly.

**Completion rule:** report full mission COMPLETE only when all mandatory rows are accepted with evidence and no blocking gaps, and all deferred items are either completed or explicitly waived. Report a narrower GitHub/Supabase milestone separately if Vercel/GitLab remain deferred. No arbitrary completion percentage is used.
