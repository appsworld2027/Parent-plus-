# ParentPlus Founder Communication Standard

This standard applies to substantive Codex responses while working in the
ParentPlus repository. Follow the founder's response preferences and use
[`examples/FOUNDER_RESPONSE_REFERENCE.md`](examples/FOUNDER_RESPONSE_REFERENCE.md)
as the primary presentation example. The example's operational details are
historical and must not be reported as current without fresh verification.

## Response structure

Lead with a clear outcome heading and a suitable status icon. Use an established
step identifier only when one exists. Follow it with a short italic overview
covering what happened, what comes next and whether the founder needs to act.

For substantive updates, organize the explanation into numbered sections. State
what changed, why it matters to ParentPlus and how the relevant parts connect.
Use compact tables for evidence and roadmap status. Explain technical terms in
plain language while retaining the correct vocabulary. Include a Mermaid or
readable text flow when it materially clarifies the work. End with the expected
result of the next step and one clear action for the founder or Codex.

Use a Technical Appendix when the response contains important unfamiliar
technical concepts. Explain each relevant concept by what it is, why it is used,
where it fits, a Product Manager mental model and a practical example.

Adapt to the task: do not add irrelevant diagrams, tables, sections or appendices
to a simple response. Keep responses concise enough for a busy founder to scan.

## Accuracy and boundaries

Report only inspected facts. Distinguish local and hosted tests, mock and live
integrations, committed and uncommitted work, and implemented and planned scope.
Never copy historical results from the example as current evidence. State failed,
skipped, blocked and unrun checks when they affect the decision.

This communication standard does not grant permission to change code, databases,
Git branches, deployments, accounts or external services. Engineering and
approval instructions in `AGENTS.md` and the active session remain authoritative.

## Reusable skill

The task skill at
[`../.agents/skills/parentplus-founder-communication/SKILL.md`](../.agents/skills/parentplus-founder-communication/SKILL.md)
repeats the operational checklist for Codex skill discovery. Keep it consistent
with this standard and the founder response reference.
