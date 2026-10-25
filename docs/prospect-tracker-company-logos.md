# Prospect Tracker Company Logos

Issue #29 adds optional `company_logo_url` and `company_logo_override` fields to prospects. A manual URL replacement or explicit clear sets the override flag. Repeated retrieval in the existing new-prospect preview respects that flag. A database trigger also preserves saved manual choices when an automatic refresh write explicitly supplies `company_logo_override: false`; other refreshed facts still save. Manual edits always supply `true`. There is no new existing-prospect refresh workflow, backfill, upload service, or employer crawl.

## Detection and review

Detection consumes only responses already fetched under the supported provider identity, size, timeout and outbound-request rules:

- Ashby and Lever: the existing uniquely matched hosted `JobPosting.hiringOrganization.logo`.
- Workday: explicit CXS hiring-organization branding and uniquely matched hosted JobPosting branding, only when employer names agree. Conflicting candidate URLs remain absent.
- Workable: `logo` on the account already bound to the posting's `accountUid` and requested subdomain.
- Greenhouse: explicit hiring-organization metadata if present in the existing job response and matching `company_name`. The usual public response often has no employer logo; no additional hosted-page request was added.

Employer metadata follows the [JobPosting hiringOrganization convention](https://developers.google.com/search/docs/appearance/structured-data/job-posting#hiring-organization). Plain HTTPS logo strings and single ImageObject `url`/`contentUrl` values are supported. Arrays, conflicting URLs/names, known ATS/recruiting labels, platform origins, known platform-branding paths, and generic page/publisher/social images are excluded. No website/domain is inferred from a company name. This is conservative metadata extraction, not independent verification of an employer's identity or artwork. Missing logos do not discard posting facts.

A detected candidate appears in the company avatar, with a review message in the ingestion preview. Users can replace or remove it through the avatar editor. In Add Prospect and Prospect Details, activate the title avatar to open a compact Company Logo popover. It offers an Image URL field, Use Logo, and Remove Logo. Accepted selections update the draft avatar and persist through Add Prospect or Save Details; Escape or light dismissal discards uncommitted popover edits. Logo metadata stays out of the main form fields in both modes. The normal guarded save path is unchanged. Blank legacy records keep their initials.

## Rendering and URL policy

The shared avatar renderer composes the existing Company Avatar classes: 28px on cards and field previews, 56px in the Details title. Adjacent company text remains the accessible label. Images are decorative, non-draggable, and pointer-inert. Logos fit within the avatar without changing layout.

URLs must be absolute public HTTPS references of at most 2,048 characters, with no credentials, custom port, query parameters or fragment. Literal IP addresses and local/reserved hostnames are rejected. Query-based and signed image URLs are intentionally unsupported, so they cannot carry prospect payloads. No server retrieves image bytes or follows image redirects. The browser uses `referrerpolicy="no-referrer"` and anonymous CORS; credentialed/hotlink-protected hosts may therefore fall back.

Remote content is assigned only to an `img` URL, never inline SVG, HTML, an iframe, or a link to executable content. Initials remain visible until a decoded image loads. Failed/blocked images are removed; pending images time out after eight seconds. A bounded page-session failure cache avoids retry loops across rerenders. Reloading the page permits another attempt.

## Validation and release

Automated coverage includes safe and unsafe URLs, all provider normalization paths, ambiguous/ATS metadata, manual replacement/clear precedence, real SDK create/edit/reload, revision conflicts, database refresh protection, unchanged status history, and owner RLS. `tests/browser/company-logo.mjs` creates a disposable fixture and intercepts synthetic image responses. It checks review/retrieval, manual overrides, clearing, save/reload, keyboard validation/Remove Logo, card activation, responsive themes, geometry, broken/slow images and request privacy. It uses isolated Chrome CDP at port 9242; no hosted records or real employer images are required. Screenshots go to the OS temporary directory.

From `tools/prospect-tracker/`:

```sh
npm run typecheck
npm run lint
npm test
npm run functions:typecheck
npm run functions:lint
npm run test:functions
node tests/browser/company-logo.mjs
```

Local application typecheck/lint, six logo tests, six Deno function tests, and the browser checks passed. The full Node suite reports 196 passing tests and one pre-existing `resume-context.test.js` date expectation failure (`May 2026 to Aug 2026` versus current canonical `May 2026 to Present`).

The company-logo migration was applied to the hosted `career-radar` project (`liwszkldtfxihoyipbai`) on October 24, 2026 through the authenticated Supabase SQL Editor because the CLI has no operator login. The exact migration SQL and its `20261025000000` history registration were executed atomically. Read-only verification confirmed both columns, the URL constraint, manual-override trigger, authenticated column write grants, and enabled RLS. No prospect records were created or edited.

Hosted database types were regenerated through the scoped `types:generate` script after CLI sign-in. `job-ingest` was redeployed as active version 9 with `verify_jwt: true`; an unauthenticated POST returned 401. Frontend publication uses the existing Pages workflow on `main`. Hosted application acceptance and current live provider-logo coverage remain unverified; a public Workable metadata probe returned 404 during implementation.

The initial Details avatar-editing refinement was published in commit `e6d755c`. The shared-form consolidation below extends the same interaction to Add Prospect.

## Shared prospect fields

`tools/prospect-tracker/prospect-form.js` owns the common company/title, URL action, description, additional details, source options, date inputs and notes markup. Its explicit `create`/`edit` mode preserves the existing field order and disclosure placement of each workflow. Both modes use the `.prospect-fields` presentation rules and the existing shared field-validation binding. `ui.js` still owns page headers, submission actions, résumé handoff and the Status/history sidebar; `app.js` and `ingestion-ui.js` retain persistence and retrieval responsibilities.

`company-logo-editor.js` accepts optional identity values, including an empty draft, with no database dependency. Both modes use its avatar/popover and hidden save fields. Company input and ingestion updates refresh the avatar; accepted replacements/removals set the existing manual marker. Closing the popover without accepting leaves draft data unchanged. No new record update API or schema was introduced.

The consolidation uses the existing Pages release workflow. Synthetic browser checks cover empty/manual creation, retrieved previews, zero writes before submission/after Cancel, logo draft preservation after a failed create, retry, shared label sets, live company initials, override/clear precedence, save/reload, status/date/history, light/dark desktop and narrow layouts, and popover cancellation/keyboard behavior.

Add Prospect now reuses the Details header markup, canonical Paddle Button and company avatar/title row. Both routes hide the redundant Tracker title bar and use the same responsive shell and main-column width. Add Prospect places the shared form in the main column and a compact, non-sticky ingestion utility in the existing 440px secondary column. Below the 1200px desktop breakpoint, ingestion precedes the form in a single column; DOM ordering follows the visible order. Only Details adds the sticky Status/history column. Browser checks compare header/main-column geometry at 1440, 1200, 899 and 390px in both themes. These presentation refinements use the existing Pages release workflow.

The Add Prospect import utility uses a short description and a collapsed Supported Job Sites disclosure. Cancel Retrieval is visible only while a request runs; cancellation retains the current form draft and returns focus to Retrieve Posting for retry. Draft navigation/discard remains available through Back to Board. These changes do not alter extraction, validation, submission or persistence.
