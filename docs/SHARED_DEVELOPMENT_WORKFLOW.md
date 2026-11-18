# Shared development workflow

This repository is the shared destination for AM and MM. The source repository remains read-only for this consolidation.

## Branches and reviews

**Current owner instruction,18November2026:** MM uses one canonical development branch, `MM/development`. All further MM work is committed/pushed there; do not create more MM task branches or work on `main`. The17November request to promote prior work to main was historical authorization and does not authorize future automatic main merges. A new explicit owner instruction is required before promoting MM work to main. The production app remains on its existing release path. This instruction does not change AM's branch or authorize merging/deleting it.

1. For MM, fetch and switch to `MM/development`, verify the working tree, and synchronize without force-pushing. It initially contains all prior MM tips and the current saved main baseline. Do not silently integrate future main/AM changes; inspect and coordinate shared changes first. AM continues under its own agreed branch rules.
2. Keep each pull request focused. State the user-facing change, affected Coach/Parent journey, data/security impact, validation performed, and any follow-up.
3. Review concrete MM commits on the canonical branch and run existing checks there. Open a release PR into main only when the owner explicitly requests that promotion; do not merge owner branches directly into each other or overwrite another person's branch.
4. Coordinate shared architecture, authentication, authorization, schema, and release decisions with both owners before implementation reaches the live project.
5. Keep secrets and personal data out of commits, logs, screenshots, and test fixtures. Use fictional data for tests.

Branch prefixes are a team convention; available GitHub metadata did not establish that they are enforced by repository rules. The baseline checks have passed, but maintainers must confirm required-check and review settings in GitHub.

## MM consolidation and branch deletion

The18November cleanup covers only inventoried MM refs. All10old local names/8remote names were already ancestors of main`f858aad`; the canonical branch preserves that full history without artificial merges or content changes. [Inventory, backup and verification gates](MM_BRANCH_CONSOLIDATION.md) record the concrete evidence. Preserve main, AM, codex and build-status refs. Verify the current remote tip before deletion and use a lease so concurrent work cannot be removed. Keep the workspace and application files. Feature development stays paused after this maintenance task until the owner resumes it.

Existing checks now also run for code/workflow pushes to `MM/development`; Markdown-only changes retain the existing path-ignore behavior. This adds no new test gate and changes no deployment/provider setting. Branch previews may be built automatically by the existing Git integration; they are not a production promotion.

## Database changes

- Preserve the destination's applied migration history. Never copy source migration numbers or mark source migrations as applied in the destination.
- Develop SQL as a new destination migration or isolated candidate, validate on disposable/staging data, and review rollback and access effects before any live application.
- A committed candidate is not a deployed migration. Record the exact target environment and migration status in the pull request.
- Do not use production data for tests. Preserve IDs and tenant boundaries where a migration is eventually authorized.

## Verification

Run the repository's relevant checks and include results in the pull request. Existing app checks include `npm run check`, `npm run test:e2e`, `npm run export:web`, and `npm run export:android`. A reviewer should verify GitHub Actions results before merging. Vercel and GitLab checks are outside the current consolidation scope.
