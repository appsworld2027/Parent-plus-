# Visible action results — version 0.3.1

The owner reported that success/failure was unclear on the phone. Version 0.3.0 put messages inside page scroll content, so a completed action could leave its result above the viewport. This is a UI feedback defect, not proof that a write failed.

## Current behavior

`FeedbackProvider` owns one in-app notification. `ActionFeedback` reserves a row outside page scrolling: below the workspace header or at the top of an auth page. It stays visible while the content scrolls and does not cover navigation/buttons. The notification remains until Dismiss, a replacement result or departure of its scoped screen. Account-completion messages survive the auth/workspace transition.

- Green: a confirmed server action, with relevant details. Class confirmations include saved dates/times; attendance confirmations include present/late/absent counts.
- Blue: information, including **Device draft saved — not sent to class**. A device save does not assert a successful server save.
- Red: validation, failure or an unconfirmed operation, with safe recovery guidance/reference where available. This does not automatically mean a timed-out request could not have committed.
- While a save is pending, its previous result is cleared and the relevant button displays Saving/Please wait and is disabled. A new success is published only after confirmation/reconciliation.

Ordinary navigation/filter taps use their selected state rather than success popups. The notifications cover mutation/request outcomes, including roster save/archive/refresh, classes, attendance/device drafts, email requests, explicit login/password update/academy creation/logout and diagnostic preparation/sharing errors. This is app UI; no OS notification permission or backend change is needed.

## Implementation map

- `src/ui/ActionFeedback.tsx`: provider, fixed host, safe ARIA/live-region roles, bounded scrollable notification body, Dismiss, and `useFeedbackMessage`.
- `App.tsx`: provider wraps auth; workspace host is outside `workspace-scroll`.
- `AuthGate.tsx`: auth page host; forms publish safe results. Account-level completions use provider notices across screen transitions.
- Roster/classes/Today screens use scoped `useFeedbackMessage`. Explicit setter calls publish outcomes, including repeated identical saves. Do not replace this with an effect watching a string: that misses equal results and can reannounce stale success.
- Clearing one source cannot clear an unrelated newer result. Unmounted publishers do not surface stale results. Notification text stays in UI memory and is not forwarded to diagnostics.
- Archive and device-draft-discard dialogs close on failure so their native Modal cannot cover the error notification. Confirmation dialogs remain deliberate choices, distinct from result notifications.

Inline context remains available after dismissal; its duplicate announcements are removed. React rendering failures still use the existing full-screen recovery boundary. Not every native crash is captured; this patch does not add remote crash telemetry.

## Evidence and remaining acceptance

79 automated checks passed, including the native-role source-contract guard. All 30 browser flows passed, followed by 21 focused auth/classes/feedback checks after final wording changes. The four new feedback flows verify full viewport visibility while scrolled, repeated identical saves, failed archive/modal dismissal, local-vs-server status, unchanged server records after failure, and no stale success during a held request.

Inspected screenshots use fictional records: [success](images/feedback-success.png), [failure](images/feedback-error.png). Native build/signature verification passed in run 43176931524 for source 73805fa. Phone acceptance remains pending. Database versions 001–004 are already installed; **do not repeat SQL setup** for this patch.
