# Feature Contract: Class announcements (M2-50)

Status: DRAFT — founder told AI to assume permissions. Source: docs/product/BACKLOG.md "class-announcements". Roadmap: M2-50

## Why
A coach has one message for a whole batch (holiday, room change, bring a costume). Posting it once should reach every linked family, without WhatsApp groups.

## In / Out
- In: coach posts one text announcement to one batch; linked parents of enrolled children see it for 7 days.
- Out: replies, push notifications, attachments, editing or deleting, announcements to unlinked families.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| CA-01 | a coach with batches | opens Today | an "Announce to a batch" area shows batch choices and a message box |
| CA-02 | batch chosen, message typed | coach taps Post | it saves once and confirms "Posted to <batch>"; the box clears |
| CA-03 | empty or blank message | coach taps Post | refused with a clear note; nothing saved |
| CA-04 | message over 500 characters | coach tries to post | refused (screen and database); nothing saved |
| CA-05 | the post fails (network) | coach taps Post | a retry message shows, the text is kept, no duplicate on retry |
| CA-06 | a linked parent of a child enrolled in that batch | opens the child's card | "From your coach" shows the batch name, message and time, newest first |
| CA-07 | a parent whose child is not in that batch, or an unlinked user | reads (screen or direct API call) | nothing shown; fail closed |
| CA-08 | no announcements | parent opens the card | no announcement area, no empty clutter |
| CA-09 | an announcement older than 7 days | parent opens the card | it is no longer shown |
| CA-10 | a coach of another academy | posts to this batch (screen or direct API call) | refused; nothing saved |
| CA-11 | any user | writes the table directly | refused; only the post function can create |
| CA-12 | a parent | calls the post function | refused |

## Agents may decide alone
Layout, wording of confirmations, storage design.

## Must ask the founder if
It needs a hosted database change, push notifications (paid), or parent replies.

## Tests
Disposable-database test tests/class-announcements-candidate.test.ts (CA-03/04/07/09–12); browser spec e2e/class-announcements.spec.ts (CA-01–03, 05, 06, 08). Hosted DB changes are founder-gated and NOT RUN.
