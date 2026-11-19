# Saved prototype visual reference

19 November 2026. Scope: reproduce the saved Parent and Coach visual treatment on existing application flows. Do not invent a new design or build the prototype-only product features. This is an independent reference audit, not implementation or a claim of finished visual parity.

## Authoritative files and cascade

Both saved references last changed in `9905456c69ae481d0acc017b6943598d9c1c0dda`, committed 19 November 2026 at 11:37:28 UTC. App baseline inspected: `260047fbcbb66c90f0c3b19de3b9932c047fe974`.

| Reference | SHA-256 of saved HTML |
| --- | --- |
| [Coach/Tutor](../../founders/prototypes/ParentPlus_Coach_Tutor_App.html) | `ac1775468070a46e1b7139aa2bada49a7ff03b09321e9ddadb96e1dc92555287` |
| [Aurora Parent](../../founders/prototypes/Parent_Plus_Aurora.html) | `a784589890c6f6d4bd757756253350e8d67f75fcf27c794af2e7345a47ca7776` |

**Use the final CSS cascade, not the first style block.** Each document has three style blocks. Coach starts with a light paper/teal palette, then its dark override starts at line 157. Parent initially declares a system font; the later `MANU EXACT VISUAL SKIN` block changes the body to Bricolage Grotesque, and the final Aurora override starts at line 146. No later JavaScript font replacement was found. The final rendered Parent font is Bricolage, not the initial system stack; neither final screen uses the initial light Coach or black/charcoal intermediate Parent palette.

Computed reference checks used Chromium, reduced motion, device scale 1, mobile viewport 412×915 and desktop viewport 1280×1000. HTML was rendered in memory; all outbound resource requests were aborted. The existing bundled Bricolage TTF was supplied with a temporary in-memory `@font-face` instead of fetching Google Fonts. Both bodies computed to `"Bricolage Grotesque", system-ui, -apple-system, sans-serif`, and the local face loaded. Source HTML was unchanged. Initial sandbox/file-navigation failures were bypassed by this in-memory render; no app server or port 18081 was used.

## Final color and typography contract

| Token / use | Coach | Parent |
| --- | --- | --- |
| App background | `--paper: #0C1722` | `--bg: #0C1722` |
| Main surface | `--card` / `--s1: #132231` | `--s1: #132231` |
| Secondary surface / input | `--soft` / `--s2: #1C2F40` | `--s2: #1C2F40` |
| Raised surface | `--s3: #284054` | `--s3: #284054` |
| Surface border | `--line: #24384A` | `--line: #24384A` |
| Main text | `--ink: #F9FBFD`; many actual labels `#FFFFFF` | `--ink` / `--tx` / `--white: #FFFFFF`; header `#F7FBFF` |
| Muted / dim | `#9EB2C4` / `#6F8597` | `#9EB2C4` / `#6F8597` |
| Primary action | White fill, black text | White fill, black text |
| Secondary action | `#1C2F40` fill, white text | `#1C2F40` fill, white text |
| Shared CSS accent variables | Sun `#FFD23F`; rose `#FF5D8F`; sky `#3ABEFF`; mint `#2EE6A6`; grape `#A27BFF`; tangerine `#FF8A3D` | Same; WhatsApp accent `#25D366` where the reference actually uses it |
| CSS alias retained | `--teal: #3ABEFF`, `--teal2: #1C2F40` | Header `--hdr: #0D2030` |
| Body | Bricolage, 16 px, 400, normal line height | Bricolage, 15 px, 400, line-height 1.4 = 21 px |
| Main screen title | 30 px / 700; line-height 1.05 = 31.5 px; tracking −1.2 px | 34 px / 800; line-height 1.04 = 35.36 px; tracking −1.3 px |
| Subtitle | 13 px / 400, muted | 13 px / 600, `#CFE0EA` |
| Section heading | 15.5 px / 700, tracking −0.2 px | 19 px / 800, tracking −0.4 px |
| Standard primary button | 13.5 px / 800 | Sheet primary: 13 px / 830 |

**Coach has two intentional accent palettes.** Its JavaScript `C` map remains pastel and is assigned inline, so the final CSS variables do not replace those fills: sun `#F2D58A`, rose `#F1B9C7`, sky `#AFD5F0`, mint `#AEDEC6`, grape `#CBBDEB`, tangerine `#F5C6A2`. The rendered Today metric tiles, list icons, avatars and some batch markers retain these pastel colors. Attendance selections use the bright CSS variables. Parent's JavaScript `C` map uses the six bright accents. Do not globally substitute one palette for the other.

Font asset: [BricolageGrotesque.ttf](../../assets/fonts/BricolageGrotesque.ttf), existing OFL license. FontTools inspection: version 1.001; variable axes `wght` 200–800 (default 800), `opsz` 12–96 (default 96), `wdth` 75–100 (default 100). References declare intermediate CSS weights including 650/750/780/830/850; computed CSS retains those values, while actual glyph interpolation is bounded by the font. A family-name string alone does not establish correct weight or optical sizing. Check the self-hosted web face and native rendering; do not claim native parity from the Chromium result.

## Coach layout and controls

Measurements below are final reference styles; heights derived from fixture text are not fixed app data requirements.

| Element | Exact reference treatment |
| --- | --- |
| Mobile phone surface | Full 412×915 at the measured viewport; radius 0; viewport height via `100dvh`; scroll bottom reserve 110 px |
| Desktop reference | Frame width 410 px, padding 11 px, radius 52 px; inner phone 388×860, radius 42 px. Desktop side copy/device bezel are presentation chrome; compare the cropped phone to app content. |
| Top row | Padding `12px 18px 6px`; final override wins over the earlier mobile 16 px rule; measured height 58 px |
| Brand | 30×30 white icon tile, radius 10, black SVG star; gap 9; title 15 px / 800; secondary name 10.5 px / 700 muted |
| Top actions | 40×40, radius 14, surface `#132231`, border `#284054`, white outlined SVG; rose count bubble if real state exists |
| Title region | Padding `10px 18px 2px`; subtitle top margin 5 px. Prototype disclaimer/feature-ID rows are demo metadata, not production content. |
| Main content | Padding `8px 18px 20px`; all ordinary content width 376 px at 412 px viewport |
| Card / list | Radius 18, 1 px `#24384A`; list padding `2px 14px`; row vertical padding 11 px, gap 11, dividers `#24384A` |
| Metric tile | Radius 14; padding `9px 10px 10px`; numeric value 19 px / 700, tracking −0.6, line-height 1.1; inline pastel fill, black text |
| Next-class band | Sky `#3ABEFF`, black text; radius 18; padding `11px 12px 11px 15px`; margin-top 12; internal gap 12; black pill action, white text |
| Chips | Radius 999; padding `8px 12px`; font 12 / 750; inactive surface `#132231`, muted; selected white/black |
| Primary / secondary | Radius 14; padding `13px 16px`; primary white/black, secondary `#1C2F40`/white; small action 11.5 px, padding `8px 11px`, radius 11 |
| Textarea | `#1C2F40` / white, 1 px `#24384A`; radius 14; padding 11; font 13.5; min-height 78 |
| Single-line input | Same surface/border; radius 12; padding `10px 11px`; font 13 |
| Attendance | 34×34 visible buttons, radius 11; base `#1C2F40`, border `#284054`; selected present mint, absent rose, late sun; black selected text |
| Floating navigation | Left/right 12, bottom 14, height 70, radius 24; fill `#141417EF`, border `#2C2C33`; shadow `0 12px 28px #0008` |
| Nav items / center | Five columns: Today, Schedule, Post, Students, Fees; labels 10.5 / 750, gap 3; inactive `#6B6B75`, active white. Center white 56×56 rounded square, radius 19, black plus 26 px / stroke 2.4; raised by center item margin-top −24. Keep existing app action names/accessibility labels where required. |
| Bottom sheet | `#141417`, white; radius `26px 26px 0 0`, 1 px `#2C2C33`; padding `10px 18px 26px`; max-height 88%; backdrop `#000B` with blur 4 px |

## Parent layout, Aurora and controls

| Element | Exact reference treatment |
| --- | --- |
| Mobile phone surface | Full 412×915; radius 0; no fake status/notch; scroll bottom reserve 118 px |
| Desktop reference | Frame width 430 px, padding 10; inner phone 410×880, radius 43. At 1280×1000 the inner phone starts at x435/y60. |
| Header | Final `.aurora-header` is a procedural gradient/stars/curve composition, not the older darkened photo asset. Base gradient `linear-gradient(175deg,#0D2030,#0D2030 50%,#0C1722 120%)`; padding-bottom 20. Do not generate substitute artwork. |
| Top row | Mobile padding `16px 18px 0`; profile/action row measured height 54. Desktop top padding 12. Profile is 38 circle, gradient sky→grape, 2 px translucent white outline; name 15 / 800, tracking −0.4; gap 9. |
| Header actions | 36 circle; fill `#0D1E2C99`, border `#C2E0F040`, white SVG; gap 8; rose notification dot only for actual supported state |
| Title region | Padding `24px 18px 0`; heading bottom margin 6. Prototype feature-ID badges add height in the demo and are not app data. |
| Content | Padding `6px 18px 20px`; sections margin-top 19; section heading row bottom margin 11 and gap 8 |
| Children | Single horizontal row, gap 8; pill radius 999, padding `4px 13px 4px 4px`; font 12.5 / 800; inner face 27 circle, 11 px text; inactive `#132231`/muted with `#284054` border, active white/black. Keep explicit child-connection targeting independent from Home selection. |
| Next band | Radius 18, min-height 70; padding `11px 12px 11px 15px`, margin-top 14; background `var(--band,var(--sky))`, foreground `#06121A`. Default selected prototype child's band is sun yellow, not always sky. Title 16.5 / 850; time 21 / 850, tracking −0.6. Do not create an unavailable linked schedule/countdown merely to populate the band. |
| List cards / rows | Radius 22; padding `4px 14px`, 1 px `#24384A`; row padding `12px 0`, gap 11; title 13, detail 10.5 muted, top margin 2 |
| Compact buttons / checkbox | Mini action radius 999, font 10.5 / 780, padding `7px 11px`, surface2/white, border surface3. Todo checkbox 24×24, radius 8, 2 px surface3; checked mint/black. |
| Together card | Main surface/border; heading strip surface2; supported completion action mint/black, radius 17, min-height 56, font 14 / 850. Photo/camera action white/black. Do not add unsupported family media capture. |
| Metric jar reference | 54×63, border 2 px `#6F8597`, radius `12px 12px 15px 15px`, surface2; translucent highlight and semantic-color fill. Prototype goals/automatic class totals are unsupported in the current app; never copy or invent those values. |
| Floating navigation | Outer bottom overlay padding `14px 13px 8px`, gradient transparent→app background at 30%; inner height 72, radius 28, fill `#0F1D2BE8`, border `#253A4D`, blur 18; inner padding `4px 6px`, gap 3; columns `1fr 1fr 70px 1fr 1fr` |
| Nav items / center | Home, Week, center capture, Together, Explore. Visible items height 57, gap 5; label 10 / 650; inactive `#7088A0`, active white. Center white 58 circle, camera/mic outlined black glyphs in reference; conic accent ring with 6 px outside inset and blurred 8 px outer glow. Current app's private log action must retain its actual behavior rather than promise unsupported audio/video. |
| Bottom sheet | Final fill `#122130`, radius `29px 29px 0 0`; padding `9px 18px 24px`; max-height 84%; heading 22 / 700 / tracking −0.6. Close circle 34, surface2. |
| Fields / sheet primary | Fields surface2/white, border line, radius 13, padding 12, multiline min-height 92. Primary white/black, radius 16, padding 14, font 13 / 830. |

Aurora layers are literal reference rules. Use `#54D9CD`, `#8585FF`, `#80BAF5`; do not substitute a newly chosen gradient:

```css
/* Header ::before: top -100px; left 8%; right -25%; height 270px */
background:
  radial-gradient(ellipse 53% 36% at 50% 42%,#54d9cd 0%,transparent 95%),
  radial-gradient(ellipse 58% 40% at 73% 60%,#8585ff 0%,transparent 85%),
  radial-gradient(ellipse 53% 56% at 7% 73%,#80baf5 0%,transparent 85%);
filter:blur(26px); opacity:.75; transform:rotate(-13deg);
/* Header ::after */
background:
  radial-gradient(circle at 20% 28%,#e3ffff 0 .75px,transparent 1.35px) 0 0/37px 43px,
  radial-gradient(circle at 50% 50%,#e8fdff 0 .85px,transparent 1.4px) 0 0/68px 59px,
  linear-gradient(0deg,#0c1722 0%,transparent 60%);
opacity:.55;
/* Curved light: width135%; height95px; top5px; left-9%; radius50% */
border-top:23px solid #54d9cd; filter:blur(20px); opacity:.33;
/* Capture ring */
background:conic-gradient(from 0deg,#3abeff,#2ee6a6,#ffd23f,#ff5d8f,#a27bff,#3abeff);
```

Reference animations: header breathing 10 s and curve 8 s, both ease-in-out/alternate; capture ring 5.5 s linear, glow 8 s reverse. Reduced-motion rules stop these. Screenshot comparisons use reduced motion to remove phase differences. Retain reduced-motion accessibility in implementation; animation is not a requirement to add unrelated interaction.

Both prototypes draw action/navigation icons with their embedded SVG path maps (`I` for Coach, `P` for Parent), viewBox `0 0 24 24`, no fill, currentColor stroke, round caps/joins, default stroke 1.9. Coach nav uses size22; Parent nav size23/stroke1.85. Reuse the actual corresponding paths rather than substitute Unicode symbols, emoji, or a newly selected icon family. Decorative child initials remain derived from the real child record. Native SVG/gradient rendering needs actual platform verification.

## Existing app mapping and implementation boundaries

At baseline the Coach UI still uses the initial light palette (`#F3F5F1`, white cards, teal actions) and a full-width bottom bar; Parent uses the superseded `#060A0E/#151A20/#20262F` palette, image header and approximate Unicode navigation. The shared [Typography wrapper](../../src/ui/Typography.tsx) already loads the bundled Bricolage alias, but existing form inputs/select controls also need font verification. Changing only the shell would leave visible light forms or old accents in existing flows.

| Reference area | Existing destination flow to restyle | Out-of-scope prototype behavior |
| --- | --- | --- |
| Coach Today / next class / cards | `App.tsx`, `TodayClasses`, `CoachSetupCard`; show actual saved counts/classes and existing actions | Trial requests, Parent inbox, engagement percentages and invented Needs-you tasks |
| Coach Schedule / live attendance | `ClassesScreen`, existing dated-class form and attendance controls | New recurring generator, new live-class feature or signal-driven attendance |
| Coach Post | `ObservationsScreen`, existing private note, reviewed Parent/WhatsApp panels and media permission states | AI polish, speech recognition, auto-send or new structured progress features |
| Coach Students / Fees | `RosterScreen`, existing student/batch/profile/import forms; `FeesScreen` manual ledger | Prototype admissions/trials, verified payment collection or provider billing |
| Parent Home / Week | `ParentApp` existing family children, private plans/todos/memories and approved feedback | Automatic academy attendance/calendar, countdowns, fabricated goals or class statistics |
| Parent Together / Explore | Existing static activities, saved family time, connections/media choices/profile tools | Marketplace discovery/trials, health/transport, external messaging, unsupported family media |
| Sheets / empty / pending / error | Existing connection, child creation, consent, rejection/retry, private log and setup states | Fake successful persistence, weakened confirmation, automatic first-child matching or removal of separate Coach approval |
| Sign-in/setup | Restyle existing verified email/password/recovery/family setup controls using reference primitives | Prototype phone OTP wizard, new auth methods or provider setup |

Retain all existing record identities, permissions, loading/error/retry states, accessible names and disabled/busy guards. Prototype mock contacts, demo labels, PP feature badges, static successes and unbuilt navigation are reference metadata, not facts to import. Visual decoration must not imply an unsupported action. Existing media and truthful data requirements remain authoritative.

## Observable acceptance and screenshot plan

| ID | Acceptance | Evidence to collect |
| --- | --- | --- |
| VIS-001 | Shared final surfaces/text/control tokens match the final cascade; Coach inline pastels remain distinct from bright CSS accents | Computed styles for active Coach/Parent, cards, inputs, selected/unselected/disabled controls; check visible screens for leftover initial palettes |
| VIS-002 | Bricolage is actually loaded and used across text, labels, fields and buttons; sizes/weights/tracking match the tables | Font-load check plus rendered text crops on Chromium; separately record native font/optical-size limitations |
| VIS-003 | Coach header/content/card/nav geometry matches the cropped reference at matched width | Mobile Today/Schedule/Post/Students/Fees captures and desktop cropped phone; compare margins/radii/icon sizes and center action |
| VIS-004 | Parent Aurora uses the literal gradients, stars and curve; title/child row/content spacing match | Mobile Home and header crop, both children selected in turn; desktop phone crop; reduced-motion capture |
| VIS-005 | Parent list/together/nav/sheet treatment matches the reference primitives on supported flows | Home/Week/Together/Explore, profile/private log/connection/child-create/consent sheets; verify active and inactive navigation |
| VIS-006 | Existing flows keep semantic correctness and security during restyle | Existing auth/roster/class/feedback/Parent regressions, including explicit child target, approval, pending+approved coexistence and preserved retry entries |
| VIS-007 | Layout remains readable at narrow and desktop sizes, with scrolling and focus/keyboard access | At least320×740,412×915,1280×1000; no horizontal clipping, hidden bottom content, clipped form actions or inaccessible modal controls; preserve minimum touch hit area around exact visible controls |
| VIS-008 | Visual findings are independently reviewed, with actual source and screenshots | Record reference hashes, implementation commit, viewport/device scale, font source, scenario/state, deviations and review disposition; token checks alone do not establish visual parity |

Temporary reference captures exist under `/tmp/parentplus-reference-<role>-<size>-<screen>.png`. Coach: mobile `today`, `schedule`, `compose`, `students`, `fees`; desktop `today`. Parent: mobile `home`, `progress`, `together`, `explore`, `capture-sheet`; desktop `home`. Raw computed data: `/tmp/parentplus-visual-reference.json` and `/tmp/parentplus-visual-reference-controls.json`. The first multi-screen script skipped the Coach center because it uses `data-act="newpost"`, not `data-go="compose"`; the follow-up correctly captured compose. This was a capture-selector correction, not a prototype runtime defect.

For durable evidence, use relative artifact names such as `evidence/prototype-visual/reference-coach-mobile-today.png`, `evidence/prototype-visual/reference-parent-mobile-home.png`, and corresponding `app-<role>-<size>-<state>.png`. These are a proposed evidence location, not files written by this report. Copy only fictional reference/test images, not real family information. Compare phone crops, not the desktop showcase copy/bezel; disclose removed prototype-only metadata and data-dependent height differences rather than claim whole-page pixel equality. Freeze animation/media and time for repeatable comparisons. Do not fabricate unsupported cards to make a screenshot look complete.

Current execution: source/cascade/font inspection and 12 prototype-state screenshots only; app-after-change comparison, VIS acceptance, native/device checks and final exact-commit implementation review are pending. The report author made no application or prototype-source edits.
