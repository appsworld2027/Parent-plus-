# Email authentication setup

The initial database migration was confirmed by the owner's Supabase screenshot: version `202611110001` has an applied timestamp. No further setup SQL is needed for the current login/academy module.

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

- Native sessions are stored using Expo SecureStore with bounded chunks and a commit manifest. Browser development sessions use sessionStorage and do not survive closing the tab.
- Confirmation/recovery codes are accepted only on the app's own routes; arbitrary access tokens from a URL are not trusted.
- Authentication callbacks do not perform awaited SDK operations inside the SDK's auth-state lock.
- The app checks the signed-in user and loads the academy through the protected API before opening the workspace.
- The interface preview is available only in development/test configuration; it loads no signed-in academy records. Production configuration omits this entry.
- Automated browser checks use intercepted fictional responses. Real email delivery, Android deep links, native SecureStore behavior, and live Supabase sign-in must still be verified on the installed build.
- Expo account name `appsworld2027` is configured, but account authorization, project linking, signing, and an APK build remain pending.
