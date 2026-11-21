## Demo Pack
<!-- Required by AGENTS.md §7A. The founder reads ONLY the first section. Infra PRs with no feature contract: write "n/a" in the AC table. -->

### For the founder (2-minute read)
**What you can do now:** <one or two plain-language sentences>
**Preview link:** <Vercel preview URL — opened successfully: yes/no>
**Try it in 3 steps:**
1.
2.
3.
**Needs your decision:** none | <link to ai:founder-decision>

### Acceptance criteria
Contract: `docs/product/<feature-slug>/ACCEPTANCE.md` (approved: <founder decision link>)

| AC | Result | Evidence (screenshot or test run link) |
|---|---|---|
| AC-01 | pass / fail | |

### Decisions I made on my own
-

### Known gaps and risks
-

### Engineering evidence
- PR type: contract (`ai:contract`) | build | fix | infra
- CI run (unit tests, typecheck, lint, acceptance tests):
- `contract-lock` check:
- Independent review (Rex — model used — verdict):
- Fix rounds used: <n>/5
- Candidate commit:

### Parent Plus checklist (kept from the previous template)
## Summary

What changed and why?

## Product and data impact

- Coach/Parent journeys affected:
- Authentication, privacy, or schema impact:
- Supabase change: none / candidate only / migration (identify target and status)

## Validation

- [ ] `npm run check` (or explain why not relevant)
- [ ] `npm run test:e2e` (or explain why not relevant)
- [ ] `npm run export:web` (or explain why not relevant)
- [ ] `npm run export:android` (or explain why not relevant)
- [ ] CI result reviewed

## Review

- [ ] No secrets or real personal data added
- [ ] Scope and follow-ups are documented
- [ ] Required owner review obtained for shared auth, access, schema, or release changes
