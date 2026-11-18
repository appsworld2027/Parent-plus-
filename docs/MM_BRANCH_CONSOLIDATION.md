# MM branch consolidation and regression evidence

18 November2026. Owner explicitly requests one MM branch, complete regression verification before cleanup, and deletion of other merged MM branches. New feature development remains paused. Canonical branch: [`MM/development`](https://github.com/appsworld2027/Parent-plus-/tree/MM/development). This is maintenance, not a main release, provider change or Supabase activation.

## Baseline and integration

Frozen main: `f858aad85577c1e49ae24f06ba260778ecb83ddd`. Eight existing remote MM names and ten local MM names were inventoried (18refs; two names local-only). Every recorded tip is an ancestor of that baseline, with zero commits outside it. The canonical MM branch starts from that saved history. Explicit integration of all ten tips reports Already up to date; no content conflict exists and no artificial merge/history rewrite is needed. All application/source/assets/tests/database files remain byte-for-byte equal to the baseline. Only current branch instructions/navigation, this report/inventory and the existing CI branch trigger are updated.

main, AM/consolidated, codex/coach-foundation and build-status are preserved. AM's open PR15 is not part of this operation. Existing production remains unchanged; routine automatic branch previews are separate from promotion. No application files or worktrees will be removed. No additional schema scripts are supplied or run.

## Original tips

The [machine-readable inventory](consolidation/mm-branches-20261118.json) preserves exact local/remote refs and backup metadata. Old remote refs already missing during the initial fetch are not claimed as deleted by this task.

| Old MM branch | Exact tip | Initial location | Preservation |
| --- | --- | --- | --- |
| `MM/feedback-save-flow-20261117` | `2b7cab57d3aab8b2fc58878e5cc2e6c4755f3a38` | local + remote | contained;0unique commits |
| `MM/learning-context-20261118` | `d3b1d459c9dcbe367e137e9975761c3213de9205` | local + remote | contained;0unique commits |
| `MM/password-recovery-20261117` | `5e18c750aef5646685d0452b8517e0d5452fb846` | local + remote | contained;0unique commits |
| `MM/promote-all-work-to-main-20261117` | `206b86b8c1778beeccdc1f7f394c28d441d80b13` | local only; remote already absent before cleanup | contained;0unique commits |
| `MM/vercel-public-entry-20261117` | `778a09d7059129bdc8e41a0b9df11f1f0eab24a0` | local + remote | contained;0unique commits |
| `MM/workspace-attendance-20261117` | `c211b72b1f593b08a8c0cd00f880c0834080697e` | local + remote | contained;0unique commits |
| `MM/workspace-authorization-kernel-20261117` | `4769d006265395559b50990ece437c544cdf6c2d` | local only; remote already absent before cleanup | contained;0unique commits |
| `MM/workspace-feedback-20261117` | `14dbda0a5b204ec2a4b1728c9d4fd5f1b2a762be` | local + remote | contained;0unique commits |
| `MM/workspace-roster-transactions-20261117` | `a1f290c8030b1e90d2483bc8aa9560d9140cfb02` | local + remote | contained;0unique commits |
| `MM/workspace-staff-lifecycle-20261117` | `ff799057cd99878c85b3993b30907104250a6648` | local + remote | contained;0unique commits |

## Recovery backup

Verified standalone Git bundle: `/workspace/ParentPlus-MM-backups/20261118-mm-before-cleanup.bundle`; 4,647,335bytes. SHA256 `44baaa515c2549304dc5a1a9e7357e8b8e47ad3bbf298595e5ae84009d7440cc`. It includes all18originalMMrefs plus the canonical baseline and passes `git bundle verify`. This workspace artifact may not survive environment replacement, so the pushed canonical history and a separately pushed annotated backup tag must also preserve every original tip before remote deletion. The inventory allows restoring any old name with its exact tip without reverting the canonical branch.

## Required checks before deletion

| Check | Expected result | Actual outcome |
| --- | --- | --- |
| Current source scope | No app/source/test/database/asset changes versus frozen baseline | PASS initial comparison; final check pending |
| TypeScript/full automated suite | All current cases pass | NOT RUN for this consolidation |
| Full browser regression | All95current fixture cases pass | NOT RUN for this consolidation |
| Actual PostgreSQL transaction suite | All29cases pass in fictional isolated database | NOT RUN for this consolidation |
| Web and Android exports | Both succeed | NOT RUN for this consolidation |
| Existing public Vercel app | Production-compatible fixture suite, phone/desktop entry/recovery smoke and source/bundle identity;0real sends/writes | NOT RUN for this consolidation |
| Independent review | Exact canonical commit, ancestry and full backup/ref mapping validated | Containment audit PASS; final review pending |
| Remote main/other-owner refs | Same as initial snapshot immediately before/after cleanup | Final verification pending |
| Branch retirement | Canonical+backup pushed, expected tips still contained, no open old-MM PRs; atomic SHA-leased deletion; safe local branch deletion | NOT EXECUTED |

The initial snapshot is evidence, not permission to delete a later updated tip. Re-read current refs immediately before cleanup; if any MM ref changed, preserve/integrate it and repeat relevant checks before retrying. Delete only the explicit inventoried branch names, never wildcard-delete other owners' refs. Use remote expected-SHA leases and atomic deletion. Locally use `git branch -d` only when each tip is reachable from the current canonical head. Do not force-delete an unmerged branch or discard files.

## Test boundaries

Browser suites use fictional intercepted transport, not actual email recovery, real authenticated Supabase persistence, physical Android acceptance or provider delivery. Do not claim zero possible bugs or that the previously unresolved real recovery-email journey is fixed by branch cleanup. Private015–021 remain inactive. Production data/provider settings and existing files are unchanged. Feature work stays paused after this maintenance task.
