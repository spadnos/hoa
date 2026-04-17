# Product Requirements Document: EMHOA ACC Project Management System

**Version:** 1.0  
**Date:** 2026-04-16  
**Status:** Draft

---

## 1. Overview

### Problem Statement

The Architectural Control Committee (ACC) of East Meadows HOA in Kirkwood, CA manually tracks homeowner construction and renovation projects using a mix of email, paper forms, and informal notes. This makes it difficult to answer basic questions like "what projects are pending review?", "has the review fee been paid?", or "what were the conditions on lot 42's approval?"

### Solution

A file-based project tracking system with a conversational AI interface powered by Claude. The ACC administrator interacts with the system through natural language — asking questions, creating records, and updating statuses — rather than navigating forms or spreadsheets. All data is stored as human-readable markdown files on the local filesystem, with no external database required.

### Primary User

The ACC administrator for East Meadows HOA. A single user running the app locally; not a multi-user or cloud-deployed system in the current scope.

---

## 2. Goals and Non-Goals

### Goals

- Track all HOA construction/renovation projects from initial inquiry through completion
- Surface project details, fee status, contacts, and documents through natural language queries
- Enforce consistent data structure (project types, fee schedules, statuses) while remaining easy to edit manually
- Provide instant access to HOA governing documents (design guidelines, construction rules) through the same chat interface

### Non-Goals

- Multi-user access or role-based permissions
- Online/cloud hosting or homeowner-facing portal (future consideration)
- Payment processing or financial accounting integration
- Mobile app
- Automated email or notification workflows (potential future enhancement)

---

## 3. Users and Context

**Primary User:** ACC Administrator  
- Manages 10–30 active projects at any time across a mountain community HOA
- Needs to track project timelines, fee collection, and approval conditions
- References HOA governing documents frequently when answering homeowner questions
- Is not a developer; expects to interact via chat, not YAML files directly

**Secondary Users (future):** ACC Members, Board Members, HOA Management Company  
- May need read-only access to project status and contact information

---

## 4. Core Concepts

### Projects

Each project represents a homeowner request for ACC approval. Projects are stored as directories under `projects/` with a `status.md` file containing YAML frontmatter.

**Project ID format:** `YYYY-NNN-lotXXX-description`  
Example: `2026-003-lot208-new-house`

**Project Types:**
| Type | Description |
|------|-------------|
| `new_residence` | Full new home construction |
| `major_remodel` | Significant structural or exterior changes |
| `minor_remodel` | Small exterior modifications |
| `landscaping` | Site and vegetation work |

**Project Statuses (lifecycle order):**
```
inquiry → preliminary_review → final_review → approved → under_construction → complete
                                                                    ↕
                                                                on_hold
```

### Standard Fee Schedule

| Project Type | Review Fee | Construction Compliance | Re-Veg Deposit | Contractor Deposit |
|---|---|---|---|---|
| `new_residence` | $2,000 | $3,500 | $2,500 | $5,000 |
| `major_remodel` | $1,000 | $2,000 | — | $2,000 |
| `minor_remodel` | $250 | $500 | — | $500 |
| `landscaping` | $200 | — | case-by-case | — |

Fees are stored per-project as a list with name, amount, and optional paid date.

### Contacts

Two types of contacts are tracked:

**Project Contacts** — stored inline in each project's `status.md`:
- `owner`: The homeowner (name, email, phone, lot address, mailing address)
- `designer`: Architect or designer (name, email, phone, company)
- `contractor`: General contractor (name, email, phone, company)

**HOA Member Contacts** — stored in `contacts/hoa-members.md`:
- ACC members with name, role, email, phone
- Board members with name, role, email, phone

### Documents

Reference documents stored in `documents/` and accessible via the chat interface:
- `design-guidelines.md` — comprehensive architectural standards
- `construction-rules.md` — construction process rules
- `delinquency-policy.md` — fee delinquency procedures

---

## 5. Feature Requirements

### 5.1 Project Management (MVP — Implemented)

**FR-1: List Projects**  
Filter projects by status, type, and/or lot number. Returns summary list with key fields.

**FR-2: Get Project Details**  
Retrieve complete project record including all contacts, fee status, and notes.

**FR-3: Create Project**  
Scaffold a new project directory and `status.md` with default fees for the given project type. Auto-assign the next sequential project ID for the current year.

**FR-4: Update Project**  
Patch any field in a project's `status.md` including status transitions, fee payment dates, contact information, and notes.

### 5.2 Document Access (MVP — Implemented)

**FR-5: List Documents**  
Return a list of available reference documents.

**FR-6: Get Document**  
Read and return the full content of a reference document for the AI to answer questions against.

### 5.3 Contact Management (Implemented)

**FR-7: Get HOA Contacts**  
Return all ACC and board members with contact details.

**FR-8: Add HOA Contact**  
Add a new ACC or board member to `hoa-members.md`.

**FR-9: Edit HOA Contact**  
Update contact information for an existing ACC or board member.

**FR-10: Remove HOA Contact**  
Remove an ACC or board member from `hoa-members.md`.

### 5.4 Conversational Interface (MVP — Implemented)

**FR-11: Natural Language Chat**  
User interacts with all features via a chat interface backed by Claude. Responses stream in real time via SSE.

**FR-12: Tool Use Loop**  
Claude autonomously decides which tools to invoke, chains multiple tool calls when needed, and presents a coherent natural language response.

---

## 6. Planned Enhancements

The following features are in the backlog (`docs/enhancements.md`) and not yet implemented:

| Priority | Feature | Description |
|---|---|---|
| High | **Deadline Tracking** | Flag projects approaching 30-day review window; surface upcoming deadlines proactively |
| High | **Fee Ledger / Balance Report** | Summarize outstanding fees across all active projects |
| Medium | **Condition Tracking** | Store approval conditions as a checklist; track which are satisfied |
| Medium | **Inspection Log** | Per-project timestamped log of site inspections with notes |
| Medium | **Document Index** | Per-project index of associated files (plans, photos, correspondence) |
| Low | **Revision History** | Track plan version submissions (v1, v2, etc.) with dates |
| Low | **Annual Activity Report** | Year-end summary of projects by type, status, and fee collection |
| Low | **Fee Payment Reminders** | Generate reminder text/email drafts for outstanding fees |
| Future | **Homeowner-Facing Status Page** | Read-only web page where homeowners can check project status |
| Future | **Meeting Agenda Generation** | Auto-generate ACC meeting agenda from pending projects |
| Future | **Email Extraction** | Parse inbox to extract project-relevant information |

### Contact System Evolution

The current flat YAML contact model is sufficient for MVP. A future migration path to SQLite (or Supabase) is documented in `docs/specs/contacts.md` and would support:
- Full ownership and occupancy history per unit
- Davis-Stirling Act compliance (CC 4041 notice requirements)
- Voting eligibility tracking
- Privacy controls and audit logging

---

## 7. Technical Architecture

### Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+, TypeScript 5 |
| HTTP Server | Express 4 |
| AI | Anthropic Claude API (claude-sonnet-4-6) with tool use |
| Streaming | Server-Sent Events (SSE) |
| Frontend | Vanilla HTML/CSS/JS, `marked.js` for markdown rendering |
| Data | YAML frontmatter markdown files via `gray-matter` |
| Testing | Jest + ts-jest |

### Data Storage

All data is stored as human-readable files on the local filesystem:

```
emhoa/
├── projects/           # One directory per project, each with status.md
├── documents/          # HOA governing documents
├── contacts/           # hoa-members.md
└── src/                # Application source
```

No external database is required. Files can be edited manually or via git. This makes the system inspectable, version-controllable, and recoverable without special tooling.

### AI Tool Interface

The backend exposes 10 tools to the Claude agent:

```
list_projects       get_project         create_project      update_project
list_documents      get_document
get_contacts        add_contact         edit_contact        remove_contact
```

The chat handler runs a tool-use loop: Claude receives the user's message, calls tools as needed, receives results, and streams a final natural language response.

---

## 8. Data Model

### Project (`status.md` frontmatter)

```yaml
id: "2026-001-lot42-new-residence"
lot: "42"
owner:
  name: "Jane Smith"
  email: "jane@example.com"
  phone: "530-555-1234"
  lot_address: "42 Mountain View Dr, Kirkwood, CA"
  mailing_address: "100 Main St, Sacramento, CA 95814"
designer:
  name: "Bob Architect"
  company: "Design Co"
  email: "bob@designco.com"
contractor:
  name: "Tom Builder"
  company: "Builder Inc"
  phone: "530-555-5678"
address: "42 Mountain View Dr, Kirkwood, CA"
type: "new_residence"
status: "approved"
submitted: "2026-01-15"
fees:
  - name: "Review Fee"
    amount: 2000
    paid: "2026-02-01"
  - name: "Construction Compliance Deposit"
    amount: 3500
notes: "Approved with conditions: natural wood siding only, no metal roofing."
```

### HOA Contacts (`hoa-members.md` frontmatter)

```yaml
acc_members:
  - name: "Alice Johnson"
    role: "ACC Chair"
    email: "alice@emhoa.org"
    phone: "530-555-0001"
board_members:
  - name: "Carol Davis"
    role: "President"
    email: "carol@emhoa.org"
    phone: "530-555-0010"
```

---

## 9. Success Metrics

Since this is a single-user internal tool, success is measured by utility and adoption rather than quantitative metrics:

- ACC administrator uses the chat interface as the primary way to look up and update project information (vs. editing files directly)
- Time to answer common questions ("Is lot 42's fee paid?", "What projects are in review?") drops from minutes to seconds
- No projects fall through the cracks due to missing status updates or untracked fees
- System remains functional and data remains intact over multi-year use

---

## 10. Open Questions

1. **Multi-user access:** If the HOA management company also needs access, what's the right path — shared local instance, a simple read-only export, or a hosted deployment?

2. **Backup and recovery:** Files are on a local machine. Should git commits serve as the backup mechanism, or is there a simpler sync strategy (e.g., iCloud Drive)?

3. **Fee collection workflow:** The system tracks whether fees are paid but has no integration with how they're actually collected (check, bank transfer). Is a notes field sufficient, or is a separate payment tracking field needed?

4. **Conditions and approvals:** ACC approvals often come with conditions. The current `notes` field handles this as free text. Should conditions be a structured field to enable tracking of which are satisfied?

5. **Document management:** Plans, photos, and correspondence are not yet tracked per-project. Should these be stored in the project directory and indexed, or is a pointer to an external folder/Drive sufficient?
