# AI organization setup progress

Branch: MM/ai-organization-setup, based on current main (74de4bbb105641fb0ea3872d32e64296e407407d).

## Verified
- Inspected open draft PR #19. Its head is f74f7981deabecc2fe0a5eeaadc2189484d6ad9, based on older main f858aad85577c1e49ae24f06ba260778ecb83ddd, and its latest diff reports 163 files.
- Inspected current root AGENTS.md, ai-workspace/README.md, ai-workspace/development/DEVELOPER_GUIDE.md, consolidated product roadmap, and current GitHub Actions workflow.
- Existing repository already has extensive operating guidance, quality workflows and product requirements. Reuse those rather than installing duplicate systems.
- Local cloud checkout is AM/consolidated, clean. GitHub connector was used for remote inspection and setup branch content.

## Checklist
- [x] P1 initial repo, branch/PR and workflow discovery. Full framework compatibility and permission inventory still in progress.
- [ ] P2 role cards and governance.
- [ ] P3 safe configuration and control validation.
- [ ] P4 one-team demonstration.
- [ ] P5 founder conflict/decision simulation.
- [ ] P6 validate both teams.
- [ ] P7 end-to-end acceptance.
- [ ] Operating, recovery and maintenance guide.

## Decisions
- Keep PR #19 untouched. Its current base predates latest main and its diff is unexpectedly broad.
- Use a separate MM branch from verified current main.
- Reuse existing GitHub Actions, repository Superpowers skills, scenario IDs, and documentation structure.
- Keep work synthetic and non-production. No merges or paid services.

## Blockers
- Codex GitHub MCP can read/write repository content, but repository settings and account-level access controls require direct capability verification.
- Live Cezar runner isolation and remote Codex network access require cloud validation before autonomous execution.
- Actual model usage/cost telemetry may not be exposed by chosen subscription route. Report measured values only when available.

## Usage and cost
- No new service or paid plan selected. Usage/cost tracking method is not yet verified.
