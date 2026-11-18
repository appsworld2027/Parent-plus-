# Superpowers for ParentPlus

ParentPlus includes the 15 [Superpowers](https://github.com/obra/superpowers) skills
under `.agents/skills/`, where Codex discovers repository skills automatically.
This is a repository-scoped skill installation, not a global plugin installation.

## Use in Codex

Destination integration: copied from AM's ParentPlus snapshot `380adba9f73b3021a787dff72074df57f2a53634` on 17 November 2026, including all supporting resources and the MIT license. The pinned upstream version below is source provenance, not a claim that this workspace fetched upstream again. The destination `AGENTS.md`, Expo scripts and existing test framework govern application work. Source Next.js paths and Python quality-gate commands are not destination commands.

Session instructions and supported tools take precedence over upstream examples about global configuration, agent models, worktrees and approvals. Skill discovery depends on the host: filesystem presence does not prove a particular ChatGPT or Codex client has loaded them. No background automation is installed by copying these files.

1. Open or clone this repository and start Codex from its root.
2. Start a new turn; if skills do not appear, restart Codex.
3. In Codex CLI or the IDE extension, use `/skills` to inspect the installed skills.

Codex selects and reads applicable skills from the task, without waiting for the user to name them. Start with `using-superpowers`; reassess when the work changes and read applicable process and verification skills before their associated work. If the client does not list a repository skill, read its SKILL.md directly from `.agents/skills/` when available. Report missing files, unsupported tools, incomplete steps and pending independent review; never claim a skill was followed merely because its files exist. Higher-priority session and user instructions still govern.

## Session and review controls

The repository provides `.codex/hooks.json` for Codex clients supporting lifecycle hooks. `SessionStart` and `SubagentStart` check the repository and pinned files and supply AGENTS.md; `UserPromptSubmit` repeats the check and reminds the agent to select applicable skills. Codex may ignore stop requests for subagent start; a failure is also supplied as context and must be reported. It does not record prompts or prove the agent followed a skill. Codex runs project hooks only for trusted projects and trusted hook definitions; a client without this support or trust will skip them. Confirm hook discovery and trust in each client; do not bypass trust or claim an unverified hook is active. Resuming or refreshing a session may be necessary after synchronizing the branch.

The Engineering review audit workflow checks that the PR contains its skill/evidence/exceptions fields and has a non-author approval on its current head, with no outstanding changes requested by an independent reviewer. It cannot prove the statements are true or that the reviewer was independent of the implementation; reviewers must inspect evidence. This is advisory: `pull_request_target` runs attach to the base commit rather than the PR head, so this workflow is not a reliable required status and must not be configured or represented as a merge block. Review-event runs depend on GitHub workflow availability on the default branch. Merge queues are not supported by this audit. GitHub branch protection and trusted, correctly associated required checks must be set up and verified separately; repository settings and plan availability are currently unconfirmed.

The quality loop validates the checked-in Superpowers files against `quality/superpowers-manifest.json`. This detects accidental missing or changed files; it cannot establish that an agent invoked or followed a skill, and a contributor who changes both the files and manifest can bypass it. Review intentional upgrades and regenerate the manifest from the approved full snapshot. GitHub protection and independent review remain separate controls.

Users may also request a skill explicitly, for example:

- `$brainstorming Help design the ParentPlus onboarding flow.`
- `$writing-plans Plan the agreed onboarding implementation.`
- `$systematic-debugging Investigate this failing test.`
- `$verification-before-completion Verify the changes before finishing.`

Skills also activate when a task matches their descriptions. `AGENTS.md` points
Codex to the bootstrap skill. No API keys or setup command are required.

Parallel-agent workflows depend on the tools and permissions available in your
Codex environment; follow the included Codex adaptation reference when supported.
The optional visual brainstorming companion needs Node.js. Graph rendering in
the skill-authoring workflow needs Graphviz. These tools are not required just
to load the skills.

## Source and updates

- Upstream: https://github.com/obra/superpowers
- Version: 7.0.1
- Pinned revision: `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b`
- Upstream skill files and supporting resources retain their upstream behavior; local documentation-path references are adapted to the existing ai-workspace folders.
- License: MIT; see [SUPERPOWERS-LICENSE](SUPERPOWERS-LICENSE).

To update, review an upstream revision, replace the complete contents of the
15 skill directories with that revision's `skills/` contents, preserve executable
file modes, update the license and this revision, and verify the snapshot.
Keep project-specific instructions in `AGENTS.md` rather than editing upstream
skill files. Avoid installing the same skills globally as well, since Codex may
show duplicate skill names.

References:
- [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills)
- [Upstream Superpowers installation](https://github.com/obra/superpowers#installation)
