# Email authentication setup

## Current web recovery —17November2026

Normal app: https://parent-plus-varcel.vercel.app. Candidate0.13.2 adds a direct recovery request form at `/auth/recovery`. Start a fresh request in the browser where the email link will open; use the newest email and choose a new password privately in the app (at least10characters). Do not send passwords or email-link URLs/codes to a coding partner.

The owner's real recovery email went to `localhost:3000`. Read-only routing probes with a deliberately invalid token independently confirmed that both default and requested live callback destinations fell back to that development Site URL. The owner changed Supabase Authentication→URL Configuration→Site URL to the normal production origin. Follow-up probes confirm both the default public origin and `/auth/recovery` now resolve correctly. No further Redirect URLs edit was needed on the observed configuration; do not ask the owner to find an unnecessary field or rerun SQL. No administrator password change or real recovery email was performed by the coding environment.

The original tab-only PKCE proof caused a separate reproduced failure when an email opened a new tab. Web recovery now shares only individually addressed, project-scoped, expiring PKCE proofs within the same browser origin. Sessions remain in per-tab sessionStorage. SDK notification channels are per document; storage aliases preserve the stable existing per-tab session keys on reload. Flow cleanup indexes remain document-local, and legacy fallback proofs remain tab-local, so another tab's account change/logout cannot replace the UI session or erase its pending email flow. Native auth stays in SecureStore.

The exact `sb_flow_id` is validated and passed to the SDK before sensitive callback parameters are removed from browser history. New Coach and Parent email links carry explicit navigation intent, independent of later requests. The plain recovery address requests an email; it never creates a session without a valid one-time code. Browser-storage restrictions can limit recovery to its requesting tab. Different browsers/profiles/devices and different preview/production origins cannot share that proof; request a fresh email on the intended public app/browser. Local proof expiry is one hour; Supabase's one-time-code and server expiry checks remain authoritative. Old unused slot bytes can remain until accessed/evicted; expiry is not an immediate disk-wipe guarantee.

Real email receipt and a real account's final password update require the owner to complete the new email flow. Do not mistake fictional SDK/browser tests for those steps. No new database migration or verification bypass is part of this repair.

## Historical native setup reference

The initial database migration and native redirect entries were owner-confirmed previously. Email/Confirm email were enabled, with anonymous sign-ins/manual linking disabled. Preserve them; the instructions below are reference, not a request to repeat native setup.

## First: register Android email-link destinations

1. Open https://supabase.com/dashboard and select your Parent Plus project.
2. Choose **Authentication**, then **URL Configuration**.
3. Under **Redirect URLs**, add these two exact entries, preserving any existing entries:

```text
parentplus-coach://auth/callback
parentplus-coach://auth/recovery
```

4. Save the changes and tell Codex “Redirect URLs saved.” If you cannot find this page, share a screenshot with any secrets hidden.

These are app destinations, not website addresses. They will open the signed Android app after its build is installed. Do not expect them to work in an ordinary browser or Expo Go without the appropriate native development build.

## Next: check email settings

1. Under Authentication, find the **Email** provider (dashboard labels may be Providers, Sign In / Providers, or Email).
2. Confirm that email sign-in is enabled and email confirmation is enabled.
3. Keep confirmation enabled. Do not disable verification as a workaround for an email-delivery error.

Supabase's default email service is for restricted testing and can limit recipients and sending frequency. It is not a production delivery plan. If delivery is restricted, Codex will guide custom SMTP setup with the chosen provider. Enter its credentials in Supabase's secure settings, not in chat or GitHub. Confirm current pricing before any paid service.

## When an Android test build is available

Codex will provide the build and a short test checklist:

1. Register using a test email inbox you control and a new password.
2. Open the confirmation email on the same device where registration started, then sign in.
3. Create your academy; close and reopen the app to verify session/workspace restoration.
4. Sign out, request a recovery email, open its newest link on the same device, set a new password, and sign in again.
5. Report any error reference. Do not send passwords, email-link codes, or tokens to Codex.

The app uses PKCE, a one-time-code flow tied to the device that requested the link. Opening the link on a different device can fail; request a fresh link on the intended device instead.

## Scope and verification limits

- Native sessions are stored using Expo SecureStore with bounded chunks and a commit manifest. Browser sessions use sessionStorage and do not survive closing the tab; only expiring, addressed PKCE proofs are shared for new-tab email callbacks.
- Confirmation/recovery codes are accepted only on the app's own routes; arbitrary access tokens from a URL are not trusted.
- Authentication callbacks do not perform awaited SDK operations inside the SDK's auth-state lock.
- The app checks the signed-in user and loads the academy through the protected API before opening the workspace.
- The interface preview is available only in development/test configuration; it loads no signed-in academy records. Production configuration omits this entry.
- Automated browser checks use intercepted fictional responses. Real email delivery, Android deep links, native SecureStore behavior, and live Supabase sign-in must still be verified on the installed build.
- Expo account name `appsworld2027` is configured, but account authorization, project linking, signing, and an APK build remain pending.
