# Match the saved Parent and Coach prototypes

Owner instruction: the latest saved prototypes determine the UI, including colors, themes and typography. Do not invent a replacement design. This authorizes implementing the reference on MM/development; the earlier main promotion is complete, not standing release permission.

**Reference:** founders/prototypes/ParentPlus_Coach_Tutor_App.html (upload3) and Parent_Plus_Aurora.html (upload1), revision9905456. Inspect every style block and the final cascade: both end in Borealis Night/Aurora with Bricolage, not the earlier light/system-font declarations. Preserve these reference files unchanged.

**Architecture:** extract literal final tokens and SVG paths into small shared native-compatible modules; use the existing locally licensed font for text and fields. Apply the reference to the existing live-data screens and controls. Keep Expo/RN and the current authentication/guardian/approval/consent/retry logic. Match available screens without importing mock sample records, simulated sends, feature IDs/debug controls or unimplemented prototype workflows into product flows.

- [x] VIS-01: record hashes, final computed palette/font/geometry/icon/header/nav reference; render screenshots at common mobile and desktop sizes.
- [x] VIS-02: shared font/input/select/dialog/auth/error/workspace components use final reference colors and the same font, including native fields and web DOM controls. No white-on-white or dark-on-dark selected/disabled states.
- [x] VIS-03: Coach header/content/Today/cards/forms/navigation and all implemented modules follow final Coach styles, sizes and SVG icons. Retain real dates/counts/records and existing save/recovery actions.
- [x] VIS-04: Parent Aurora header/background/child chips/cards/metrics/forms/floating navigation follow final Parent styles. Keep explicit child selection, pending-versus-approved feeds and private records unchanged.
- [x] VIS-05: compare actual browser computed styles against the independently parsed/rendered prototype; capture screenshots of existing screens, forms, menus and errors at412px and desktop, with overflow/accessibility checks. Use fictional accounts; never live inbox/provider calls.
- [x] VIS-06: run appropriate full existing type/unit/browser checks and web/Android exports; independently review exact saved source, record actual evidence/limits, commit/push MM only. No live SQL, provider settings, main promotion or real notifications.

The independent reviewer owns reference extraction and final review; implementers own separate Parent, Coach-feature and shared/shell files. Prototype behavior and unfinished full-product scope do not gain acceptance because their colors appear in the app. No screenshot comparison implies that unimplemented functionality exists or that native hardware was tested.
