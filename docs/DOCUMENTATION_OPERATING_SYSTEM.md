# ParentPlus documentation operating system

**Status:** Active  
**Owner:** ParentPlus engineering and founder workspace  
**Purpose:** Give founders and AI agents one predictable way to find, use, validate, and close work.

## The simple flow

```text
Discover → Read → Plan → Build → Validate → Close → Move ahead
```

| Stage | Main question | Primary location | Output |
| --- | --- | --- | --- |
| Discover | What is this task and why does it matter? | `START-HERE.md`, `founders/` | A roadmap item or decision |
| Read | What rules and requirements apply? | `AGENTS.md`, `founders/product/`, `ai-workspace/` | Authoritative sources identified |
| Plan | What exact work and checks are needed? | `ai-workspace/plans/` | A dated implementation plan |
| Build | Which code, migrations, or documents change? | `src/`, `supabase/`, `founders/`, `ai-workspace/` | A focused change |
| Validate | How do we know it works? | `ai-workspace/validation/`, `quality/`, tests | Fresh evidence and known gaps |
| Close | What changed and what remains? | `PROGRESS.md`, decisions, closeout record | A concise task closeout |
| Move ahead | What should happen next? | roadmap and current status | One next action |

## Two navigation paths

### Founder path

Founders should begin with the short summaries:

1. [Product vision](../founders/01-product-vision.md)
2. [Feature map](../founders/02-feature-map.md)
3. [Current status](../founders/03-current-status.md)
4. [Decisions needed](../founders/04-decisions-needed.md)
5. [Quality report](../founders/05-quality-report.md)

The founder workspace contains product requirements, decisions, owner steps,
and prototypes. It explains what to build and why.

### AI path

AI agents should begin with:

1. [Repository rules](../AGENTS.md)
2. [Developer guide](../ai-workspace/development/DEVELOPER_GUIDE.md)
3. [Product roadmap](../founders/product/CONSOLIDATED_PRODUCT_ROADMAP.md)
4. The relevant feature, architecture, or database contract
5. A dated plan in [plans](../ai-workspace/plans/README.md)
6. The relevant validation guide
7. The [task closeout template](../ai-workspace/instructions/TASK_CLOSEOUT_TEMPLATE.md)

The AI workspace explains how to build, test, review, and record evidence.

## Document authority

Every document belongs to one of four categories:

- **Active:** current source of truth for decisions or work.
- **Reference:** supporting context that does not override an Active document.
- **Historical:** preserved evidence from an earlier state.
- **Archive:** retained for traceability and not used to guide new work.

When two documents disagree, prefer the newer explicitly Active document and
record the decision in the relevant roadmap or decision record. Do not silently
delete historical material to resolve a disagreement.

## Rules for new documents

Before creating a document:

1. Search for an existing authoritative document.
2. Decide whether the content belongs to the founder or AI path.
3. Put it in the narrowest existing folder that owns the topic.
4. Link it from that folder's `README.md`.
5. Link it from the roadmap, feature, plan, or validation record that uses it.
6. Mark its status as Active, Reference, Historical, or Archive.

Do not create a second roadmap, competing product requirement, parallel QA
standard, or duplicate closeout report.

## Controlled migration policy

The existing `founders/` and `ai-workspace/` folders remain the stable homes for
their content. Reorganization happens in batches:

1. Add or update navigation.
2. Classify documents by authority.
3. Move one topic family at a time only when its links can be updated together.
4. Run `python3 scripts/check-documentation-links.py` after each batch.
5. Record the move in the documentation move inventory when paths change.

This avoids a large rename that makes AI sessions lose context or leaves broken
links for founders.
