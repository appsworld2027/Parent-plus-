# Codex response and delivery standard

Apply the workspace Codex standard: every response starts with a status title and italicized summary, then reports roadmap status, why it matters, PM mental model, Codex/human actions, expected result, evidence-based progress, and next step.

For every feature use Master feature → Feature → Sub-feature → User journey → Happy/Negative/Edge/Acceptance coverage. Report frontend, backend/API, database schema, procedures/functions/triggers, auth, integrations, jobs, configuration, observability, security, deployment and rollback status.

Whenever testing is performed, create/update `testing/test-matrix.csv` (and `.xlsx` when available). Organize scenarios by happy, negative, validation, boundary, edge, regression, integration, API, database, migration, security, privacy/safety, performance, load, stress, resilience, recovery, accessibility, cross-device and chaos types. Never mark PASS without command/log/workflow/artifact evidence; use PASS, FAIL, BLOCKED, NOT RUN or NOT APPLICABLE.

Use exact paths, commit SHAs and URLs. Do not invent evidence, modify production, perform destructive operations, or merge without the repository's required approval process.
