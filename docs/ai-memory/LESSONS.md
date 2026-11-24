# Lessons

- 2026-11-22 · Coach "Needs you": green tests + AI review still missed a false "All caught up" while loading and on error. Contracts must include loading / empty / error / offline / large-data ACs. (Evidence: QA audit, Parent_Plus_QA_Coverage_Results.xlsx D-01.)
- 2026-11-23 · Overdue fees (#42): the first agent-written spec failed for the wrong reason in 11 of 18 tests while its PR claimed success. Agent self-reports are not evidence; the acceptance gate and a second reviewer on another model are required. (Evidence: AI Org issue #62, PR #61.)
- 2026-11-24 · Model trial 3: Kimi K3.1 Pro at medium reasoning and Nemotron 3 Ultra both wrote a gate-passing 18-test spec in ~42 min; Kimi/GLM at low reasoning ran out of time. (Evidence: AI Org issue #66.)
- Agents must commit to feature branches only; `main` accepts pull requests only. (Evidence: #42, a revision committed to `main` before branch protection.)
