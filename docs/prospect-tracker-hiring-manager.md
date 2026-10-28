# Manual Potential Hiring Manager and Builder handoff — issues #30 and #43

28 October 2026. Implemented and validated locally only. No commit, push, deployment, hosted migration or production writes. Automatic discovery, APIs, AI extraction, picker, network integration and enrichment remain deferred.

## Data and editor

`prospects.hiring_manager` is one nullable JSON value: required `name` (up to120 characters), optional `title`/`company` (up to160 each), optional `profile_url` (up to2048), and `status`. Manual edits use `manual`. The bounded provenance vocabulary reserves `suggested`, `user_selected`, and `user_verified` for future phases; no suggestion/selection/verification workflow is implemented here. These statuses do not establish that a person manages this vacancy.

The name is visible in a compact **Potential Hiring Manager** group. Optional Title, Company and Profile URL live under **Contact Details**, expanded when saved optional details exist. Shared fields, labels, validation, spacing, typography, keyboard behavior and mobile layout are reused. The helper explicitly says this is a potential contact, not a confirmed hiring manager. Contact is optional for create/save. If optional details are present, a name is required; clearing all contact inputs stores SQL NULL. Profile URLs accept HTTP/HTTPS professional sites beyond LinkedIn, with no credentials, whitespace or backslashes. They are not fetched.

The old Find People button/popover, associated UI module/styles and its obsolete browser fixture are removed. The pure `people-search.js` builder and Node tests remain available for the later provider phase; they perform no requests and are not mounted in the editor.

The additive local migration `20261028000000_prospect_hiring_manager.sql` creates a private JSON-shape validator, adds the nullable column and grants authenticated insert/update on that column only. It rejects unknown fields, invalid shapes/statuses, excessive lengths and unsafe URL shapes. Existing owner RLS, revision trigger and exact updated_at guards are retained. No contact table, discovery evidence, raw provider data, new service or dependency is introduced. Existing records default to null. Status history is not changed by contact-only edits. Types were generated from local PostgreSQL introspection using the narrowly scoped `--hiring-manager-only` option; hosted types must be regenerated after the separately approved migration.

Ingestion has no authority to supply/overwrite `hiring_manager`; the returned preview whitelist still excludes it. Browser population updates only ATS-owned job controls, retaining manual contact inputs. Later ingestion patches omit the contact key. The new Contact Details disclosure made the previous first-details selector ambiguous, so ingestion explicitly opens `.prospect-job-details` to preserve the original More Job Details behavior.

## Builder handoff and recipient safeguard

The existing one-use, same-origin local-storage handoff remains token-addressed, path-scoped and five-minute-expiring. Its version1 job payload accepts an optional `hiring_manager` containing only saved `name` and `status`. No contact details enter the URL. Unknown job/contact keys are rejected, preventing accidental notes/profile/contact-corpus transfers. Old payloads without a contact continue to work. Title, company and profile URL stay in Tracker: Builder has no compatible dedicated fields for them, so they are not appended to the recipient name or duplicated in extra notes.

Builder consumes job fields under the existing draft-replacement confirmation and leaves its current Hiring contact unchanged. If job replacement is declined, the contact is not offered. Otherwise the existing handoff notice shows the potential contact, its provenance and an explicit **Use [name] as Recipient** action. No automatic name population occurs for manual, suggested, selected or verified provenance. The name reaches the existing `hiringContact` field only after this action. If a different recipient is already entered, a confirmation protects it. The comparison happens at click time, including edits made after handoff arrival. Decline preserves it; acceptance leaves the normal recipient field editable. Missing contact preserves the recipient and existing blank-field Hiring Team fallback.

This visible action replaces an initially tested page-load confirmation: background-tab dialog behavior was not a reliable explicit-use boundary. The generated-cover-letter prompt still uses the existing field, so the explicit action is the safeguard; no cover-letter flow or export formatting was redesigned.

## Acceptance and validation

Issue #30 complete for this phase: persistent manual contact, optional fields and clearing, existing-row compatibility, owner/revision protections, preservation during ingestion, safe validation, and removal of old Find People UI. Deferred: automatic candidates/ingestion suggestions, in-field picker, evidence storage/provider integration, and user verification controls. Reserved provenance values alone are not those features.

Issue #43 implemented locally: saved contact transport, safe suggested/unverified/default behavior, explicit recipient choice, existing-recipient protection, no-contact compatibility and continued recipient editability. Only the name is compatible with Builder's current fields.

- Focused persistence/handoff tests:13/13 pass. Cover manual/future provenance validation, create/edit/clear/reload, missing contacts, unknown data/unsafe URLs, owner isolation, stale/failed writes, history isolation and ingestion preservation. Handoff coverage includes old payloads, token expiry/path isolation, minimal payloads, explicit use for every provenance, existing-recipient decline and later editing.
- Full Node suite:254/255 pass. Sole pre-existing failure: `resume-context.test.js:34`, actual “May 2026 to Present” versus expected “May 2026 to Aug 2026”. The data test's returned-row fixture was updated for the new nullable column.
- Frontend/backend typechecks and lint pass; backend tests19/19 pass. `git diff --check` passes.
- Browser fixture `tests/fixtures/hiring-manager-editor.html` passes with real form/preview/handoff components and synthetic responses. It validates saved/optional fields, removed action, profile validation, name dependency, edit/clear, saved-only handoff despite unsaved edits, only compatible payload fields and contact preservation through an actual mocked ingestion preview.
- Full disposable app: edited Alex Example → Sam Example, saved and reloaded successfully; confirmed existing profile/title/company persisted. Actual Send to Builder showed Sam as a potential contact while recipient remained blank, then explicit Use populated it; editing the recipient afterward worked. Existing-recipient confirmation was visibly presented; browser automation stalled handling its decline, so declined-replacement correctness is claimed from automated shared tests, not a successful browser decline.
- Inspected desktop and actual390px light/dark contact layout, native focus indicator and Name → Contact Details keyboard order. Screenshot artifacts are outside the repo at `/private/tmp/hiring-manager-mobile-dark.png`, `/private/tmp/hiring-manager-mobile-light.png` and `/private/tmp/hiring-manager-builder.png`.

No résumé generation/export request was made. The disposable server does not serve all career-context assets, so Builder's unrelated emphasis-context loader reported a fixture404; generation is not part of this handoff acceptance.

## Files and release boundary

- New: migration; `hiring-manager.js`; `tests/hiring-manager.test.js`; `tests/fixtures/hiring-manager-editor.html` and `.js`; this document.
- Updated: `model.js`, `prospect-form.js`, `view-model.js`, `ui.js`, `ingestion-ui.js`, `styles.css`, `database.types.ts`; `scripts/local-database.js`, `scripts/generate-local-types.js`; disposable `tests/fixtures/radar-server.js`; `tests/data.test.js`, `tests/resume-handoff.test.js`; shared `tools/shared/resume-handoff.mjs`; Builder `tools/resume-tailor.html`.
- Cache references: `app.js`, `bootstrap.js`, `index.html`, shared handoff import and Builder import use prepared revision `20261028-hiring-manager`.
- Removed: `find-people.js` and its two obsolete UI-fixture files. Previous external-search document is marked historical.

Release needs separate approval: apply only the reviewed additive migration, regenerate types from hosted Supabase, then release Tracker and Builder together through Pages. No separate Edge Function deployment is required for this phase: contact persistence uses existing Supabase REST/owner guards and ingestion's accepted preview contract is unchanged. If functions are later redeployed, include the new imported validator module in the bundle. Before migration, this frontend cannot save the new field and must not be published as complete. Rollback should prefer restoring the frontend while retaining the nullable column/data; do not drop stored contacts as part of a code rollback.

Product review: confirm the visible recipient opt-in and optional Company field. No automatic-discovery/provider decision is required for this phase. Explicit user authorization remains required before commit/push/deployment or any hosted migration.
