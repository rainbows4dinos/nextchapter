# Manual company logo picker

The optional Brandfetch picker extends the existing avatar editor in Add Prospect and Prospect Details. It is user-driven and never participates in ingestion, employer identity verification or inventory backfilling. No new database columns or dependencies are needed.

## Interaction and persistence

Opening the editor prefills the current company name and requests live matches after a 300ms debounce. Up to five returned matches show name, domain and a canonical 28px avatar. No result is automatically selected. Deliberate selection displays a 56px preview and Icon / Symbol / Logo options. Missing variants use initials, show feedback and disable Use Logo; provider-generated fallback artwork is disabled with `fallback/404`.

Use Logo changes the existing unsaved prospect form and manual-override marker. Only the normal prospect save/create action persists it. Cancel/Escape/light dismissal discard the editor selection; a failed prospect save preserves its draft. Remove Logo sets an explicit manual clear. Existing merge/guarded-save/RLS behavior remains authoritative. A custom image URL remains available in the same editor.

## Reference and delivery boundary

Persist only `https://cdn.brandfetch.io/domain/<domain>/type/<icon|symbol|logo>` in `company_logo_url`. The strict parser rejects credentials, ports, queries, fragments, arbitrary paths, invalid domains and private/literal address forms. No raw Search responses, temporary Search icon links or client ID are stored with a prospect. References from other providers keep their existing validation.

At render time the shared avatar appends fixed 112px dimensions, dark artwork for its white backing, explicit 404 fallback and the public client ID. Images hotlink directly with anonymous CORS and origin-only referrer. They never use the authenticated Blob loader, signed references or backend proxy. Neither application code nor tests download/cache Brandfetch image bytes. Ordinary browser HTTP caching is provider-controlled. Other image providers retain their existing no-referrer and authenticated-delivery paths.

Search calls only the free `/v2/search/` endpoint directly from the browser, with omitted credentials, origin-only referrer, no-store and an eight-second deadline. Editing/closing aborts obsolete requests; generation guards ignore late responses. Responses live only in the open editor and are released on close. Empty queries, null fields, duplicate names, timeouts, rate limits and errors retain a manual URL recovery path.

## Configuration and release gate

Set the optional **public** `BRANDFETCH_CLIENT_ID` alongside the two existing public Supabase variables when running `npm run config:generate` from `tools/prospect-tracker`. The generator explicitly allowlists it and validates its syntax. Never use a Brand API Bearer/secret key. If absent, the existing URL editor remains available; saved Brandfetch references show initials until configuration is restored.

The Pages workflow has been prepared to read a repository variable of that name. No repository variable or hosted configuration has been changed. The local preview reads the user's separate private client-ID file only into a disposable fixture server's generated public configuration. No actual client ID is committed.

Release this feature through the frontend Pages workflow. Release approval covers configuring the public Pages variable, updating matching frontend cache revisions, running checks and publishing; production test-record writes require separate approval. No Edge Function deployment, migration or signing-key change is needed. Test actual Pages-origin Search/CORS/referrer behavior before declaring hosted acceptance; successful localhost loading is not proof of hosted configuration. If anonymous loading fails, keep initials rather than forwarding credentials or weakening protections. Do not create hosted test records without separate approval.

## Vendor and privacy requirements

Reviewed 26 October 2026 against the official [Search guidance](https://docs.brandfetch.com/brand-search-api/overview), [autocomplete guide](https://docs.brandfetch.com/use-cases/company-autocomplete), [Logo guidance](https://docs.brandfetch.com/logo-api/overview) and [parameters](https://docs.brandfetch.com/logo-api/parameters). These document the user-facing autocomplete use, storage of a selected domain, direct browser Search and logo hotlinks, and no required attribution. Raw Search data must not be persisted or cached; image downloading/rehosting requires separate permission and is not implemented. Brand rights and vendor terms still apply; this is not an independent trademark license review.

Brandfetch receives the entered query, selected public domain, client ID, browser IP and application origin. No prospect IDs, job URLs, owner IDs, application auth tokens, full page paths or user credentials are added to requests. Search occurs only while the user opens/edits this control. Neither paid Brand API calls nor background inventory searches exist. Vendor availability, terms and origin/CORS restrictions remain external dependencies.

## Validation

Run `npm run typecheck`, `npm run lint`, `npm test` and existing backend checks in the scoped package. `tests/brandfetch.test.js` covers strict references, public configuration, free Search requests/nulls/errors/cancellation, backend exclusion, manual precedence and disposable owner-scoped create/edit/failed-save/reload/clear persistence. Existing logo tests cover ATS and managed references.

The native DOM regression page at `tests/fixtures/brandfetch-editor.html`, served by the existing local fixture, has a Run Component Tests button. It synthesizes Search and image events, never uses real Brandfetch images or database writes, and checks debounce, timeout, cancellation, stale results, variants, cancel, replacement and clear. It is a test harness, not application navigation. Actual CDN loading and responsive presentation require separate browser inspection.
