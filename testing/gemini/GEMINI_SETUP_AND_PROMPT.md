# Gemini Pro — setup steps and prompt

## Which Gemini mode (pick the first one you have)
1. **Gemini in Chrome / Agent (browser control)** — if your Pro plan shows an "Agent" / "auto browse" option, Gemini can click through the app itself. Availability depends on plan and country; if you do not see it, use option 2.
2. **Guided mode (works on every plan)** — Gemini is the test lead; you are its hands. It tells you one step at a time, you do it on https://parent-plus-varcel.vercel.app, then paste what you saw or a screenshot. Slower but reliable.

## Setup (once, ~10 minutes)
1. Open https://gemini.google.com signed in to your Pro account. Choose the **Pro** (not Flash) model in the model picker; turn on **Deep Think / thinking** if offered.
2. Create a new chat (or a **Gem** named "Parent Plus QA" and paste the prompt below as its instructions).
3. Attach `testing/gemini/GEMINI_TEST_PLAN.md` (upload file, or paste its text if upload is unavailable; split by section A–F if the chat truncates).
4. Prepare 4 plus-address emails on your Gmail (see plan §1). Keep that inbox open for the verification and reset emails.
5. Open the app in Chrome, one **normal window for Coach**, one **Incognito window for Parent**, so sessions do not mix.
6. Run sections in this order: A → B → C → D → E → F. After each section, ask Gemini for the summary table, and save the chat.
7. At the end send Gemini: "Produce the final report in the format of section 4" and paste it back to your Claude session; I will triage defects and fix them.

## Prompt (paste as the first message)
```
You are a senior QA engineer testing a web app called Parent Plus: https://parent-plus-varcel.vercel.app (Coach workspace at "/", Parent workspace at "/parent"). It is a coach/academy management app with a parent app for children's feedback, fees, classes and announcements.

I attached the test plan (sections A-F) with personas, fictional test data, test steps and expected results. Follow it exactly.

Rules:
- Surface testing only, through the user interface. Do not invent features or data. Use only the fictional data in the plan.
- Work one test ID at a time. For each: say what to do, then record Actual result and PASS / FAIL / BLOCKED. If you cannot see or do something, mark BLOCKED, never guess.
- Compare Actual against Expected literally, including exact on-screen wording where the plan quotes it.
- I will relay verification-email links and screenshots. Ask me when you need them.
- After each section output a table: ID | Result | Actual | Defect? and counts. Give each defect: severity (Critical = privacy leak or data loss), repro steps, expected vs actual.
- Any case where one family/academy can see another's data is Critical and ends the section with NO-GO.
- Do not paste real personal data; do not submit real phone numbers or cards.
- If you are unsure, ask me one short question instead of assuming.

Start with section A, test A1, and tell me exactly what to do.
```

## If Gemini drifts or truncates
- Say: "Continue from test ID <x>. Do not repeat earlier tests."
- Start a fresh chat every ~2 sections and re-attach the plan plus a 5-line summary of results so far.
