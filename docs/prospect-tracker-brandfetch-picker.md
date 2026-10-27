# Manual company logo picker

The optional Brandfetch picker extends the existing avatar editor in Add Prospect and Prospect Details. It is user-driven and never participates in ingestion, employer identity verification or inventory backfilling. No new database columns or dependencies are needed.

## Interaction and persistence

The editor has one heading, “Choose a logo,” and a prefilled search input. After the existing 300ms debounce, up to five live results appear as centered 56px logo tiles with name and domain. Desktop uses three columns in a 480px popover; viewports at or below the existing 600px breakpoint use two columns. Results scroll independently, text truncates, and transparent assets retain white backing and contain sizing. Initials remain visible while loading; unavailable assets cannot be selected. No candidate is automatically chosen. The currently saved matching reference is visibly marked.

Clicking a loaded tile is the only selection action. New prospects update only their existing hidden draft fields and manual marker, then close; the normal initial creation persists them. Existing prospects call the current authenticated `updateProspect` with exactly the logo reference/manual marker and the exact current revision. The app advances its in-memory row/revision, updates the hidden logo fields and avatar, and closes without rebuilding the form, saving unrelated drafts or clearing the dirty flag. Subsequent form/status saves use the advanced revision. Failed/conflicting writes keep the picker, old avatar and form draft; conflicts require the user to reconcile/reload rather than silently retrying against newer data.

Saving disables the search/tiles and prevents duplicate submissions/dismissal. Escape and outside clicks otherwise dismiss without changes and return focus to the avatar. Arrow keys navigate tiles, Enter/Space select, and loading/saving/errors are announced. The avatar tooltip is suppressed while open. There is no action footer, custom URL entry, removal button or variant chooser. Existing custom URLs, all supported stored variants and explicit-clear semantics remain supported in validation/data/delivery; the redesign never rewrites existing references. The grid selects the existing default icon reference, without new discovery/ranking rules.

## Reference and delivery boundary

Persist only `https://cdn.brandfetch.io/domain/<domain>/type/<icon|symbol|logo>` in `company_logo_url`. The strict parser rejects credentials, ports, queries, fragments, arbitrary paths, invalid domains and private/literal address forms. No raw Search responses, temporary Search icon links or client ID are stored with a prospect. References from other providers keep their existing validation.

At render time the shared avatar appends fixed 112px dimensions, dark artwork for its white backing, explicit 404 fallback and the public client ID. Images hotlink directly with anonymous CORS and origin-only referrer. They never use the authenticated Blob loader, signed references or backend proxy. Neither application code nor tests download/cache Brandfetch image bytes. Ordinary browser HTTP caching is provider-controlled. Other image providers retain their existing no-referrer and authenticated-delivery paths.

Search calls only the free `/v2/search/` endpoint directly from the browser, with omitted credentials, origin-only referrer, no-store and an eight-second deadline. Editing/closing aborts obsolete requests; generation guards ignore late responses. Responses live only in the open editor and are released on close. Empty queries, null fields, duplicate names, timeouts, rate limits and errors offer recovery by editing the query.

## Configuration and release gate

Set the optional **public** `BRANDFETCH_CLIENT_ID` alongside the two existing public Supabase variables when running `npm run config:generate` from `tools/prospect-tracker`. The generator explicitly allowlists it and validates its syntax. Never use a Brand API Bearer/secret key. If absent, the picker reports search unavailable; saved Brandfetch references show initials until configuration is restored. Existing non-Brandfetch URLs continue to render.

The existing Pages workflow reads the public repository variable of that name. The grid redesign does not change its value or hosted configuration. The local preview reads the user's separate private client-ID file only into a disposable fixture server's generated public configuration. No actual client ID is committed.

Release this feature through the frontend Pages workflow. Release approval covers configuring the public Pages variable, updating matching frontend cache revisions, running checks and publishing; production test-record writes require separate approval. No Edge Function deployment, migration or signing-key change is needed. Test actual Pages-origin Search/CORS/referrer behavior before declaring hosted acceptance; successful localhost loading is not proof of hosted configuration. If anonymous loading fails, keep initials rather than forwarding credentials or weakening protections. Do not create hosted test records without separate approval.

## Vendor and privacy requirements

Reviewed 26 October 2026 against the official [Search guidance](https://docs.brandfetch.com/brand-search-api/overview), [autocomplete guide](https://docs.brandfetch.com/use-cases/company-autocomplete), [Logo guidance](https://docs.brandfetch.com/logo-api/overview) and [parameters](https://docs.brandfetch.com/logo-api/parameters). These document the user-facing autocomplete use, storage of a selected domain, direct browser Search and logo hotlinks, and no required attribution. Raw Search data must not be persisted or cached; image downloading/rehosting requires separate permission and is not implemented. Brand rights and vendor terms still apply; this is not an independent trademark license review.

Brandfetch receives the entered query, selected public domain, client ID, browser IP and application origin. No prospect IDs, job URLs, owner IDs, application auth tokens, full page paths or user credentials are added to requests. Search occurs only while the user opens/edits this control. Neither paid Brand API calls nor background inventory searches exist. Vendor availability, terms and origin/CORS restrictions remain external dependencies.

## Validation

Run `npm run typecheck`, `npm run lint`, `npm test` and existing backend checks in the scoped package. `tests/brandfetch.test.js` covers strict references, public configuration, free Search requests/nulls/errors/cancellation, backend exclusion, manual precedence and disposable owner-scoped create/edit/failed-save/reload/clear persistence. Existing logo tests cover ATS and managed references.

The native DOM regression page at `tests/fixtures/brandfetch-editor.html`, served by the existing local fixture, has a Run Component Tests button. It synthesizes Search and image events, never uses real Brandfetch images or database writes, and checks debounce, timeout, stale results, broken assets, keyboard navigation, draft-only selection, saving locks, failures/retry and dismissal. It is a test harness, not application navigation. Actual CDN loading and responsive presentation require separate browser inspection.
