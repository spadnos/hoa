# EMHOA Contacts Enhancement — Design Spec

**Date:** 2026-04-16  
**Status:** Approved

## Overview

Adds structured contact information to the EMHOA project tracking system. Project contacts (owner, designer, contractor) are stored inline in each project's `status.md`. HOA standing members (ACC and Board) are stored in a single `contacts/hoa-members.md` file. A new `get_contacts` tool exposes HOA member data to the chatbot.

---

## 1. Data Model

### Project contacts (inline in `status.md`)

`owner` changes from a plain string to a nested YAML object. `designer` and `contractor` are new optional top-level fields.

```yaml
owner:
  name: Alice Sample
  email: alice@example.com
  phone: 555-123-4567
  lot_address: 42 Alpine Way, Kirkwood, CA
  mailing_address: 100 Main St, South Lake Tahoe, CA 96150

designer:                      # optional — omit if not yet engaged
  name: Bob Architect
  company: Alpine Design Studio
  email: bob@alpinedesign.com
  phone: 555-234-5678

contractor:                    # optional — omit if not yet engaged
  name: Carol Builder
  company: Sierra Construction
  email: carol@sierraconstruction.com
  phone: 555-345-6789
```

The existing top-level `address` field is retained for display/summary purposes. It represents the lot address and should match `owner.lot_address`.

### HOA member contacts (`contacts/hoa-members.md`)

A single markdown file with two sections, each a table of members.

```markdown
# HOA Members

## ACC Members

| Name | Role | Email | Phone |
|------|------|-------|-------|
| Jane Doe | Chair | jane@example.com | 555-001-0001 |

## Board Members

| Name | Role | Email | Phone |
|------|------|-------|-------|
| Mary Jones | President | mary@example.com | 555-002-0001 |
```

---

## 2. TypeScript Types (`src/types.ts`)

Add a `ContactInfo` interface. Update `Project` to use it.

```typescript
export interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
  company?: string;          // designer/contractor only
  lot_address?: string;      // owner only
  mailing_address?: string;  // owner only
}

export interface Project {
  id: string;
  lot: number;
  owner: ContactInfo;        // was: string
  address: string;           // retained for display/summary
  designer?: ContactInfo;    // new, optional
  contractor?: ContactInfo;  // new, optional
  type: ProjectType;
  status: ProjectStatus;
  submitted: string;
  fees: Fee[];
  notes?: string;
}
```

`ProjectSummary.owner` remains a `string` — derived from `owner.name` when building summaries.

---

## 3. Tool Changes

### `create_project`

- `owner` parameter changes from a string to a nested object: `{ name, email?, phone?, lot_address?, mailing_address? }`
- Add optional `designer` and `contractor` parameters, each a nested object: `{ name, company?, email?, phone? }`
- Scaffolded `status.md` writes `owner` as a nested object; omits `designer`/`contractor` if not provided

### `update_project`

- No structural changes — the generic `fields` patch already supports nested objects
- Tool description (exposed to Claude) updated to explicitly document `owner`, `designer`, and `contractor` as patchable nested objects with their subfields

### `get_project`

- No changes — returns raw parsed YAML, which now naturally includes nested contact objects

### `get_contacts` (new tool)

- Reads `contacts/hoa-members.md` and returns its full content as a string
- Follows the same pattern as `get_document`
- Registered in `src/tools/index.ts`

---

## 4. System Prompt Update

Add one instruction: call `get_contacts` when answering questions about ACC or Board members, their roles, or contact information.

---

## 5. Out of Scope

- Normalizing contacts into a shared roster (owners/designers/contractors referenced by ID across projects)
- Contact search or filtering tools
- Validation that `address` and `owner.lot_address` stay in sync
