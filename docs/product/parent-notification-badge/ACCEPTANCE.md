# Feature Contract: Parent "new from your coach" banner (M2-40, in-app part)

Status: DRAFT — founder approved all work. Roadmap: M2-40 (notification engine) — this is the in-app channel; push is the next layer.

## Why
Holidays, cancellations and feedback now reach the parent's app. A parent who opens the app must see at once that something new arrived, and be able to clear it.

## Acceptance criteria
| ID | Given | When | Then |
|---|---|---|---|
| NB-01 | announcements or reviewed feedback from the last 7 days that the parent has not marked read | opens Home | a banner "N new updates from your coach" (singular "1 new update") |
| NB-02 | parent taps "Mark as read" | — | the banner disappears; the updates stay listed below |
| NB-03 | the app is reopened after Mark as read | opens Home | banner stays hidden (this device); a newer update brings it back |
| NB-04 | items older than 7 days | opens Home | not counted |
| NB-05 | no updates | opens Home | no banner |
| NB-06 | two children | switches child | each child has its own count and read marker |
| NB-07 | device storage unavailable | any | no error; the banner may reappear |
Out (needs credentials and a new app build): push to the phone when the app is closed. Requires `expo-notifications`, a free Firebase (FCM) project key for Android, a token table and a sender function; not built, not claimed.
Tests: tests/parent-unseen.test.ts (NB-01,03,04,05,06); e2e/parent-notification-badge.spec.ts (NB-01,02,03,05).
