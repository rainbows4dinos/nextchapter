# Verified branding discovery and selection

This extends the existing `job-ingest` pipeline and Company Avatar delivery path. It does not add a company model, schema, paid dependency, search service, AI classifier or backfill. Manual replacement and explicit clearing still use the existing override marker and owner-scoped save path.

## Identity and bounded discovery

Provider adapters retain optional `employer_website` evidence from a uniquely matched hiring organization's single `sameAs`, an explicitly labelled employer/homepage link in the matched posting, or the already-bound Workable account URL. Exact normalized company matching and existing ATS/intermediary exclusions remain prerequisites. Conflicting websites, social/recruiter links, arrays, private/literal addresses, credentials, queries, fragments and custom ports are rejected. HTTP metadata can identify a hostname, but only HTTPS at the same host/path is requested. No company-name domain guessing or manual audit mappings are used.

The server reads at most one verified HTML page (1 MiB), one declared same-origin manifest (64 KiB), and three declared image assets (2 MiB each). Only touch icons, manifest icons with `any` purpose, favicons and exact-company Organization logo metadata are candidates. It ignores page images, partner logos, social/Open Graph images, guessed root paths, maskable-only/monochrome icons and unsafe declarations. Candidate deduplication preserves the strongest declared role. Generic ATS branding continues to be excluded. Optional branding has an 8.5-second sub-budget inside the existing request deadline; the handler reserves time to return already-retrieved facts if optional work fails.

## Suitability without semantic overclaims

`logo-suitability.js` exposes qualitative decisions and flags, never a numerical quality score. The browser uses its native image decoder and a maximum 224px analysis canvas to estimate visible artwork against the actual white avatar backing. It measures original dimensions, normalized bounds, wide artwork, effective height at 28px, excessive padding and limited resolution. Original images are never cropped, edited or re-encoded for storage.

Verified employer identity and successful image validation come first. Explicit marketing/social/platform context, invisible artwork and invalid dimensions are rejected. Recognizable square ATS branding is retained ahead of website icons merely labelled as favicons. When ATS branding has significant geometry/padding flags, a suitable declared icon can be preferred. A flagged but otherwise valid wordmark remains an option if there is no better trustworthy candidate; geometry alone is not rejection or proof of semantic content. Explicit generic filename context such as `now-hiring` rejects identifiable marketing artwork. Opaque or misleadingly named banners cannot be classified perfectly without semantic analysis; this implementation does not pretend otherwise.

Image-analysis work fits within the existing client retrieval timeout. Broken, canceled, low-contrast or unsupported images leave initials; ordinary posting fields and manual choices remain usable. The normal preview carries candidate metadata and `field_sources` selection/provenance descriptions, then the selected reference alone saves through the existing form/data layer. No new fields or layouts are added to the form.

## Owner-bound delivery references

The server uses the existing native pinned transport for verified pages, manifests and raster bytes. It resolves A records once, rejects nonpublic/mixed answers, connects to a checked literal IP, verifies TLS using the original hostname, and never re-resolves for that connection. IPv6-only sites and all redirects intentionally fail closed. Requests carry only fixed Host/Accept/identity-encoding/connection-close headers, never user credentials or referrers. Existing header, wire, body, timeout and pixel limits apply. Actual PNG/JPEG/WebP structure and dimensions are checked independently of MIME/extension. SVG, HTML, GIF, animated PNG/WebP and oversized content are rejected. The browser decoder is the final validity check.

The image action accepts the old narrow ATS asset routes or a server-signed managed reference. It never accepts an arbitrary raw website image URL. Website references are issued only after a verified site explicitly declares the asset and its raster content validates. Independent-CDN ATS logos may also receive references after matched employer metadata establishes their source.

A managed reference is a query-free HTTPS URL under the project's `/functions/v1/job-ingest/logo/v1.<payload>.<signature>` namespace. Its payload contains only version, public asset URL, public site/origin and asset role. HMAC-SHA256 binds the payload to both the exact issuer and authenticated owner; owner IDs, prospect IDs, company names, credentials and auth tokens are not encoded. Every delivery verifies issuer/signature/owner and then repeats safe network and raster validation. The signature attests the evidence at capture time; it does not promise that a remote brand asset can never change later.

References persist in the existing `company_logo_url`, require no schema change, and have no automatic expiry. Keep the signing key stable. The URL is a reference, not an anonymous GET image endpoint; the shared loader sends it to the existing authenticated POST action and displays only a typed Blob. The editor, board and Details share this loader. Existing direct manual URLs outside these managed/ATS routes retain no-referrer anonymous CORS.

## Configuration and release

Set a unique, cryptographically random, server-only `RADAR_LOGO_SIGNING_KEY` (at least 32 characters; 32 random bytes encoded as hex is appropriate) in the function's secret store before enabling full discovery. Never put it in public-env, a browser file, command output or this repository. Back it up under normal operator secret management. Losing/changing it invalidates stored managed references; do not casually rotate it. A future rotation would require an explicit compatibility/migration plan. Do not reuse the key across projects.

If the key is absent, existing ingestion/delivery remains compatible and no new managed references or website discovery are enabled; explicit marketing filename context is still filtered. JWT verification, verified Auth, the single-owner restriction, CORS and database RLS remain unchanged. Deploy the backend with the key configured before publishing the matching browser revision. Existing prospects are never refreshed or rewritten automatically by deployment.

This implementation remains local pending review. No production key, deployment, hosted prospect save, replacement or backfill is authorized by the test commands below. Use the established read-only proposal workflow only after separate authorization; quality replacement needs an explicit mode because existing renderable logos are normally preserved. Do not reuse an earlier approval to replace newly selected assets.

## Validation

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

An explicit live-source acceptance harness uses production adapters, resolver, signer, transport and client selection, but synthetic Auth and a disposable local database. It never accesses hosted prospect records. Start isolated Chrome CDP on port 9242, then in separate terminals:

```sh
node_modules/.bin/deno run --config ../../supabase/functions/job-ingest/deno.json --allow-net tests/browser/branding-live-server.ts
node tests/browser/branding-live.mjs
```

Optional `LOGO_LIVE_CASES` points to a private outside-repo JSON array of `{company,posting}` examples. `LOGO_LIVE_OUTPUT` points to an existing outside-repo directory for private results/screenshots. Neither private employer collections nor audit assets belong in this repository. The harness uses loopback port 9253 and a synthetic test-only signing key; never deploy it. It asserts zero prospect/history writes, and checks native loading at 28px/56px plus light/dark responsive presentation.

Regression coverage includes ambiguous identity, explicit homepage links, unsafe metadata, declaration/manifest budgets, quality comparison, image bytes versus misleading extensions/MIME, original manual semantics, owner/issuer-bound signatures, tampering, raw-URL rejection, DNS rebinding/private networks, blocked redirects, content/pixel limits, unsupported images, optional deadlines and managed-reference persistence. The private audit examples can be exercised locally under controlled verified-identity fixtures; that is not proof that their websites are automatically discoverable.

## Known coverage limits

Reverse verification performed manually during an audit is not runtime identity evidence. If an ATS posting does not supply a trustworthy official website, the resolver keeps the ATS candidate or initials. It does not search for the employer, guess a domain or embed company-specific mappings. Strict redirect rejection, unsupported formats/query parameters, inaccessible sites and absent declarations can also leave ATS branding unchanged. Marketing classification uses explicit context plus qualitative geometry flags, not OCR or AI. Deferred key rotation and URL-length limits are operational constraints of schema-free signed references.
