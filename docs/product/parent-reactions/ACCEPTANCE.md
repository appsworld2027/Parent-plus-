# Feature Contract: Parent reactions on reviewed feedback (M2-24)

Status: DRAFT — built under the founder's standing direction (28 Nov). Roadmap: M2-24. Database: parentplus-dev only (migration 202611280032, applied).

## Why
Parents read the coach's reviewed note but have no quick way to respond. One tap tells the coach it landed, without a WhatsApp message.

## In / Out
- In: three fixed reactions (Thank you, Helpful, We will try this), one per parent per reviewed note, changeable and removable; the coach sees counts on Today.
- Out: free-text replies, parent names on the coach card, push notifications for reactions, reacting to announcements.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| PR-01 | a parent sees a reviewed note | views the card | three reactions show |
| PR-02 | linked parent, shared note | taps one | saved; card shows "<reaction> · sent to coach" |
| PR-03 | a reaction exists | taps another | it replaces the first |
| PR-04 | a reaction exists | taps Undo | it is removed |
| PR-05 | reactions exist | coach opens Today | counts per note, no parent names; other academies see nothing |
| PR-06 | the network fails | parent taps | retry message; not marked sent |
| PR-07 | an unlinked user | reacts or reads | refused |
| PR-08 | feedback not yet shared | parent reacts | refused |
| PR-09 | unknown kind / direct table write | any | refused |
| PR-10 | parent disconnected | reacts | refused |
| PR-11 | no reactions or load fails | coach opens Today | card hidden |

## Must ask the founder if
It needs free text, parent names shown to coaches, or a paid notification service.

## Tests
tests/parent-reactions-candidate.test.ts (disposable Postgres), tests/parent-reactions.test.ts, tests/component/SafetyAndReactions.test.tsx, e2e/parent-reactions.spec.ts. Hosted real-login check NOT RUN.
