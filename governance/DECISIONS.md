# Founder decisions — Parent Plus

| Date | Decision | By | Notes |
|---|---|---|---|
| 2026-11-22 | One founder's approval is sufficient for product decisions and merges to `main` | Ankit (Manu onboarded) | Recorded in `.ai-org/manifest.json` `governance.approvalRule`. Agents still never merge to `main` without a founder `/approve` on green checks. |
| 2026-11-22 | Use the existing dev Supabase project for staging/hosted QA; do not create more projects | Ankit | Fictional, labelled QA data only; cleaned up after runs. |
| 2026-11-22 | Bottom-nav inactive colour `#8a8a96` (WCAG AA) instead of prototype `#6b6b75` | Ankit | Shipped in #40. |
| 2026-11-22 | Keep `AM/consolidated` as a separate branch (APVerse work, 87 commits) | Ankit | Plan later as its own feature with a contract. |
| 2026-11-22 | AI Org runs the semi-autonomous loop (Option A): founder approves the contract and the Demo Pack only | Ankit | `docs/product/BACKLOG.md` drives what is next. |
| 2026-11-23 | Founders decide only in their AI chat and test only on the Vercel link; the assistant posts `/approve` / `/changes` for them | Ankit | Demo Pack and Maya texts say "tell your AI assistant". |
| 2026-11-23 | Retire unused GitHub Actions (13) and make Android preview manual-only; delete their old run history | Ankit | From `GitHub_Actions_Audit.xlsx`: Parent Plus keeps 7 workflows, AI Org keeps 9. |
| 2026-11-23 | `main` accepts changes only through pull requests (no direct pushes, force-pushes or deletion) | Ankit | After Maya committed a contract straight to `main` (a3802f0). No extra approval count; the loop's gates stay as they are. |
