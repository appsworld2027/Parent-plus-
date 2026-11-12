# Current owner steps

Development has resumed. Start with the phone check below; coding and automated tests can proceed independently. The current source of truth is [the progress checkpoint](../PROGRESS.md).

1. Install the [0.2.1 APK update](https://github.com/appsworld2027/Parent-plus-/actions/runs/43145465149/artifacts/13911472972), preserving existing app data. This build is verified; its reported-crash repair is not yet verified on the phone.
2. With guidance, test one recovery-email request, recovery link/password update, academy setup and session restart/sign-out. No new registration is required.
3. Apply the [single combined database update](CLASS_SETUP.md), which includes migrations 002, 003 and 004 after your existing 001. Test students/batches first, then classes/attendance with a verified 0.3.0 APK and fictional records.

The initial database migration and email settings were already confirmed. Do not repeat them. An Expo login, admin/network changes, or new tokens are not required for the successful GitHub preview build route. Never share passwords or login codes.
