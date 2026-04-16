# Contacts Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured contact information (owner, designer, contractor) to project status files, and add a contacts file and tool for ACC/Board members.

**Architecture:** `ContactInfo` is a new shared interface in `types.ts`. Project `status.md` files gain structured `owner`, `designer`, and `contractor` YAML objects. A new `get_contacts` tool reads `contacts/hoa-members.md`. All changes follow the existing pattern of TypeScript types → tool input schema → tool implementation → tests.

**Tech Stack:** TypeScript, Jest/ts-jest, gray-matter, `@anthropic-ai/sdk`

---

## File Map

| File | Change |
|------|--------|
| `src/types.ts` | Add `ContactInfo` interface; update `Project.owner` to `ContactInfo`; add optional `designer`/`contractor`; keep `ProjectSummary.owner` as `string` |
| `tests/helpers.ts` | Update `makeTestProject` owner default to `ContactInfo` object |
| `src/tools/list-projects.ts` | Derive `owner` string from `project.owner.name` |
| `tests/tools/list-projects.test.ts` | Add assertion that summary owner is the name string |
| `src/tools/create-project.ts` | Update tool schema and `CreateProjectInput`; write owner as object; accept optional designer/contractor |
| `tests/tools/create-project.test.ts` | Update existing tests; add tests for owner object shape and optional contacts |
| `src/tools/get-contacts.ts` | New tool — reads `contacts/hoa-members.md` |
| `tests/tools/get-contacts.test.ts` | New test file |
| `contacts/hoa-members.md` | New file — ACC and Board member tables |
| `src/tools/index.ts` | Register `get_contacts` tool and handler |
| `src/tools/update-project.ts` | Update tool description to document owner/designer/contractor as patchable nested objects |
| `src/system-prompt.ts` | Add `get_contacts` instruction |
| `projects/2026-001-lot42-sample/status.md` | Update owner to ContactInfo shape |
| `projects/2026-002-lot518-new-house/status.md` | Update owner to ContactInfo shape |
| `projects/2026-003-lot208-new-house/status.md` | Update owner to ContactInfo shape |

---

## Task 1: Update TypeScript types and test helpers

**Files:**
- Modify: `src/types.ts`
- Modify: `tests/helpers.ts`

- [ ] **Step 1: Update `src/types.ts`**

Replace the entire file content:

```typescript
export type ProjectType =
  | 'new_residence'
  | 'minor_remodel'
  | 'major_remodel'
  | 'landscaping';

export type ProjectStatus =
  | 'inquiry'
  | 'preliminary_review'
  | 'final_review'
  | 'approved'
  | 'under_construction'
  | 'complete'
  | 'on_hold';

export interface Fee {
  description: string;
  amount: number;
  due_at: string;
  paid: string | null;
}

export interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
  company?: string;         // designer/contractor only
  lot_address?: string;     // owner only
  mailing_address?: string; // owner only
}

export interface Project {
  id: string;
  lot: number;
  owner: ContactInfo;       // was: string
  address: string;          // retained for display/summary
  designer?: ContactInfo;
  contractor?: ContactInfo;
  type: ProjectType;
  status: ProjectStatus;
  submitted: string;        // ISO date string, e.g. "2026-04-15"
  fees: Fee[];
  notes?: string;
}

export interface ProjectSummary {
  id: string;
  lot: number;
  owner: string;            // derived from owner.name
  type: ProjectType;
  status: ProjectStatus;
  directory: string;        // full path to project directory
}
```

- [ ] **Step 2: Update `tests/helpers.ts`**

Replace the `owner` default value in `makeTestProject` so it matches the new `ContactInfo` shape:

```typescript
import fs from 'fs';
import os from 'os';
import path from 'path';
import matter from 'gray-matter';
import { Project, ProjectType, ProjectStatus, Fee, ContactInfo } from '../src/types';

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'emhoa-test-'));
}

export function makeTestProject(
  projectsDir: string,
  overrides: Partial<Project> = {}
): string {
  const project: Project = {
    id: '2026-001',
    lot: 42,
    owner: { name: 'Test Owner' } as ContactInfo,
    address: '42 Test Lane',
    type: 'new_residence' as ProjectType,
    status: 'preliminary_review' as ProjectStatus,
    submitted: '2026-01-01',
    fees: [] as Fee[],
    ...overrides,
  };
  const dirName = `${project.id}-lot${project.lot}-test`;
  const dirPath = path.join(projectsDir, dirName);
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(
    path.join(dirPath, 'status.md'),
    matter.stringify('', project)
  );
  return dirPath;
}

export function makeTestDocument(documentsDir: string, filename: string, content: string): void {
  fs.mkdirSync(documentsDir, { recursive: true });
  fs.writeFileSync(path.join(documentsDir, filename), content);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors. (Some tests will fail at runtime until later tasks — that is expected.)

- [ ] **Step 4: Commit**

```bash
git add src/types.ts tests/helpers.ts
git commit -m "feat: add ContactInfo type, update Project.owner to object"
```

---

## Task 2: Update `list-projects` to derive owner name

**Files:**
- Modify: `src/tools/list-projects.ts`
- Modify: `tests/tools/list-projects.test.ts`

- [ ] **Step 1: Write a failing test**

Add this test to `tests/tools/list-projects.test.ts` (after the existing tests):

```typescript
test('summary owner is the owner name string', async () => {
  makeTestProject(projectsDir, {
    id: '2026-001',
    owner: { name: 'Alice Sample', email: 'alice@example.com' },
  });
  const result = await listProjects({}, projectsDir);
  expect(result[0].owner).toBe('Alice Sample');
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npx jest tests/tools/list-projects.test.ts -t "summary owner is the owner name string" --no-coverage`

Expected: FAIL — `owner` will be an object `{ name: 'Alice Sample', email: '...' }` not a string.

- [ ] **Step 3: Update `src/tools/list-projects.ts`**

Change line 63 from `owner: project.owner,` to `owner: project.owner.name,`:

```typescript
    summaries.push({
      id: project.id,
      lot: project.lot,
      owner: typeof project.owner === 'string' ? project.owner : project.owner.name,
      type: project.type,
      status: project.status,
      directory: path.join(projectsDir, entry.name),
    });
```

> Note: The `typeof` guard handles any legacy `status.md` files that still have `owner` as a plain string, avoiding a crash when the old sample projects exist. This guard can be removed once all project files are migrated in Task 7.

- [ ] **Step 4: Run all list-projects tests**

Run: `npx jest tests/tools/list-projects.test.ts --no-coverage`

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/list-projects.ts tests/tools/list-projects.test.ts
git commit -m "feat: derive owner name string from ContactInfo in project summaries"
```

---

## Task 3: Update `create-project` to use ContactInfo

**Files:**
- Modify: `src/tools/create-project.ts`
- Modify: `tests/tools/create-project.test.ts`

- [ ] **Step 1: Write failing tests**

Add these tests to `tests/tools/create-project.test.ts` (after the existing tests):

```typescript
test('writes owner as a ContactInfo object', async () => {
  const result = await createProject(
    {
      lot: 5,
      owner: { name: 'Dana', email: 'dana@example.com', phone: '555-000-1111',
               lot_address: '5 Hill Rd', mailing_address: 'PO Box 5' },
      address: '5 Hill Rd',
      type: 'new_residence',
      description: 'new-house',
    },
    projectsDir
  ) as { id: string; directory: string };

  const { data } = matter(fs.readFileSync(path.join(result.directory, 'status.md'), 'utf-8'));
  expect(data.owner).toMatchObject({ name: 'Dana', email: 'dana@example.com' });
});

test('writes designer and contractor when provided', async () => {
  const result = await createProject(
    {
      lot: 6,
      owner: { name: 'Eve' },
      address: '6 Ridge Rd',
      type: 'major_remodel',
      description: 'remodel',
      designer: { name: 'Frank', company: 'Studio F', email: 'frank@studio.com' },
      contractor: { name: 'Grace', company: 'GC Inc', phone: '555-222-3333' },
    },
    projectsDir
  ) as { id: string; directory: string };

  const { data } = matter(fs.readFileSync(path.join(result.directory, 'status.md'), 'utf-8'));
  expect(data.designer).toMatchObject({ name: 'Frank', company: 'Studio F' });
  expect(data.contractor).toMatchObject({ name: 'Grace', company: 'GC Inc' });
});

test('omits designer and contractor when not provided', async () => {
  const result = await createProject(
    { lot: 7, owner: { name: 'Hank' }, address: '7 Peak St', type: 'landscaping', description: 'landscaping' },
    projectsDir
  ) as { id: string; directory: string };

  const { data } = matter(fs.readFileSync(path.join(result.directory, 'status.md'), 'utf-8'));
  expect(data.designer).toBeUndefined();
  expect(data.contractor).toBeUndefined();
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx jest tests/tools/create-project.test.ts --no-coverage`

Expected: The three new tests FAIL. Existing tests may also fail because they pass `owner` as a string.

- [ ] **Step 3: Update `src/tools/create-project.ts`**

Replace the entire file:

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { ContactInfo, Fee, Project, ProjectType } from '../types';

export const createProjectTool: Tool = {
  name: 'create_project',
  description:
    'Create a new HOA project. Scaffolds a project directory with status.md and pre-populates standard fees for the project type.',
  input_schema: {
    type: 'object' as const,
    properties: {
      lot: { type: 'number', description: 'Lot number' },
      owner: {
        type: 'object',
        description: 'Owner contact information',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          lot_address: { type: 'string', description: 'Physical address of the lot' },
          mailing_address: { type: 'string', description: 'Owner mailing/billing address if different from lot' },
        },
        required: ['name'],
      },
      address: { type: 'string', description: 'Property address (lot location, used for display)' },
      type: {
        type: 'string',
        enum: ['new_residence', 'minor_remodel', 'major_remodel', 'landscaping'],
        description: 'Project type',
      },
      description: {
        type: 'string',
        description: 'Short description used in directory name (e.g. "new-house", "deck-addition")',
      },
      designer: {
        type: 'object',
        description: 'Designer contact information (optional)',
        properties: {
          name: { type: 'string' },
          company: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
        },
        required: ['name'],
      },
      contractor: {
        type: 'object',
        description: 'Contractor contact information (optional)',
        properties: {
          name: { type: 'string' },
          company: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
        },
        required: ['name'],
      },
    },
    required: ['lot', 'owner', 'address', 'type', 'description'],
  },
};

export interface CreateProjectInput {
  lot: number;
  owner: ContactInfo;
  address: string;
  type: ProjectType;
  description: string;
  designer?: ContactInfo;
  contractor?: ContactInfo;
}

const DEFAULT_FEES: Record<ProjectType, Fee[]> = {
  new_residence: [
    { description: 'EMACC Review Fee', amount: 2000, due_at: 'preliminary_review', paid: null },
    { description: 'Compliance Deposit (Construction)', amount: 3500, due_at: 'final_plan_approval', paid: null },
    { description: 'Compliance Deposit (Re-vegetation)', amount: 2500, due_at: 'final_plan_approval', paid: null },
    { description: 'Contractor Deposit', amount: 5000, due_at: 'construction_start', paid: null },
  ],
  major_remodel: [
    { description: 'EMACC Review Fee', amount: 1000, due_at: 'preliminary_review', paid: null },
    { description: 'Compliance Deposit', amount: 2000, due_at: 'final_plan_approval', paid: null },
    { description: 'Contractor Deposit', amount: 2000, due_at: 'construction_start', paid: null },
  ],
  minor_remodel: [
    { description: 'EMACC Review Fee', amount: 250, due_at: 'preliminary_review', paid: null },
    { description: 'Compliance Deposit', amount: 500, due_at: 'final_plan_approval', paid: null },
    { description: 'Contractor Deposit', amount: 500, due_at: 'construction_start', paid: null },
  ],
  landscaping: [
    { description: 'EMACC Review Fee', amount: 200, due_at: 'preliminary_review', paid: null },
  ],
};

function generateId(projectsDir: string): string {
  const year = new Date().getFullYear();
  const entries = fs.existsSync(projectsDir) ? fs.readdirSync(projectsDir) : [];
  const thisYearNums = entries
    .map((e) => e.match(/^(\d{4})-(\d{3})-/))
    .filter((m): m is RegExpMatchArray => m !== null && m[1] === String(year))
    .map((m) => parseInt(m[2], 10));
  const next = thisYearNums.length > 0 ? Math.max(...thisYearNums) + 1 : 1;
  return `${year}-${String(next).padStart(3, '0')}`;
}

function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createProject(
  input: CreateProjectInput,
  projectsDir: string
): Promise<{ id: string; directory: string } | string> {
  try {
    fs.mkdirSync(projectsDir, { recursive: true });

    const id = generateId(projectsDir);
    const dirName = `${id}-lot${input.lot}-${toKebab(input.description)}`;
    const dirPath = path.join(projectsDir, dirName);
    fs.mkdirSync(dirPath, { recursive: true });

    const project: Project = {
      id,
      lot: input.lot,
      owner: input.owner,
      address: input.address,
      type: input.type,
      status: 'inquiry',
      submitted: new Date().toISOString().split('T')[0],
      fees: DEFAULT_FEES[input.type].map((f) => ({ ...f })),
      ...(input.designer ? { designer: input.designer } : {}),
      ...(input.contractor ? { contractor: input.contractor } : {}),
    };

    fs.writeFileSync(path.join(dirPath, 'status.md'), matter.stringify('', project));
    return { id, directory: dirPath };
  } catch (err) {
    return `Failed to create project: ${String(err)}`;
  }
}
```

- [ ] **Step 4: Update the existing tests in `tests/tools/create-project.test.ts` to pass owner as an object**

The four existing tests all pass `owner: 'Alice'` (or similar) — update each to use `owner: { name: 'Alice' }` (etc.):

```typescript
// test: 'creates project directory and status.md'
{ lot: 42, owner: { name: 'Alice' }, address: '42 Alpine Way', type: 'new_residence', description: 'new house' }

// test: 'pre-populates standard fees for new_residence'
{ lot: 1, owner: { name: 'Bob' }, address: '1 Main St', type: 'new_residence', description: 'build' }

// test: 'pre-populates standard fees for minor_remodel'
{ lot: 2, owner: { name: 'Carol' }, address: '2 Pine St', type: 'minor_remodel', description: 'deck' }

// test: 'generates sequential IDs within the same year'
{ lot: 1, owner: { name: 'A' }, address: '1 St', type: 'landscaping', description: 'trees' }
{ lot: 2, owner: { name: 'B' }, address: '2 St', type: 'landscaping', description: 'shrubs' }
```

- [ ] **Step 5: Run all create-project tests**

Run: `npx jest tests/tools/create-project.test.ts --no-coverage`

Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/tools/create-project.ts tests/tools/create-project.test.ts
git commit -m "feat: update create_project to use ContactInfo for owner, designer, contractor"
```

---

## Task 4: Create `get_contacts` tool

**Files:**
- Create: `contacts/hoa-members.md`
- Create: `src/tools/get-contacts.ts`
- Create: `tests/tools/get-contacts.test.ts`

- [ ] **Step 1: Create `contacts/hoa-members.md`**

```markdown
# HOA Members

## ACC Members

| Name | Role | Email | Phone |
|------|------|-------|-------|
| (ACC Chair) | Chair | | |
| (ACC Member) | Member | | |

## Board Members

| Name | Role | Email | Phone |
|------|------|-------|-------|
| (President) | President | | |
| (Treasurer) | Treasurer | | |
| (Secretary) | Secretary | | |
```

> Fill in real names/contacts before using in production. The file is intentionally sparse — the ACC admin will populate it.

- [ ] **Step 2: Write failing tests in `tests/tools/get-contacts.test.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import { getContacts } from '../../src/tools/get-contacts';
import { makeTempDir } from '../helpers';

let contactsDir: string;

beforeEach(() => {
  contactsDir = makeTempDir();
  fs.writeFileSync(
    path.join(contactsDir, 'hoa-members.md'),
    '# HOA Members\n\n## ACC Members\n\n| Name | Role |\n|------|------|\n| Jane Doe | Chair |\n'
  );
});

afterEach(() => {
  fs.rmSync(contactsDir, { recursive: true, force: true });
});

test('returns content of hoa-members.md', async () => {
  const result = await getContacts(contactsDir);
  expect(result).toContain('Jane Doe');
  expect(result).toContain('ACC Members');
});

test('returns error message when file does not exist', async () => {
  fs.rmSync(path.join(contactsDir, 'hoa-members.md'));
  const result = await getContacts(contactsDir);
  expect(result).toMatch(/not found/i);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest tests/tools/get-contacts.test.ts --no-coverage`

Expected: FAIL — module `../../src/tools/get-contacts` not found.

- [ ] **Step 4: Create `src/tools/get-contacts.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const getContactsTool: Tool = {
  name: 'get_contacts',
  description:
    'Get the list of current ACC members and HOA Board members with their contact information.',
  input_schema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function getContacts(contactsDir: string): Promise<string> {
  const filePath = path.join(contactsDir, 'hoa-members.md');
  if (!fs.existsSync(filePath)) {
    return 'HOA members file not found';
  }
  return fs.readFileSync(filePath, 'utf-8');
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest tests/tools/get-contacts.test.ts --no-coverage`

Expected: Both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add contacts/hoa-members.md src/tools/get-contacts.ts tests/tools/get-contacts.test.ts
git commit -m "feat: add get_contacts tool and contacts/hoa-members.md"
```

---

## Task 5: Wire up `get_contacts` and update descriptions

**Files:**
- Modify: `src/tools/index.ts`
- Modify: `src/tools/update-project.ts`
- Modify: `src/system-prompt.ts`

- [ ] **Step 1: Update `src/tools/index.ts`**

Add the import at the top (after the existing imports):

```typescript
import { getContactsTool, getContacts } from './get-contacts';
```

Add `getContactsTool` to the `getTools()` return array:

```typescript
export function getTools(): Tool[] {
  return [
    listProjectsTool,
    getProjectTool,
    createProjectTool,
    updateProjectTool,
    listDocumentsTool,
    getDocumentTool,
    getContactsTool,
  ];
}
```

Add the `contactsDir` to the `dirs()` function:

```typescript
function dirs(): { projectsDir: string; documentsDir: string; contactsDir: string } {
  return {
    projectsDir: process.env.PROJECTS_DIR ?? path.join(process.cwd(), 'projects'),
    documentsDir: process.env.DOCUMENTS_DIR ?? path.join(process.cwd(), 'documents'),
    contactsDir: process.env.CONTACTS_DIR ?? path.join(process.cwd(), 'contacts'),
  };
}
```

Add the `get_contacts` case to `executeTool`:

```typescript
    case 'get_contacts':
      return getContacts(contactsDir);
```

The full updated `executeTool` switch:

```typescript
export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const { projectsDir, documentsDir, contactsDir } = dirs();

  switch (name) {
    case 'list_projects':
      return listProjects(input as ListProjectsInput, projectsDir);
    case 'get_project':
      return getProject(input as unknown as GetProjectInput, projectsDir);
    case 'create_project':
      return createProject(input as unknown as CreateProjectInput, projectsDir);
    case 'update_project':
      return updateProject(input as unknown as UpdateProjectInput, projectsDir);
    case 'list_documents':
      return listDocuments(documentsDir);
    case 'get_document':
      return getDocument(input as unknown as GetDocumentInput, documentsDir);
    case 'get_contacts':
      return getContacts(contactsDir);
    default:
      return `Unknown tool: ${name}`;
  }
}
```

- [ ] **Step 2: Update `update_project` tool description in `src/tools/update-project.ts`**

Replace the `description` field of the `updateProjectTool`:

```typescript
  description:
    'Update fields on an existing project. Use this to change status, mark fees as paid, update notes, or update contact information. ' +
    'Pass the full fees array when updating fee records. ' +
    'Contact fields are nested objects: owner (name, email, phone, lot_address, mailing_address), ' +
    'designer (name, company, email, phone), contractor (name, company, email, phone). ' +
    'To add or update a designer or contractor, pass the full contact object in the fields.',
```

- [ ] **Step 3: Update `src/system-prompt.ts`**

Add a line to the `## Available reference documents` section:

```typescript
export const SYSTEM_PROMPT = `You are an assistant for the East Meadows Homeowners Association (EMHOA) Architectural Control Committee (ACC) in Kirkwood, CA.

You help track and manage construction and renovation projects submitted by homeowners. You can look up project status, create new projects, update existing ones, and answer questions about HOA rules and requirements.

## Available reference documents

Use get_document to read these before answering questions about rules, fees, or requirements. Do not rely on your training data for HOA-specific details.

- design-guidelines.md — Full EMACC Design Guidelines (2006, revised 2009): architectural requirements, fees, review process, lot-specific rules, dwelling size/height/coverage limits
- construction-rules.md — ACC submittal instructions, fee table, Contractor Constraints checklist
- delinquency-policy.md — Delinquency timeline and ADR requirements
- document-request-sample.md — Sample HOA document request letter with contacts

## ACC and Board member contacts

Use get_contacts when asked about ACC members, Board members, their roles, or their contact information.

## Project types and standard fees (from Design Guidelines)

- new_residence: Review $2,000 + Construction Compliance $3,500 + Re-veg Compliance $2,500 + Contractor $5,000 + $400 per additional review
- major_remodel: Review $1,000 + Compliance $2,000 + Contractor $2,000
- minor_remodel: Review $250 + Compliance $500 + Contractor $500 (covers 1 review, 1 meeting, 1 inspection)
- landscaping: Review $200 (deposits case-by-case)

## Guidelines for making changes

Always confirm with the user before calling create_project or update_project. Describe what you're about to do and ask for approval first.`;
```

- [ ] **Step 4: Run the full test suite**

Run: `npx jest --no-coverage`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/index.ts src/tools/update-project.ts src/system-prompt.ts
git commit -m "feat: register get_contacts tool, update descriptions and system prompt"
```

---

## Task 6: Migrate existing project status files

**Files:**
- Modify: `projects/2026-001-lot42-sample/status.md`
- Modify: `projects/2026-002-lot518-new-house/status.md`
- Modify: `projects/2026-003-lot208-new-house/status.md`

- [ ] **Step 1: Update `projects/2026-001-lot42-sample/status.md`**

Replace `owner: Alice Sample` with:

```yaml
owner:
  name: Alice Sample
  lot_address: 42 Alpine Way, Kirkwood, CA
```

- [ ] **Step 2: Update `projects/2026-002-lot518-new-house/status.md`**

Replace `owner: Griffin` with (the notes mention designer Sheldon Bidwell / JA Designs — add that too):

```yaml
owner:
  name: Griffin
  lot_address: 795 Columbine Circle, Kirkwood, CA
designer:
  name: Sheldon Bidwell
  company: JA Designs
```

- [ ] **Step 3: Update `projects/2026-003-lot208-new-house/status.md`**

Replace `owner: Brent Tetri` with (the notes mention architect Natalia Wieczorek / BFD Key Architecture — add that too):

```yaml
owner:
  name: Brent Tetri
  lot_address: 342 East Meadows Drive, Kirkwood, CA
designer:
  name: Natalia Wieczorek
  company: BFD/Key Architecture
```

- [ ] **Step 5: Verify the app still works**

Run: `npx jest --no-coverage`

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add projects/
git commit -m "chore: migrate project status files to ContactInfo owner shape"
```
