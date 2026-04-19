# Implementation Plan: Remaining Features

Generated: 2026-04-18  
Status: Not started

---

## Architectural Decisions (Resolve Before Starting)

These affect multiple features — resolve them first.

**1. Multi-tenancy enforcement**  
Every query currently passes `'emhoa'` as a hardcoded string. Extend `SessionUser` with `organizationId` (derived from `parties.organization_id` at login), then replace all hardcoded literals in queries. One-day refactor; prevents data leaks if a second org is ever added.

**2. File upload strategy (needed for FR-4)**  
Store uploaded files under `UPLOADS_DIR/library/` (mirror the existing `DOCUMENTS_DIR` pattern). Serve via a `GET /api/documents/[id]/download` route that checks the session tier and streams the file. Object storage (R2/S3) can replace this for production without changing the API surface.

**3. Auth upgrade scope**  
The current session cookie is unsigned and forgeable. Fix: signed cookies via `crypto.createHmac` + `SESSION_SECRET` env var, then add `password_hash TEXT` to `parties` and replace the dropdown login with email + password. Magic links come before the member portal launches.

**4. Chat history depends on auth**  
Don't invest in persistent chat history until the session is meaningful (i.e., after Decision 3 is done).

---

## Phase 1 Completion

### [x] Multi-tenancy Enforcement (Small)

**What:** Replace `'emhoa'` literals in all SQL queries with a session-derived `organizationId`.

**Schema changes:** None.

**Files to modify:**
- `src/auth/session.ts` — add `organizationId: string` to `SessionUser`
- `src/auth/actions.ts` — populate `organizationId` from `parties` table on login
- All files under `src/tools/` — replace hardcoded `'emhoa'` with passed `organizationId`
- All API routes — pass `organizationId` from session to tools

**Acceptance:** No query references the string `'emhoa'` directly; a second org row in `organizations` would see only its own data.

---

### [ ] FR-10: External Agency Tracking (Small)

**What:** Per-project status fields for TC-TAC approval, USFS color approval, and Alpine County building permit. Required by the project flows but missing from the schema and UI.

**Schema changes — `010_external_approvals.sql`:**
```sql
ALTER TABLE projects ADD COLUMN tctac_status TEXT;
ALTER TABLE projects ADD COLUMN tctac_notes TEXT;
ALTER TABLE projects ADD COLUMN usfs_color_status TEXT;
ALTER TABLE projects ADD COLUMN usfs_color_notes TEXT;
ALTER TABLE projects ADD COLUMN alpine_permit_status TEXT;
ALTER TABLE projects ADD COLUMN alpine_permit_notes TEXT;
```
Status values: `null | 'pending' | 'approved' | 'not_required'` (permit: `'issued'` instead of `'approved'`).

**Files to modify:**
- `src/db.ts` — register migration 010
- `src/types.ts` — add six optional fields to `Project`
- `src/tools/update-project.ts` — add fields to `SCALAR_FIELDS`
- `src/tools/get-project.ts` — include new columns in `SELECT`
- `app/projects/[id]/page.tsx` — add "External Approvals" section; show yellow warning badge for lots 212, 301, and 409 if `usfs_color_status` is null

**Acceptance:** ACC user can record USFS/TC-TAC/permit status via chat or project detail page; warning badge appears for sensitive lots.

---

### [x] FR-6: Cross-Project Fee Dashboard (Small)

**What:** A dedicated page showing unpaid balances across all active projects. The per-project fee ledger exists; this aggregates it.

**Schema changes:** None.

**Files to create/modify:**
- `app/acc/fees/page.tsx` — new server component; table with project ID links, lot, owner name, fee breakdown, due dates, outstanding amounts; inline "Mark Paid" action
- `app/api/projects/[id]/fees/route.ts` — new `PATCH` endpoint to mark a fee paid (`paid_at = datetime('now')`) or add a new fee entry
- `app/components/FeeLedgerCard.tsx` — add "View All →" link to `/acc/fees`

**Acceptance:** Single page shows all unpaid fees across active projects; fees can be marked paid inline.

---

### [ ] FR-4: Document Library (Medium)

**What:** Association-wide document storage with access tiers (public / members / board). Currently only project-specific documents exist. Reference markdown files in `documents/` have no DB records or UI.

**Schema changes — `011_library_documents.sql`:**
```sql
CREATE TABLE IF NOT EXISTS library_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  access_tier TEXT NOT NULL DEFAULT 'members'
    CHECK(access_tier IN ('public', 'members', 'board')),
  category TEXT,
  uploaded_by_party_id INTEGER REFERENCES parties(id),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_library_documents_org
  ON library_documents(organization_id);
```

**Files to create/modify:**
- `src/db.ts` — register migration 011
- `src/types.ts` — add `LibraryDocument` interface
- `app/documents/page.tsx` — new server component; fetches documents the current user is permitted to see; grouped by category; card grid with download links
- `app/documents/upload/page.tsx` — admin-only; form with title, description, access tier, category, and file input
- `app/api/documents/route.ts` — `GET` (filtered by session tier), `POST` (accepts `FormData`, saves file, inserts row; requires `admin`)
- `app/api/documents/[id]/route.ts` — `DELETE` (admin only)
- `app/api/documents/[id]/download/route.ts` — `GET` with session tier check; streams file from `UPLOADS_DIR`
- `app/components/Nav.tsx` — add "Documents" link

**Acceptance:** Admin can upload a document with an access tier; members see only `members`-and-below documents; download works; non-admins cannot upload.

---

## Phase 2: Foundation Data Layer

### [ ] FR-1: Auth Hardening (Medium)

**What:** Replace the unsigned, forgeable cookie session and hardcoded user picker with real email + password auth.

**Schema changes — `012_auth_credentials.sql`:**
```sql
ALTER TABLE parties ADD COLUMN email TEXT;
ALTER TABLE parties ADD COLUMN password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_email ON parties(email) WHERE email IS NOT NULL;
```

**Steps:**
1. Sign the session cookie using `crypto.createHmac('sha256', SESSION_SECRET)` — verify on read; reject unsigned cookies
2. Add `bcryptjs` dependency; hash passwords on write, compare on login
3. Replace the dropdown login form with email + password fields

**Files to modify:**
- `src/auth/session.ts` — add HMAC signing/verification
- `src/auth/actions.ts` — `loginAction` accepts email + password; verifies hash
- `app/login/page.tsx` and `app/components/LoginClient.tsx` — email + password form

**Files to create:**
- `src/migrations/012_auth_credentials.sql`
- `app/api/auth/set-password/route.ts` — admin utility to set a password for a party (used during migration)

**Acceptance:** Forged or unsigned cookies are rejected; login requires a valid email + password; existing sessions expire and require re-login.

---

### [x] FR-2: Group Management UI (Small)

**What:** A group-centric view for managing ACC, board, and other committee memberships. The data model is complete; only the UI is missing.

**Schema changes:** None.

**Files to create:**
- `app/groups/page.tsx` — server component (admin-only); lists all distinct `group_name` values with member counts; each group expandable to show current members with titles and start dates; inline "Add member" form using existing membership endpoints

**Files to modify:**
- `app/components/Nav.tsx` — add "Groups" link (visible only for `admin`)

**Acceptance:** Admin can view current members of each group and add/end memberships without going through individual party profiles.

---

### [ ] FR-3: Lot Ownership History UI (Small)

**What:** A timeline view of ownership/occupancy history for a lot, and a way to record move-in/move-out transitions. The `lot_associations` table already stores `start_date` and `end_date`; the UI only shows current associations.

**Schema changes:** None.

**Files to modify:**
- `app/lots/[id]/page.tsx` — add "Ownership History" card querying `lot_associations` including ended rows (`end_date IS NOT NULL`), sorted by `start_date DESC`; show role, party name, start/end dates; link to party profile
- Extend `AssociationsTable` with an "End" button (admin only) that PATCHes `end_date` via the existing `/api/lot-associations/[id]` endpoint
- Add an inline "Add Association" form to record a new owner/occupant

**Acceptance:** Lot detail page shows full ownership timeline; admin can end a current association and add a new one.

---

## Phase 3: Member Portal

### [ ] FR-12: Announcements (Small)

**What:** Replace the hardcoded placeholder in `AnnouncementsCard` with a real announcement system.

**Schema changes — `013_announcements.sql`:**
```sql
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  posted_by_party_id INTEGER REFERENCES parties(id),
  visible_from TEXT NOT NULL DEFAULT (date('now')),
  visible_until TEXT,
  audience TEXT NOT NULL DEFAULT 'members'
    CHECK(audience IN ('public', 'members', 'board')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Files to create/modify:**
- `src/db.ts` — register migration 013
- `src/types.ts` — add `Announcement` interface
- `app/components/AnnouncementsCard.tsx` — accept `announcements` as a prop (replace static mock)
- `app/page.tsx` — query DB for recent announcements filtered by audience and date range
- `app/api/announcements/route.ts` — `GET` (filtered by session tier), `POST` (admin/board only)
- `app/api/announcements/[id]/route.ts` — `PATCH`, `DELETE` (admin/board only)
- `app/admin/announcements/page.tsx` — new CRUD page for board members

**Acceptance:** Board member can post an announcement visible on the dashboard; expired announcements are hidden automatically.

---

### [x] FR-13: Homeowner Account View (Medium)

**What:** A member-facing portal page showing their lot, active projects, outstanding fees, and documents.

**Schema changes:** None.

**Files to create:**
- `app/portal/page.tsx` — server component; requires `homeowner` permission; queries lot associations for the current `partyId`, projects for those lots, outstanding fees for those projects, and `members`-tier library documents. Layout: lot summary card, projects table, outstanding fees mini-ledger, documents section.

**Acceptance:** A logged-in homeowner sees only their own data; no ACC-internal fields are visible; page is inaccessible without login.

---

### [x] FR-14: ACC Application Submission (Small)

**What:** AI-assisted homeowner project submission. Instead of a form, homeowners describe their project in plain language; an AI agent reads the design guidelines, determines whether ACC approval is needed, identifies the project type and fees, asks clarifying questions, and creates the project on confirmation.

**Schema changes:** None.

**Files created/modified:**
- `src/homeowner-submit-prompt.ts` — dynamic system prompt with lot/owner context injected
- `src/tools/index.ts` — added `getHomeownerTools()` (restricted to `get_document` + `create_project`)
- `app/api/portal/chat/route.ts` — homeowner-scoped SSE chat API; verifies lot ownership, enforces tool restrictions, emits `project_created` event
- `app/portal/submit/page.tsx` — server component; fetches homeowner lots and renders client widget
- `app/portal/submit/SubmitProjectClient.tsx` — two-phase UI: lot picker + description intake → streaming chat conversation with project confirmation card
- `app/portal/page.tsx` — added "Submit New Project" button to ACC Projects card

**Acceptance:** Homeowner selects their lot, describes their project, converses with the AI to clarify scope, and confirms to create the application; AI correctly identifies when no approval is needed; homeowners cannot create projects for lots they don't own.

---

## Technical Debt

### [ ] Chat History Persistence (Medium)

**Prerequisite:** FR-1 auth hardening must be complete first.

**What:** Chat is currently stateless — each page load starts a new session. The sidebar shows three hardcoded placeholder sessions.

**Schema changes — `014_chat_sessions.sql`:**
```sql
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  party_id INTEGER NOT NULL REFERENCES parties(id),
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_party ON chat_sessions(party_id);
```

**Files to modify:**
- `app/api/chat/route.ts` — accept optional `sessionId` in request body; load prior messages from DB and prepend to `allMessages`; persist new user message and assistant response after completion; create a new session if none provided; return `sessionId` in response
- `app/chat/page.tsx` — fetch `/api/chat/sessions` on mount to populate sidebar; pass `sessionId` in subsequent chat POSTs; update sidebar in real time

**Files to create:**
- `src/migrations/014_chat_sessions.sql`
- `app/api/chat/sessions/route.ts` — `GET` returns current user's sessions (last 20, ordered by `updated_at`)
- `app/api/chat/sessions/[id]/route.ts` — `GET` full message history; `PATCH` to rename; `DELETE`

**Note:** Cap `allMessages` sent to Anthropic at 40 turns (slice to last N) to prevent token bloat on long sessions.

**Acceptance:** Refreshing the chat page restores the last session; sidebar lists real sessions; old sessions are browseable.

---

## Recommended Sequencing

```
Week 1:  Multi-tenancy enforcement → FR-10 → FR-6
Week 2:  FR-4 document library → FR-12 announcements
Week 3:  FR-1 auth hardening → FR-2 groups UI → FR-3 ownership history
Week 4:  Chat history → FR-13 portal → FR-14 ACC submission
```

The group management and ownership history UIs (FR-2, FR-3) should wait until auth is hardened (FR-1) because they expose membership data that is currently unguarded.
