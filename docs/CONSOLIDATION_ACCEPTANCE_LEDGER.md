# Consolidation acceptance ledger

Status: OPEN, 17 November 2026. This is the completion audit for the Master Mission and Addendum, not a completion certificate. Work continues only on `AM/consolidated` until the owner authorizes other merges. Source remains read-only; live SQL/infrastructure changes require separate approval. Every acceptance row needs exact commit/environment, dated execution evidence, remaining limitations, owner acceptance and a rollback/repair reference. Never accept a row merely because its document or test filename exists.

## Master Mission final deliverables: all19 tracked

| ID / deliverable | Current state, evidence and closure requirement |
| --- | --- |
| D01 Complete source/destination audit | PARTIAL: Git review, metadata snapshots, document inventory and system comparison exist. Finish full domain/API/security/configuration inventory and unresolved access items. |
| D02 Product/engineering capability comparison | PARTIAL:58source catalogue IDs and comparison report. Each source and destination capability needs a final KEEP/ADOPT/COMBINE/REDESIGN/DEFER/DECISION disposition and acceptance evidence; source catalogue alone is insufficient. |
| D03 Architecture diagrams | PARTIAL: existing architecture docs and target relationship diagram. Reconcile diagrams with final implemented/runtime topology. |
| D04 Infrastructure inventory | PARTIAL: GitHub/Supabase refs known. Complete environments, configuration-name mapping, integration ownership and remaining external systems without secrets. |
| D05 Supabase schema comparison/migration plan | PARTIAL:41source/31destination tables, function identities, target design and private SQL tests. Finish policies/indexes/triggers/function bodies, compatibility/races/staging and exact activation/repair plan. |
| D06 Vercel comparison | DEFERRED by owner. Not completed; resume or explicitly waive before full mission closure. |
| D07 GitLab backup verification | DEFERRED by owner. A configured mirror or successful Git sync does not prove database restore. Resume or explicitly waive. |
| D08 Consolidated engineering standards | PARTIAL:Superpowers installed, shared workflow, CI/JUnit practice. Verify all adopted scripts/dependencies and required hosted checks; protect branches and record exceptions. |
| D09 Consolidated product practices | PARTIAL:shared strategy/roadmap and existing PRDs. Resolve historical contradictions and publish one current acceptance/prioritization baseline. |
| D10 AI collaboration instructions | PARTIAL:AGENTS/skills/response reference installed. Demonstrate a clean session reads current destination context and needs no source access. |
| D11 Branch ownership/synchronization | PARTIAL:AM/consolidated exists; instructions/proposal recorded. Founder protection postponed; actual two-identity enforcement is not configured. |
| D12 Migration change log | PARTIAL:Git commits and isolated integration notes. Produce final source-to-destination change/disposition log, including retired prototypes and every applied/not-applied DB artifact. |
| D13 Automated test evidence | PARTIAL:latest local335tests/35files and TypeScript passed on attendance slice. Bind required CI/browser/realPG/staging/device/security results to final reviewed head and retain downloadable artifacts. |
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
