# Session handover prompts (copy, paste, done)

## A. Next-session prompt (the agent fills the angle brackets and gives you this at every switch)
> Continue <product> on branch <branch>. First read `docs/product/SESSION_STATE.md` and `docs/product/<slug>/CHECKPOINT.md`. Verify them against git and the latest test evidence; tell me only what is stale or blocked. Do not redo finished work or reopen approved decisions. Next step: <exact next step>. Done when: <completion criteria>. Use the session-handover skill; recommended options without asking me; Superpowers framework; cheapest suitable model; touched tests only.

## B. Account-wide reminder (paste once into claude.ai Settings → Profile → Personal preferences; applies to every chat, project and Claude Code session in your account)
> Session discipline for ALL my work and chats: at the start of any task read the latest handover if one exists. At every milestone, and whenever a session is long (many tool calls, large history, repeated reads, forgotten decisions, or measured context above about 80%), tell me in at most five lines to switch to a new session, write a self-contained handover document (objective, decisions, done with evidence, in progress, pending, validation including NOT RUN, risks, exact next step) into the project's git repository and push it, or, if git is unavailable, give me a portable .md file, and give me a ready-to-paste prompt for the next session. Never invent token or context figures. Delete superseded handover files once the new session has verified the handover.

## C. Where it takes effect
| Place | How | Applies to |
|---|---|---|
| This repo (Claude Code, Codex, any agent) | `AGENTS.md` rule + `.agents/skills/session-handover` + `.claude/skills/session-handover` | Everyone working in Parent Plus |
| All your Claude chats and projects | Paste prompt B into Personal preferences | Every chat, no matter the project |
| Other repos | Copy `.claude/skills/session-handover` into that repo (or into `~/.claude/skills` for all your Claude Code sessions on a machine) | Those repos / that machine |
Limits: no tool can interrupt you between turns or measure context in every product. The agent checks the triggers whenever it acts, so it reminds you at its next reply, not in the background.
