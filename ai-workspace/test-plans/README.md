# Feature scenarios and evidence

Before implementing a feature, identify its roadmap feature ID, observable acceptance criteria, affected journeys and risk-based scenario inventory. For documentation-only work, validate the documentation; do not invent application test results.

Use stable scenario IDs such as `<feature-ID>-SC-001`. Each scenario records feature ID, category, priority, preconditions, steps, expected result, executable test path/name when available, automation status, execution status, actual result, commit/build/environment, evidence link and defect/retest reference. Distinguish PASS, FAIL, BLOCKED, NOT RUN and NOT APPLICABLE (with reason). Record skipped/flaky tests explicitly. No fabricated results or implied coverage from missing tests.

Consider happy, negative, boundary, permissions, privacy/security, integration, regression, performance/load, reliability/repeated requests, accessibility, supported devices/browsers, failure/recovery, data integrity and concurrency. Select relevant categories and explain exclusions; add feature-specific risks.

Flow: accepted behavior → scenario IDs → executable feature tests → actual run evidence → independent review → founder release summary.

For app changes, use existing repository checks and add meaningful feature-specific coverage. Include regression effects on both Coach and Parent. Database candidate work uses the existing disposable validation process; it does not authorize live changes.

An independent reviewer must assess requirements, diff, test quality, failure/recovery and security impact, using the exact reviewed commit. Record reviewer identity/role, findings and their disposition. The implementer's self-review is useful but is not independent review. If no independent reviewer is available, record review as pending in the PR; never claim it happened. Do not start extra agents without session authorization.

Existing CI and required checks stay intact. This first rollout adds no automated enforcement. Future advisory jobs must report failures visibly without unexpectedly blocking the active sprint. Excel will be a generated report from executable tests and scenario records, not the testing engine; its generator belongs in a separate PR.
