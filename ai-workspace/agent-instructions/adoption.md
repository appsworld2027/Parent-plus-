# Adopt shared rules without interrupting active work

AGENTS.md is versioned with the repository. A GitHub update cannot push instructions into an already-running session or an unsynchronized branch.

1. Finish or safely save current work. Do not overwrite another founder's branch or discard uncommitted changes.
2. After the documentation PR is approved and merged, fetch origin and integrate the current authorized development base into your own branch through the existing reviewed workflow. Resolve conflicts deliberately; do not force-push shared history.
3. Read root AGENTS.md and relevant nested instructions. Start a new Codex task/session or explicitly reload the updated instructions in the current session.
4. Confirm the branch includes the rules commit before claiming adoption. Continue the current feature without restarting its implementation.

Choose the development base and PR target from the current owner instructions and [shared workflow](../development/SHARED_DEVELOPMENT_WORKFLOW.md). On this branch, the current restriction is AM/consolidated only; these instructions do not authorize promotion to main or another branch. Each owner synchronizes only the authorized base into their own work. Do not bulk merge owner branches into one another. Use temporary merge checks against current remote heads before integration; a clean textual merge does not prove behavioral compatibility or guarantee future conflict freedom.

Scope of this rollout: shared instructions, founder navigation, traceable scenario rules, independent review and adoption. The separate audit in strategy step 11 is skipped. Excel generation, new automated checks and mandatory-gate rollout remain separate work. Existing checks and release approvals continue to apply.

## Documentation folder adoption

Use existing `founders/` and `ai-workspace/`; no AI-Tools folder is introduced. `docs/README.md` redirects readers to those indexes. Product decisions, requirements and prototypes live under founders; technical guides, feature contracts, database setup records, snapshots, validation evidence and plans live under ai-workspace. The [move inventory](../documentation-moves.json) maps all 98 original files to their new locations. Historical source-repository snapshot paths and hashes remain unchanged because they identify the inventoried revision.

Run `python3 scripts/check-documentation-links.py` from the repository root to validate static local document/image targets. External URLs and dynamic prototype asset expressions require separate online/runtime checks. This local helper adds no CI workflow or required merge gate.

For another branch that touches moved documentation, apply its changes to the new paths deliberately and rerun the link check. Never recreate old copies as competing sources. Compatibility checks describe the fetched revisions only; future commits can still conflict. Existing AM/consolidated feature work must be retained rather than resetting this shared branch to main.

## Branch compatibility evidence — 17 November 2026

Read-only `git merge-tree --write-tree` checks compare baseline `d32564b` and documentation commit `7d6e3b1` against fetched remote heads. No branch was merged or overwritten. Counts are Git conflict messages, not counts of application defects. Existing divergence and move-related conflicts must be resolved before integration; this is not a conflict-free cross-branch rollout.

| Fetched branch | Exact head | Baseline conflict messages | After document moves |
| --- | --- | ---: | ---: |
| `AM/ai-operating-system` | `c5d705af3a2f89a58d6730c610ac4e94770fb37b` | 6 | 18 |
| `AM/ai-operating-system-consolidated` | `63d47feeda538f7904842693e0bca2cc71743bda` | 0 | 0 |
| `AM/vercel-preview-repair` | `bf6f44f2ad871c9a5abea38c3c501a5af220ef2d` | 6 | 18 |
| `MM/feedback-save-flow-20261117` | `2b7cab57d3aab8b2fc58878e5cc2e6c4755f3a38` | 2 | 9 |
| `MM/vercel-public-entry-20261117` | `778a09d7059129bdc8e41a0b9df11f1f0eab24a0` | 3 | 10 |
| `MM/workspace-attendance-20261117` | `c211b72b1f593b08a8c0cd00f880c0834080697e` | 2 | 7 |
| `MM/workspace-feedback-20261117` | `14dbda0a5b204ec2a4b1728c9d4fd5f1b2a762be` | 2 | 8 |
| `MM/workspace-roster-transactions-20261117` | `a1f290c8030b1e90d2483bc8aa9560d9140cfb02` | 2 | 5 |
| `MM/workspace-staff-lifecycle-20261117` | `ff799057cd99878c85b3993b30907104250a6648` | 2 | 6 |
| `codex/coach-foundation` | `b6c9006eacc02f6908306b9070ba4f60d0316018` | 0 | 0 |
| `main` | `fc16814497186e089901158be469270242a9ac62` | 6 | 18 |

Owner-confirmed scope: keep a documentation-only review on AM/consolidated and leave every other branch untouched. Do not integrate main or propagate these changes to MM branches. Keep ongoing feature work; do not reset this shared branch to imitate main. The documentation commits can be reviewed independently of the pre-existing branch divergence.
