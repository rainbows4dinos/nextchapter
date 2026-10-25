# Prospect Tracker Company Logos

Issue #29 adds optional `company_logo_url` and `company_logo_override` fields to prospects. A manual URL replacement or explicit clear sets the override flag. Repeated retrieval in the existing new-prospect preview respects that flag. A database trigger also preserves saved manual choices when an automatic refresh write explicitly supplies `company_logo_override: false`; other refreshed facts still save. Manual edits always supply `true`. There is no new existing-prospect refresh workflow, backfill, upload service, or employer crawl.

## Detection and review

Detection uses bounded responses under the supported provider identity, size, timeout and outbound-request rules:

- Ashby and Lever: the existing uniquely matched hosted `JobPosting.hiringOrganization.logo`.
- Workday: explicit CXS hiring-organization branding and uniquely matched hosted JobPosting branding, only when employer names agree. Conflicting candidate URLs remain absent.
- Workable: `logo` on the account already bound to the posting's `accountUid` and requested subdomain.
- Greenhouse: matching hiring-organization API metadata first. If absent, one optional hosted-page request (1 MiB, 2.5-second budget within the existing request deadline) checks the canonical posting and the employer header slot: `main.job-post > .job-post-container > .image-container > img.logo`, with company-matched alt text and a verified Greenhouse logo asset route. Missing, conflicting, rejected or unavailable branding leaves the API facts intact. No arbitrary HTML URLs are followed.

Employer metadata follows the [JobPosting hiringOrganization convention](https://developers.google.com/search/docs/appearance/structured-data/job-posting#hiring-organization). Plain HTTPS logo strings and single ImageObject `url`/`contentUrl` values are supported. Arrays, conflicting URLs/names, known ATS/recruiting labels, platform origins outside the narrow employer asset routes, known platform-branding paths, and generic page/publisher/social images are excluded. Matched Ashby metadata may reference `app.ashbyhq.com/api/images/org-theme-logo/<uuid>/<uuid>/<uuid>.<raster>`; generic Ashby logos and social assets remain rejected. No website/domain is inferred from a company name. This is conservative metadata extraction, not independent verification of an employer's identity or artwork. Missing logos do not discard posting facts.

A detected candidate appears in the company avatar, with a review message in the ingestion preview. Users can replace or remove it through the avatar editor. In Add Prospect and Prospect Details, activate the title avatar to open a compact Company Logo popover. It offers an Image URL field, Use Logo, and Remove Logo. Accepted selections update the draft avatar and persist through Add Prospect or Save Details; Escape or light dismissal discards uncommitted popover edits. Logo metadata stays out of the main form fields in both modes. The normal guarded save path is unchanged. Blank legacy records keep their initials.

## Rendering and URL policy

The shared avatar renderer composes the existing Company Avatar classes: 28px on cards and field previews, 56px in the Details title. Adjacent company text remains the accessible label. Images are decorative, non-draggable, and pointer-inert. Logos fit within the avatar without changing layout.

URLs must be absolute public HTTPS references of at most 2,048 characters, without credentials, custom ports or fragments. Literal IPs and local/reserved hostnames are rejected. `ats-logo.js` owns narrow employer asset routes for Greenhouse, Ashby, Lever and Workable. Only Greenhouse’s audited bare numeric cache-version suffix is accepted and canonicalized away (the live versioned and versionless ShopMy assets were identical). Extraction, manual validation and delivery use this same canonicalizer; storage stays query-free, so no schema change is needed. Arbitrary and signed query strings remain unsupported and are never blindly stripped. No supported audited candidate requires a signed URL.

Verified ATS asset routes use a new `action: "logo"` on the existing `job-ingest` function, behind its unchanged origin, verified Auth and single-owner gates. No prospect ID, company name or browser credentials are forwarded upstream. The transport resolves A records once, rejects the whole answer if any address is nonpublic, connects to the checked literal IP on port 443, then verifies TLS with the original ATS hostname using `Deno.startTls`. The connection never re-resolves DNS. IPv6-only destinations intentionally fall back. Every redirect is rejected.

The native HTTP/1 transport requests identity encoding and connection close. It accepts only status 200, bounded content-length/chunked/EOF bodies, no compression, conflicting framing, chunk extensions or trailers. Limits are six seconds, 16 KiB headers, 2 MiB image bytes plus 64 KiB wire-framing allowance, maximum 4096px per dimension and eight million pixels. PNG/JPEG/WebP signatures, structure and dimensions are checked independently of MIME; HTML, SVG, unsupported formats and oversized images are rejected. The browser decoder provides the final image validity check.

The function returns no-store binary content with `nosniff`, sandbox CSP and an exposed, validated raster-type header. Supabase’s SDK decodes `image/*` responses as text, so the response uses `application/octet-stream` and the client creates a typed Blob from the verified header. Avatars load short-lived object URLs and revoke them after load/failure. This supports ATS assets without anonymous CORS. Manual URLs outside the verified ATS routes retain the existing no-referrer, anonymous-CORS browser behavior; they are never proxied.

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

## Automatic logo corrections (October 25, 2026)

Changed implementation boundaries:

- `ingestion/greenhouse-branding.js`, `greenhouse.js`, `company-logo.js`: bounded employer-header fallback and narrowly permitted Ashby assets.
- `ats-logo.js`, `company-logo.js`: shared provider route and version canonicalization; persistence and manual precedence remain unchanged.
- `supabase/functions/job-ingest/logo-transport.ts`, `index.ts`, `ingestion/handler.js`, `ingestion/logo-image.js`: authenticated, IP-pinned raster delivery through the existing function; no new service or dependency.
- `company-logo-delivery.js`, `company-avatar.js`, `app.js`: shared authenticated binary loader, bounded fallback and object URL disposal. `ui.js`, `company-logo-editor.js`, `bootstrap.js`, `index.html` synchronize browser module revisions so header and board use the same configured avatar module.
- `logo-diagnostics.js`, `ingestion-client.js`: browser diagnostics enabled with `localStorage.setItem('nextchapter:logo-debug', '1')`. Backend extraction logs outcome names only. Outcomes distinguish absent/rejected/accepted candidates, branding/delivery failures, rejected content and rendered images. No names, URLs, tokens, prospect fields or user IDs are logged.
- `tests/logo-resolution.test.js`, `logo-transport.test.ts`, existing ingestion tests, fixture server, browser live checks and scoped test scripts: security, extraction, binary SDK, persistence and regression coverage.

Live public sources and real raster images were exercised through the production extraction and pinned transport, then through isolated Chrome and the disposable local Auth/database fixture. No hosted prospect records were touched:

| Employer | Posting/extraction | Pinned delivery | Ingestion avatar | Save/reload | Details/board |
| --- | --- | --- | --- | --- | --- |
| ShopMy / Greenhouse, job 5448826008 | Passed | JPEG, 23,547 bytes | Passed | Local DB passed | Passed |
| Propel / Ashby, e46ef4e0-33b0-4f21-acdf-6d7e78ec6b47 | Passed | PNG, 12,354 bytes | Passed | Local DB passed | Passed |
| Skio / Lever, 0110e9f5-4640-4daf-bc53-da03d6a4e642 | Passed | PNG, 22,816 bytes (upstream generic MIME) | Passed | Local DB passed | Passed |
| Hugging Face / Workable, 81B46579FE | Passed | PNG, 10,614 bytes | Passed | Local DB passed | Passed |

Validation: 48 focused Node ingestion/logo/SDK/RLS tests and 12 Deno function/transport tests passed. The full scoped suite reports 203 passing tests and the one existing résumé-context date mismatch described above. Application and function typecheck/lint and `git diff --check` passed.

The live browser check also verifies both themes at 1440px/390px and that the browser never requests ATS image hosts directly. The existing synthetic browser suite additionally covers manual replacement/clear, cancellation, keyboard controls, status history, layout, failed saves and broken/slow-image suppression. The rendered live board was inspected visually. ShopMy and Skio supply wordmarks that remain small at card size; no speculative cropping or substitute artwork was added.

Reproduce the explicit live check (network access and isolated Chrome CDP on port 9242 required), from `tools/prospect-tracker/`, in separate terminals:

```sh
node_modules/.bin/deno run --config ../../supabase/functions/job-ingest/deno.json --allow-net tests/browser/logo-transport-server.ts
node tests/browser/live-company-logo.mjs
```

The bridge is test-only, loopback-bound and must never be deployed. The fixture persists only in its disposable local database. Real-image transport checks also passed under Deno 2.1.4 (the documented hosted runtime generation) and the installed Deno 2.9.6. The corrected `job-ingest` was deployed as active version 10 on October 25, 2026 with JWT verification retained. An unauthenticated logo request returned 401, and signed-in hosted ShopMy ingestion produced the employer logo candidate. Frontend publication and final hosted image-render acceptance follow this backend deployment. No schema, dependency, third-party logo service, official-site fallback, company cache, Workday behavior or manual editing UX changed.
