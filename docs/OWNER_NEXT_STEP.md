# Current owner steps

**Development has resumed. Nothing is required from you while the new build is prepared.** Set up the laptop emulator when convenient; physical-phone automation remains on hold. The 0.3.2 phone/Windows-emulator compatible APK build is verified; the owner has confirmed database versions 001–004 installed. Phone and real app/API acceptance remain pending.

Existing database updates 001–004 are complete; do not repeat them. The new observations module requires only migration 005, prepared with [short direct-link instructions](OBSERVATIONS.md). Its deployment has not yet been confirmed.

1. For laptop checks, follow [Windows Intel emulator setup](WINDOWS_EMULATOR.md). For the phone, install the [0.3.2 APK](https://github.com/appsworld2027/Parent-plus-/actions/runs/43186145925/artifacts/13928512623), preserving existing app data. Extract the ZIP and tap `ParentPlus-Coach-Preview.apk` → Update. This includes the earlier email repair plus fixed visible action notifications; no separate 0.2.1 installation is needed.
2. First check one result: Students → Batches → edit the existing test batch → Save batch. Expect a green fixed notification saying Batch saved. Dismiss it, then continue the guided attendance save/reopen check. No additional SQL is needed.
3. With guidance, verify one recovery-email success message stays open, then complete recovery/password update, academy setup, session restart/sign-out and roster tests. Use the existing account; no new registration is needed.
4. Once the new build is ready, complete the one-time [observations update and short test](OBSERVATIONS.md).
5. Test classes/attendance with fictional records using [the phone checklist](CLASS_SETUP.md). Save to the class before sign-out because device-only drafts are cleared.

The initial migration and email settings were already confirmed. No Expo authorization, admin/network changes or new tokens are needed for this working preview route. Never share passwords or login codes. See [current progress](../PROGRESS.md).
