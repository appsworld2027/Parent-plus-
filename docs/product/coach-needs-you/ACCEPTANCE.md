# Feature Contract: Coach "Needs you" list

Status: approved by founder (Ankit) on 2026-11-21 — pilot feature for the AI Org quality system (AGENTS.md §7A)
Prototype reference: `founders/prototypes/ParentPlus_Coach_Tutor_App.html`, Coach Today screen, section "Needs you" (line ~322)
Roadmap: M2-41 Coach "Today" and "Needs you" list

## Why this feature
Coaches open Today to see what they must do next. Children who have not received feedback for a week quietly fall behind on the
Parent side. "Needs you" puts that work in front of the coach with one tap to act.

## In scope / Out of scope
- In: a "Needs you" section on Coach Today with one real item — children who need feedback — and an "All caught up" state.
- Out (later slices, need their own contracts): trial requests and parent messages (those features don't exist yet);
  fees overdue (needs an agreed definition of "overdue"); load-error state (the shared test fixture cannot yet simulate a
  load failure); attendance metrics tiles.

## Definitions
- **Child who needs feedback:** a student who is not archived, has an enrolment active today in any batch, and has NO
  *recorded* feedback (status "recorded", not draft) naming them as a recipient in the last 7 days (7 × 24 hours).

## Acceptance criteria
| ID | Given (starting situation) | When (user does) | Then (user sees) | Prototype |
|---|---|---|---|---|
| AC-01 | a signed-in coach with an academy | opens Today | a heading "Needs you", placed above "Your teaching workspace" | Needs you section |
| AC-02 | 1 enrolled student (Ria) with no feedback ever | opens Today | one tappable item "1 child needs feedback" with the line "No update for over a week" | star row |
| AC-03 | 2 enrolled students, neither with feedback | opens Today | the item says "2 children need feedback" | star row |
| AC-04 | Ria got recorded feedback today; Zoya has none | opens Today | "1 child needs feedback" (only Zoya is counted) | — |
| AC-05 | Ria (the only student) got recorded feedback today | opens Today | "All caught up" and "New requests will show here"; no feedback item | All caught up |
| AC-06 | Ria has only a draft (not recorded) feedback | opens Today | "1 child needs feedback" (drafts don't count) | — |
| AC-07 | Ria's only recorded feedback is 8 days old | opens Today | "1 child needs feedback" | — |
| AC-08 | besides Ria, an archived student and a student whose enrolment ended | opens Today | "1 child needs feedback" (only Ria is counted) | — |
| AC-09 | the feedback item is showing | taps it | the "Feedback for parents" screen opens | chevron |
| AC-10 | an academy with no students | opens Today | "All caught up" and "New requests will show here" | All caught up |

## Decisions agents may make alone (no founder needed)
- How the data is loaded, component and file names, caching, and code structure.
- Visual styling, following the prototype's Coach theme (star icon, chevron, card style) via `src/ui/prototypeTheme`.
- Changes to shared test support outside `e2e/acceptance/` if a fixture query is missing — recorded in the Demo Pack.

## Must ask the founder if
- A user-visible behaviour is needed that no AC covers.
- An AC cannot be met as written.
- The change affects money, privacy, child safety, or data that users can't get back.

## Tests
Locked acceptance tests: `e2e/acceptance/coach-needs-you.spec.ts` — one test per AC, titled with its AC ID.

## Change log
| Date | AC | Change | Founder decision link |
|---|---|---|---|
