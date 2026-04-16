# EMHOA Project Tracking System — Design Spec

**Date:** 2026-04-15  
**Status:** Approved

## Overview

A file-based HOA project tracking system with a Claude-powered chatbot interface. Tracks construction and renovation projects for the East Meadows HOA (EMHOA) in Kirkwood, CA. The primary user is the ACC administrator; may eventually be extended to the full ACC committee and board.

---

## 1. Data Model

### Project directories

Each project lives in its own directory under `projects/`:

```
projects/
  2026-001-lot42-new-residence/
    status.md
    plans/         # submitted plan files (PDF, etc.)
    notes/         # any other correspondence or documents
```

**Directory naming:** `YYYY-NNN-lotXX-description`

- `YYYY` — year the project was opened
- `NNN` — zero-padded sequential ID within the year
- `lotXX` — lot number (e.g., `lot42`)
- `description` — short kebab-case description

### `status.md` frontmatter

YAML frontmatter followed by optional free-form markdown notes.

```yaml
---
id: 2026-001
lot: 42
owner: John Smith
address: 123 Alpine Way
type: new_residence # new_residence | minor_remodel | major_remodel | landscaping
status: preliminary_review # inquiry | preliminary_review | final_review | approved | under_construction | complete | on_hold
submitted: 2026-03-01
fees:
  - description: EMACC Review Fee
    amount: 2000
    due_at: preliminary_review
    paid: 2026-03-01
  - description: Compliance Deposit (Construction)
    amount: 3500
    due_at: final_plan_approval
    paid: null
  - description: Compliance Deposit (Re-vegetation)
    amount: 2500
    due_at: final_plan_approval
    paid: null
  - description: Contractor Deposit
    amount: 5000
    due_at: construction_start
    paid: null
notes: |
  Preliminary plans received. Waiting on site survey.
---
```

**Project types and standard fees** (from Design Guidelines and Construction Rules):

| Type            | Review | Compliance             | Contractor | Notes                                                                     |
| --------------- | ------ | ---------------------- | ---------- | ------------------------------------------------------------------------- |
| `new_residence` | $2,000 | $3,500 + $2,500 re-veg | $5,000     | +$400/additional review; +$100 land coverage variance                     |
| `major_remodel` | $1,000 | $2,000                 | $2,000     | Additional reviews billed at consultant's rate                            |
| `minor_remodel` | $250   | $500                   | $500       | Covers 1 review, 1 meeting, 1 inspection; additional at consultant's rate |
| `landscaping`   | $200   | varies                 | varies     | Deposits case-by-case                                                     |

### Reference documents

```
documents/
  design-guidelines.md         # Full EMACC Design Guidelines (2006, rev. 2009)
  construction-rules.md        # ACC submittal instructions + Contractor Constraints
  delinquency-policy.md        # Delinquency timeline + ADR requirements
```

---

## 2. Backend Architecture

Express/TypeScript server. Stateless: no session storage. The browser sends the full conversation history on every request.

```
src/
  server.ts          # Express entry point, static file serving
  chat.ts            # POST /api/chat — Claude API tool-use loop, SSE streaming
  tools/
    list-projects.ts   # Scan projects/, return array of project summaries
    get-project.ts     # Read a specific project's status.md (full content)
    create-project.ts  # Scaffold new project directory + status.md
    update-project.ts  # Patch YAML frontmatter fields in status.md
    list-documents.ts  # List available files in documents/
    get-document.ts    # Read a specific document from documents/
```

**`POST /api/chat`** request body:

```json
{ "messages": [ { "role": "user", "content": "..." }, ... ] }
```

Response: Server-Sent Events stream, one token at a time. The handler runs the full Claude tool-use loop (tool calls → tool execution → results back to Claude) before streaming the final text response.

---

## 3. Tool Design

Six tools exposed to Claude:

| Tool             | Parameters                                       | Description                                                                 |
| ---------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| `list_projects`  | `status?`, `type?`, `lot?`                       | List projects, optionally filtered                                          |
| `get_project`    | `id`                                             | Return full status.md for a project                                         |
| `create_project` | `lot`, `owner`, `address`, `type`, `description` | Scaffold new project directory + status.md with standard fees pre-populated |
| `update_project` | `id`, `fields`                                   | Patch YAML frontmatter (status, fee paid dates, notes, etc.)                |
| `list_documents` | —                                                | Return names and one-line descriptions of available reference docs          |
| `get_document`   | `filename`                                       | Return full content of a document from documents/                           |

**Document loading strategy:** Lazy. Documents are not pre-loaded into the system prompt. The system prompt includes a one-line description of each document so Claude knows when to reach for it. Claude calls `get_document` when a question requires rule or fee details.

**System prompt** instructs Claude to:

- Act as an assistant for the East Meadows HOA Architectural Control Committee
- Use `get_document` before answering questions about rules, fees, or requirements (don't rely on training data)
- Use `list_projects` / `get_project` to answer questions about specific lots or projects
- Use `create_project` / `update_project` to make changes (always confirm with user before creating or updating)

---

## 4. Frontend

Single `public/index.html` — no framework, no build step.

- Chat message list (scrolling, newest at bottom)
- Markdown rendering via `marked.js` (CDN)
- Text input + Send button
- Streaming: responses appear token-by-token via EventSource / SSE
- No login, no session persistence — refresh clears the chat
- Project data persists in files; only the conversation is ephemeral

---

## 5. Project Structure

```
emhoa/
  src/
    server.ts
    chat.ts
    tools/
      list-projects.ts
      get-project.ts
      create-project.ts
      update-project.ts
      list-documents.ts
      get-document.ts
  public/
    index.html
  projects/          # one directory per project
  documents/         # reference markdown files
  docs/
    superpowers/
      specs/
        2026-04-15-emhoa-design.md
  package.json
  tsconfig.json
  .env               # ANTHROPIC_API_KEY
```

---

## 6. Out of Scope (v1)

- Authentication / multi-user access
- Email notifications
- PDF viewing in the UI
- Importing existing project history
- Automated fee reminders
