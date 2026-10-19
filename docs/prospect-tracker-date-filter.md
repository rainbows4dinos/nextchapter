# Prospect Tracker date filtering — Issue #28

[Issue #28](https://github.com/rainbows4dinos/nextchapter/issues/28) is implemented locally on top of [Automatic Applied Date](prospect-tracker-applied-date.md). No database migration, new dependency or production change is required. The original feature was deployed on October 18, 2026; the October 19 frontend release includes filtered reordering.

## Controls and date meaning

The existing board toolbar adds **Date basis** (Added date / Applied date), **Date range**, and **Clear dates**. Added date and Past 90 days are the defaults. Presets are Past 7 days, Past 30 days, Past 90 days, Past Year, All and Custom range. Custom exposes native Start date / End date inputs. Custom ranges retain a screen-reader summary of the basis, inclusive calendar dates and local timezone; date-validation errors remain visible. Incomplete, invalid or reversed custom ranges show useful feedback and no results. Clear dates selects All while retaining the basis and any search.

Past N days includes today and the preceding N−1 local days. Past Year starts on the same calendar day in the previous year, clamping February 29 when necessary, and ends today. Timestamp filtering uses local midnight at the start and next-day exclusive midnight at the end, respecting daylight-saving changes. `applied_on` remains a date-only value and never shifts through UTC.

- **Added date** uses `created_at` explicitly. It describes adding a record, not submitting an application. `updated_at` is never a date basis.
- **Applied date** prefers the saved `applied_on`, including manual corrections and backdated dates, regardless of current status.
- When that field is missing, the first genuine historical transition into Applied supplies a fallback. It must have a non-null, different `from_status`; an initial Applied import/creation event does not qualify. Repeat transitions do not duplicate a card or replace the first fallback.
- Fallback cards visibly say **Applied status recorded [date]**. This records a status action, not proof of actual submission. The UI asks the user to review/correct the application date before reporting. No inferred date is written back.
- Records with no qualifying date are excluded from bounded Applied ranges. Applied / All keeps them accessible and labels **Application date unknown**. An unavailable history read is labeled incomplete rather than treating missing history as confirmed absence.

Current status never gates an Applied-date match. Interviewing, rejected, withdrawn and other prospects remain in their existing lifecycle columns when their application date matches. Matching Done cards open through the existing disclosure when the filter changes or history becomes available; its matching count remains visible.

## Ordering, state and reads

Search and date filtering compose with AND after manual column ordering. Existing company/title search semantics remain. Counts show the matching total and per-column X of Y; empty columns distinguish no matches, invalid dates and incomplete history. All plus an empty search restores the underlying full manual order. Within-column native drag and Alt+Up/Down reordering work with every search/date combination. Only visible cards exchange their existing slots in the full column order; hidden cards retain their indices. Saves submit the complete column order to the existing guarded RPC. Keyboard steps skip hidden cards, and first/last visible boundaries are no-ops. Existing cross-column status actions remain available.

The controls and scroll containers stay mounted during changes. Query, basis, preset and custom dates survive opening a card and returning in the same application session. This follows the existing in-memory board state; a full page reload resets filters, and owner/session changes discard state. There is no additional browser storage of prospect/history data.

Applied history loads lazily when selecting Applied basis. The dedicated `listAppliedTransitions(signal)` data method selects only genuine Applied transitions under the existing history RLS, paginates in 500-event batches, and uses timestamp/ID ordering. Requests scale by pages rather than prospects. A page failure rejects the whole load; the board shows incomplete results and Retry history, preserving filters. Known explicit-date matches can remain visible, with the count clearly marked incomplete. Disposing the board aborts the read and prevents late responses repainting another route/session. Successful history is cached only while that board view is mounted and re-read on return from Details.

Filtering makes no prospect, status, application-date or ledger writes. It reuses Issue #16's local calendar helper and the existing append-only history. No status selector (#12), reporting/export flow, benefits submission, backfill or Résumé Builder change is added.

## Files and validation

- `tools/prospect-tracker/board-dates.js`: local ranges, calendar validation, history fallback selection and the date predicate.
- `view-model.js`: search AND date filtering after manual ordering.
- `data.js`: abortable, paginated owner-scoped history read.
- `ui.js`, `styles.css`: compact shared-token controls, summaries/counts, missing/fallback/incomplete states, retry, Done discovery and visible filtered-order instructions.
- `app.js`, `bootstrap.js`, `index.html`: history-loader wiring and matching cache revisions; existing Issue #16 work is preserved.
- `tests/board-dates.test.js`, `board-date-data.test.js`, `data.test.js`: date semantics, real SDK/PGlite history and read-only behavior, pagination and failure coverage.
- `tests/browser/date-filter.mjs`: synthetic local browser acceptance; the existing ordering acceptance explicitly selects All before reordering.

Validation: **185 Node tests**, scoped typecheck/lint, documentation file links and `git diff --check` pass. Unit cases cover explicit dates and corrections, later statuses, first genuine/initial/repeated history events, missing dates, exact custom boundaries, all presets, leap-year clamping, local midnight, Los Angeles 23/25-hour DST days, Tokyo/Honolulu date edges, combined search and restored order. PostgreSQL/SDK tests verify historical status records without backfilling or creating events during filtering and batched pagination without per-card reads.

Browser acceptance uses a fresh disposable Auth/SDK/PGlite fixture on port 8781 and isolated Chrome CDP on 9231. It covers defaults, custom reporting weeks, search composition, range retention through Details/back, history failure/retry, fallback/missing labels, Done discovery, drag/keyboard reorder availability, clear-to-All restoration and no database writes during filtering. Both themes and widths 320/390/600/900/1440px pass; desktop/mobile renders were visually inspected. The existing native mouse-drag/keyboard ordering acceptance also passes on a separate fixture with range All. Start `startFixture(8781)` from `tests/fixtures/radar-server.js` on a clean fixture, then run `node tools/prospect-tracker/tests/browser/date-filter.mjs`. Visual checks are `/tmp/nextchapter-date-filter-desktop.png` and `/tmp/nextchapter-date-filter-mobile.png`.

Limits: history timestamps establish when a status was recorded, not when an older application was actually submitted. Review them before use in reporting. Local timezone/clock and available history determine results. Filters do not update in realtime from other devices; revisiting the board reloads records/history. Hosted API acceptance, other browser engines, real touch devices and screen-reader speech remain unverified. No live records were used for acceptance.

October 19 filtered-order validation: all 187 Node tests, typecheck/lint and diff checks pass. Both updated browser scripts pass, covering filtered drag/keyboard ordering with hidden slots preserved, default-date availability, failure recovery and reload persistence. Date filtering by itself remains read-only. No database migration or hosted test records were needed.
