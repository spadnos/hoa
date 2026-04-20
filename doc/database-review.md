# Database & Table Structure Review

## What's good

- **Multi-tenant by design.** `organization_id` on every table and `UNIQUE(organization_id, lot_number)` on `lots` lays groundwork for scaling beyond East Meadows.
- **Normalization.** Migration 007 cleanly refactored denormalized owner/designer/contractor strings on `projects` into `parties` + `lot_associations` + `lot_addresses`. That was the right move.
- **Parameterized queries everywhere.** Every query uses `db.prepare(...).run(...)`/`.all(...)` with `?` placeholders. The one dynamic query (`app/api/announcements/[id]/route.ts:41`) only interpolates field names from a whitelisted set — no SQL injection risk.
- **Versioned migrations** with `_schema_version`, `PRAGMA foreign_keys = ON`, and `journal_mode = WAL` in `src/db.ts:28-30`.
- **Check constraints** on enum-like columns (`role`, `audience`, `access_tier`, etc.) keep bad data out at the DB level.

## Robustness issues

1. **Missing `ON DELETE` policies on most FKs.** Only 4 of ~30 FKs have `ON DELETE CASCADE`. Deleting a `project`, `party`, or `lot` will either fail or orphan rows in `fees`, `conditions`, `inspections`, `project_documents`, `project_contacts.party_id`, `lot_associations.party_id`, `group_memberships.party_id`, `announcements.posted_by_party_id`, `library_documents.uploaded_by_party_id`, `chat_sessions.party_id`, `projects.owner_party_id`/`designer_party_id`/`contractor_party_id`. Decide per-table: `CASCADE`, `RESTRICT`, or `SET NULL` (e.g. `posted_by_party_id` should be `SET NULL` so a departed board member doesn't delete announcements).

2. **`updated_at` is never updated.** It's defaulted on insert (`projects`, `library_documents`, `chat_sessions`) but no `UPDATE` statements or triggers touch it. Either add `AFTER UPDATE` triggers or set it explicitly in each `UPDATE`.

3. **Migration numbering gap (8, 11, 12 missing, and `008_restore_deadline_columns.sql` exists but isn't in the `MIGRATIONS` array in `src/db.ts:9-24`).** Dead file on disk is a footgun — someone will eventually wire it up and it'll re-run `ALTER ADD COLUMN` on columns already added in 002, which fails. Delete the file or document why it's intentionally excluded.

4. **Non-idempotent data migration in 007.** The `INSERT INTO parties ... FROM members` step has no dedup on re-run (not a problem now because `_schema_version` guards it, but if a migration ever fails partway through the `BEGIN;...COMMIT;` block on a system where `foreign_keys = OFF` masked an error, you could end up with half-applied state). Low risk but worth knowing.

5. **Text dates instead of real types.** All timestamps are `TEXT` with `datetime('now')`. Fine for SQLite, but be aware:
   - No timezone info stored (assumed UTC).
   - `date('now')` vs `datetime('now')` are mixed (e.g. `announcements.visible_from` uses `date`, most others use `datetime`). Comparisons work but are fragile.
   - Consider `INTEGER` Unix timestamps or at least a consistent ISO-8601 convention and a CHECK constraint.

6. **Missing indexes for common query paths:**
   - `fees(project_id)`, `conditions(project_id)`, `inspections(project_id)` — all filtered by `project_id` but unindexed.
   - `lot_associations(end_date)` — every portal/auth query does `WHERE end_date IS NULL`; a partial index `WHERE end_date IS NULL` would help.
   - `group_memberships(party_id, end_date)` — same pattern in `src/auth/actions.ts:19`.
   - `projects(status)`, `projects(submitted)` if you ever list/sort by them.
   - `chat_messages(session_id, id)` is covered, but `chat_sessions(organization_id, updated_at)` isn't.

7. **No `NOT NULL` on `created_at` in `members`** (migration 006). Minor, but every other table enforces it.

8. **`lot_addresses` has no uniqueness.** You can insert the same `(lot_id, address, unit)` twice. Migration 007 Step 5 even does `SELECT DISTINCT` to work around this — add `UNIQUE(lot_id, address, unit)`.

9. **Orphan risk in `projects.lot_address_id`.** It references `lot_addresses` but has no `ON DELETE` action. If `lot_addresses` is cascade-deleted when a lot is deleted, the project's `lot_address_id` becomes dangling. Use `ON DELETE SET NULL`.

## Security issues

1. **Session cookie is base64 JSON, not signed.** `src/auth/session.ts:29` just base64-encodes the JSON. Anyone can forge `{partyId: 1, permissions: ["admin"]}` and paste it into their cookie to become an admin. The comment says "Add secure: true and a signed/encrypted payload before production" — this needs to happen before the DB matters. Use `iron-session`, `next-auth`, or at minimum an HMAC signature.

2. **Several API routes bypass auth entirely:**
   - `app/api/lot-associations/[id]/route.ts` — no `getSession()` check, lets anyone end any lot association.
   - `app/api/group-memberships/[id]/route.ts` — same; anyone can remove board/ACC members or reorder them.
   - `app/api/parties/route.ts` POST — creates parties with no auth check.
   - `app/api/lots/route.ts` GET — no session required; falls back to `ORG_ID`.

   The pattern `const orgId = session?.organizationId ?? ORG_ID` throughout the codebase means unauthenticated requests silently act on the default org. That's a big problem if/when you add a second org.

3. **`file_path` stored directly, download route unverified.** Worth auditing `app/api/documents/[id]/download/route.ts` and `app/api/projects/[id]/documents/[docId]/download/route.ts` for path traversal — the `safeName` generator is good, but make sure no user input ever reaches `path.join` with the uploads dir.

4. **No rate limiting on chat.** `chat_sessions` tracks cost but nothing caps a single party's spend. One compromised or abusive account can rack up unbounded Anthropic charges. Add a per-party daily token/cost limit enforced in `createOrLoadSession`.

## Scalability concerns

1. **SQLite + Next.js serverless is a dead end.** `better-sqlite3` with a singleton `_db` in `src/db.ts:60-67` works in a single long-lived Node process but breaks on Vercel-style serverless (each lambda has its own file), and WAL doesn't help across processes. Plan the Postgres migration now — keep the `Db` type as a thin abstraction. Drizzle/Kysely would let you keep most of the query code.

2. **No connection pooling story.** Same root cause. When you move to Postgres, `getDb()` becomes a pool, not a singleton.

3. **No full-text search.** Parties/announcements/documents search with `LIKE '%q%'` (`app/api/parties/route.ts:22`). Fine for 100 users, bad at 10k. SQLite has FTS5; Postgres has `tsvector`.

4. **Chat message history query is unbounded in practice.** `LIMIT 80` caps the load, but `chat_messages` grows forever with no archival strategy.

5. **No soft delete / audit log.** Given this is HOA compliance data (approvals, conditions, inspections), regulators/boards often want history. Consider an `audit_log` table or at minimum `deleted_at` columns.

## Recommended next steps (in priority order)

1. Sign/encrypt the session cookie (security-critical, blocks everything else).
2. Add auth checks to the 3–4 unauthenticated API routes listed above.
3. Delete or integrate `008_restore_deadline_columns.sql`.
4. Add `ON DELETE` policies to all FKs; add `UNIQUE(lot_id, address, unit)` on `lot_addresses`.
5. Add the missing indexes (`fees.project_id`, `conditions.project_id`, `inspections.project_id`, partial index on `lot_associations(party_id) WHERE end_date IS NULL`).
6. Add triggers (or explicit `UPDATE ... SET updated_at = datetime('now')`) to maintain `updated_at`.
7. Plan the Postgres migration before you take on a second HOA.
