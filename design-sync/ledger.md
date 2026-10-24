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
| Components | 24 | 24 | 3 | 21 |
| Figma hygiene | - | 8 | 0 | 0 |

## Log

- 2026-10-24: Figma: agent bound 59 unbound padding, gap and radius values in 7 components to existing Spacing and Radius variables (user-approved). Only exact value matches were bound, except 6 pill and circle radii (999 or 10) moved to radius/full (9999), which renders identically. Re-scan of all 24 library components found 0 unbound padding, gap or radius values.
- 2026-10-24: Decisions: add typography primitives; build Avatar, Avatar Badge, Company Avatar and Paddle Button; sync full spacing and radius scales; radius changes and proposed component map accepted.
- 2026-10-24: Token sync: tokens.css gains 50 tokens (typography primitives, full spacing and radius); text tokens reference primitives; surface/default aliases match Figma; Inter and IBM Plex Mono 300 added to the font URL on 4 entry pages; tokens.css cache revision bumped to 20261024-token-sync. Checks: token-diff 173/173 Figma variables match; resolve-tokens shows no resolved value change for any of the 198 existing tokens in either theme; lint passes; npm test 190/191 with the one failure pre-existing (resume-context date fixture); typecheck could not run in the agent's Linux shell. Not verified: Google Fonts response and rendered weight in a browser.
- 2026-10-24: Designer updated Figma Typography: font-weight/normal (300) renamed to light, new normal (400); serif styles rebound to normal (closes H-08); Type/Meta changed from Plex Mono Light to Regular. Code follows: --nc-font-weight-light 300 and --nc-font-weight-normal 400, serif and Meta weights reference normal, Plex Mono URL back to 400 only. Checks: token-diff 174/174; text-style-check 17/17 including loaded weights; versus HEAD the only resolved value change is --nc-type-meta-weight 300 to 400.
- 2026-10-24: Component sync batch 1 (C-01 Load Spinner, C-02 Status-Badge, C-04 Input Label): components.css padding and offsets tokenized, .nc-field__label--sm added, components.css cache revision bumped to 20261024-component-sync. Added design-sync/preview.html and scripts/shot.mjs; evidence in design-sync/evidence/batch-1.*. Measured sizes within 1px of Figma in both themes.

Status totals: fixed-in-figma 8, pending 21, synced 55

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
| C-05 | Components | Pill Tab Item | 92:5012 | `.nc-pill-tab` | structure-drift | pending | Figma Size Sm/Lg; code has no size modifier |
| C-06 | Components | Step Progress Item | 77:137 | `.nc-step` | structure-drift | pending | Figma Size Lg/Sm; code has no size modifier |
| C-07 | Components | Chip | 62:285 | `.nc-chip` | structure-drift | pending | Figma hygiene fixed 2026-10-24, see H rows |
| C-08 | Components | Button | 53:220 | `.nc-button` | structure-drift | pending | Figma has Icon Only variant; code has no icon-only modifier |
| C-09 | Components | Switch-Mode | 81:397 | `.theme-toggle` | structure-drift | pending | Figma hygiene fixed 2026-10-24, see H rows |
| C-10 | Components | MainNavItem | 92:9731 | `.nextchapter-nav-item` | structure-drift | pending | Figma hygiene fixed 2026-10-24, see H rows |
| C-11 | Components | Company Avatar | 206:18776 | `none` | missing-in-code | pending | Decision 2026-10-24: build in code. Needed by Prospect Card (C-23). |
| C-12 | Components | Avatar | 205:679 | `none` | missing-in-code | pending | Decision 2026-10-24: build in code. |
| C-13 | Components | Paddle Button | 216:20314 | `none` | missing-in-code | pending | Decision 2026-10-24: build in code. |
| C-14 | Components | Pill-Tabs | 279:1161 | `.nc-pill-tabs` | structure-drift | pending | Figma Size Sm/Lg; code has no size modifier. Figma hygiene fixed 2026-10-24, see H rows |
| C-15 | Components | Step Progress Indicator | 102:11781 | `.nc-step-progress` | structure-drift | pending | Figma Size Lg/Sm; code has no size modifier |
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
