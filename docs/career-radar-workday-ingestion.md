# Career Radar: limited Workday ingestion

Implemented and deployed October 7, 2026, from checkpoint `bffc310`, following the approved compatibility spike. Local validation and authenticated hosted retrieval/preview acceptance passed. No database migration, generated type change, new dependency, browser setting, résumé change or Worker change is required.

## Supported links and identity

Use **Add prospect → Retrieve posting** with a public Workday detail link, then review the existing editable preview and explicitly save or cancel.

- `https://<tenant>.wd<cluster>.myworkdayjobs.com/[locale/]<site>/job/[location/]<posting-anchor>`
- `https://wd<cluster>.myworkdaysite.com/[locale/]recruiting/<tenant>/<site>/job/[location/]<posting-anchor>`

The cluster allowlist is **1, 3, 5, 103 and 501**, exercised in the spike or subsequent public detail smoke checks; multi-digit clusters are supported without allowing untested environments. Extend this list only after a public detail smoke check. Tenant/site/anchor tokens are validated. The complete anchor, including meaningful suffixes such as `-1`, is retained; its case-insensitive comparison identity is distinct from the CXS requisition ID. Locale, location and tracking variants match the same host/tenant/site/anchor. Different hosts, clusters, sites or repost anchors remain distinct; cross-host aliases are not assumed equivalent.

Canonical saved links omit locale, fragments, `utm_*`, `source` and `sourceid`; preserve the validated location segment and unknown query parameters. No input query is forwarded upstream. Board listings, `/details/` routes, application routes, custom employer domains, implementation/internal host variants and unknown clusters receive the existing manual-entry fallback.

## Retrieval and extraction

The adapter constructs `https://<validated-host>/wday/cxs/<tenant>/<site>/job/[location/]<complete-anchor>` internally. It GETs the public CXS detail response, validates its exact `jobPostingId`, `jobPostingSiteId` and any supplied hosted `externalUrl`, then optionally GETs the fixed public detail page. No upstream link is followed. The optional inert JSON-LD must match one exact CXS requisition and normalized title; any supplied URL must match the same posting identity.

| Field | Rule |
| --- | --- |
| Company | Explicit CXS or matched JSON-LD `hiringOrganization.name`; preserve legal entity names and warn for review. Conflicting names leave Company blank. Never manufacture a brand from the tenant or strip a legal prefix. |
| Title | Explicit CXS title |
| Location | All supplied primary/additional locations, country and matched geographic eligibility; preserve multiple locations |
| Work arrangement | Explicit recognized CXS `remoteType` or matched `TELECOMMUTE`; conflicts leave it blank with a warning. Remote-looking location names alone do not set it. Unknown `Flex` is not guessed. |
| Employment | Preserve CXS `timeType` verbatim; `Full time` does not mean permanent |
| Description | Complete CXS HTML converted to inert text with paragraphs/lists; no scripts/resources |
| Posted date | Valid matched `datePosted`, checked against any CXS `startDate`. Conflicts/relative dates stay blank. This is current publication, not an inferred original posting date. |
| Compensation | Complete explicit structured salary tiers, currency and interval; otherwise narrowly bounded labeled pay sections with all supplied tiers/qualifiers. Ambiguous sections and unlabeled prose leave it blank. No annualization. |
| Requisition | CXS `jobReqId` in preview metadata; never substituted for the full posting identity |

Discovered date remains first capture in Radar (UTC), editable. Source remains the optional discovery channel. Applied date, status, assessments and connections are not inferred. Missing required company/title must be completed before Save.

For pay prose, only explicit Salary/Pay/Compensation Range headings and safe known section boundaries are supported. Examples outside this conservative shape remain available in the complete description for manual review; blank Compensation does not assert that the posting has no pay information.

## Errors and security

Workday 403 is **inaccessible**, not proof of expiration. 404/410 or explicit `posted=false` is **unavailable**. Malformed/mismatched detail JSON, retrieval failures, redirects and throttling remain distinct typed errors. Optional metadata failure retains CXS facts with a warning; exhausting the shared deadline aborts the operation. `canApply=false` warns but never changes Radar status.

The existing function still verifies Supabase Auth, restricts the configured owner, enforces exact-origin CORS and keeps gateway JWT verification enabled. Only internally constructed HTTPS destinations on validated hosted identities are requested. Credentials, custom ports, traversal/encoded separators, IPs, hostile subdomains and unknown hosts are rejected. Redirects are not followed; no cookies or Radar credentials go to Workday.

Existing bounds remain: 4 KiB inbound body, 2,048-character URL, 1 MiB streamed upstream response, 32 KiB Auth response, 15-second overall deadline, and at most two Workday GETs. JSON-LD collection is inert and bounded. Retrieval never writes to the database, creates history, archives bodies or modifies existing prospects. Distributed rate limiting is still deferred; add it before automated discovery/broader traffic.

## Files and validation

New modules: `tools/prospect-tracker/ingestion/workday-url.js` (URL identity) and `workday.js` (CXS validation, matching, extraction and bounded retrieval). Shared dispatch, preview provider/method variants and UI support text add Workday. The JSON-LD collector is reused with Workday-specific matching; existing Ashby/Lever matching is unchanged. Existing duplicate comparison, preview, create path, revision guards and status trigger remain authoritative.

New synthetic fixtures and coverage live in `tools/prospect-tracker/tests/fixtures/workday/` and `tests/workday-ingestion.test.js`. Existing SDK/migration-backed persistence and Deno handler suites also cover Workday. No live posting bodies or personal job-search records were committed as fixtures.

From `tools/prospect-tracker/`:

```sh
npm run typecheck
npm run lint
npm test
npm run functions:typecheck
npm run functions:lint
npm run test:functions
npm run vendor:check
```

Local results: **79 Node tests and 5 Deno tests pass**, both typechecks/linters and vendor verification pass. Coverage includes both hosted families, clusters/locale/location aliases, shared-host routing, posting/requisition separation, repost suffixes, legal companies, remote conflicts, complete geography, pay present/missing/tiers, malformed/inaccessible/unavailable responses, unsafe URLs, redirects, size/deadline boundaries and conservative duplicates. Existing Greenhouse, Ashby, Lever, manual/data/RLS/revision/history regressions pass. Save tests use the actual SDK and migration-backed PostgreSQL fixture, retaining UUID across retries and producing one normal trigger event.

Local Chrome acceptance uses the disposable fixture server:

```sh
node tests/fixtures/radar-server.js
```

Sign in with the printed synthetic credentials. The full Workday fixture is `https://example.wd5.myworkdayjobs.com/en-US/External_Careers/job/Example-City/Senior-Product-Designer_REQ-123-1`; remove locale/location to test duplicate aliases. Anchors ending `REQ-999`, `REQ-404`, `REQ-403` exercise partial facts, unavailable and inaccessible outcomes. Retrieval/edit/Cancel left zero rows/events; a failed Save preserved the edited preview, retry created one prospect/event and reload restored both. Locale/location-alias duplicate review opened the original UUID/history after the existing native draft-discard confirmation. Missing Company blocked Save, 403 displayed inaccessible rather than expired, and normal manual creation succeeded in the disposable fixture.

Limited native-fetch smoke checks succeeded for public NVIDIA, McKesson and Penn postings. These exercised tenant/shared families, legal names, missing unlabeled pay, a real remote conflict and an explicit hourly pay section. They do not guarantee all tenants or Supabase egress behavior; hosted acceptance is separate.

## Deployment and hosted acceptance

Reuse existing `RADAR_PUBLISHABLE_KEY`, `RADAR_OWNER_ID`, `RADAR_ALLOWED_ORIGINS`; no credential/origin change is needed. Commit, then redeploy the function before publishing the browser's expanded support:

```sh
supabase functions deploy job-ingest --project-ref liwszkldtfxihoyipbai --use-api
git push origin main
```

Keep `verify_jwt = true`; never use `--no-verify-jwt`. The existing Pages workflow publishes the static changes and generates browser-safe config. See [initial server setup](career-radar-greenhouse-ingestion.md#deploy-and-configure) for configuration details.

Hosted checks must use the real signed-in account: retrieve real hosted links, review/edit, Cancel with no writes, partial/error behavior and existing-provider/manual regressions. Avoid disposable production prospects; Save/retry/history/reload and distinct-identity duplicate cases are covered locally. Keep read-only before/after record snapshots outside this public repository. Record actual hosted results rather than treating local tests as production acceptance.

## Hosted results — October 7, 2026

- Checkpoint `bffc310` was pushed to `main`; Pages workflow `37689753897` succeeded. `job-ingest` version 3 is active with its existing import map and `verify_jwt = true`. No new settings or credential changes were needed.
- The deployed function rejected unauthenticated POST with 401 and returned 204 for the existing Pages-origin preflight.
- Real signed-in retrieval passed for [NVIDIA (wd5)](https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/US-CA-Remote/Senior-Product-Manager--AI-Physics_JR2021069), [McKesson (wd3)](https://mckesson.wd3.myworkdayjobs.com/en-US/External_Careers/job/Product-Designer_JR0152759-1), and [Penn (shared wd1)](https://wd1.myworkdaysite.com/recruiting/upenn/careers-at-penn/job/ryan-veterinary-hospital/icu-veterinary-nurse-assistant_jr00120131-1). These were retrieval/preview/Cancel tests, not recommendations or saved opportunities.
- All three previews preserved explicit legal names, complete posting anchors and separate requisitions. McKesson retained all 22 locations/geographic eligibility and left its conflicting Hybrid/TELECOMMUTE arrangement blank with a warning. NVIDIA's unlabeled salary prose and McKesson's unsupported pay-heading shape stayed blank for manual review. Penn's bounded hourly pay section and qualification paragraph were preserved. Publication dates came from matched metadata, not relative text.
- Preview edits and Cancel wrote nothing. Greenhouse, Ashby and Lever retrieval, existing duplicate detection and Cancel passed against current postings. Hosted manual required-field validation, editing and Cancel passed; actual manual Save and Workday Save/retry/history/reload were exercised locally, without creating disposable production prospects. Workday alias/distinct-anchor duplicate cases were verified locally, not through an extra hosted save.
- Read-only before/after snapshots matched exactly: **43 prospects and 48 history events**, all fields unchanged. Private snapshots/screenshots remain outside the repository. No production prospect or audit event was created during this milestone's acceptance.
- Chrome initially retained old provider modules despite successful Pages deployment. Hosted bytes matched the checkpoint; one reload with DevTools cache disabled loaded the current assets and resolved the mismatch. The temporary cache setting was restored and DevTools closed. No application behavior mismatch remained. If Workday is reported unsupported immediately after publishing, refresh stale static assets before changing provider logic.

## Limitations and follow-up

CXS is an observed public interface, not a documented integration contract with guaranteed compatibility. Access can differ by tenant or egress region. No authenticated employer access, CAPTCHA handling, browser automation, generic scraping, custom domains, AI, discovery or schema changes were added. Optional JSON-LD absence leaves publication and other unsupported facts blank. Salary extraction is deliberately conservative. Manual Add still bypasses ingestion duplicate review; concurrent tabs can still create duplicates. Broader cluster coverage and durable rate limiting require separate review.

## wd501 compatibility fix — October 27, 2026

The shared browser/Edge Function recognizer rejected Ancestry before retrieval because cluster 501 was absent from the explicit allowlist. Added 501 without broadening the anchored hosted-domain patterns, accepted routes, posting identity checks or fetch policy. Other unverified clusters (including 502) remain unsupported. Both existing hosted URL families use the same cluster policy; the live smoke check covered the tenant-hosted family only.

Read-only public CXS smoke check returned HTTP 200 for [Ancestry's Director of UX posting](https://ancestry.wd501.myworkdayjobs.com/en-US/Careers/job/Remote/Director-of-UX--Engage_R003462-1). Its complete posting anchor, Careers site and hosted external URL matched the constructed request. The fixed adapter also completed native-fetch ingestion of the same public posting with a title and description. Public Ancestry detail pages also show optional locale and location routes. No live posting body was added as a fixture. This verifies the observed public interface, not authenticated hosted acceptance or all tenants.

Regression coverage adds 501 to the hosted-family/locale/location recognition matrix, exercises fixed two-request ingestion and preview decoding on 501, rejects conflicting host/site/repost identities, and retains unknown-cluster and hostile-domain rejection. Authentication, drafts, persistence and other providers are unchanged.

Release requires separately approved coordinated publication: deploy job-ingest with its updated shared modules and JWT verification enabled, then publish the static frontend. Refresh stale browser modules if necessary. Check real signed-in retrieval/edit/Cancel without writes after release; local/public checks do not establish deployed acceptance. No migration, secret or configuration change is required. Release authorized October 27: job-ingest version 15 deployed successfully with JWT verification preserved, before frontend publication. Signed-in browser acceptance is recorded below after publication.

Validation: 11 Workday tests and all 19 Deno tests passed; JavaScript/Edge typechecks and linters passed. Full Node suite: 242/243 passed. The remaining résumé-context date assertion (Present versus Aug 2026) also fails on an untouched HEAD archive. Browser interaction and hosted authenticated acceptance were not performed.
