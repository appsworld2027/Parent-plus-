# Current owner steps

Development has resumed. The final 0.3.0 APK build is verified; database deployment and phone acceptance still need confirmation.

1. Apply the [single combined database update](CLASS_SETUP.md) in your [Supabase SQL Editor](https://supabase.com/dashboard/project/zcgcnycnanqkbdlwojln/sql). It applies 002, 003 and 004 after your existing 001. Share the result/version rows. Do not repeat the initial setup.
2. Install the [final 0.3.0 APK update](https://github.com/appsworld2027/Parent-plus-/actions/runs/43164824902/artifacts/13920265830), preserving existing app data. Extract the ZIP and tap `ParentPlus-Coach-Preview.apk` → Update. This includes the earlier email success-message repair; no separate 0.2.1 installation is needed.
3. With guidance, verify one recovery-email success message stays open, then complete recovery/password update, academy setup, session restart/sign-out and roster tests. Use the existing account; no new registration is needed.
4. Test classes/attendance with fictional records using [the phone checklist](CLASS_SETUP.md). Save to the class before sign-out because device-only drafts are cleared.

The initial migration and email settings were already confirmed. No Expo authorization, admin/network changes or new tokens are needed for this working preview route. Never share passwords or login codes. See [current progress](../PROGRESS.md).
