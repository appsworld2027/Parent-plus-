# Parent Plus — Gemini surface-test pack

App under test: **https://parent-plus-varcel.vercel.app** (Coach at `/`, Parent at `/parent`).
Backend is the shared *development* database. Use only the fictional data below. Never enter real children, real phone numbers or real passwords.
Built from the code on branch `claude/peaceful-feynman-u2j011` (labels below are the real on-screen labels). Nothing here has been executed yet: every result is **NOT RUN** until Gemini fills it in.

## 0. Rules for the tester (Gemini)
1. Surface testing only: use the UI. No code, no API calls, no guessing URLs beyond `/` and `/parent`.
2. For every step record: Step ID, what you did, what you saw, PASS / FAIL / BLOCKED, and a screenshot description.
3. If something is not visible or not possible, mark BLOCKED with the reason. Never mark PASS from assumption.
4. Stop and report (do not retry more than twice) on: white screen, endless spinner (>20 s), raw error text, anything showing another family's data.
5. Never click Sign out of an account you still need; test sign-out only in section F.

## 1. Test accounts (you create them)
Sign-up sends a verification email, so Gemini cannot finish sign-up alone. Use plus-addresses on one Gmail you control (`you+x@gmail.com` all land in the same inbox) and paste the verification link/code to Gemini when asked.
Passwords must be **at least 15 characters** and at most 72 bytes (not on a breached list).

| Handle | Email | Password (fictional) |
|---|---|---|
| COACH-A | `YOURNAME+pp.coachA@gmail.com` | `Blue-Mango-Rides-Train-77` |
| COACH-B | `YOURNAME+pp.coachB@gmail.com` | `Green-Otter-Paints-Door-88` |
| PARENT-A | `YOURNAME+pp.parentA@gmail.com` | `Amber-Heron-Sings-Lake-55` |
| PARENT-B | `YOURNAME+pp.parentB@gmail.com` | `Violet-Fox-Bakes-Moon-66` |

## 2. Personas and datasets
**Coach personas**
- **Meera Iyer (COACH-A)** — runs "Sunrise Swim Academy", Bengaluru. Busy, mobile, many students. Academy name: `Sunrise Swim Academy`. Your name: `Meera Iyer`.
- **Dan D'Souza (COACH-B)** — tiny academy "Chess Nest", 2 students. Used to prove academy isolation. Academy: `Chess Nest`. Name: `Dan Dsouza`.

**Parent personas**
- **Priya Nair (PARENT-A)** — mother of two. Family `Nair Family`; children `Aarav` (born 2017-03-14) and `Ishita` (born 2019-09-02). Guardian phone `+91 90000 11111` (fictional).
- **Rohan Shah (PARENT-B)** — father of one. Family `Shah Family`; child `Kabir` (born 2018-06-20). Guardian phone `+91 90000 22222`.

**Coach data (Meera)**
| Batch | Room | Monthly fee | Students |
|---|---|---|---|
| Beginners Mon-Wed 6am | Pool 1 | ₹2500 | Aarav Nair, Kabir Shah, Zoya Khan |
| Advanced Sat 7am | Pool 2 | ₹3500 | Ishita Nair, Neel Rao |
Guardians: Aarav+Ishita → Priya Nair / `YOURNAME+pp.parentA@gmail.com`; Kabir → Rohan Shah / `YOURNAME+pp.parentB@gmail.com`; Zoya/Neel → `zoya.guardian@example.com`, `neel.guardian@example.com`.
Dan's data: batch `Opening Basics`, students `Leela Menon`, `Sam Fernandes`.

**Boundary / hostile inputs (reuse in validation steps)**
- Emails: `abc`, `abc@`, `a b@c.com`, `  YOURNAME+pp.coachA@gmail.com  ` (spaces)
- Passwords: `short12345678` (13 chars), `aaaaaaaaaaaaaaa` (15 chars, weak), 80 × `x`, `Blue-Mango-Rides-Train-77` vs mismatching confirm `Blue-Mango-Rides-Train-78`
- Text: 501-character announcement; `<script>alert(1)</script>`; `Aarav 🏊 – ñ – 你好`; 300 spaces; empty string
- Money: `0`, `-100`, `2500.50`, `25000000`, `abc`
- Dates: `2026-13-45`, `2026-02-30`, `28-11-2026`, month `2026-11`

## 3. Test cases

Legend: Expected = what must happen. Result column to be filled by Gemini.

### A. Entry, sign-up, sign-in, recovery (both workspaces)
| ID | Steps | Test data | Expected |
|---|---|---|---|
| A1 | Open `/` on desktop and a 390px-wide phone view | — | Sign-in page loads, no horizontal scroll, "Coach space / Parent space" links visible, no console error text on screen |
| A2 | Tap "Create an account", submit empty | — | Inline error "Enter a valid email address." (form kept) |
| A3 | Bad emails | `abc`, `abc@`, `a b@c.com` | Each rejected with "Enter a valid email address." |
| A4 | Password too short | 13-char `short12345678` | "Choose a password with at least 15 characters…" |
| A5 | Password mismatch | confirm `…-78` | "The passwords do not match." |
| A6 | Password over 72 bytes | 80×`x` | "Choose a password up to 72 bytes long…" (not silently cut) |
| A7 | Weak password | `aaaaaaaaaaaaaaa` | Either refused with "too easy to guess…" or shows a clear error; never a silent success |
| A8 | Valid signup COACH-A | Meera data | Message to verify email; no entry to workspace before verification |
| A9 | Verify via email link (human supplies link) | — | Returns to app, signed in, goes to academy setup (asks "Academy name" and "Your name") |
| A10 | Sign in with wrong password | COACH-A email + wrong pw | Clear generic error, no hint whether the email exists |
| A11 | "Forgot password?" | COACH-A email | Confirmation shown; reset email arrives; link opens recovery page on the app domain (not localhost); setting a ≥15-char new password works; old password then fails |
| A12 | Reload page while signed in | — | Stays signed in |
| A13 | Open `/parent` signed in as a Coach-only account | COACH-A | Parent space asks to create a family workspace; no academy data visible |

### B. Coach — Meera (COACH-A)
| ID | Steps | Test data | Expected |
|---|---|---|---|
| B1 | Academy setup | `Sunrise Swim Academy`, `Meera Iyer` | Lands on **Today**; heading "Needs you" above "Your teaching workspace"; empty academy shows "All caught up" |
| B2 | Bottom tabs | — | Tabs: Today, Schedule, Feedback, Students, Fees, Profile, Listing present and each opens without error |
| B3 | Students → Create a batch | `Beginners Mon-Wed 6am`, room `Pool 1`, fee `2500` | Batch appears in list |
| B4 | Batch validation | empty name; fee `-100`, `abc`, `2500.50`, `25000000` | Each invalid value rejected with message; form content retained; valid value `2500` accepted |
| B5 | Duplicate batch name | same name again | Rejected or warned (record outcome) |
| B6 | Add a student | `Aarav Nair`, birth `2017-03-14`, guardian `Priya Nair`, phone `+91 90000 11111`, email parentA | Student saved and listed in the batch |
| B7 | Add rest of roster | Kabir, Zoya (Beginners); Ishita, Neel (Advanced batch `Advanced Sat 7am`, Pool 2, ₹3500) | All appear; Search students finds `kab` → Kabir |
| B8 | Duplicate student | `aarav nair ` (case/space variant) in same batch | Warned or blocked as duplicate |
| B9 | Edge text | student name `Aarav 🏊 – ñ – 你好`; `<script>alert(1)</script>` | Saved/displayed as plain text; no script runs; layout intact |
| B10 | Edit student details / archive a student | Zoya | Edit persists after reload; archived student hidden from active list |
| B11 | Schedule a class | Beginners, date next Monday, 06:00–07:00, Pool 1 | Class listed under Schedule and on Today (when today) |
| B12 | Class validation | date `2026-13-45`, `2026-02-30`, `28-11-2026`; end before start | Each rejected with message |
| B13 | Mark attendance ("View saved attendance") | Aarav present, Kabir absent | Saved; reload shows same marks |
| B14 | Cancel a class | the class from B11 | Shows under "View today's cancelled classes" / status Cancelled |
| B15 | Feedback tab → write feedback | Student `Aarav Nair`, text `Aarav floated 10 seconds unaided and kicked well today.` | Saved as private draft/record; NOT sent to parent yet |
| B16 | Feedback edge cases | empty text; 300 spaces | Blocked with message |
| B17 | Today "Needs you" | after B15 | Count drops: Aarav no longer listed; "N children need feedback" wording correct (1 child → "1 child needs feedback") |
| B18 | Review & approve for parent | Aarav's feedback | Explicit review/approval step exists; parent receives only after approval |
| B19 | Fees → create invoice | Aarav, billing month `2026-11`, ₹2500, due `2026-12-05` | Invoice listed as unpaid |
| B20 | Record manual payment | ₹1000, received `2026-11-28`, method UPI, ref `UPI-TEST-001` | Balance ₹1500; status partial; payment in history |
| B21 | Overpay / bad amount | `0`, `-100`, `abc`, `3000` (> balance) | Rejected or clearly handled; record what happens |
| B22 | Void unpaid invoice | an unpaid test invoice | Marked void; paid invoices cannot be voided |
| B23 | Overdue fee | invoice due `2026-11-01` unpaid | Today "Needs you" lists overdue fee; tap opens that student's fee record; Fees shows overdue first |
| B24 | Announcement | Post to Beginners batch: `Pool closed Monday for cleaning.` | Posted to that batch's families only (verify in parent tests D) |
| B25 | Announcement limits | empty; 501 chars | "Write a message first." / "Keep it under 500 characters." |
| B26 | Profile & Listing | fill provider profile, preview listing | Fields validate; nothing publishes without explicit action; record anything that does |
| B27 | Unsaved changes | type in a form, tap another tab | Warned about unsaved changes, not silently lost |
| B28 | Reload mid-way | refresh on each tab | No crash; data persists; stays signed in |

### C. Parent invitation / connection (Meera → Priya)
| ID | Steps | Test data | Expected |
|---|---|---|---|
| C1 | COACH-A: open Aarav → parent link card, issue invitation | Guardian email = parentA | One-time code shown; requires ticking "I checked the intended guardian email" |
| C2 | Wrong-email guard | Try to issue with blank guardian email | Blocked |
| C3 | Sign up PARENT-A at `/parent` | Priya data | Verification → "Create my family workspace": `Nair Family`, `Your parent name` = `Priya Nair` |
| C4 | Add children | `Aarav` 2017-03-14, `Ishita` 2019-09-02 | Both chips selectable |
| C5 | Child validation | empty name; future birth date `2031-01-01` | Rejected |
| C6 | Connect a coach | paste code from C1, choose Aarav | Shows academy + student identity for review; "This is the right coach and child" required; then "Request coach approval" |
| C7 | Bad / reused / expired code | `ABC-123`; reuse the used code | Clear error, no connection |
| C8 | Coach approval | COACH-A approves the pending request | Parent sees connected state ("Check connection approval" refresh works) |
| C9 | Wrong child | Try linking code for Aarav to Ishita | Blocked or explicit mismatch warning (record behaviour) |
| C10 | Cancel pending connection | start a new request, cancel | Request withdrawn |
| C11 | Disconnect coach | Priya disconnects, confirms | Feedback no longer visible; reconnect needs a new code |

### D. Parent — Priya (PARENT-A)
| ID | Steps | Expected |
|---|---|---|
| D1 | After C8 + B18: open Home / "From coaches" | Aarav's approved feedback visible; Ishita sees nothing from Aarav's feedback |
| D2 | Announcement from B24 | Priya (Aarav in Beginners) sees it; Rohan does NOT see Advanced-only messages and a Chess Nest family never sees it |
| D3 | Quick signals | Tap **Running late**, **Missing today**, **Dropped off** for Aarav | Each confirms; Coach Today shows "From parents today"; withdraw works |
| D4 | Family plan | `Swim gala`, date `2026-12-05`, 08:00–10:00, `City Pool` | Saved, shows under Week |
| D5 | Plan validation | end before start; bad date | Rejected |
| D6 | Reminder / family moment / together minutes | `Pack goggles`; moment `Aarav floated!` ; minutes `30` and `-5` / `abc` | Valid saved; invalid rejected; week total updates only after saved |
| D7 | Media choices | Open permissions: "Allow class photos of my child", "Allow class videos of my child" | Both OFF by default; toggling then "Save my media choices" persists after reload |
| D8 | Explore | "Explore interface preview" | Clearly labelled preview; no fake successes (no fake bookings/calls) |
| D9 | Refresh | "Refresh family records" | Data stays; no duplicates |
| D10 | Switch Coach space / Parent space | with unsaved form | Blocked or warned; with no unsaved form, same-tab session preserved |

### E. Isolation and security (most important)
| ID | Steps | Expected |
|---|---|---|
| E1 | COACH-B signs up, academy `Chess Nest`, adds Leela, Sam | Dan sees NONE of Meera's batches, students, fees, announcements |
| E2 | Meera never sees Chess Nest data | Confirmed after reload on both |
| E3 | PARENT-B (Rohan) signs up, family `Shah Family`, child Kabir, connects via Meera's code | Rohan sees only Kabir's approved feedback; never Aarav's or Ishita's |
| E4 | Priya vs Rohan | Neither sees the other's family, children, plans, moments |
| E5 | Unreviewed feedback | Feedback saved but not approved never appears to parents |
| E6 | Parent tries Coach areas | PARENT-only account opens `/`: no academy data; asks for academy setup rather than exposing data |
| E7 | URL tampering | Open `/parent` with a different path, `/admin`, `/api` | Safe not-found/sign-in; no stack traces |
| E8 | Injection strings | `<script>alert(1)</script>`, `' OR 1=1 --` in every text field | Rendered inert; no error dialog |
| E9 | Session end | Sign out (section F), press browser Back | Does not reveal previous account data |

### F. Sign-out, change password, resilience, UX
| ID | Steps | Expected |
|---|---|---|
| F1 | Settings → change password (current wrong, new <15, mismatch, valid) | Errors for first three; valid works; next sign-in needs new password |
| F2 | Sign out | Returns to sign-in; no data flash |
| F3 | Go offline (browser devtools or airplane) then save feedback/payment | Clear failure message and a retry (e.g. "Retry pending fee save"); no lost or duplicated record after reconnect |
| F4 | Double-tap save on feedback/payment/announcement | Exactly one record created |
| F5 | Browser Back/forward during forms | No crash, no duplicate |
| F6 | 390px phone width, 768px tablet, 1440px desktop | No clipped buttons, no overlapping text, tap targets usable |
| F7 | Keyboard only: Tab through sign-in and one form | Visible focus; Enter submits; errors announced near field |
| F8 | Support: Settings → "Open support and diagnostics" → "Run safe error check" | Report contains no password, token or personal data |
| F9 | Loading states | Spinners ("Loading roster", etc.) end; no stuck state >20 s |

## 4. Reporting format Gemini must return
1. Summary table: section, total, PASS, FAIL, BLOCKED, NOT RUN.
2. Defect list: ID, step, expected, actual, severity (Critical = data leak or data loss; High = flow broken; Medium; Low), repro steps, screenshot.
3. Separate list "Could not test and why".
4. Final line: GO / NO-GO with reason. Any E-section FAIL = NO-GO.

## 5. Known limits (do not report as defects)
- Hosted dev database only; real WhatsApp/SMS/email sending to parents, push notifications and payment gateway are not live. Anything claiming otherwise is a defect.
- Some workspace features (candidates 015–021) are not installed in the hosted database; a clear "not available yet" message is acceptable, a crash is not.
- Real-device Android is not covered by this web test.
