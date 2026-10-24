# Design sync ledger

- Figma file: nextchapter (hLBR7Nl3GelwM9hstQb3Ah), library pages Brand 45:3, Components 92:5175
- Figma last modified: not exposed by the plugin API; inventory read 2026-10-24
- Code baseline: 66eac22 (2026-10-22)
- Audit run: 2026-10-24 with lr-design-system-sync (audit, mapping, and approved Figma hygiene fixes; no code changed)
- Direction: Figma to code
- Machine-readable copy: ledger.json (source for the Figma mirror)

## Inventory

| Category | Figma count | Ledger rows | Synced | Open |
|---|---|---|---|---|
| Variables | 173 | 34 groups (173 vars) | 30 | 2 |
| Text styles | 17 | 17 | 11 | 6 |
| Effect styles | 1 | 1 | 1 | 0 |
| Paint styles | 0 | 0 | 0 | 0 |
| Components | 24 | 24 | 0 | 24 |
| Figma hygiene | - | 7 | 0 | 0 |

## Figma fixes applied

- 2026-10-24: agent bound 59 unbound padding, gap and radius values in 7 components to existing Spacing and Radius variables (user-approved). Only exact value matches were bound, except 6 pill and circle radii (999 or 10) moved to radius/full (9999), which renders identically. Re-scan of all 24 library components found 0 unbound padding, gap or radius values.

Status totals: blocked 6, fixed-in-figma 7, needs-decision 5, pending 21, skipped 2, synced 42

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
| V-09 | Variables | Theme surface/* (3) | Theme | `tokens.css` | value-drift | pending | surface/default: Figma aliases neutral/50 and neutral/900 directly, code aliases --nc-surface-raised. Same resolved color; alias chain differs. |
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
| V-29 | Variables | Spacing in use (9) | Spacing | `tokens.css` | match | synced | 0_5, 1, 1_5, 2, 3, 4, 5, 7, 10 |
| V-30 | Variables | Spacing not in code (26) | Spacing | `tokens.css` | missing-in-code | skipped | Code adds steps only when a consumer needs them (tokens.css comment). Confirm or sync full scale. |
| V-31 | Variables | Radius in use (6) | Radius | `tokens.css` | match | synced | --nc-radius-panel is a code-only alias of xl |
| V-32 | Variables | Radius not in code (3) | Radius | `tokens.css` | missing-in-code | skipped | none, lg, 3xl. Same subset rule. lg duplicates default (8). |
| V-33 | Variables | Typography font-family (3) | Typography | `--nc-font-*` | match | synced | named --nc-font-serif|sans|mono |
| V-34 | Variables | Typography size, line height, weight (21) | Typography | `none` | missing-in-code | needs-decision | All 17 text styles bind these variables, but code text tokens use raw px. Add --nc-font-size-*, --nc-line-height-*, --nc-font-weight-* and point --nc-type-* at them? font-size/6xl (67) and line-height/20 (80) are unused by any style. |
| T-01 | Text styles | Type/Display | text style | `--nc-type-display-*` | match | synced | values match; raw px, see Typography row |
| T-02 | Text styles | Type/Heading/H1 | text style | `--nc-type-h1-*` | match | synced | values match; raw px, see Typography row |
| T-03 | Text styles | Type/Heading/H2 | text style | `--nc-type-h2-*` | match | synced | values match; raw px, see Typography row |
| T-04 | Text styles | Type/Heading/H3 | text style | `--nc-type-h3-*` | match | synced | values match; raw px, see Typography row |
| T-05 | Text styles | Type/Heading/H4 | text style | `--nc-type-h4-*` | match | synced | values match; raw px, see Typography row |
| T-06 | Text styles | Type/Body/Large | text style | `--nc-type-body-large-*` | match | blocked | Inter Light (300) is not loaded: Google Fonts URL requests Inter 400;500;600 and default-weight Plex Mono, so the browser falls back to 400. Add wght 300 to the font URL on all 4 entry pages. |
| T-07 | Text styles | Type/Body/Default | text style | `--nc-type-body-default-*` | match | blocked | Inter Light (300) is not loaded: Google Fonts URL requests Inter 400;500;600 and default-weight Plex Mono, so the browser falls back to 400. Add wght 300 to the font URL on all 4 entry pages. |
| T-08 | Text styles | Type/Body/Small | text style | `--nc-type-body-small-*` | match | blocked | Inter Light (300) is not loaded: Google Fonts URL requests Inter 400;500;600 and default-weight Plex Mono, so the browser falls back to 400. Add wght 300 to the font URL on all 4 entry pages. |
| T-09 | Text styles | Type/Caption | text style | `--nc-type-caption-*` | match | blocked | Inter Light (300) is not loaded: Google Fonts URL requests Inter 400;500;600 and default-weight Plex Mono, so the browser falls back to 400. Add wght 300 to the font URL on all 4 entry pages. |
| T-10 | Text styles | Type/UI/Title | text style | `--nc-type-ui-title-*` | match | synced | values match; raw px, see Typography row |
| T-11 | Text styles | Type/UI/Label | text style | `--nc-type-ui-label-*` | match | synced | values match; raw px, see Typography row |
| T-12 | Text styles | Type/UI/Label Sm | text style | `--nc-type-ui-label-sm-*` | match | synced | values match; raw px, see Typography row |
| T-13 | Text styles | Type/UI/Button | text style | `--nc-type-ui-button-*` | match | synced | values match; raw px, see Typography row |
| T-14 | Text styles | Type/UI/Button Sm | text style | `--nc-type-ui-button-small-*` | match | synced | values match; raw px, see Typography row |
| T-15 | Text styles | Type/UI/Badge | text style | `--nc-type-ui-badge-*` | match | blocked | Inter Light (300) is not loaded: Google Fonts URL requests Inter 400;500;600 and default-weight Plex Mono, so the browser falls back to 400. Add wght 300 to the font URL on all 4 entry pages. |
| T-16 | Text styles | Type/Meta | text style | `--nc-type-meta-*` | match | blocked | IBM Plex Mono Light (300) is not loaded: Google Fonts URL requests Inter 400;500;600 and default-weight Plex Mono, so the browser falls back to 400. Add wght 300 to the font URL on all 4 entry pages. |
| T-17 | Text styles | Type/UI/Status | text style | `--nc-type-ui-status-*` | match | synced | values match; raw px, see Typography row |
| E-01 | Effect styles | shadow/sm | effect style | `--nc-shadow-sm` | match | synced | 1px 1px 0 var(--nc-border-control); color binding preserved |
| C-01 | Components | Load Spinner | 81:1063 | `.nc-spinner` | structure-drift | pending |  |
| C-02 | Components | Status-Badge | 134:13529 | `.nc-status-badge` | structure-drift | pending |  |
| C-03 | Components | Avatar Badge | 205:665 | `none` | missing-in-code | needs-decision | Build in code or skip? |
| C-04 | Components | Input Label | 168:610 | `.nc-field__label` | structure-drift | pending | Figma hygiene fixed 2026-10-24, see H rows |
| C-05 | Components | Pill Tab Item | 92:5012 | `.nc-pill-tab` | structure-drift | pending | Figma Size Sm/Lg; code has no size modifier |
| C-06 | Components | Step Progress Item | 77:137 | `.nc-step` | structure-drift | pending | Figma Size Lg/Sm; code has no size modifier |
| C-07 | Components | Chip | 62:285 | `.nc-chip` | structure-drift | pending | Figma hygiene fixed 2026-10-24, see H rows |
| C-08 | Components | Button | 53:220 | `.nc-button` | structure-drift | pending | Figma has Icon Only variant; code has no icon-only modifier |
| C-09 | Components | Switch-Mode | 81:397 | `.theme-toggle` | structure-drift | pending | Figma hygiene fixed 2026-10-24, see H rows |
| C-10 | Components | MainNavItem | 92:9731 | `.nextchapter-nav-item` | structure-drift | pending | Figma hygiene fixed 2026-10-24, see H rows |
| C-11 | Components | Company Avatar | 206:18776 | `none` | missing-in-code | needs-decision | Build in code or skip? Used by Prospect Card. |
| C-12 | Components | Avatar | 205:679 | `none` | missing-in-code | needs-decision | Build in code or skip? |
| C-13 | Components | Paddle Button | 216:20314 | `none` | missing-in-code | needs-decision | Build in code or skip? |
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

## Component checklists

Filled in during component sync, one section per component (C rows), with verification evidence.
