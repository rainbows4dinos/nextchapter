# Find People — issue #30

Implemented locally, 27 October 2026. No commit, push, deployment, schema/backend change, paid API, AI call or added dependency. [Issue #30](https://github.com/rainbows4dinos/nextchapter/issues/30).

## Behavior

A shared tertiary **Find People** button sits beside **Send to Résumé Builder** in the saved editor's secondary action area. New prospects have no action. It captures saved company/title values when the editor is rendered; unsaved form values are never read. Saving details rebuilds the editor with the new saved context. Opening/dismissing a search neither saves nor cancels the prospect.

A native auto popover offers three ordinary external links:

- **Potential Hiring Managers / Team Leaders** → a fixed Google Search URL targeting public LinkedIn profile results.
- **Recruiters / Talent Acquisition** → a separate Google Search URL with relevant recruiting vocabulary.
- **Check My Network** → only `https://www.linkedin.com/`, with instructions to search the company, choose People/current employees, check first-degree connections and consider second-degree introductions.

All links use `target="_blank" rel="noopener noreferrer"` and identify their destination/new-tab behavior. The disclaimer is “Search leads to verify—not confirmed hiring managers.” No results are fetched, parsed, stored or represented as verified people. No LinkedIn deep links or automated account access are used.

The popover reuses `.nc-button--tertiary`, `.nc-menu-elevation`, semantic surface/typography/spacing tokens and the existing native-popover positioning pattern. It has an accessible dialog name, initial link focus, normal Tab navigation, Escape/trigger/light-dismiss behavior and focus restoration on Escape/link activation. Outside clicks retain focus on the clicked control. Scrolling repositions the popover rather than closing it during mobile activation; viewport listeners are scoped to its open lifetime and disconnected when the editor is removed. Figma detailed context was unavailable; existing code conventions and previously inspected canonical component metadata were used without introducing new button variants.

## Queries and privacy

`people-search.js` accepts two strings, not a prospect object. Only the normalized quoted saved employer and fixed vocabulary enter Google queries. The full title, notes, descriptions, résumé data, contacts, saved connections, IDs, location and status are not transmitted.

Company input is bounded before processing and normalized to a bounded name with whitespace collapsed and query delimiters removed. Empty/placeholder employers and email/URL/phone-like values disable all three destinations with guidance to correct/save the company. Ambiguous real names remain unchanged rather than being enriched or guessed; users must refine results externally. This deliberately conservative check can also reject unusual company names.

Title matching is bounded and case-insensitive. Specific patterns precede general ones, including Product Marketing and Sales/Product Operations. Supported disciplines are design, product, engineering, marketing, sales, finance and operations; unknown/missing roles use broad fixed team-leader/recruiter terms instead of forwarding raw title text. Director/VP/Head/Chief, Manager and advanced IC roles adjust leader terms. Lead alone does not imply management. These mappings are heuristics, not evidence of reporting lines or recruiter ownership.

All Google URLs are built with `URL` and `URLSearchParams`, not concatenated query parameters. Example for Example Studio / Director of Product Design:

`site:linkedin.com/in/ "Example Studio" ("VP of Design" OR "Head of Design" OR "Chief Design Officer")`

The user is told that Google receives the employer/role terms on activation. Search providers may retain those terms in account/browser history. Current employer, relevance and identity must be checked by the user; no complete coverage, current employment or network membership is promised.

## Validation

- Five Node tests cover all seven disciplines and precedence, seniority, missing/ambiguous employers, bounded inputs, query-structure safety, URL encoding, and exclusion of raw/private fields.
- `tests/fixtures/find-people-editor.html` runs offline real-editor/popover assertions: saved-only visibility, shared non-submit button, accessibility/focus, scroll stability, secure links and exact LinkedIn homepage, saved context despite draft edits, privacy, Escape restoration, external-link activation without submission, preserved drafts and disabled-employer guidance.
- Full disposable local app: verified placement, saved Example Studio / Director of Product Design searches while company/title/notes had unsaved edits; clicked a synthetic Google search and verified a new tab opened while the editor/draft stayed intact. Inspected desktop and actual 390px light/dark layouts; checked Tab/Escape and outside-click dismissal. No production data was accessed or modified for acceptance.
- Full Node suite: 246/247 passed. Sole failure is the pre-existing `resume-context.test.js:34` date expectation (“May 2026 to Present” vs “May 2026 to Aug 2026”). Typecheck, lint and `git diff --check` pass. Backend tests were not repeated because no backend/persistence behavior changed.

## Changed files and release

- `people-search.js`: pure query builder.
- `find-people.js`: popover and safe external links.
- `ui.js`, `styles.css`: saved-editor integration and token-based layout.
- `app.js`, `bootstrap.js`, `index.html`: prepared frontend cache revision `20261027-find-people` through the existing UI import chain.
- `tests/people-search.test.js`, `tests/fixtures/find-people-editor.html`, `tests/fixtures/find-people-editor.js`: regression coverage.
- This documentation file.

Release requires separate commit/push/Pages approval only. No migration, Edge Function deployment, configuration or credentials are needed. External search coverage and manual LinkedIn filtering remain limitations. Automated discovery and contact management remain out of scope.
