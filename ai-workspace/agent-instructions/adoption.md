# Adopt shared rules without interrupting active work

AGENTS.md is versioned with the repository. A GitHub update cannot push instructions into an already-running session or an unsynchronized branch.

1. Finish or safely save current work. Do not overwrite another founder's branch or discard uncommitted changes.
2. After the documentation PR is approved and merged, fetch origin and integrate the current authorized development base into your own branch through the existing reviewed workflow. Resolve conflicts deliberately; do not force-push shared history.
3. Read root AGENTS.md and relevant nested instructions. Start a new Codex task/session or explicitly reload the updated instructions in the current session.
4. Confirm the branch includes the rules commit before claiming adoption. Continue the current feature without restarting its implementation.

Choose the development base and PR target from the current owner instructions and [shared workflow](../../docs/SHARED_DEVELOPMENT_WORKFLOW.md). On this branch, the current restriction is AM/consolidated only; these instructions do not authorize promotion to main or another branch. Each owner synchronizes only the authorized base into their own work. Do not bulk merge owner branches into one another. Use temporary merge checks against current remote heads before integration; a clean textual merge does not prove behavioral compatibility or guarantee future conflict freedom.

Scope of this rollout: shared instructions, founder navigation, traceable scenario rules, independent review and adoption. The separate audit in strategy step 11 is skipped. Excel generation, new automated checks and mandatory-gate rollout remain separate work. Existing checks and release approvals continue to apply.
