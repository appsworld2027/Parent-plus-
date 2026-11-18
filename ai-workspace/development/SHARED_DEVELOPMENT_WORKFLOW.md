# Shared development workflow

This repository is the shared destination for AM and MM. The source repository remains read-only for this consolidation.

## Branches and reviews

**Current owner restriction (supersedes the historical promotion paragraph below):** new consolidation work stays on `AM/consolidated`. Do not merge into main, coach-foundation, MM or another AM branch until instructed. Read the reusable feature procedure in Developer Guide section 10. Branch-prefix conventions and documentation are not enforcement; current GitHub required-check/reviewer protection is not established here.

Historical promotion: the owner previously requested consolidation into `main` on 17 November 2026, establishing a shared base while preserving legacy branch history. That promotion did not authorize live SQL or provider/release settings. Later AM-only instructions above govern ongoing work. A feature-branch commit is not a main-branch commit; reports must identify the actual branch containing the work.

1. Start work from the agreed current destination development base. Use `AM/<short-task>` or `MM/<short-task>` for owner work; keep existing legacy branches intact.
2. Keep each pull request focused. State the user-facing change, affected Coach/Parent journey, data/security impact, validation performed, and any follow-up.
3. Review and merge through a pull request into the agreed development base. Do not merge owner branches directly into each other or overwrite another person's branch.
4. Coordinate shared architecture, authentication, authorization, schema, and release decisions with both owners before implementation reaches the live project.
5. Keep secrets and personal data out of commits, logs, screenshots, and test fixtures. Use fictional data for tests.

Branch prefixes are a team convention; available GitHub metadata did not establish that they are enforced by repository rules. The baseline checks have passed, but maintainers must confirm required-check and review settings in GitHub.

## Database changes

- Preserve the destination's applied migration history. Never copy source migration numbers or mark source migrations as applied in the destination.
- Develop SQL as a new destination migration or isolated candidate, validate on disposable/staging data, and review rollback and access effects before any live application.
- A committed candidate is not a deployed migration. Record the exact target environment and migration status in the pull request.
- Do not use production data for tests. Preserve IDs and tenant boundaries where a migration is eventually authorized.

## Verification

Run the repository's relevant checks and include results in the pull request. Current app checks include `npm run check`, `npm run test:e2e`, and `npm run export:web`. Verify GitHub Actions results and the exact Vercel branch preview/browser scenarios before release. APK builds and APK-based testing are retired. GitLab mirroring remains deferred.
