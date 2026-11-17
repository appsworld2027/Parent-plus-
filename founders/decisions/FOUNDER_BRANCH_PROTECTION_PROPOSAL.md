# Founder branch ownership and merge controls

Status: proposed, not configured or enforced. Verified 17 November 2026. Repository is private and owned by the personal `appsworld2027` account. Rulesets API returned 403 with “Upgrade to GitHub Pro or make this repository public to enable this feature.” Collaborator listing returned only `appsworld2027` as admin. Detailed branch-protection reads were unavailable to this integration. Do not claim effective merge controls from instructions alone.

## Requested operating rules

| Target | Direct commits | Merge requirement |
| --- | --- | --- |
| `AM/**` | AM identity only | AM can work freely within this scope |
| `MM/**` | MM identity only | An AM proposal enters through a PR approved by both founders |
| `main` | No routine direct pushes by either founder | PR, current-head approvals from both founders and passing required checks |
| `codex/coach-foundation` | Legacy development branch; treat as shared during transition | Same review controls as main until formally retired |
| `build-status` | Dedicated GitHub Actions actor only | Generated build-report writes; never treat it as a product development branch |

The current human is AM. The destination repository owner remains MM. Author names/emails and branch prefixes are labels, not authentication. Access enforcement uses the authenticated GitHub user or installed GitHub App. Both founders must use separate accounts and separate connector/CLI credentials, with two-factor authentication; an AM session authenticated as MM can exercise MM's permissions regardless of the commit author label.

## Recommended setup

Use a private GitHub Organization on GitHub Team so branch push restrictions can be scoped to people/teams. Do not make the repository public to unlock controls. Use AM `ankitmittal-madman` and MM `appsworld2027` as separate named identities, confirm both before configuration, and restrict routine repository permissions to the minimum required. Organization owners/admins retain settings powers; ordinary PR protections cannot prevent an owner deliberately changing the controls. Keep administrative access separate from everyday work.

Configure branch protections/rulesets for AM and MM namespaces, shared main and legacy development. Restrict AM namespace updates to AM and MM namespace updates to MM; require PRs and reviews on shared branches and cross-founder integration. Block force pushes and deletion, dismiss stale approvals, require approval of the latest changes and required CI checks, and remove routine administrator bypass. Audit any automation bypass, limiting the status writer to its own branch. Verify creation, update, merge and deletion behavior separately with each identity.

## Two founder consent: GitHub limitation and solution

A PR author cannot approve their own PR. Setting “two required approvals” in a two-person team can block every founder-authored PR. A CODEOWNERS line listing both people requires either owner's approval, not automatically both.

If explicit approval from both founders is mandatory, use a trusted GitHub App check. It records each named founder's authenticated `/approve <full-head-sha>` consent (including the author via a comment) and requires both for the current PR head. The other founder also submits a normal approving PR review. Bind the required check to that specific App as its expected source. A new commit or changed target invalidates both consents; revoked approvals and withdrawn consent must block merging. The App must verify GitHub-signed events, immutable numeric user IDs, repository, target branch and current head at evaluation. Do not execute PR code with write credentials, trust commit author fields, or accept a repository workflow that can award its own protected status.

This App is proposed work, not installed software. Until paid-plan/access prerequisites and the check are implemented and tested, use explicit PR review manually and do not call it enforced.

## Owner setup actions and subsequent implementation

1. In GitHub, create or select a private Organization with the Team plan. This is an owner billing decision; no subscription or repository transfer is authorized by this document.
2. Under repository Settings → General → Danger Zone → Transfer, transfer the repository to the agreed Organization only after reviewing the transfer and integration effects. Preserve the repository name/history. Revalidate GitHub, Supabase links, Actions permissions and any integrations; Vercel/GitLab remain deferred and must not be silently reconfigured.
3. Invite both founder identities and accept both invitations. Configure each AI connector with the acting founder's own identity and access to the destination. Never share tokens or passwords in chat.
4. Once organization and account access exist, prepare and review exact ruleset/protection settings and the trusted approval check. Configure only with explicit repository-settings authorization.
5. Test: AM push to AM succeeds; AM push to MM/main fails; MM push to MM succeeds; missing one consent fails; both current-head consents plus CI succeeds; new commit/revoked consent fails; spoofed author, duplicate account and unauthorized App status fail. Confirm no bypass through direct pushes, force pushes or branch deletion.

No paid service, invitation, repository transfer, ruleset or credential change has been executed by this proposal.
