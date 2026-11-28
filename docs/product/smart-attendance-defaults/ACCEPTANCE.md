# Feature Contract: Smart attendance defaults (M2-09)
Status: DRAFT — founder standing permission; AI-chosen rule below. A suggestion only; the coach always saves.
| ID | Given | When | Then |
|---|---|---|---|
| SD-01 | child attended ≥3 of the batch's last 5 saved classes and was not absent last time | coach opens an unmarked class | "Fill usual attendance (N)" appears; N counts such children |
| SD-02 | child absent last time | — | not suggested |
| SD-03 | fewer than 3 attended | — | not suggested |
| SD-04 | new child, no history | — | not suggested |
| SD-05 | coach already marked a child | fill | never overrides |
| SD-06 | more than 5 past classes | — | only the last 5 count |
| SD-07 | no past classes | — | no button |
| SD-08 | last class has no mark for the child | — | not suggested |
| SD-09 | button shown | coach taps | those children become "present" as an unsent device draft; nothing is saved to the class |
| SD-10/11 | absent last time / no history | open | no button (browser) |
Out: auto-saving, suggesting absent/late, cross-batch history. Tests: tests/smart-defaults.test.ts (SD-01..08), e2e/smart-defaults.spec.ts (SD-09..11). History query failure hides the button silently (not a hard error).
