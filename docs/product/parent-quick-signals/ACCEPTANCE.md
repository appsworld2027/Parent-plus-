# Feature Contract: Parent quick signals (M2-06)

Status: DRAFT — awaiting founder approval. No tests or code exist. Source: docs/product/BACKLOG.md line "parent-quick-signals". Roadmap: M2-06

## Why
A parent running late or unable to attend should tell the coach in one tap, without a WhatsApp message the coach may miss. The coach then knows who is coming before class starts.

## In / Out
- In: three signals (Running late, Missing today, Dropped off), shown to the coach, one signal per child per class session, recovery from errors.
- Out: free-text chat, push notifications, attendance records, fee impact, signals for classes the child is not linked to.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| QS-01 | a verified parent linked to a child with a class today | parent opens the child's card | three buttons show: Running late, Missing today, Dropped off |
| QS-02 | a child with no class today | parent opens the card | the buttons are hidden and a "No class today" note shows |
| QS-03 | buttons showing | parent taps one | the signal saves in one tap and the card shows "Sent to coach" with the time |
| QS-04 | a signal was sent | parent reopens the app or another device | the same signal and time still show |
| QS-05 | a signal was sent | parent taps a different signal | it replaces the first; the coach sees only the latest, and the change time is kept |
| QS-06 | a signal was sent | parent taps Undo within the session day | it is withdrawn and the coach no longer sees it |
| QS-07 | the coach opens Today | any signals exist for today's classes | they show under the class, child name first, newest first, with the time sent |
| QS-08 | no signals for a class | coach opens Today | that class shows no signal area and no empty-state clutter |
| QS-09 | the network fails while sending | parent taps a signal | a clear retry message shows, the button is not marked sent, and no duplicate is created on retry |
| QS-10 | a parent not linked to the child, or linked in another academy | tries to send or read a signal (screen or direct API call) | refused; nothing saved; no data revealed |
| QS-11 | a coach not in that academy | tries to read signals (screen or direct API call) | refused; fail closed |
| QS-12 | a signal for a past day | the next day starts | it is no longer shown as current to the coach or the parent buttons, and a new day starts clean |

## Agents may decide alone
Button layout and icons, exact wording of the confirmation, how signals are stored.

## Must ask the founder if
It needs a hosted database change, a paid notification service, or free-text from parents.

## Tests
Locked tests: e2e/acceptance/parent-quick-signals.spec.ts, plus a disposable-database test for QS-10/QS-11. Hosted database changes are founder-gated and reported NOT RUN.
