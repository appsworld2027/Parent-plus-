# Technical appendix

## Components

- `feedback.mjs`: pure visibility decision for draft versus published feedback.
- `fixture.json`: fictional coach, class, student, and feedback records.
- `feedback.test.mjs`: Node's built-in test runner covering the acceptance criteria.
- `specs/001-feedback-visibility/`: requirement, plan, and task traceability.

## Boundary controls

- No Supabase, Vercel, payment, authentication, or production API calls.
- No migration or schema change.
- No real child, parent, or coach records.
- Test execution is local and deterministic.

## Verification command

```bash
node --test ai-workspace/pilots/parentplus-ai-pilot/feedback.test.mjs
```

## Acceptance evidence

The command must report two passing tests: draft feedback is hidden and published feedback is visible.
