---
name: session-handover
description: Use at the start of every session and at every milestone, before any long task, and whenever the session feels long or repetitive. Decides CONTINUE or SWITCH, and when switching writes a self-contained handover document into git (or a portable .md if git is unavailable) plus a ready-to-paste prompt for the next session. Also use when the user says "switch session", "hand over", "new session" or "checkpoint".
---

# Session handover (always-on discipline for Parent Plus)

Invoke this skill once at session start to load the rules; they then apply for the whole session. It does not run by itself between turns: you (the agent) re-check the triggers below at every milestone.

## 1. At session start (resume)
1. Read the newest handover: `docs/product/SESSION_STATE.md` and the feature's `docs/product/<slug>/CHECKPOINT.md`. If none, ask nothing; start fresh.
2. Verify against evidence (git log, `git status`, a quick `npm run check:features`). Note anything stale. Do not redo finished work or reopen approved decisions without new evidence.
3. If the handover is verified correct, mark it `Verified` (a fresh session read it back correctly).
4. Delete handover files that are now superseded (older checkpoints folded into the new one). Never delete records of hosted-database changes, decisions or evidence.

## 2. Triggers: when to SWITCH (check at each milestone, tool-call heavy turn or finished feature)
Switch when ANY is true:
- Measured context use is above about 80% (only if the tool shows it; never invent a figure).
- The session has made many tool calls (rough guide: 150+) or the history is large and you are re-reading files you already read.
- The module/feature changes, or independent QA/review starts.
- Decisions are being forgotten or repeated, or two attempts at the same fix failed (change approach or escalate first).
- The founder's credit-control instruction applies (see AGENTS/CHECKPOINT): long session or credit-sensitive next task.
Otherwise CONTINUE silently. Say nothing to the user on CONTINUE.

## 3. How to switch
1. Write the handover (template: `docs/session-handover/HANDOVER_TEMPLATE.md`) to `docs/product/SESSION_STATE.md` (project-wide) and, for feature work, `docs/product/<slug>/CHECKPOINT.md`.
2. Persist it: commit and push to the working branch (and `MM/development` when the repo rules allow). Verify: `git fetch` and compare commit ids; only then say it is saved. If git or push is unavailable, write a portable file (for example `SESSION_HANDOVER.md` in the scratchpad or outputs folder), say clearly it is NOT synced to git, and give its path.
3. Never put secrets or personal data in it.
4. Tell the user in at most five lines: why switching, where the handover is, that it is pushed/verified (or not), and the ready-to-paste prompt (template in `docs/session-handover/PROMPTS.md`).
5. Stop doing new work in the old session.

## 4. Handover content (must be self-contained)
Objective and expected outcome; approved decisions with reason; done work with evidence; in-progress state with file references; pending work in order; test and validation results (pass, fail, skipped, NOT RUN); risks, traps, open decisions and who decides; standing founder instructions; exact next step and completion criteria; handover status (Saved locally, Synced to GitHub, Verified).

## 5. Truth rules
Unknown stays Unknown. Do not claim a model switch the tool has not confirmed. Do not claim memory across sessions; the handover file is the memory.
