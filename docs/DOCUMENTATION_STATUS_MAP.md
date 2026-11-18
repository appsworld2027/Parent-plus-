# ParentPlus documentation status map

**Status:** Active
**Purpose:** Tell founders and AI agents which documents guide current work and which provide context only.

## Current sources of truth

| Area | Current source | Use it for |
| --- | --- | --- |
| Navigation | [`START-HERE.md`](../START-HERE.md) | Choosing the founder or AI path |
| Repository rules | [`AGENTS.md`](../AGENTS.md) | Mandatory engineering and safety rules |
| Product direction | [`founders/product/CONSOLIDATED_PRODUCT_ROADMAP.md`](../founders/product/CONSOLIDATED_PRODUCT_ROADMAP.md) | Feature order and integration status |
| Coach requirements | [`PRD.md`](../PRD.md) | Coach product behavior |
| Parent requirements | [`founders/product/PARENT_PRD.md`](../founders/product/PARENT_PRD.md) | Parent product behavior |
| Current progress | [`PROGRESS.md`](../PROGRESS.md) | What is done, blocked, or next |
| Architecture | [`ai-workspace/architecture/ARCHITECTURE.md`](../ai-workspace/architecture/ARCHITECTURE.md) | System boundaries and technical design |
| Delivery rules | [`ai-workspace/development/DEVELOPER_GUIDE.md`](../ai-workspace/development/DEVELOPER_GUIDE.md) | How to implement and review work |
| Validation | [`ai-workspace/validation/MULTI_WORKSPACE_VALIDATION.md`](../ai-workspace/validation/MULTI_WORKSPACE_VALIDATION.md) | Required checks and evidence |
| Task closeout | [`ai-workspace/instructions/TASK_CLOSEOUT_TEMPLATE.md`](../ai-workspace/instructions/TASK_CLOSEOUT_TEMPLATE.md) | How to finish and hand off work |

## Status categories

### Active

Defines current behavior, current rules, or current work. Active documents may
guide implementation.

### Reference

Supports understanding but does not override an Active document. Use it when a
task needs additional detail.

### Historical

Preserves an earlier state for audit and context. It must not be treated as
current permission or current system state.

### Archive

Retained for traceability but not part of normal task discovery.

## How an AI agent chooses documents

1. Start at [`START-HERE.md`](../START-HERE.md).
2. Read [`AGENTS.md`](../AGENTS.md).
3. Identify the task's roadmap item or requirement.
4. Read the Active product, architecture, and validation documents for that task.
5. Read Reference documents only when Active sources point to them.
6. Treat Historical and Archive documents as context, never as fresh authority.
7. Record the sources used in the task plan or closeout.

## How a founder samples the structure

Choose one document from each category:

- One Active source: confirm it clearly says what is current.
- One Reference source: confirm it links back to an Active owner.
- One Historical source: confirm its date and limits are visible.
- One completed task closeout: confirm it contains validation and a next action.

If a sample is ambiguous, clarify its owner, status, or index link instead of
creating another document.
