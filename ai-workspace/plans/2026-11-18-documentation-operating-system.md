# Documentation operating system Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ParentPlus documentation predictable for founders and AI agents without breaking the existing `founders/` and `ai-workspace/` structure.

**Architecture:** Keep the existing folders as stable ownership boundaries. Add one cross-repository operating-system guide, make `START-HERE.md` the two-path entry point, and standardize task closeout evidence. Defer large file moves until navigation and authority labels are working.

**Tech Stack:** Markdown, repository link checker, GitHub Actions documentation checks.

**Spec:** `docs/DOCUMENTATION_OPERATING_SYSTEM.md`

## Global Constraints

- Keep founder documents under `founders/` and AI technical documents under `ai-workspace/`.
- Preserve historical records and dates; do not silently delete or rewrite their meaning.
- Use existing authoritative documents instead of creating competing roadmaps or QA standards.
- Run `python3 scripts/check-documentation-links.py` after documentation changes.
- Do not touch unfinished child-profile product files while reorganizing documentation.

## Review Focus

- Every new navigation link resolves to an existing file.
- Founder and AI paths are clearly separated.
- The closeout template requires commands, evidence, scope, limitations, and a next action.
- Existing repository rules and current database policy remain unchanged.
- The change is documentation-only.

### Task 1: Add the navigation model

**Files:**
- Modify: `START-HERE.md`
- Modify: `founders/README.md`
- Modify: `ai-workspace/README.md`
- Modify: `ai-workspace/instructions/README.md`
- Create: `docs/DOCUMENTATION_OPERATING_SYSTEM.md`

- [x] Add founder and AI reading paths.
- [x] Define the Discover → Read → Plan → Build → Validate → Close → Move ahead lifecycle.
- [ ] Run the documentation link checker.

### Task 2: Add closeout and implementation templates

**Files:**
- Create: `ai-workspace/instructions/TASK_CLOSEOUT_TEMPLATE.md`
- Create: `ai-workspace/plans/2026-11-18-documentation-operating-system.md`

- [x] Add required task evidence fields.
- [x] Add the implementation plan for this documentation change.
- [ ] Verify the files are linked from the indexes.

### Task 3: Verify and hand off

**Files:**
- Documentation files from Tasks 1–2 only.

- [ ] Run `python3 scripts/check-documentation-links.py`.
- [ ] Run `git diff --check`.
- [ ] Confirm the changed-file list contains documentation only.
- [ ] Commit and push to `AM/consolidated` without touching unrelated work.
