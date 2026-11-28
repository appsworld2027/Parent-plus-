# Feature Contract: Safety and health notes (M2-43)

Status: DRAFT — built under the founder's standing direction (28 Nov). Roadmap: M2-43. Database: parentplus-dev only (migration 202611280031, applied).

## Why
A coach must remember each child's allergy, injury or medical need (e.g. peanut allergy, inhaler). It is sensitive: only the coach may see it.

## In / Out
- In: one private note (up to 500 characters) per student, edited on the student profile; clear by saving blank.
- Out: showing the note on the attendance screen (later), sharing with parents (never in this version), history of edits, alerts.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| SN-01 | coach opens a student profile | types a note and saves | it is saved and shows again after reload |
| SN-02 | a note exists | coach saves different text | it replaces the old note |
| SN-03 | a parent linked to that student | reads or writes the note by any route | refused; nothing revealed |
| SN-04 | a coach of another academy | reads or writes | refused |
| SN-05 | signed-out caller | calls the save function | refused |
| SN-06 | a note over 500 characters | coach saves | refused with a clear message; old note kept |
| SN-07 | a note exists | coach saves blank | the note is removed |
| SN-08 | the save fails | coach saves | message shown, typed text kept |
| SN-09 | the note cannot load | profile opens | warning shown; never shown as "no note" |
| SN-10 | profile opens | while loading / always | says "Private to you. Parents never see this." |

## Agents may decide alone
Layout and wording. Must ask the founder before showing the note to parents or adding notifications.

## Tests
Disposable Postgres: tests/safety-notes-candidate.test.ts. Rules: tests/safety-notes.test.ts. Component: tests/component/SafetyAndReactions.test.tsx. Browser: e2e/safety-notes.spec.ts. Hosted real-login check is NOT RUN (SCENARIOS.csv).
