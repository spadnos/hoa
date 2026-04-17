# Plan: EMHOA POC — Complete Implementation

## Goal

Bring the EMHOA ACC project management POC to full completion per the PRD: migrate the data layer from YAML file storage to SQLite3 with a multi-tenant-aware schema, then add the high-priority backlog features (deadline tracking, fee ledger). Medium-priority features follow in Phase 3.

## Current State

The core POC is working: all 10 tools are implemented, Claude chat with SSE streaming works, and 37 tests pass. The data layer uses YAML frontmatter (gray-matter) for projects and contacts. The PRD explicitly chose SQLite3 over YAML to avoid throwaway infrastructure and keep the schema close to what PostgreSQL/Supabase will require. Phase 1 closes that gap.

## Prerequisites

- Node.js 20+ with TypeScript 5
- `ANTHROPIC_API_KEY` set in `.env`
- Existing project data in `projects/` and `contacts/hoa-members.md` (will be migrated)

---

## Phase 1: SQLite3 Database Migration

Replace the YAML/gray-matter data layer with SQLite3. Documents remain file-based — they are reference content, not structured data.

### Tasks

- [ ] **Add SQLite3 dependency**
  - Add `better-sqlite3` and `@types/better-sqlite3`
  - Remove `gray-matter` (no longer needed after migration)

- [ ] **Design schema** — all HOA-scoped tables include `organization_id` (TEXT, FK to `organizations`)
  - `organizations` — id, name, created_at
  - `projects` — id (TEXT, e.g. `2026-003-lot208-new-house`), organization_id, lot, address, type, status, submitted, notes, owner_*, designer_*, contractor_*, created_at, updated_at
  - `fees` — id, project_id, organization_id, name, amount, paid_at
  - `contacts` — id, organization_id, name, role, group (acc_member | board_member), email, phone, created_at

- [ ] **Create database module** (`src/db.ts`)
  - Initialize SQLite3 connection (path configurable via env var, default `./emhoa.db`)
  - Run schema migrations on startup using a simple version table
  - Export a typed `db` singleton

- [ ] **Write schema migration** (`src/migrations/001_initial.sql`)
  - `CREATE TABLE IF NOT EXISTS` for all tables
  - Seed a default organization row for the POC (`id: 'emhoa'`)

- [ ] **Rewrite project tools** to use SQLite3 queries instead of file I/O
  - `list-projects.ts` — SELECT with optional WHERE clauses on status/type/lot
  - `get-project.ts` — SELECT project + JOIN fees
  - `create-project.ts` — INSERT project row + INSERT default fee rows for project type; preserve sequential ID generation logic
  - `update-project.ts` — UPDATE project fields; handle fee payment date updates

- [ ] **Rewrite contact tools** to use SQLite3 queries
  - `get-contacts.ts` — SELECT WHERE group IN ('acc_member', 'board_member')
  - `add-contact.ts` — INSERT contact row
  - `edit-contact.ts` — UPDATE contact row by id or name+group
  - `remove-contact.ts` — DELETE contact row

- [ ] **Data migration script** (`src/scripts/migrate-yaml.ts`)
  - Read all existing `projects/*/status.md` files and INSERT into SQLite3
  - Read `contacts/hoa-members.md` and INSERT into SQLite3
  - Log counts; safe to run repeatedly (upsert by ID)

- [ ] **Update all tests** to use SQLite3
  - Replace temp directory + YAML file setup with in-memory SQLite3 (`:memory:`)
  - Update `tests/helpers.ts` to initialize schema and seed test data
  - Verify all 37 existing tests pass with new data layer

- [ ] **Run migration** on existing data; verify project count and contact count match

### Acceptance Criteria

- [ ] All 37 tests pass using SQLite3 backend
- [ ] `npm run dev` starts without errors; existing projects and contacts are queryable via chat
- [ ] `gray-matter` dependency removed
- [ ] All tables include `organization_id` column with a default seed value of `'emhoa'`
- [ ] No data loss: project count and contact count match pre-migration totals

---

## Phase 2: High-Priority Enhancements

Add the two "High" priority features from the enhancements backlog. Both require only new tools + system prompt updates; no schema changes.

### Tasks

- [ ] **Fee Ledger / Balance Report** (`src/tools/fee-ledger.ts`)
  - New tool: `get_fee_ledger`
  - SELECT all unpaid fees (paid_at IS NULL) grouped by project, with project status and owner name
  - Return total outstanding amount + per-project breakdown
  - Register in `src/tools/index.ts`
  - Add test coverage in `tests/tools/fee-ledger.test.ts`

- [ ] **Deadline Tracking** (`src/tools/get-deadlines.ts`)
  - New tool: `get_deadlines`
  - Input: optional `days_ahead` (default 30), optional `project_id`
  - Compute upcoming deadlines from project data using the rules in the PRD:
    - Plan submission cutoff: 14 days before next ACC meeting
    - Final Review window: 90 days from preliminary approval date
    - Construction start: 90 days from effective approval (stamp date + 31 days)
    - Winter erosion control: October 31 each year (for active construction)
    - Earthwork blackout: November 1 – April 1
    - Compliance deposit refund: 60-day inspection window after owner notification
  - Store key dates on projects table (add columns: `preliminary_approved_at`, `final_approved_at`, `construction_started_at`, `owner_notified_complete_at`)
  - Schema migration: `002_deadline_dates.sql`
  - Return sorted list of upcoming deadlines with project ID, deadline type, date, and days remaining
  - Register in `src/tools/index.ts`
  - Add test coverage in `tests/tools/get-deadlines.test.ts`

- [ ] **Update system prompt** to reference new tools and prompt Claude to surface deadlines and outstanding fees proactively when the user asks for a project summary or meeting prep

### Acceptance Criteria

- [ ] `get_fee_ledger` returns correct unpaid totals matching test data
- [ ] `get_deadlines` correctly computes all deadline types for a test project
- [ ] Claude surfaces a fee summary and upcoming deadlines when asked "what's coming up for the next meeting?"
- [ ] All tests pass

---

## Phase 3: Medium-Priority Enhancements

### Tasks

- [ ] **Condition Tracking**
  - Add `conditions` table: id, project_id, organization_id, description, satisfied_at
  - New tools: `add_condition`, `update_condition` (mark satisfied), `list_conditions`
  - Schema migration: `003_conditions.sql`
  - Tests

- [ ] **Inspection Log**
  - Add `inspections` table: id, project_id, organization_id, type, inspector, date, outcome, notes
  - New tool: `log_inspection`, `list_inspections`
  - Schema migration: `004_inspections.sql`
  - Tests

- [ ] **Document Index**
  - Add `project_documents` table: id, project_id, organization_id, title, file_path, description, uploaded_at
  - New tools: `add_project_document`, `list_project_documents`
  - Files stored in `projects/<id>/docs/`; table stores metadata and path
  - Schema migration: `005_project_documents.sql`
  - Tests

### Acceptance Criteria

- [ ] All three features accessible via chat with natural language
- [ ] All tests pass; no regressions

---

## Risks

- **Data migration integrity** — YAML files have inconsistent or missing fields across the 13 existing projects. The migration script should handle missing fields gracefully (NULL for optional fields) and log any rows it couldn't parse.

- **Schema evolution** — The deadline tracking columns added in Phase 2 extend the projects table. Ensure the migration runner applies scripts in order and is idempotent.

- **better-sqlite3 native build** — `better-sqlite3` requires a native addon; it may need a rebuild if the Node.js version changes. Document this in setup notes. Alternative: `@prisma/client` with SQLite adapter avoids native compilation but adds significant complexity.

- **Test isolation** — Switching tests from temp directories to in-memory SQLite means each test suite must initialize its own schema. The helpers module needs careful design to avoid test pollution.

- **Deadline logic complexity** — Some deadlines (e.g., erosion control) are calendar-based, not relative to a project date. These need special-casing and should be clearly documented with the rules they implement.
