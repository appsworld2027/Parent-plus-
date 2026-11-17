# Step 0: prepare accounts and the development foundation

You do not need to install coding tools or write code. This step prepares access so Codex can build and test the app. Start with Supabase; complete other accounts in parallel where convenient.

Current setup and acceptance position is in [PROGRESS.md](PROGRESS.md) and [owner next steps](founders/getting-started/OWNER_NEXT_STEP.md). The original preparation instructions below are retained for reference; do not repeat completed project/email setup or treat Expo authorization as necessary for the working GitHub preview route.

## A. Your first task: Supabase development project

1. Open https://supabase.com/dashboard and sign in. GitHub sign-in is convenient if offered, but not required.
2. Create an organization if asked. Choose a free option if available and suitable; pause before any paid commitment.
3. Choose New project. Name it `parentplus-coach-dev` so it is clearly a development project.
4. Generate a strong database password and save it in your password manager. Do not send it in chat.
5. Choose a region near the intended pilot users. For an India pilot, select a nearby available region; the listed choices may vary. Keep any formal residency requirements in mind before creating live records.
6. Create the project and wait for its dashboard to become available.
7. Locate the project URL and publishable API key. Depending on the dashboard version these may appear under Connect, API, or Project Settings. A legacy key labelled `anon` serves a similar client purpose; never substitute a secret or `service_role` key.
8. Tell Codex: “Supabase development project created.” You may share the project URL; do not paste secret keys, passwords, or access tokens. Codex will identify the supported secure configuration route before requesting any credentials.

If you cannot find a menu, describe the labels you see or send a screenshot with credentials hidden. You do not need to troubleshoot it yourself.

Done means the project exists. Schema setup, backend access, authentication configuration, and security validation remain Codex-led implementation steps.

## B. Prepare Android build access

1. Open https://expo.dev/ and create/sign in to an account.
2. Keep ownership with you. Do not purchase a plan yet; check available allowances and build requirements first.
3. Have an Android phone available for testing. Expo Go may help early screen checks if compatible; the gateway/native dependencies and final pilot may require a development or standalone build.
4. Tell Codex whether the account and phone are available. Do not send your password or access token in chat.

## C. Begin payment-provider onboarding

1. For the planned India/INR pilot, open https://razorpay.com/ and review merchant eligibility before creating an account. Another provider may be needed if the business/country is ineligible.
2. Register for the academy/business that will actually receive fees. Do not enter invented business or bank details.
3. Complete the provider's requested verification yourself and check whether test-mode access is available. Live approval can take longer than development.
4. Do not create or share keys in chat. When the backend exists, Codex will guide server-secret entry and webhook registration using its actual URL.
5. Tell Codex whether test access is available and live verification is pending. Review fees before accepting any paid commitment.

No live transaction or real parent payment is needed in Step 0.

## D. GitHub

The selected repository is `appsworld2027/Parent-plus-`. Its read access was verified during onboarding. No new repository is needed. Push/PR and CI capabilities must be checked separately before claiming changes have been published.

Work does not automatically sync from this cloud workspace to your computer. The app, plans, migrations, and tests have now been committed and pushed to GitHub branch `codex/coach-foundation`. Select that branch on GitHub or fetch it into your local checkout. It has not been merged into `main`, and no pull request has been created.

## E. What Codex builds as Module 0

Once implementation begins, Codex will:

1. Create the Expo/TypeScript app and native navigation in the existing checkout.
2. Add configuration validation and a secret-free environment-variable template.
3. Add automated checks and the first meaningful tests; prepare GitHub CI.
4. Add error boundaries, safe error references, diagnostic/version display, and an issue/validation record.
5. Run startup and controlled-error checks, verify the Android build path, and report actual results.
6. Continue database/auth work as configuration becomes available. Backend-independent work can proceed while you create accounts.

Module 0 passes only when the app can launch, the first checks run, and a controlled failure is recoverable and traceable. Creating accounts or writing configuration files alone does not pass it.

## Simple status reply

Reply with whichever items you have completed:

- Supabase: created / need help
- Expo: account available / need help
- Android phone: available / unavailable
- Gateway: test access available / verification pending / need help

This is a status checklist, not a request for passwords or API secrets. Start with Supabase only if you prefer one step at a time.
