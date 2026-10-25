# Company logo backfill dry run

`tools/prospect-tracker/logo-backfill-review.html` is a standalone operator review page. It reuses the Tracker's existing signed-in session, Supabase public configuration, verified Auth and owner RLS. It is deliberately absent from application navigation. The page has one read-only run control and no apply/save capability.

`logo-backfill.js` reads only ID, company, posting URL, logo reference, manual marker and exact revision. Reads explicitly filter the verified user ID and paginate. The decision engine accepts only retrieval and rendering dependencies, never a write operation. Manual replacements and explicit clears are always preserved, including broken manual logos. Supported posting URLs with no usable automatic image qualify; unsupported URLs and already-renderable images are skipped.

Resolution reuses `retrieveJob` and existing adapter/preview validation. A candidate must pass the current URL policy, have an extracted employer with source provenance, exactly match the stored company after case/whitespace/Unicode normalization, and load in an actual browser image decoder. Verified ATS assets use the existing authenticated pinned delivery path; other references use the same no-referrer anonymous-CORS behavior as avatars. All image checks time out. Identical posting identities and image checks are deduplicated in memory for one run. Distinct Ashby jobs on one board remain distinct. Individual failures do not halt the review.

The report includes per-record decisions and exact revisions for a future guarded approval step. `candidates_found` counts usable candidates returned by the existing extraction boundary; that boundary does not expose raw missing-versus-rejected metadata, so the report labels that uncertainty rather than inventing counts. `candidates_rejected` counts returned candidates failing URL, employer or rendering checks. `skipped` includes every record that is not an expected update. There are no writes, automatic retries, company enrichment, schema changes or update scripts in this phase.

Run after signing into Prospect Tracker on the same origin:

`tools/prospect-tracker/logo-backfill-review.html`

Reports remain in page memory. Save review artifacts outside the public repository, for example under `/private/tmp/career-radar-private/`, with restrictive file permissions. Do not commit prospect identifiers, employer lists, snapshots, URLs or report results. Applying any subset requires separate explicit approval, a fresh owner-scoped eligibility read and exact `updated_at` guard; preserve every non-logo field and manual choice. A dry run is not a reservation against concurrent edits.

Validation:

```sh
node --test tools/prospect-tracker/tests/logo-backfill.test.js
node tools/prospect-tracker/tests/browser/logo-backfill.mjs
npm --prefix tools/prospect-tracker run typecheck
npm --prefix tools/prospect-tracker run lint
```

The browser check requires isolated Chrome CDP on port 9242. It uses disposable synthetic records and asserts no additional prospect writes or history events during the dry run. Hosted dry-run results must be reported separately from these fixture checks, and no hosted changes may occur before approval.
