# Feature Contract: Provider listing and publish (C1.3)

Status: APPROVED by founder in chat on 2026-11-27 ("Approved"), both contracts as drafted, including the C1.3 reading of D-03 (private publish). Recorded by Claude; not a GitHub /approve. First admin: the founder (assumed by Claude 2026-11-27 on founder instruction to stop asking; changeable). No tests or code exist. Founder decision D-03: public listing is OUT of scope. So "listing" here is a private listing record and "publish" means "ready and approved to be offered", visible only to the owner and admins, not the public. This reading is an assumption to confirm. Depends on C1.2. Roadmap: C1.3

## Why
Once verified, a coach describes what they offer so the product can later show it to parents, without anything becoming public yet.

## In / Out
- In: listing draft, validation, publish and unpublish, edit rules, admin visibility.
- Out: public pages, search, discovery, bookings, payments (all later modules).

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| LP-01 | a coach whose status is not Verified | opens Listing | it is blocked with "Get verified first" and a link to Profile |
| LP-02 | a Verified coach | opens Listing | an empty draft form (title, description, sport, age group, location, price note) shows, status "Draft" |
| LP-03 | invalid or missing required fields | coach taps Save draft | nothing saves, field errors show, entries stay |
| LP-04 | valid fields | coach taps Save draft | the draft persists after reload and on another device |
| LP-05 | draft incomplete | coach taps Publish | refused, listing says what is missing, status stays Draft |
| LP-06 | draft complete and coach Verified | coach taps Publish | status becomes "Published" with the date, and a note says it is not publicly visible |
| LP-07 | a Published listing | any non-owner, non-admin, or signed-out user | cannot read it by screen or direct API call (fail closed) |
| LP-08 | a Published listing | admin opens the listings view | sees it, read-only |
| LP-09 | a Published listing | coach edits and saves | the change persists and status stays Published |
| LP-10 | a Published listing | coach taps Unpublish | status returns to Draft and the content is kept |
| LP-11 | a coach's verification is revoked or rejected | next load | their listing becomes Draft automatically and cannot be republished |
| LP-12 | a coach | tries to publish or edit another coach's listing | refused; nothing changes; a second academy cannot see it |

## Agents may decide alone
Form layout, field limits, how the listing is stored.

## Must ask the founder if
Any wording or setting that would make a listing visible outside the owner and admins.

## Tests
Locked tests: e2e/acceptance/provider-listing-publish.spec.ts, plus a disposable-database test for LP-07/LP-11/LP-12.
