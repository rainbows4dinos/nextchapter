# Delete a mistaken prospect — issue #41

Implemented locally; not committed or deployed to Pages. The database migration was applied to hosted Supabase on 26 October 2026 under separate user approval. [Issue #41](https://github.com/rainbows4dinos/nextchapter/issues/41) distinguishes permanent removal of a mistaken record from a Pass/Reject/Closed outcome.

## Interaction

Only the saved prospect editor offers **Delete prospect**, using the shared Icon-Only Button / Tertiary / Lg classes and Gravity `trash-bin` icon, with matching accessible label and tooltip. It sits apart from Save in the existing sticky action footer. Creation has no delete control.

The button opens a native modal confirmation: **Delete this prospect?** / “Remove **[saved title] at [saved company]** from your tracker? This can't be undone.” Cancel receives initial focus; Cancel and Escape close it without a request and return focus to Trash. Native modal behavior makes the editor inert. Record names are rendered as text. The application has no reusable confirmation-modal component or destructive-button variant; the implementation composes the established raised-panel surface, hard-shadow elevation, shared primary/tertiary buttons and semantic tokens. No new button variant is introduced. Figma canonical metadata confirms the tertiary icon-only variant; detailed design context was unavailable during implementation.

Explicit **Delete Prospect** makes one pending request. Both actions are disabled and Escape is blocked until it finishes. Failure keeps the dialog, record and unsaved editor values, shows an error and allows retry. A stale/unavailable record also offers the existing explicit reload action in editor feedback after Cancel. No automatic retry, editor close or optimistic removal occurs.

After the server confirms the selected UUID, the dialog closes and the app returns to a freshly loaded board using its existing in-memory search/status/date filters, ordering and scroll state. Counts derive from the new owner-scoped read; the shared success toast announces deletion. A full browser reload retains deletion but, as before, does not persist in-memory board filters.

## Persistence and relationships

[Migration](../supabase/migrations/20261027000000_delete_prospect.sql) adds only `public.delete_prospect(prospect_id uuid, expected_updated_at timestamptz) returns uuid`. No tables, DELETE grants, cascades or new status outcomes are added.

The original schema gives authenticated clients no DELETE permission. Every prospect has a status event, whose foreign key uses ON DELETE RESTRICT. Consequently a direct table delete cannot support the feature. The narrow security-definer RPC uses an empty search path, explicit `auth.uid()` ownership, the existing per-owner board advisory lock and a row lock, then compares the exact saved revision. Missing/other-owner/already-deleted/stale IDs fail with `40001`, without revealing another owner's record. Anonymous invocation is denied; null IDs/revisions are rejected. No browser service-role credential is involved, and existing RLS and table permissions remain unchanged.

For an eligible record the RPC removes only that UUID's status events and prospect atomically. Embedded notes, connections, assessment and logo references go with that prospect row; external logo assets are not deleted. A failure rolls back history cleanup. Other prospects and their history remain untouched even if company/title/job URL match.

**Linked Radar opportunities deliberately block deletion.** Their restrictive foreign key and immutable handoff semantics are preserved. The RPC returns a useful error instead of unlinking/deleting the opportunity or mutating its decision. Supporting deletion of such a linked prospect would require a separately defined handoff policy. This limitation does not affect ordinary manually created/imported duplicates.

The client validates ID and exact microsecond revision, calls only the RPC and accepts success only for the selected UUID. No delete is inferred from an empty response. If a response is lost after commit, close the dialog and reload to reconcile; a subsequent delete reports unavailable rather than falsely succeeding or deleting another record.

## Validation

- Five PostgreSQL/SDK tests cover exact duplicate selection and history isolation, owner/anonymous restrictions, missing/stale revisions, linked-opportunity protection, rollback on final-delete failure, SDK errors and later reads.
- Two data-access regressions check exact RPC payload/revision preservation, response confirmation, error propagation and input validation.
- Browser fixture: `tools/prospect-tracker/tests/fixtures/delete-editor.html` automatically exercises real editor/modal components for new/existing controls, safe labels, Cancel/focus, pending/repeat-submit/Escape guard, failure/draft preservation, retry/success and cleanup.
- Full local app acceptance used two synthetic duplicate records only. Actual Escape restored focus; a one-shot injected request failure preserved unsaved notes; successful deletion returned to the filtered board with one card, and the surviving duplicate remained after reload. Dialog layout was inspected at desktop and 390px in light/dark themes, including keyboard navigation. No production prospect was read or deleted for these checks.
- Full Node suite: 241/242 passed. The sole pre-existing failure is `resume-context.test.js:34`: “May 2026 to Present” versus the expected “May 2026 to Aug 2026”. Frontend/backend typechecks and lint pass; backend tests pass 19/19. Whitespace checks pass.

Initial RPC types were obtained through migration-based PGlite introspection. After the approved hosted migration, `npm run types:generate` regenerated the types directly from hosted Supabase.

## Release requirements — separate approval required

1. Review the migration and related-record policy, rerun scoped checks and confirm the intended hosted project. Do not apply unrelated pending migrations.
2. Apply only the reviewed migration to hosted Supabase, retaining table RLS and existing grants. Verify function signature, restricted execution and the absence of direct DELETE grants; regenerate hosted database types. Migration application itself deletes no records.
3. Commit/push only with approval, then publish Pages with the prepared `20261027-delete-prospect` bootstrap/app/data/CSS cache revisions. No Edge Function deployment, credentials, signing keys or existing record changes are required.
4. Hosted acceptance should verify rendering and Cancel/Escape without deleting production prospects. Any hosted destructive test needs separately approved disposable records.
5. Prefer a forward fix. To disable the capability, restore the previous frontend and revoke/drop this RPC through a reviewed migration. Keep existing schemas and history intact. Already confirmed permanent deletes cannot be undone by a code rollback; there is no trash/recovery feature.

## Changed files

- UI/controller: [app.js](../tools/prospect-tracker/app.js), [prospect-delete.js](../tools/prospect-tracker/prospect-delete.js), [styles.css](../tools/prospect-tracker/styles.css).
- Frontend cache references: [bootstrap.js](../tools/prospect-tracker/bootstrap.js), [index.html](../tools/prospect-tracker/index.html).
- Persistence/types: [data.js](../tools/prospect-tracker/data.js), [database.types.ts](../tools/prospect-tracker/database.types.ts), [migration](../supabase/migrations/20261027000000_delete_prospect.sql).
- Local schema tooling: [local-database.js](../tools/prospect-tracker/scripts/local-database.js), [generate-local-types.js](../tools/prospect-tracker/scripts/generate-local-types.js).
- Regression tests/fixtures: [data.test.js](../tools/prospect-tracker/tests/data.test.js), [delete-prospect.test.js](../tools/prospect-tracker/tests/delete-prospect.test.js), [radar-server.js](../tools/prospect-tracker/tests/fixtures/radar-server.js), [delete-editor.html](../tools/prospect-tracker/tests/fixtures/delete-editor.html), [delete-editor.js](../tools/prospect-tracker/tests/fixtures/delete-editor.js).
- Documentation: this file.


## Hosted migration acceptance — 26 October 2026

Applied only `20261027000000_delete_prospect.sql` to the existing project after a dry run confirmed it was the sole pending migration. The hosted ledger records `delete_prospect`. Function body checksum matches the reviewed migration; signature is `(prospect_id uuid, expected_updated_at timestamptz) returns uuid`, security definer with empty search path. Authenticated execution is enabled; public/anonymous execution and direct authenticated DELETE on prospects/history are disabled. RLS remains enabled and both incoming prospect foreign keys retain ON DELETE RESTRICT.

Aggregate counts before and after were 73 prospects and 156 status events. No deletion RPC was invoked and no production prospect was deleted for migration acceptance. No frontend or Edge Function deployment, commit or push was performed. Private operator evidence lives outside the repository. Pages release remains subject to separate approval.
