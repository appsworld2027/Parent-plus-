# Use Parent Plus Coach on a Windows Intel laptop

# Historical setup — retired 17 November 2026

This guide describes the previous APK/emulator path. The owner has moved deployment and acceptance to Vercel; do not download or install APKs for current ParentPlus work. Retain the steps below only as historical context.


Owner hardware: Windows, Intel Core Ultra 7. This is an x86-64 host. The earlier 0.3.1 APK is ARM64-only; do not assume it works on a standard x86_64 emulator. Latest verified **0.4.0** packages both `arm64-v8a` and `x86_64`; [run 43225589808](https://github.com/appsworld2027/Parent-plus-/actions/runs/43225589808) passed native compilation, signature verification and ELF/header checks for 17 libraries per architecture. [Download the compatible APK](https://github.com/appsworld2027/Parent-plus-/actions/runs/43225589808/artifacts/13948107259). Actual startup/UI acceptance on this laptop is still pending.

## Setup on the laptop

1. Download [Google Android Studio for Windows](https://developer.android.com/studio). Include Android Virtual Device during setup.
2. Open **More Actions → Virtual Device Manager** from the welcome screen, or **Tools → Device Manager** from an open project. Menu labels can vary by release.
3. Choose **Create Virtual Device**, select a Pixel phone profile, then choose a **Google APIs x86_64** system image such as **Android 15 / API 35**. Accept the official SDK license/download as prompted. Do not select ARM64 for this Intel laptop.
4. Finish and press the play/start button beside that virtual device. Wait for its Android home screen.
5. Download the [verified **0.4.0 multi-architecture APK**](https://github.com/appsworld2027/Parent-plus-/actions/runs/43225589808/artifacts/13948107259), extract the ZIP and drag `ParentPlus-Coach-Preview.apk` onto the running emulator. Do not use the older phone-only build for this test.
6. Open Parent Plus Coach Preview and sign in with the existing app email/password. A new emulator does not contain the phone's saved session, so it should ask for login. Do not create another app account just for this step.
7. Check the green result notice by opening Students → Batches → edit the test batch → Save batch. Then complete the guided attendance-save/reopen checks.

The laptop processor is suitable in principle; RAM, disk space, Windows virtualization availability and organization policy also affect emulator startup. For practical use, plan for at least 16 GB RAM and roughly 30 GB free space. If Android Studio reports a virtualization/hypervisor or installation restriction, share the exact message. Do not change organization/admin settings blindly. A browser preview is a possible fallback for workflow checks, but it is not native Android acceptance.

No USB connection to the personal/work phone, phone debugging setup, Google Play purchase is needed. Existing login/roster/classes need no repeat database setup. Only the new observations module needs [migration 005](../../ai-workspace/features/OBSERVATIONS.md), which has not yet been deployed. A Google account is not needed merely to sideload this APK. Use a separate test Google account if an optional emulator service requires one; avoid syncing work/personal content.

Saved Supabase records are shared after signing in to the same app account. A phone's **device-only unsent attendance draft** does not transfer to the emulator. Save it to its class on the phone first if that work must appear on the laptop.

## What has and has not been verified

The build guard checks both requested ABI folders and the ELF machine type of every packaged native library, in addition to APK signature verification. That establishes native CPU packaging. It does not prove installation, startup, graphics, email links or app flows on this particular Windows emulator.

Observations are implemented in this verified 0.4.0 build; live deployment/acceptance is pending. Physical-phone automation remains on hold. This packaging work supports the owner's requested manual laptop testing; it does not connect the cloud agent to the laptop or phone.
