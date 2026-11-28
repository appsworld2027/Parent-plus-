# Feature Contract: Holiday calendar prompt (M2-07)
Status: DRAFT — founder standing permission. Scope kept honest: fixed-date national holidays only.
| ID | Given | When | Then |
|---|---|---|---|
| HC-01 | a fixed-date national holiday (Republic Day, Independence Day, Gandhi Jayanti, Christmas, Ambedkar Jayanti, Labour Day) in any year | date checked | name returned |
| HC-02 | ordinary day or bad input | — | none |
| HC-03/04 | a date window | listing | holidays in order, including the start day |
| HC-05 | coach views such a day on Schedule | — | prompt "…is a national holiday. Tap Mark this day as a holiday if your classes are off." |
| HC-06 | same | — | nothing is cancelled automatically (browser) |
Out (honest): lunar festivals (Diwali, Holi, Eid…) change yearly and are NOT listed; coach marks them with the existing holiday button; academy-specific saved calendar needs a database table (not built). Tests: tests/national-holidays.test.ts, e2e/smart-defaults.spec.ts (HC-06).
