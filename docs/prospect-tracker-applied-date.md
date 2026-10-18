# Automatic Applied date — Issue #16

[Issue #16](https://github.com/rainbows4dinos/nextchapter/issues/16) is implemented locally. No migration or schema/type change is required. No production write, commit or deployment was performed. The existing nullable `applied_on` date, exact `updated_at` guard, RLS and trigger-owned status history remain the persistence contract.

## Existing paths and behavior

Board column moves resolve Applied through `view-model.js` and `kanban.js`; Prospect Details uses its existing status select. Both call `createStatusSaver()` in `status-save.js`, then `data.changeStatus()`. Previously that wrote only status. Details already permits manually correcting or clearing `applied_on` under More job details, and date-only saves do not create history.

`data.createProspect()` also supports initial Applied status. The current add form and job-preview save use the default Prospect status; the explicit Radar handoff does too. These creation flows share the same helper, so any caller that explicitly creates Applied now gets the same missing-date behavior. There is no new creation status control.

## Save rules

- Creating Applied without a date includes today's browser-local `YYYY-MM-DD` date in the single insert. An explicit/backdated date is preserved.
- Entering Applied first reads saved status/date at the caller's exact revision. If it is a real transition and the saved date is null, the existing guarded PATCH includes status and date together. The extra read does not write; a competing edit between read and PATCH causes the existing stale-write error.
- Existing dates are preserved on re-entry and when leaving Applied. Unchanged Applied status, unrelated edits, viewing/filtering/reordering and later statuses never generate a date. Historical Applied records remain null unless manually corrected or subsequently undergoing a real transition into Applied.
- Details adopts the returned date and revision after success. If its date input has an unsaved manual correction or clearing, that draft remains for the separate Save details action. Other drafts also remain. This follows the existing independent status/details save model.
- Clearing an Applied date is allowed. Saving the same Applied status leaves it cleared; leaving and later re-entering Applied fills it again because that is a new transition with no saved date.
- The database's existing trigger remains the only history writer. A real status change creates one event; date-only edits, repeated statuses and reordering create none. Failure cannot save just the automatic date separately. Board failure restores its prior card; Details failure restores the saved status and retains drafts.

The date uses local `getFullYear()`, `getMonth()` and `getDate()`, consistent with the existing calendar-date inputs. It is not derived from a UTC ISO timestamp, server timezone, import time or record timestamps. The existing date label formatter displays that saved day without a timezone shift.

## Files and validation

- `tools/prospect-tracker/data.js`: local calendar helper, direct Applied creation, guarded transition logic.
- `tools/prospect-tracker/app.js`: synchronize the returned date while retaining manual drafts.
- `tools/prospect-tracker/index.html`, `bootstrap.js`: cache revisions for the changed modules.
- `tools/prospect-tracker/tests/data.test.js`, `tests/applied-date.test.js`: real vendored SDK requests and synthetic HTTP/PostgreSQL persistence/history tests.
- `tools/prospect-tracker/tests/browser/applied-date.mjs`: local Chromium acceptance with synthetic Auth and disposable PostgreSQL only.

Scoped typecheck, lint, all **178 Node tests**, and `git diff --check` pass. Tests cover initial Applied creation, transitions, manual and retroactive dates, clearing, Applied → Interviewing → Applied, exact revisions, stale/failed saves, unchanged historical rows, unrelated edits and card reordering. Timezone cases cover dates on either side of UTC midnight in Los Angeles and Tokyo plus leap day in Honolulu. Browser acceptance covers both status entry points, returned-form synchronization, a subsequent Details save, unsaved manual/date drafts, correction/clearing without extra history, failed-save recovery and reload persistence.

For browser acceptance, start the existing `startFixture()` from `tests/fixtures/radar-server.js` on port **8779**, use isolated Chrome CDP on **9229**, then run `node tools/prospect-tracker/tests/browser/applied-date.mjs`. Its screenshot is written to `/tmp/nextchapter-applied-date.png`.

## Limits

The browser's configured timezone and clock determine today. Direct SQL, dashboard writes and clients bypassing these data helpers do not auto-fill dates; a database default would not know the user's local day and could stamp historical records incorrectly. A read failure blocks an Applied change; it does not guess the existing date. Ambiguous network failures still require reload/reconciliation, as with existing guarded saves. Hosted acceptance, other browser engines and screen-reader speech are not established by these local tests. No date filtering or other requested-out-of-scope feature is included.
