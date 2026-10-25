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
| Components | 24 | 24 | 19 | 5 |
| Figma hygiene | - | 13 | 0 | 0 |

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
- 2026-10-24: Component sync batch 3 (C-08 Button, C-09 Switch-Mode, C-10 MainNavItem): buttons now 40/28px (were 42/30) with side padding minus the border, new .nc-button--icon-only; Switch-Mode already matched; nav item padding tokenized. components.css and navigation.css cache revisions 20261024-batch-3. New Figma item H-10. Evidence in design-sync/evidence/batch-3.*; Resume Builder checked at 1280px.
- 2026-10-24: Component sync batch 4 (C-15 Step Progress Indicator, C-16 TextField, C-17 TextArea): shared input padding corrected for the inside stroke, disabled inputs get @action/disabled/bg with no border, error border uses @danger/border, input radius and border tokens match Figma bindings, field spacing tokenized. components.css cache revision 20261024-batch-4. New Figma item H-11. Evidence in design-sync/evidence/batch-4.*; Resume Builder fields checked in the browser.
- 2026-10-24: TextField Action R: the audit had marked it unused, but Prospect Tracker's Job URL field implements it locally (user caught this). Promoted to shared .nc-input-group / .nc-input-group__action (Action L and R), switched ui.js to it and removed the local job-url-control CSS. Prospect Tracker styles.css, bootstrap.js, app.js and ui.js cache revisions 20261024-input-action; components.css 20261024-input-action. Tests 190/191 (pre-existing failure), lint clean.
- 2026-10-24: Built TextField Icon R at the user's request: shared .nc-input-group__icon with padding and position rules for icon alone and icon plus Action R, disabled color. components.css cache revision 20261024-input-icon. New Figma item H-12 (icon color unbound).
- 2026-10-24: Designer direction: Icon R sits to the right of Action R. Code updated (icon always at the end, link shifts left 8px past it). Figma variants disagree on the order; added to H-12.
- 2026-10-24: Designer fixed TextField content order (Icon R after Action R in all five variants, verified). Icon R color could not be verified through the API. H-10 (mobile nav padding) and H-11 (TextArea 98 vs 96) re-checked: unchanged, still open.
- 2026-10-24: Designer fixed H-11 (TextArea 98px in all states; code min-height 96 -> 98) and partly H-10 (mobile nav radius/md in all states; code mobile default radius set to md, padding tokenized). Selected mobile padding 6 vs 4 still open pending designer confirmation. components.css and navigation.css cache revisions 20261024-figma-fixes.
- 2026-10-24: Designer fixed H-10 (mobile nav items 6px padding and radius/md in all states); code follows for mobile and the compact account menu. H-12 closed as a false positive: Icon R is bound to text/secondary (action/disabled/fg when disabled), which the API could not read inside the instance. navigation.css cache revision 20261024-nav-mobile.
- 2026-10-24: Component sync batch 5 (C-18 Select, C-19 Checkbox, C-20 Radio): Select chevron positioned and padded like TextField Icon R; new .nc-choice label composite for Checkbox and Radio (gap 8/6, Input Label type, disabled label color). Controls already matched. components.css cache revision 20261024-batch-5. Open question: Prospect Tracker date filter radio labels. Evidence in design-sync/evidence/batch-5.*.
- 2026-10-24: Prospect Tracker date filter range radios switched to the shared Radio Sm label (.nc-choice--sm); local font-size and gap removed from .board-date-option. Cache revisions: date-filter.js, ui.js, app.js, bootstrap.js and styles.css 20261024-radio-label. Tests 190/191 (pre-existing failure), lint clean.
- 2026-10-24: Component sync batch 6 (C-21 Alert, C-22 Toast, C-03 Avatar Badge): alert and toast padding corrected for the inside stroke (alerts were 42px tall), radius @radius/lg; new .nc-avatar-badge. components.css cache revision 20261024-batch-6. New Figma item H-13 (badge ring bound to a deleted variable). Evidence in design-sync/evidence/batch-6.*.
- 2026-10-24: Designer rebound the Avatar Badge ring to surface/default (closes H-13, verified).

Status totals: fixed-in-figma 13, pending 5, synced 71

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
| C-03 | Components | Avatar Badge | 205:665 | `none` | missing-in-code | synced | New .nc-avatar-badge: 8px @warning/fg dot with a 1px @surface/default ring outside. Positioning on the avatar comes with Avatar (C-12). |
| C-04 | Components | Input Label | 168:610 | `.nc-field__label` | structure-drift | synced | Added .nc-field__label--sm (Figma Size=Sm); 2px offsets now use --nc-space-0-5. Label bottom margin belongs to TextField and is checked in C-16. |
| C-05 | Components | Pill Tab Item | 92:5012 | `.nc-pill-tab` | structure-drift | synced | Padding and gap use spacing tokens; tabs are group height minus 4px (Sm 24, Lg 36) and stay on one line. Lg via .nc-pill-tabs--lg. |
| C-06 | Components | Step Progress Item | 77:137 | `.nc-step` | structure-drift | synced | Lg is now the default (UI/Button labels); .nc-step--sm added (UI/Button Sm, only the active label shown). The indicator switches to Sm below 600px. Resume Builder desktop step labels go from 12px to 16px. |
| C-07 | Components | Chip | 62:285 | `.nc-chip` | structure-drift | synced | Padding now subtracts the 1px border (Figma measures padding from the outer edge with an inside stroke). Sm width 70 -> 68, Lg horizontal padding 12 -> 16. |
| C-08 | Components | Button | 53:220 | `.nc-button` | structure-drift | synced | Buttons were 2px too tall and wide (42/30px); now fixed 40/28px with no vertical padding and side padding minus the border. Added .nc-button--icon-only (40x40, 28x28). |
| C-09 | Components | Switch-Mode | 81:397 | `.theme-toggle` | match | synced | No structural drift: 48x28 track, 20px thumb at 4px and 24px, 12px sun and moon at 6px and 30px, colors per theme all match. |
| C-10 | Components | MainNavItem | 92:9731 | `.nextchapter-nav-item` | structure-drift | synced | Desktop item matched (92x32); padding tokenized. Mobile now 6px side inset and radius md in every state, matching Figma after H-10. |
| C-11 | Components | Company Avatar | 206:18776 | `none` | missing-in-code | pending | Decision 2026-10-24: build in code. Needed by Prospect Card (C-23). |
| C-12 | Components | Avatar | 205:679 | `none` | missing-in-code | pending | Decision 2026-10-24: build in code. |
| C-13 | Components | Paddle Button | 216:20314 | `none` | missing-in-code | pending | Decision 2026-10-24: build in code. |
| C-14 | Components | Pill-Tabs | 279:1161 | `.nc-pill-tabs` | structure-drift | synced | Group height is the spec (Sm 28px, Lg 40px via --nc-pill-tabs-height); the 1px border sits inside the 2px padding, so tabs are group - 4px. Group grows with its tabs instead of wrapping. |
| C-15 | Components | Step Progress Indicator | 102:11781 | `.nc-step-progress` | match | synced | Already matched (16px gaps, 1px @border/control connectors, Lg and Sm widths 719 and 300); spacing now uses tokens. |
| C-16 | Components | TextField | 53:589 | `.nc-field .nc-input` | structure-drift | synced | Side padding 1px too wide fixed; disabled gets the gray fill and no border; error border @danger/border; Action L/R and Icon R now shared (.nc-input-group); Prospect Tracker Job URL uses Action R. |
| C-17 | Components | TextArea | 61:183 | `.nc-field .nc-textarea` | structure-drift | synced | Shares the TextField fixes. Height now 98px in all states, matching Figma after H-11. Native resize handle kept instead of Figma's drawn handle. |
| C-18 | Components | Select | 92:9223 | `.nc-select-wrap .nc-select` | structure-drift | synced | Shares the TextField fixes. Chevron is now positioned like TextField Icon R (12px inset, centered, 8px gap); right padding corrected for the border (36 -> 35px). |
| C-19 | Components | Checkbox | 165:590 | `.nc-checkbox` | structure-drift | synced | Control already matched (20/16px, check 14/12px, all state colors). Added .nc-choice, the Figma Checkbox/Radio label composite: 8px gap (6px Sm), Input Label type, disabled label @control/disabled-fg. |
| C-20 | Components | Radio | 165:618 | `.nc-radio` | structure-drift | synced | Control already matched; uses the new .nc-choice label. Prospect Tracker date filter radios switched to it (12px medium, 6px gap). |
| C-21 | Components | Alert | 53:638 | `.nc-alert` | structure-drift | synced | Alerts were 42px tall (border added to Figma padding); now 40px with padding minus the border. Radius uses @radius/lg as bound in Figma. |
| C-22 | Components | Toast | 125:11817 | `.nc-toast` | structure-drift | synced | Toasts were 2px too large; padding now subtracts the border (134x40 like Figma). Close icon lands 10px after the message and 8px from the edge. |
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
| H-10 | Figma hygiene | MainNavItem mobile variants | 92:9731 | `-` | hygiene | fixed-in-figma | Fixed by designer 2026-10-24: all mobile states use 6px side padding and radius/md (80x32). Code: every mobile and compact-menu state now uses calc(var(--nc-space-1-5) - 1px) side padding, so the item no longer changes width on hover or selection. |
| H-11 | Figma hygiene | TextArea input height | 61:183 | `-` | hygiene | fixed-in-figma | Fixed by designer 2026-10-24: TextArea input is 98px in all five states. Code min-height updated from 96 to 98. |
| H-12 | Figma hygiene | TextField Icon R color | 53:589 | `-` | false-positive | fixed-in-figma | False positive (designer confirmed 2026-10-24): Icon R is bound to text/secondary, and action/disabled/fg in the disabled state; the API could not read inside the icon instance. Order fix (icon after Action R) verified in all five variants. Code matches. |
| H-13 | Figma hygiene | Avatar Badge ring variable | 205:665 | `-` | hygiene | fixed-in-figma | Fixed by designer 2026-10-24: the badge ring is now bound to surface/default (verified), matching the code. |

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

### C-03 Avatar Badge

- [x] New .nc-avatar-badge, 8x8, radius full, @warning/fg
- [x] 1px outside ring via box-shadow in @surface/default, matching the Figma binding (H-13 fixed)
- [ ] Placement on Avatar: batch 7 (C-12)

Evidence: design-sync/evidence/batch-6.png and batch-6-metrics.json

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

### C-08 Button

- [x] Lg: min-height 40, padding 0 calc(var(--nc-space-3) - 1px), gap var(--nc-space-2); was padding 12px 12px (rendered 42px tall). Measured 121.7x40 vs Figma 123x40 (label width), icon at 12px matches
- [x] Sm: min-height 28, padding 0 calc(var(--nc-space-2) - 1px), gap 6; was padding 8px (rendered 30px). Measured 89.3x28 vs Figma 91x28, icon at 8px matches
- [x] Icon Only: new .nc-button--icon-only, 40x40 and 28x28, icon centered (aria-label required)
- [x] Primary, Secondary, Tertiary: default, hover, pressed and disabled bindings match Figma (Tertiary hover/pressed use secondary tokens in both)
- [x] Icons 16px (Lg) and 12px (Sm) match
- [x] Browser: Resume Builder primary button now 40px tall at 1280px; local overrides (board-date-trigger, board-search-clear) keep their own padding

Evidence: design-sync/evidence/batch-3.png and batch-3-metrics.json; Resume Builder checked in the browser at 1280px

### C-09 Switch-Mode

- [x] Track 48x28, radius full, 1px border; Light @action/primary, Dark @action/secondary bg and border
- [x] Thumb 20px at x4 (light) and x24 (dark) from the outer edge; fill @action/primary/fg or @action/secondary/fg
- [x] Moon at x30 (light, @action/secondary/fg) and sun at x6 (dark, @action/primary/fg), 12px
- [x] No edits needed

Evidence: design-sync/evidence/batch-3.png and batch-3-metrics.json; Resume Builder checked in the browser at 1280px

### C-10 MainNavItem

- [x] Default size: padding 8/12 from the outer edge -> calc(var(--nc-space-2) - 1px) calc(var(--nc-space-3) - 1px); measured 91.9x32 vs Figma 92x32
- [x] Hover stroke @action/primary/border; Selected fill @action/primary/bg with @action/primary/fg label
- [x] UI/Button label, radius full
- [x] Browser: all header nav items 32px tall at 1280px
- [x] Mobile (and compact account menu): 6px side inset in every state -> calc(var(--nc-space-1-5) - 1px), radius md, 32px tall; no width change on hover or selection (H-10 fixed in Figma)

Evidence: design-sync/evidence/batch-3.png and batch-3-metrics.json; Resume Builder checked in the browser at 1280px

### C-14 Pill-Tabs

- [x] Padding 2 from the outer edge with the 1px border inside it -> calc(var(--nc-space-0-5) - 1px), matching Figma stroke excluded from layout
- [x] Border 1px @input/border, fill @surface/default, radius full match
- [x] --nc-pill-tabs-height (28px Sm, 40px Lg) drives tab min-height = group - 2 x space-0-5. Browser: Sm 28/24, Lg 40/36, no wrapping at 385px
- [x] Removed max-width: 100% so the group grows with one-line tabs instead of wrapping them
- [ ] Enhancement requested: animated sliding selection pill (not in Figma yet)

Evidence: design-sync/evidence/batch-2.png and batch-2-metrics.json; Resume Builder step bar checked in the browser at 385px and 1280px

### C-15 Step Progress Indicator

- [x] Gap between items and connectors 16 -> var(--nc-space-4) (indicator gap and connector margin)
- [x] Connector 1px, fills remaining width, @border/control
- [x] Lg measured 719x32 and Sm 300x32 at Figma widths
- [x] Sm below 600px handled in batch 2

Evidence: design-sync/evidence/batch-4.png and batch-4-metrics.json; Resume Builder form fields checked in the browser

### C-16 TextField

- [x] Field: label, input, message stacked with 4px gaps -> var(--nc-space-1); measured 280x68 (92 with message) vs Figma 280x68 and 280x92
- [x] Input 40px, radius @radius/lg, border @input/border, fill @input/bg; padding 8/12 from the outer edge -> calc(var(--nc-space-2) - 1px) calc(var(--nc-space-3) - 1px) (was 7px 12px)
- [x] Hover @input/hover; placeholder @text/placeholder; value Body/Default
- [x] Error border @danger/border (was @danger/fg, same color); error text Body/Small @danger/fg
- [x] Disabled: fill @action/disabled/bg, no border, @action/disabled/fg text, label and helper (was input background with a visible border)
- [x] Focus ring 2px @focus/ring, 2px outside the edge, matches outline and offset
- [x] Helper and error text 2px side inset -> var(--nc-space-0-5)
- [x] Action R / Action L: new shared .nc-input-group with .nc-input-group__action (UI/Button, @link/default, @link/hover on hover, 12px from the edge, 8px gap; --nc-input-action-size reserves room). Prospect Tracker Job URL "Open" link moved from local CSS to it: now 16/16 instead of inherited size with a 24px line, and no hover background. Measured: 12px inset, 8.8px gap, vertically centered
- [x] Icon R: new .nc-input-group__icon (16px, 12px from the edge, 8px gap, vertically centered; always last, with Action R moved 8px to its left when both show, per designer direction; @text/secondary, @action/disabled/fg when disabled). Decorative only (pointer-events: none); use an Action for anything clickable

Evidence: design-sync/evidence/batch-4.png and batch-4-metrics.json; Resume Builder form fields checked in the browser

### C-17 TextArea

- [x] Same padding, border, radius, hover, error and disabled rules as TextField
- [-] Native resize handle kept; Figma draws a custom 3-line handle in @border/control
- [x] Pages that set their own textarea height (Resume Builder) are unaffected
- [x] min-height 98 matches all Figma states (was 96; Figma Error state fixed to 98, H-11)

Evidence: design-sync/evidence/batch-4.png and batch-4-metrics.json; Resume Builder form fields checked in the browser

### C-18 Select

- [x] Field, input, hover, error and disabled rules shared with TextField (batch 4)
- [x] Chevron: 16px, right var(--nc-space-3), vertically centered; padding-right calc(var(--nc-space-3) + 16px + var(--nc-space-2) - 1px) (was 36px). Measured 12px inset, 8px gap, centered
- [x] Chevron @text/secondary, @action/disabled/fg when disabled
- [x] Placeholder option uses @text/placeholder
- [-] Icon L slot not implemented; no current consumer

Evidence: design-sync/evidence/batch-5.png and batch-5-metrics.json; Select chevron measured in the browser

### C-19 Checkbox

- [x] Control 20x20 (Sm 16x16), radius sm, @control/* bindings for default, hover, selected, indeterminate, disabled match
- [x] Check 14px (Sm 12px); indeterminate bar matches the Figma minus glyph
- [x] New .nc-choice / .nc-choice__label / .nc-choice--sm: control then Input Label, gap 8 (Sm 6), UI/Label (Sm UI/Label Sm), label inset 2px; measured label at x28 (Sm x22) and control at y2, matching Figma
- [x] Disabled label @control/disabled-fg (Figma binding)
- [x] Career profile review checkbox already follows the Lg pattern locally (multi-line, top aligned); left as is

Evidence: design-sync/evidence/batch-5.png and batch-5-metrics.json; Select chevron measured in the browser

### C-20 Radio

- [x] Control 20x20 (Sm 16x16), radius full, dot 8px (Sm 6px), @control/* bindings match
- [x] Label via .nc-choice (same as Checkbox); measured 97x24 vs Figma 98x24
- [x] Prospect Tracker date filter range options now use .nc-choice--sm (user decision 2026-10-24): label 12/20 500 with a 6px gap (was 14px/400, 8px); row hit area and selected highlight kept locally. Verified with the tracker stylesheet in the browser: 274x32 rows, label at 22px, 12/20 500

Evidence: design-sync/evidence/batch-5.png and batch-5-metrics.json; Select chevron measured in the browser

### C-21 Alert

- [x] Padding 8/12 from the outer edge -> calc(var(--nc-space-2) - 1px) calc(var(--nc-space-3) - 1px); measured 40px tall (was 42) vs Figma 40
- [x] Gap 6, icon 16px at y12 (4px inset in the 24px line), message at x34, matching Figma
- [x] @success/@danger/@warning/@info bg, fg and border bindings; UI/Badge text
- [x] Radius @radius/lg (same 8px value as before)
- [x] Local overrides on pages only change margins

Evidence: design-sync/evidence/batch-6.png and batch-6-metrics.json

### C-22 Toast

- [x] Padding 8 from the outer edge -> calc(var(--nc-space-2) - 1px); measured 133.9x40 vs Figma 134x40
- [x] Gap 8; icon at x8, message at x32; close icon at x110 (24px target with negative margins), matching Figma
- [x] @surface/raised fill, @border/control stroke, shadow/sm, @text/primary message; icons in the variant fg color
- [x] Radius @radius/lg; dismiss radius uses @radius/sm

Evidence: design-sync/evidence/batch-6.png and batch-6-metrics.json
