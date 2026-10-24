# Design sync ledger

- Figma file: nextchapter (hLBR7Nl3GelwM9hstQb3Ah), library pages Brand 45:3, Components 92:5175
- Figma last modified: not exposed by the plugin API; inventory read 2026-10-24
- Code baseline: 66eac22 (2026-10-22)
- Audit run: 2026-10-24 with lr-design-system-sync (see Log)
- Direction: Figma to code
- Machine-readable copy: ledger.json (source for the Figma mirror)

## Inventory

| Category | Figma count | Ledger rows | Synced | Open |
|---|---|---|---|---|
| Variables | 174 | 34 groups (174 vars) | 34 | 0 |
| Text styles | 17 | 17 | 17 | 0 |
| Effect styles | 1 | 1 | 1 | 0 |
| Paint styles | 0 | 0 | 0 | 0 |
| Components | 24 | 24 | 7 | 17 |
| Figma hygiene | - | 9 | 0 | 0 |

## Log

- 2026-10-24: Figma: agent bound 59 unbound padding, gap and radius values in 7 components to existing Spacing and Radius variables (user-approved). Only exact value matches were bound, except 6 pill and circle radii (999 or 10) moved to radius/full (9999), which renders identically. Re-scan of all 24 library components found 0 unbound padding, gap or radius values.
- 2026-10-24: Decisions: add typography primitives; build Avatar, Avatar Badge, Company Avatar and Paddle Button; sync full spacing and radius scales; radius changes and proposed component map accepted.
- 2026-10-24: Token sync: tokens.css gains 50 tokens (typography primitives, full spacing and radius); text tokens reference primitives; surface/default aliases match Figma; Inter and IBM Plex Mono 300 added to the font URL on 4 entry pages; tokens.css cache revision bumped to 20261024-token-sync. Checks: token-diff 173/173 Figma variables match; resolve-tokens shows no resolved value change for any of the 198 existing tokens in either theme; lint passes; npm test 190/191 with the one failure pre-existing (resume-context date fixture); typecheck could not run in the agent's Linux shell. Not verified: Google Fonts response and rendered weight in a browser.
- 2026-10-24: Designer updated Figma Typography: font-weight/normal (300) renamed to light, new normal (400); serif styles rebound to normal (closes H-08); Type/Meta changed from Plex Mono Light to Regular. Code follows: --nc-font-weight-light 300 and --nc-font-weight-normal 400, serif and Meta weights reference normal, Plex Mono URL back to 400 only. Checks: token-diff 174/174; text-style-check 17/17 including loaded weights; versus HEAD the only resolved value change is --nc-type-meta-weight 300 to 400.
- 2026-10-24: Component sync batch 1 (C-01 Load Spinner, C-02 Status-Badge, C-04 Input Label): components.css padding and offsets tokenized, .nc-field__label--sm added, components.css cache revision bumped to 20261024-component-sync. Added design-sync/preview.html and scripts/shot.mjs; evidence in design-sync/evidence/batch-1.*. Measured sizes within 1px of Figma in both themes.
- 2026-10-24: Browser check on localhost: Inter 300 loads from Google Fonts and renders on the Resume Builder. Fixed two off-scale weights found there: the app heading and loading status (DM Serif Display at 600, faux bold) now use --nc-type-h1-weight and --nc-type-h3-weight (400); .nc-field__description now uses --nc-type-body-default-weight (300) instead of 400. Resume document and export serif weights left as-is (document formatting stays local). components.css cache revision bumped to 20261024-label-weight. Re-check: no visible text on the page at an off-scale weight.
- 2026-10-24: Component sync batch 2 (C-05 Pill Tab Item, C-14 Pill-Tabs, C-06 Step Progress Item, C-07 Chip): pill tabs gain .nc-pill-tabs--lg; step items default to Figma Lg with .nc-step--sm and Sm below 600px in the indicator; chip padding corrected for Figma inside strokes. Pill-Tabs (C-14) done early since its Lg size lives on the group. New Figma item H-09. components.css cache revision 20261024-batch-2. Evidence in design-sync/evidence/batch-2.*; Resume Builder step bar checked in the browser at 385px and 1280px.
- 2026-10-24: Designer set Pill Tab Item Lg to 34px (closes H-09). Code now derives pill tab height from a --nc-pill-tabs-height group variable (28px Sm, 40px Lg) so the group height is the single spec; verified 28/22 and 40/34 at 1280px.
- 2026-10-24: Designer excluded the Pill-Tabs border from layout; tab items are now 24px (Sm) and 36px (Lg) inside 28/40px groups. Code follows: group padding is 2px minus the 1px border, tabs are group height minus 4px, and tab labels no longer wrap (user request). Verified Sm 28/24 and Lg 40/36 in the browser, including at 385px. components.css cache revision 20261024-pill-tabs; batch-2 evidence re-captured.

Status totals: fixed-in-figma 9, pending 17, synced 59

## Rows

| ID | Category | Item | Figma ref | Code ref | Class | Status | Notes |
|---|---|---|---|---|---|---|---|
| V-01 | Variables | Primitives primary/* (3) | Primitives | `tokens.css` | match | synced |  |
| V-02 | Variables | Primitives secondary/* (6) | Primitives | `tokens.css` | match | synced |  |
| V-03 | Variables | Primitives neutral/* (11) | Primitives | `tokens.css` | match | synced |  |
| V-04 | Variables | Primitives peach/* (1) | Primitives | `tokens.css` | match | synced |  |
| V-05 | Variables | Primitives success/* (3) | Primitives | `tokens.css` | match | synced |  |
| V-06 | Variables | Primitives danger/* (3) | Primitives | `tokens.css` | match | synced |  |
| V-07 | Variables | Primitives warning/* (3) | Primitives | `tokens.css` | match | synced |  |
| V-08 | Variables | Theme background/* (1) | Theme | `tokens.css` | match | synced |  |
| V-09 | Variables | Theme surface/* (3) | Theme | `tokens.css` | value-drift | synced | Token sync 2026-10-24: --nc-surface-default now aliases neutral/50 (light) and neutral/900 (dark) directly, matching Figma. Resolved color unchanged. |
| V-10 | Variables | Theme border/* (2) | Theme | `tokens.css` | match | synced |  |
| V-11 | Variables | Theme text/* (4) | Theme | `tokens.css` | match | synced |  |
| V-12 | Variables | Theme action/primary/* (5) | Theme | `tokens.css` | match | synced |  |
| V-13 | Variables | Theme input/* (3) | Theme | `tokens.css` | match | synced |  |
| V-14 | Variables | Theme action/secondary/* (5) | Theme | `tokens.css` | match | synced |  |
| V-15 | Variables | Theme action/tertiary/* (3) | Theme | `tokens.css` | match | synced |  |
| V-16 | Variables | Theme loading/* (2) | Theme | `tokens.css` | match | synced |  |
| V-17 | Variables | Theme link/* (2) | Theme | `tokens.css` | match | synced |  |
| V-18 | Variables | Theme focus/* (1) | Theme | `tokens.css` | match | synced |  |
| V-19 | Variables | Theme selection/* (3) | Theme | `tokens.css` | match | synced |  |
| V-20 | Variables | Theme action/disabled/* (2) | Theme | `tokens.css` | match | synced |  |
| V-21 | Variables | Theme supporting/* (2) | Theme | `tokens.css` | match | synced |  |
| V-22 | Variables | Theme success/* (3) | Theme | `tokens.css` | match | synced |  |
| V-23 | Variables | Theme danger/* (3) | Theme | `tokens.css` | match | synced |  |
| V-24 | Variables | Theme warning/* (3) | Theme | `tokens.css` | match | synced |  |
| V-25 | Variables | Theme info/* (3) | Theme | `tokens.css` | match | synced |  |
| V-26 | Variables | Theme status/* (12) | Theme | `tokens.css` | match | synced | --ds-badge-* names (code-owned contract) |
| V-27 | Variables | Theme control/* (9) | Theme | `tokens.css` | match | synced |  |
| V-28 | Variables | Theme card/* (4) | Theme | `tokens.css` | match | synced |  |
| V-29 | Variables | Spacing original subset (9) | Spacing | `tokens.css` | match | synced | All 35 steps in tokens.css (decision 2026-10-24: sync full scale). |
| V-30 | Variables | Spacing added (26) | Spacing | `tokens.css` | missing-in-code | synced | Added 2026-10-24 after decision to sync the full scale. |
| V-31 | Variables | Radius original subset (6) | Radius | `tokens.css` | match | synced | All 9 steps in tokens.css; --nc-radius-panel stays a code-only alias of xl. |
| V-32 | Variables | Radius added (3) | Radius | `tokens.css` | missing-in-code | synced | Added none, lg, 3xl 2026-10-24 (full scale decision). |
| V-33 | Variables | Typography font-family (3) | Typography | `--nc-font-*` | match | synced | named --nc-font-serif|sans|mono |
| V-34 | Variables | Typography size, line height, weight (22) | Typography | `none` | missing-in-code | synced | Added --nc-font-size-*, --nc-line-height-*, --nc-font-weight-* (light 300, normal 400, medium 500, semibold 600); every --nc-type-* size, line height and weight references them. Figma renamed normal (300) to light and added normal (400) on 2026-10-24. |
| T-01 | Text styles | Type/Display | text style | `--nc-type-display-*` | match | synced | Size, line height and weight reference typography primitives; weight is --nc-font-weight-normal (400), matching the corrected Figma binding (H-08). |
| T-02 | Text styles | Type/Heading/H1 | text style | `--nc-type-h1-*` | match | synced | Size, line height and weight reference typography primitives; weight is --nc-font-weight-normal (400), matching the corrected Figma binding (H-08). |
| T-03 | Text styles | Type/Heading/H2 | text style | `--nc-type-h2-*` | match | synced | Size, line height and weight reference typography primitives; weight is --nc-font-weight-normal (400), matching the corrected Figma binding (H-08). |
| T-04 | Text styles | Type/Heading/H3 | text style | `--nc-type-h3-*` | match | synced | Size, line height and weight reference typography primitives; weight is --nc-font-weight-normal (400), matching the corrected Figma binding (H-08). |
| T-05 | Text styles | Type/Heading/H4 | text style | `--nc-type-h4-*` | match | synced | Size, line height and weight reference typography primitives; weight is --nc-font-weight-normal (400), matching the corrected Figma binding (H-08). |
| T-06 | Text styles | Type/Body/Large | text style | `--nc-type-body-large-*` | font-not-loaded | synced | Inter 300 now loaded on all 4 entry pages (token sync 2026-10-24). Weight references --nc-font-weight-light. Confirm in a browser that this text renders Light. |
| T-07 | Text styles | Type/Body/Default | text style | `--nc-type-body-default-*` | font-not-loaded | synced | Inter 300 now loaded on all 4 entry pages (token sync 2026-10-24). Weight references --nc-font-weight-light. Confirm in a browser that this text renders Light. |
| T-08 | Text styles | Type/Body/Small | text style | `--nc-type-body-small-*` | font-not-loaded | synced | Inter 300 now loaded on all 4 entry pages (token sync 2026-10-24). Weight references --nc-font-weight-light. Confirm in a browser that this text renders Light. |
| T-09 | Text styles | Type/Caption | text style | `--nc-type-caption-*` | font-not-loaded | synced | Inter 300 now loaded on all 4 entry pages (token sync 2026-10-24). Weight references --nc-font-weight-light. Confirm in a browser that this text renders Light. |
| T-10 | Text styles | Type/UI/Title | text style | `--nc-type-ui-title-*` | match | synced | Size, line height and weight reference typography primitives. |
| T-11 | Text styles | Type/UI/Label | text style | `--nc-type-ui-label-*` | match | synced | Size, line height and weight reference typography primitives. |
| T-12 | Text styles | Type/UI/Label Sm | text style | `--nc-type-ui-label-sm-*` | match | synced | Size, line height and weight reference typography primitives. |
| T-13 | Text styles | Type/UI/Button | text style | `--nc-type-ui-button-*` | match | synced | Size, line height and weight reference typography primitives. |
| T-14 | Text styles | Type/UI/Button Sm | text style | `--nc-type-ui-button-small-*` | match | synced | Size, line height and weight reference typography primitives. |
| T-15 | Text styles | Type/UI/Badge | text style | `--nc-type-ui-badge-*` | font-not-loaded | synced | Inter 300 now loaded on all 4 entry pages (token sync 2026-10-24). Weight references --nc-font-weight-light. Confirm in a browser that this text renders Light. |
| T-16 | Text styles | Type/Meta | text style | `--nc-type-meta-*` | value-drift | synced | Figma changed Meta from IBM Plex Mono Light (300) to Regular (400) on 2026-10-24; code follows (--nc-font-weight-normal). Plex Mono 300 dropped from the font URL again. Only resolved value change in this sync. |
| T-17 | Text styles | Type/UI/Status | text style | `--nc-type-ui-status-*` | match | synced | Size, line height and weight reference typography primitives. |
| E-01 | Effect styles | shadow/sm | effect style | `--nc-shadow-sm` | match | synced | 1px 1px 0 var(--nc-border-control); color binding preserved |
| C-01 | Components | Load Spinner | 81:1063 | `.nc-spinner` | match | synced | No structural drift: 28px ring, 2px loading/bg track, loading/fg quarter arc. Spin animation and reduced-motion handling are code-owned. |
| C-02 | Components | Status-Badge | 134:13529 | `.nc-status-badge` | structure-drift | synced | Values already matched; padding now uses spacing tokens and gap added to mirror Figma auto layout. |
| C-03 | Components | Avatar Badge | 205:665 | `none` | missing-in-code | pending | Decision 2026-10-24: build in code. |
| C-04 | Components | Input Label | 168:610 | `.nc-field__label` | structure-drift | synced | Added .nc-field__label--sm (Figma Size=Sm); 2px offsets now use --nc-space-0-5. Label bottom margin belongs to TextField and is checked in C-16. |
| C-05 | Components | Pill Tab Item | 92:5012 | `.nc-pill-tab` | structure-drift | synced | Padding and gap use spacing tokens; tabs are group height minus 4px (Sm 24, Lg 36) and stay on one line. Lg via .nc-pill-tabs--lg. |
| C-06 | Components | Step Progress Item | 77:137 | `.nc-step` | structure-drift | synced | Lg is now the default (UI/Button labels); .nc-step--sm added (UI/Button Sm, only the active label shown). The indicator switches to Sm below 600px. Resume Builder desktop step labels go from 12px to 16px. |
| C-07 | Components | Chip | 62:285 | `.nc-chip` | structure-drift | synced | Padding now subtracts the 1px border (Figma measures padding from the outer edge with an inside stroke). Sm width 70 -> 68, Lg horizontal padding 12 -> 16. |
| C-08 | Components | Button | 53:220 | `.nc-button` | structure-drift | pending | Figma has Icon Only variant; code has no icon-only modifier |
| C-09 | Components | Switch-Mode | 81:397 | `.theme-toggle` | structure-drift | pending | Figma hygiene fixed 2026-10-24, see H rows |
| C-10 | Components | MainNavItem | 92:9731 | `.nextchapter-nav-item` | structure-drift | pending | Figma hygiene fixed 2026-10-24, see H rows |
| C-11 | Components | Company Avatar | 206:18776 | `none` | missing-in-code | pending | Decision 2026-10-24: build in code. Needed by Prospect Card (C-23). |
| C-12 | Components | Avatar | 205:679 | `none` | missing-in-code | pending | Decision 2026-10-24: build in code. |
| C-13 | Components | Paddle Button | 216:20314 | `none` | missing-in-code | pending | Decision 2026-10-24: build in code. |
| C-14 | Components | Pill-Tabs | 279:1161 | `.nc-pill-tabs` | structure-drift | synced | Group height is the spec (Sm 28px, Lg 40px via --nc-pill-tabs-height); the 1px border sits inside the 2px padding, so tabs are group - 4px. Group grows with its tabs instead of wrapping. |
| C-15 | Components | Step Progress Indicator | 102:11781 | `.nc-step-progress` | structure-drift | pending | Narrow-screen rule now applies Figma Sm label size (batch 2). Connector, gap and orientation still to check. |
| C-16 | Components | TextField | 53:589 | `.nc-field .nc-input` | structure-drift | pending |  |
| C-17 | Components | TextArea | 61:183 | `.nc-field .nc-textarea` | structure-drift | pending |  |
| C-18 | Components | Select | 92:9223 | `.nc-select-wrap .nc-select` | structure-drift | pending |  |
| C-19 | Components | Checkbox | 165:590 | `.nc-checkbox` | structure-drift | pending | implemented Oct 20 per docs |
| C-20 | Components | Radio | 165:618 | `.nc-radio` | structure-drift | pending | implemented Oct 20 per docs |
| C-21 | Components | Alert | 53:638 | `.nc-alert` | structure-drift | pending |  |
| C-22 | Components | Toast | 125:11817 | `.nc-toast` | structure-drift | pending |  |
| C-23 | Components | Prospect Card | 216:20442 | `.prospect-card` | structure-drift | pending | Figma nests Company Avatar; no avatar in code |
| C-24 | Components | Main Navigation Header | 125:12294 | `.nextchapter-header` | structure-drift | pending | Figma hygiene fixed 2026-10-24, see H rows |
| H-01 | Figma hygiene | Paddle Button | 216:20314 | `-` | hygiene | fixed-in-figma | Fixed by agent 2026-10-24: gap 8 -> spacing/2 on both variants (215:20115, 216:20310). Values unchanged, binding only. |
| H-02 | Figma hygiene | Chip | 62:285 | `-` | hygiene | fixed-in-figma | Fixed by agent 2026-10-24: padding on all 6 variants: Sm 12/8 -> spacing/3, spacing/2; Lg 16/12 -> spacing/4, spacing/3. Values unchanged, binding only. |
| H-03 | Figma hygiene | Pill-Tabs | 279:1161 | `-` | hygiene | fixed-in-figma | Fixed by agent 2026-10-24: padding 2 -> spacing/0_5 on both sizes; radius 999 -> radius/full (9999, renders the same pill). Radius value changed (999/10 -> 9999), visual result identical; review. |
| H-04 | Figma hygiene | Switch-Mode | 81:397 | `-` | hygiene | fixed-in-figma | Fixed by agent 2026-10-24: track radius 999 -> radius/full on both states; thumb radius 10 -> radius/full (20x20 circle, renders the same). Header instances inherit it. Radius value changed (999/10 -> 9999), visual result identical; review. |
| H-05 | Figma hygiene | MainNavItem | 92:9731 | `-` | hygiene | fixed-in-figma | Fixed by agent 2026-10-24: horizontal padding 12 -> spacing/3 on 3 default-size variants. Values unchanged, binding only. |
| H-06 | Figma hygiene | Main Navigation Header | 125:12294 | `-` | hygiene | fixed-in-figma | Fixed by agent 2026-10-24: gaps 40/24/20/12/4 -> spacing/10, 6, 5, 3, 1; Sm padding 20 -> spacing/5; Sm-Open util menu top padding 20 -> spacing/5. Thumb radius fixed via Switch-Mode. Values unchanged, binding only. |
| H-07 | Figma hygiene | Input Label | 168:610 | `-` | hygiene | fixed-in-figma | Fixed by agent 2026-10-24: gap 2 -> spacing/0_5 on both sizes. Values unchanged, binding only. |
| H-08 | Figma hygiene | Serif text styles weight binding | Type/Display, Type/Heading/H1-H4 | `-` | hygiene | fixed-in-figma | Fixed by designer 2026-10-24: renamed font-weight/normal (300) to font-weight/light, added font-weight/normal (400), rebound the 5 serif styles to it. |
| H-09 | Figma hygiene | Pill Tab Item Lg height | 92:5012 | `-` | hygiene | fixed-in-figma | Fixed by designer 2026-10-24: Pill Tab Item Lg is now 34px, matching its use in Pill-Tabs Lg. The spec that matters is the 40px group height. |

## Component checklists

### C-01 Load Spinner

- [x] Size 28x28 matches
- [x] Track 2px @loading/bg matches border
- [x] Arc @loading/fg matches border-top-color (quarter arc; arc end caps differ: Figma flat, CSS mitered; accepted)
- [x] No edits needed

Evidence: design-sync/evidence/batch-1.png and batch-1-metrics.json (preview.html, dark and light, Inter/Plex/DM Serif from @fontsource)

### C-02 Status-Badge

- [x] Height 20 fixed matches
- [x] Padding 4/6 -> var(--nc-space-1) var(--nc-space-1-5) (was raw px)
- [x] Gap @spacing/1 added (single child today; keeps parity if an icon is added)
- [x] Radius @radius/sm matches
- [x] Text Type/UI/Status matches
- [x] All 6 tones match in both themes (Figma binds the same primitives in both modes)
- [x] Measured 48.3x20 vs Figma 49x20 (text rendering)

Evidence: design-sync/evidence/batch-1.png and batch-1-metrics.json (preview.html, dark and light, Inter/Plex/DM Serif from @fontsource)

### C-04 Input Label

- [x] Size=Lg: Type/UI/Label, text/primary, 24px line box matches
- [x] Size=Sm: new modifier .nc-field__label--sm with Type/UI/Label Sm tokens (additive, no consumer changed)
- [x] Left padding 2 -> var(--nc-space-0-5)
- [x] Required * gap 2 -> margin-left var(--nc-space-0-5), text/secondary matches
- [x] Kept display:block instead of Figma horizontal auto layout: code labels include inline .nc-field__description text that flex would break; visual result matches
- [-] margin-bottom 4px is TextField spacing, deferred to C-16

Evidence: design-sync/evidence/batch-1.png and batch-1-metrics.json (preview.html, dark and light, Inter/Plex/DM Serif from @fontsource)

### C-05 Pill Tab Item

- [x] Padding 4/20 -> var(--nc-space-1) var(--nc-space-5); gap 4 -> var(--nc-space-1)
- [x] Sm 24px, Lg 36px tall (Figma updated 2026-10-24 after the group stroke was excluded from layout); measured 90x24 and 106x36 vs Figma 90x24 and 107x36
- [x] Labels stay on one line (white-space: nowrap, flex-shrink: 0), as requested
- [x] Default, Hover (@action/secondary/hover) and Selected (@action/secondary/bg) bindings match

Evidence: design-sync/evidence/batch-2.png and batch-2-metrics.json; Resume Builder step bar checked in the browser at 385px and 1280px

### C-06 Step Progress Item

- [x] Gap 8 -> var(--nc-space-2)
- [x] Badge 32px, radius full, @action/primary/bg (active, completed) and @action/disabled/bg with @text/secondary (upcoming) match
- [x] Lg label UI/Button (16/16), @text/primary or @text/muted; measured 125.3x32 vs Figma 126x32
- [x] Sm label UI/Button Sm; non-active labels visually hidden (kept for screen readers); measured 104x32 and 32x32 match Figma
- [x] Completed check icon 20px matches
- [x] Browser: 1280px all labels 16px, no overflow; 385px only the active label at 12px

Evidence: design-sync/evidence/batch-2.png and batch-2-metrics.json; Resume Builder step bar checked in the browser at 385px and 1280px

### C-07 Chip

- [x] Sm padding 8/12 from edge -> calc(var(--nc-space-2) - 1px) calc(var(--nc-space-3) - 1px); measured 67.6x28 vs Figma 68x28 (was 2px wider)
- [x] Lg padding 12/16 from edge -> calc(var(--nc-space-3) - 1px) calc(var(--nc-space-4) - 1px); measured 90.1x40 vs Figma 91x40 (horizontal padding was 12)
- [x] Default @border/control stroke and @text/secondary; Hover and Selected @action/primary bindings match
- [-] Gap kept at 6/8px: chips have a single child, so it has no effect

Evidence: design-sync/evidence/batch-2.png and batch-2-metrics.json; Resume Builder step bar checked in the browser at 385px and 1280px

### C-14 Pill-Tabs

- [x] Padding 2 from the outer edge with the 1px border inside it -> calc(var(--nc-space-0-5) - 1px), matching Figma stroke excluded from layout
- [x] Border 1px @input/border, fill @surface/default, radius full match
- [x] --nc-pill-tabs-height (28px Sm, 40px Lg) drives tab min-height = group - 2 x space-0-5. Browser: Sm 28/24, Lg 40/36, no wrapping at 385px
- [x] Removed max-width: 100% so the group grows with one-line tabs instead of wrapping them
- [ ] Enhancement requested: animated sliding selection pill (not in Figma yet)

Evidence: design-sync/evidence/batch-2.png and batch-2-metrics.json; Resume Builder step bar checked in the browser at 385px and 1280px
