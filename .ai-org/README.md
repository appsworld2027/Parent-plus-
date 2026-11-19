# AppsWorld AI Organization adapter

Parent Plus uses the product-agnostic AppsWorld AI Organization for role contracts, governance, quality gates and reporting. Parent Plus remains the source of truth for product code and product requirements.

## Connected-session bootstrap

The organization workflows do **not** live in this product repository. They live in the repository named by `manifest.json`:

```text
appsworld2027/parent-plus-ai-org
```

When Codex or Claude is operating in this repository and a founder submits a product idea, it must:

1. Read this manifest and resolve `source`.
2. Load the founder interface from the AI Organization repository.
3. Invoke `founder-intake.yml` or `scripts/founder-command.mjs discover` in the AI Organization repository.
4. Return the real Idea ID, workflow run URL, decision brief and blockers in the same conversation.

Finding no AI PM workflow under `.github/workflows` in Parent Plus is expected; that workflow is intentionally owned by the separate AI Organization repository. The adapter is the versioned pointer between the two repositories.

If the connected session cannot access the source repository or invoke its workflow, it must report `AI_ORG_UNAVAILABLE` with the exact access/tool limitation. It must not claim that discovery is unavailable merely because the workflow is not duplicated locally, and it must not present a generic product answer as an executed AI Organization result.
