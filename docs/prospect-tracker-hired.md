# Prospect Tracker: Hired

Implemented locally on November 9, 2026. The owner confirmed applying the Hired migration before authorizing the frontend commit and push.

`hired` is a first-class, reversible success status. It has its own visible board column and a positive badge with a decorative sparkle in cards, details, and history. Existing search, status/date filters, counts, drag moves, and manual ordering apply. Done retains passed/rejected/withdrawn/closed. No other prospect changes when one is hired.

## Celebration

Both board moves and the status editor compare the previous status with the acknowledged saved row, after persistence and while the same route/account is current. Only entering `hired` opens the native modal. Loading a record, reloading, editing details, failed saves, and leaving Hired do not celebrate. Explicitly leaving and later reentering Hired celebrates again. There is no local-storage replay flag or persisted celebration state.

The dialog shows “You got the job! 🎉”, the saved title and company as text, and “A new chapter begins.” Continue or Escape dismisses it and returns focus to the status dropdown or moved card. Native modal behavior contains keyboard navigation. Route changes and sign-out dispose it. Thirty-two decorative CSS confetti pieces run once and are removed within 2.8 seconds; reduced-motion users receive the same dialog with no particles. A change to reduced motion also removes particles immediately. No dependency was added.

The implementation reuses canonical positive badge colors, shared buttons, typography and tokens, and the existing prospect-deletion dialog shell/elevation. The Figma canonical component reference was inspected; Hired adds a milestone composition using those existing primitives, without changing Figma.

## Database and release

[20261109000000_prospect_hired.sql](../supabase/migrations/20261109000000_prospect_hired.sql) extends all three status constraints (prospects, history from, history to), adds Hired to the database board-column mapping, and allows the existing owner-guarded ordering RPC to reorder Hired. It preserves existing rows, history, triggers, RLS, and function grants. Database columns and signatures are unchanged; generated status types remain `string`.

The owner confirmed applying the migration before publishing the updated frontend. Regenerate hosted database types using the established workflow after applying; no shape change is expected. Existing tabs running an older client cannot decode Hired, so refresh them after release. This feature does not change ingestion, Radar research, Builder handoff, or creation defaults. Those workflows continue using the shared status/data model.

## Local validation

From `tools/prospect-tracker/`:

- `npm run typecheck`
- `npm run lint`
- `npm test` (261 pass; one unrelated existing résumé-context date expectation fails: Aug 2026 versus canonical Present)
- `node tests/browser/hired.mjs` with the synthetic fixture on 8779 and isolated Chrome CDP on 9229, matching the other browser scripts
- `git diff --check`

The Hired unit/database tests cover validation, filters/counts, separate grouping, reversible transitions, history, and migration compatibility with existing rows. Browser acceptance covers failed and successful editor/board transitions, persisted status, edits and reload without replay, repeated transitions, native modality, initial/returned focus, Escape/Continue dismissal, reduced motion, light/dark themes, and 390/1440px screenshots. Screenshots are local `/tmp/nextchapter-hired-{dark,light}-{390,1440}.png` and `/tmp/nextchapter-hired-board.png`. All fixtures are synthetic and use disposable PostgreSQL; no production data is touched.

The existing Applied-date browser regression also passes. Two older browser scripts stop at unrelated assertions: `board-order.mjs` expects history helper text containing “Review/correct”; `inputs-status.mjs` expects a danger border color on a Builder test control but sees the control-border color. Their referenced helper/Builder code was not changed. Hired's dedicated browser script independently verifies board moves, failure rollback, counts/filtering and responsive overflow in both themes at 390/600/900/1440px.
