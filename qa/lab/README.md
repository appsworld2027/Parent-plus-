# Parent Plus QA lab (owned by Quinn-Explore)

Agents prepare all test data and run all tests themselves. Founders only read the report.

| Layer | File | What it proves |
|---|---|---|
| Personas | `personas.mjs` | 1,000 deterministic fictional users (100 coaches in 6 types, 900 parents in 7 types). Same seed → same data → reproducible failures. |
| Database | `persona-db.test.ts` | Every persona is created **as that signed-in user through the app's own RPCs** on the real migrations + RLS, then isolation, approval, business rules and the Needs-you count are checked for **every** persona against a contract oracle. |
| Browser | `persona-journeys.spec.ts` | Headless journeys: brand-new coach → academy → batches → students → Today → Feedback, with a named step and screenshot per screen, and a "screen matches the docs" check on every tab. |
| Probes | `qa-probes.spec.ts` | Risk probes: loading/error honesty, privacy, a11y (axe), 320 px, scale, XSS, performance. |

Run: `npm run qa:lab` → `qa-results/` (JSON, HTML report with screenshots, data summary) → `npm run qa:report` refreshes `testing/qa-scenarios.csv` results.
Rules: every test title starts with its ID (`QA-LAB-…`, `QA-NY-…`); every isolation test has a sanity guard so it cannot pass while checking nothing; the lab must fail when a security rule is deliberately broken (mutation check, run monthly).
Known harness limit H-01: the in-browser test backend cannot persist a newly created academy across reload — reload is proven at the database layer.
