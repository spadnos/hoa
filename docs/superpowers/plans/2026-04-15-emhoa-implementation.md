# EMHOA Project Tracking System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a file-based HOA project tracking system with a Claude-powered chatbot interface that lets the ACC administrator query rules, fees, and project status via natural language.

**Architecture:** Express/TypeScript server with a stateless `/api/chat` endpoint that runs a Claude tool-use loop and streams the final response via SSE. Projects are stored as directories under `projects/` with YAML-frontmatter `status.md` files. Reference documents live in `documents/` as markdown.

**Tech Stack:** Node.js 20+, TypeScript 5, Express 4, Anthropic SDK (`@anthropic-ai/sdk`), `gray-matter` (YAML frontmatter), Jest + ts-jest, `marked` (CDN in browser)

---

## File Structure

```
emhoa/
├── src/
│   ├── server.ts              # Express app + server entry point
│   ├── chat.ts                # POST /api/chat: tool-use loop + SSE streaming
│   ├── system-prompt.ts       # Claude system prompt string
│   ├── types.ts               # Shared TypeScript types
│   └── tools/
│       ├── index.ts           # getTools() array + executeTool() dispatcher
│       ├── list-projects.ts   # list_projects tool
│       ├── get-project.ts     # get_project tool
│       ├── create-project.ts  # create_project tool
│       ├── update-project.ts  # update_project tool
│       ├── list-documents.ts  # list_documents tool
│       └── get-document.ts    # get_document tool
├── tests/
│   ├── helpers.ts             # shared temp-dir + fixture factories
│   ├── tools/
│   │   ├── list-projects.test.ts
│   │   ├── get-project.test.ts
│   │   ├── create-project.test.ts
│   │   ├── update-project.test.ts
│   │   └── documents.test.ts
│   └── chat.test.ts
├── public/
│   └── index.html
├── projects/                  # HOA projects (committed to git, start empty)
├── documents/                 # Reference markdown (already exists)
├── .env.example
├── package.json
└── tsconfig.json
```

---

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `projects/.gitkeep`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "emhoa",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.12.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "tsx": "^4.7.2",
    "typescript": "^5.4.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.ts"]
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `.env.example`**

```
ANTHROPIC_API_KEY=your-key-here
PORT=3000
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
.env
*.js.map
```

- [ ] **Step 5: Create `projects/.gitkeep`**

Empty file. Ensures the directory is tracked by git.

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json .env.example .gitignore projects/.gitkeep
git commit -m "feat: scaffold project"
```

---

### Task 2: TypeScript types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write `src/types.ts`**

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

export interface Project {
  id: string;
  lot: number;
  owner: string;
  address: string;
  type: ProjectType;
  status: ProjectStatus;
  submitted: string;   // ISO date string, e.g. "2026-04-15"
  fees: Fee[];
  notes?: string;
}

export interface ProjectSummary {
  id: string;
  lot: number;
  owner: string;
  type: ProjectType;
  status: ProjectStatus;
  directory: string;   // full path to project directory
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add TypeScript types"
```

---

### Task 3: Test helpers

**Files:**
- Create: `tests/helpers.ts`

- [ ] **Step 1: Write `tests/helpers.ts`**

```typescript
import fs from 'fs';
import os from 'os';
import path from 'path';
import matter from 'gray-matter';
import { Project, ProjectType, ProjectStatus, Fee } from '../src/types';

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
    owner: 'Test Owner',
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

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add tests/helpers.ts
git commit -m "feat: add test helpers"
```

---

### Task 4: `list-projects` tool

**Files:**
- Create: `src/tools/list-projects.ts`
- Create: `tests/tools/list-projects.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/list-projects.test.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { listProjects } from '../../src/tools/list-projects';
import { makeTempDir, makeTestProject } from '../helpers';

let projectsDir: string;

beforeEach(() => {
  projectsDir = makeTempDir();
});

afterEach(() => {
  fs.rmSync(projectsDir, { recursive: true, force: true });
});

test('returns empty array when no projects exist', async () => {
  const result = await listProjects({}, projectsDir);
  expect(result).toEqual([]);
});

test('returns summaries for all projects', async () => {
  makeTestProject(projectsDir, { id: '2026-001', lot: 42 });
  makeTestProject(projectsDir, { id: '2026-002', lot: 99, status: 'approved' });
  const result = await listProjects({}, projectsDir);
  expect(result).toHaveLength(2);
  expect(result[0].id).toBe('2026-001');
  expect(result[1].id).toBe('2026-002');
});

test('filters by status', async () => {
  makeTestProject(projectsDir, { id: '2026-001', status: 'preliminary_review' });
  makeTestProject(projectsDir, { id: '2026-002', status: 'approved' });
  const result = await listProjects({ status: 'approved' }, projectsDir);
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('2026-002');
});

test('filters by lot number', async () => {
  makeTestProject(projectsDir, { id: '2026-001', lot: 42 });
  makeTestProject(projectsDir, { id: '2026-002', lot: 99 });
  const result = await listProjects({ lot: 42 }, projectsDir);
  expect(result).toHaveLength(1);
  expect(result[0].lot).toBe(42);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/tools/list-projects.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../src/tools/list-projects'`

- [ ] **Step 3: Implement `src/tools/list-projects.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Project, ProjectSummary } from '../types';

export const listProjectsTool: Tool = {
  name: 'list_projects',
  description:
    'List all HOA projects. Optionally filter by status, project type, or lot number.',
  input_schema: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        description: 'Filter by project status (e.g. "preliminary_review", "approved")',
      },
      type: {
        type: 'string',
        description: 'Filter by project type (e.g. "new_residence", "minor_remodel")',
      },
      lot: {
        type: 'number',
        description: 'Filter by lot number',
      },
    },
  },
};

export interface ListProjectsInput {
  status?: string;
  type?: string;
  lot?: number;
}

export async function listProjects(
  input: ListProjectsInput,
  projectsDir: string
): Promise<ProjectSummary[]> {
  if (!fs.existsSync(projectsDir)) return [];

  const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
  const summaries: ProjectSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const statusPath = path.join(projectsDir, entry.name, 'status.md');
    if (!fs.existsSync(statusPath)) continue;

    const content = fs.readFileSync(statusPath, 'utf-8');
    const { data } = matter(content);
    const project = data as Project;

    if (input.status && project.status !== input.status) continue;
    if (input.type && project.type !== input.type) continue;
    if (input.lot !== undefined && project.lot !== input.lot) continue;

    summaries.push({
      id: project.id,
      lot: project.lot,
      owner: project.owner,
      type: project.type,
      status: project.status,
      directory: path.join(projectsDir, entry.name),
    });
  }

  return summaries.sort((a, b) => a.id.localeCompare(b.id));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/tools/list-projects.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/tools/list-projects.ts tests/tools/list-projects.test.ts
git commit -m "feat: add list_projects tool"
```

---

### Task 5: `get-project` tool

**Files:**
- Create: `src/tools/get-project.ts`
- Create: `tests/tools/get-project.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/get-project.test.ts`:

```typescript
import fs from 'fs';
import { getProject } from '../../src/tools/get-project';
import { makeTempDir, makeTestProject } from '../helpers';

let projectsDir: string;

beforeEach(() => {
  projectsDir = makeTempDir();
});

afterEach(() => {
  fs.rmSync(projectsDir, { recursive: true, force: true });
});

test('returns full project when found by id', async () => {
  makeTestProject(projectsDir, { id: '2026-001', lot: 42, owner: 'Alice' });
  const result = await getProject({ id: '2026-001' }, projectsDir);
  expect(result).toMatchObject({ id: '2026-001', lot: 42, owner: 'Alice' });
});

test('returns error string when project not found', async () => {
  const result = await getProject({ id: '9999-999' }, projectsDir);
  expect(typeof result).toBe('string');
  expect(result).toContain('not found');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/tools/get-project.test.ts --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/tools/get-project.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Project } from '../types';

export const getProjectTool: Tool = {
  name: 'get_project',
  description: 'Get full details for a specific project by its ID (e.g. "2026-001").',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
    },
    required: ['id'],
  },
};

export interface GetProjectInput {
  id: string;
}

export async function getProject(
  input: GetProjectInput,
  projectsDir: string
): Promise<Project | string> {
  if (!fs.existsSync(projectsDir)) return `Project ${input.id} not found`;

  const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith(input.id)) continue;

    const statusPath = path.join(projectsDir, entry.name, 'status.md');
    if (!fs.existsSync(statusPath)) continue;

    const content = fs.readFileSync(statusPath, 'utf-8');
    const { data } = matter(content);
    return data as Project;
  }

  return `Project ${input.id} not found`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/tools/get-project.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/tools/get-project.ts tests/tools/get-project.test.ts
git commit -m "feat: add get_project tool"
```

---

### Task 6: `create-project` tool

**Files:**
- Create: `src/tools/create-project.ts`
- Create: `tests/tools/create-project.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/create-project.test.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { createProject } from '../../src/tools/create-project';
import { makeTempDir } from '../helpers';

let projectsDir: string;

beforeEach(() => {
  projectsDir = makeTempDir();
  fs.mkdirSync(projectsDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(projectsDir, { recursive: true, force: true });
});

test('creates project directory and status.md', async () => {
  const result = await createProject(
    { lot: 42, owner: 'Alice', address: '42 Alpine Way', type: 'new_residence', description: 'new house' },
    projectsDir
  );
  expect(typeof result).toBe('object');
  const project = result as { id: string; directory: string };
  expect(project.id).toMatch(/^\d{4}-001$/);
  expect(fs.existsSync(path.join(project.directory, 'status.md'))).toBe(true);
});

test('pre-populates standard fees for new_residence', async () => {
  const result = await createProject(
    { lot: 1, owner: 'Bob', address: '1 Main St', type: 'new_residence', description: 'build' },
    projectsDir
  ) as { id: string; directory: string };

  const statusPath = path.join(result.directory, 'status.md');
  const { data } = matter(fs.readFileSync(statusPath, 'utf-8'));
  expect(data.fees).toHaveLength(4);
  expect(data.fees[0].description).toBe('EMACC Review Fee');
  expect(data.fees[0].amount).toBe(2000);
  expect(data.fees[0].paid).toBeNull();
});

test('pre-populates standard fees for minor_remodel', async () => {
  const result = await createProject(
    { lot: 2, owner: 'Carol', address: '2 Pine St', type: 'minor_remodel', description: 'deck' },
    projectsDir
  ) as { id: string; directory: string };

  const { data } = matter(fs.readFileSync(path.join(result.directory, 'status.md'), 'utf-8'));
  expect(data.fees[0].amount).toBe(250);
});

test('generates sequential IDs within the same year', async () => {
  const r1 = await createProject(
    { lot: 1, owner: 'A', address: '1 St', type: 'landscaping', description: 'trees' },
    projectsDir
  ) as { id: string; directory: string };
  const r2 = await createProject(
    { lot: 2, owner: 'B', address: '2 St', type: 'landscaping', description: 'shrubs' },
    projectsDir
  ) as { id: string; directory: string };

  const year = new Date().getFullYear();
  expect(r1.id).toBe(`${year}-001`);
  expect(r2.id).toBe(`${year}-002`);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/tools/create-project.test.ts --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/tools/create-project.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Fee, Project, ProjectType } from '../types';

export const createProjectTool: Tool = {
  name: 'create_project',
  description:
    'Create a new HOA project. Scaffolds a project directory with status.md and pre-populates standard fees for the project type.',
  input_schema: {
    type: 'object' as const,
    properties: {
      lot: { type: 'number', description: 'Lot number' },
      owner: { type: 'string', description: 'Owner name' },
      address: { type: 'string', description: 'Property address' },
      type: {
        type: 'string',
        enum: ['new_residence', 'minor_remodel', 'major_remodel', 'landscaping'],
        description: 'Project type',
      },
      description: {
        type: 'string',
        description: 'Short description used in directory name (e.g. "new-house", "deck-addition")',
      },
    },
    required: ['lot', 'owner', 'address', 'type', 'description'],
  },
};

export interface CreateProjectInput {
  lot: number;
  owner: string;
  address: string;
  type: ProjectType;
  description: string;
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
    };

    fs.writeFileSync(path.join(dirPath, 'status.md'), matter.stringify('', project));
    return { id, directory: dirPath };
  } catch (err) {
    return `Failed to create project: ${String(err)}`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/tools/create-project.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/tools/create-project.ts tests/tools/create-project.test.ts
git commit -m "feat: add create_project tool with default fees"
```

---

### Task 7: `update-project` tool

**Files:**
- Create: `src/tools/update-project.ts`
- Create: `tests/tools/update-project.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/update-project.test.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { updateProject } from '../../src/tools/update-project';
import { makeTempDir, makeTestProject } from '../helpers';

let projectsDir: string;

beforeEach(() => {
  projectsDir = makeTempDir();
});

afterEach(() => {
  fs.rmSync(projectsDir, { recursive: true, force: true });
});

test('updates status field', async () => {
  const dir = makeTestProject(projectsDir, { id: '2026-001', status: 'inquiry' });
  await updateProject({ id: '2026-001', fields: { status: 'preliminary_review' } }, projectsDir);

  const { data } = matter(fs.readFileSync(path.join(dir, 'status.md'), 'utf-8'));
  expect(data.status).toBe('preliminary_review');
});

test('updates fees array', async () => {
  const dir = makeTestProject(projectsDir, {
    id: '2026-001',
    fees: [{ description: 'Review Fee', amount: 200, due_at: 'preliminary_review', paid: null }],
  });

  await updateProject(
    {
      id: '2026-001',
      fields: {
        fees: [{ description: 'Review Fee', amount: 200, due_at: 'preliminary_review', paid: '2026-04-15' }],
      },
    },
    projectsDir
  );

  const { data } = matter(fs.readFileSync(path.join(dir, 'status.md'), 'utf-8'));
  expect(data.fees[0].paid).toBe('2026-04-15');
});

test('returns error string when project not found', async () => {
  const result = await updateProject({ id: '9999-999', fields: { status: 'approved' } }, projectsDir);
  expect(typeof result).toBe('string');
  expect(result).toContain('not found');
});

test('preserves existing fields not in update', async () => {
  makeTestProject(projectsDir, { id: '2026-001', owner: 'Alice', status: 'inquiry' });
  await updateProject({ id: '2026-001', fields: { status: 'approved' } }, projectsDir);

  const dirs = fs.readdirSync(projectsDir);
  const { data } = matter(fs.readFileSync(path.join(projectsDir, dirs[0], 'status.md'), 'utf-8'));
  expect(data.owner).toBe('Alice');
  expect(data.status).toBe('approved');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/tools/update-project.test.ts --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/tools/update-project.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Project } from '../types';

export const updateProjectTool: Tool = {
  name: 'update_project',
  description:
    'Update fields on an existing project. Use this to change status, mark fees as paid, update notes, etc. Pass the full fees array when updating fee records.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
      fields: {
        type: 'object',
        description:
          'Object containing fields to update. Any top-level Project field may be included. To mark a fee paid, pass the full updated fees array.',
      },
    },
    required: ['id', 'fields'],
  },
};

export interface UpdateProjectInput {
  id: string;
  fields: Partial<Omit<Project, 'id'>>;
}

export async function updateProject(
  input: UpdateProjectInput,
  projectsDir: string
): Promise<{ id: string } | string> {
  if (!fs.existsSync(projectsDir)) return `Project ${input.id} not found`;

  const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith(input.id)) continue;

    const statusPath = path.join(projectsDir, entry.name, 'status.md');
    if (!fs.existsSync(statusPath)) continue;

    const content = fs.readFileSync(statusPath, 'utf-8');
    const { data, content: body } = matter(content);
    const updated = { ...data, ...input.fields };
    fs.writeFileSync(statusPath, matter.stringify(body, updated));
    return { id: input.id };
  }

  return `Project ${input.id} not found`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/tools/update-project.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/tools/update-project.ts tests/tools/update-project.test.ts
git commit -m "feat: add update_project tool"
```

---

### Task 8: `list-documents` and `get-document` tools

**Files:**
- Create: `src/tools/list-documents.ts`
- Create: `src/tools/get-document.ts`
- Create: `tests/tools/documents.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/tools/documents.test.ts`:

```typescript
import fs from 'fs';
import { listDocuments } from '../../src/tools/list-documents';
import { getDocument } from '../../src/tools/get-document';
import { makeTempDir, makeTestDocument } from '../helpers';

let documentsDir: string;

beforeEach(() => {
  documentsDir = makeTempDir();
});

afterEach(() => {
  fs.rmSync(documentsDir, { recursive: true, force: true });
});

test('listDocuments returns names of markdown files', async () => {
  makeTestDocument(documentsDir, 'design-guidelines.md', '# Design Guidelines\nContent here.');
  makeTestDocument(documentsDir, 'construction-rules.md', '# Construction Rules\nContent here.');
  makeTestDocument(documentsDir, 'not-markdown.txt', 'ignore me');

  const result = await listDocuments(documentsDir);
  expect(result).toHaveLength(2);
  expect(result.map((d: { filename: string }) => d.filename)).toContain('design-guidelines.md');
  expect(result.map((d: { filename: string }) => d.filename)).toContain('construction-rules.md');
});

test('getDocument returns file content', async () => {
  makeTestDocument(documentsDir, 'design-guidelines.md', '# Design Guidelines\nContent here.');
  const result = await getDocument({ filename: 'design-guidelines.md' }, documentsDir);
  expect(result).toContain('# Design Guidelines');
});

test('getDocument returns error for unknown file', async () => {
  const result = await getDocument({ filename: 'nonexistent.md' }, documentsDir);
  expect(typeof result).toBe('string');
  expect(result).toContain('not found');
});

test('getDocument rejects path traversal attempts', async () => {
  const result = await getDocument({ filename: '../../../etc/passwd' }, documentsDir);
  expect(typeof result).toBe('string');
  expect(result).toContain('not found');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/tools/documents.test.ts --no-coverage
```

Expected: FAIL — modules not found

- [ ] **Step 3: Implement `src/tools/list-documents.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const listDocumentsTool: Tool = {
  name: 'list_documents',
  description:
    'List available HOA reference documents (Design Guidelines, Construction Rules, Delinquency Policy, etc.).',
  input_schema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function listDocuments(
  documentsDir: string
): Promise<Array<{ filename: string }>> {
  if (!fs.existsSync(documentsDir)) return [];

  const entries = fs.readdirSync(documentsDir);
  return entries
    .filter((e) => e.endsWith('.md'))
    .map((filename) => ({ filename }));
}
```

- [ ] **Step 4: Implement `src/tools/get-document.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const getDocumentTool: Tool = {
  name: 'get_document',
  description:
    'Read the full content of an HOA reference document. Use this to answer questions about rules, fees, and requirements.',
  input_schema: {
    type: 'object' as const,
    properties: {
      filename: {
        type: 'string',
        description: 'Filename from list_documents, e.g. "design-guidelines.md"',
      },
    },
    required: ['filename'],
  },
};

export interface GetDocumentInput {
  filename: string;
}

export async function getDocument(
  input: GetDocumentInput,
  documentsDir: string
): Promise<string> {
  // Prevent path traversal
  const resolved = path.resolve(documentsDir, input.filename);
  if (!resolved.startsWith(path.resolve(documentsDir))) {
    return `Document not found: ${input.filename}`;
  }

  if (!fs.existsSync(resolved) || !resolved.endsWith('.md')) {
    return `Document not found: ${input.filename}`;
  }

  return fs.readFileSync(resolved, 'utf-8');
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest tests/tools/documents.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/tools/list-documents.ts src/tools/get-document.ts tests/tools/documents.test.ts
git commit -m "feat: add list_documents and get_document tools"
```

---

### Task 9: Tools index and system prompt

**Files:**
- Create: `src/tools/index.ts`
- Create: `src/system-prompt.ts`

- [ ] **Step 1: Create `src/system-prompt.ts`**

```typescript
export const SYSTEM_PROMPT = `You are an assistant for the East Meadows Homeowners Association (EMHOA) Architectural Control Committee (ACC) in Kirkwood, CA.

You help track and manage construction and renovation projects submitted by homeowners. You can look up project status, create new projects, update existing ones, and answer questions about HOA rules and requirements.

## Available reference documents

Use get_document to read these before answering questions about rules, fees, or requirements. Do not rely on your training data for HOA-specific details.

- design-guidelines.md — Full EMACC Design Guidelines (2006, revised 2009): architectural requirements, fees, review process, lot-specific rules, dwelling size/height/coverage limits
- construction-rules.md — ACC submittal instructions, fee table, Contractor Constraints checklist
- delinquency-policy.md — Delinquency timeline and ADR requirements
- document-request-sample.md — Sample HOA document request letter with contacts

## Project types and standard fees (from Design Guidelines)

- new_residence: Review $2,000 + Construction Compliance $3,500 + Re-veg Compliance $2,500 + Contractor $5,000 + $400 per additional review
- major_remodel: Review $1,000 + Compliance $2,000 + Contractor $2,000
- minor_remodel: Review $250 + Compliance $500 + Contractor $500 (covers 1 review, 1 meeting, 1 inspection)
- landscaping: Review $200 (deposits case-by-case)

## Guidelines for making changes

Always confirm with the user before calling create_project or update_project. Describe what you're about to do and ask for approval first.`;
```

- [ ] **Step 2: Create `src/tools/index.ts`**

```typescript
import path from 'path';
import { listProjectsTool, listProjects, ListProjectsInput } from './list-projects';
import { getProjectTool, getProject, GetProjectInput } from './get-project';
import { createProjectTool, createProject, CreateProjectInput } from './create-project';
import { updateProjectTool, updateProject, UpdateProjectInput } from './update-project';
import { listDocumentsTool, listDocuments } from './list-documents';
import { getDocumentTool, getDocument, GetDocumentInput } from './get-document';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export function getTools(): Tool[] {
  return [
    listProjectsTool,
    getProjectTool,
    createProjectTool,
    updateProjectTool,
    listDocumentsTool,
    getDocumentTool,
  ];
}

function dirs(): { projectsDir: string; documentsDir: string } {
  return {
    projectsDir: process.env.PROJECTS_DIR ?? path.join(process.cwd(), 'projects'),
    documentsDir: process.env.DOCUMENTS_DIR ?? path.join(process.cwd(), 'documents'),
  };
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const { projectsDir, documentsDir } = dirs();

  switch (name) {
    case 'list_projects':
      return listProjects(input as ListProjectsInput, projectsDir);
    case 'get_project':
      return getProject(input as GetProjectInput, projectsDir);
    case 'create_project':
      return createProject(input as CreateProjectInput, projectsDir);
    case 'update_project':
      return updateProject(input as UpdateProjectInput, projectsDir);
    case 'list_documents':
      return listDocuments(documentsDir);
    case 'get_document':
      return getDocument(input as GetDocumentInput, documentsDir);
    default:
      return `Unknown tool: ${name}`;
  }
}
```

- [ ] **Step 3: Verify everything compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/index.ts src/system-prompt.ts
git commit -m "feat: add tools index and system prompt"
```

---

### Task 10: Chat handler

**Files:**
- Create: `src/chat.ts`
- Create: `tests/chat.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/chat.test.ts`:

```typescript
import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createChatHandler } from '../src/chat';

function makeRes() {
  const written: string[] = [];
  return {
    setHeader: jest.fn(),
    write: jest.fn((chunk: string) => written.push(chunk)),
    end: jest.fn(),
    written,
  };
}

function makeStream(
  events: object[],
  stopReason: string,
  content: object[]
) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const event of events) yield event;
    },
    finalMessage: async () => ({ stop_reason: stopReason, content }),
  };
}

test('streams text response via SSE', async () => {
  const stream = makeStream(
    [
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' world' } },
    ],
    'end_turn',
    [{ type: 'text', text: 'Hello world' }]
  );

  const mockAnthropic = {
    messages: { stream: jest.fn().mockReturnValue(stream) },
  } as unknown as Anthropic;

  const handler = createChatHandler(mockAnthropic);
  const req = { body: { messages: [{ role: 'user', content: 'hi' }] } } as Request;
  const res = makeRes() as unknown as Response;

  await handler(req, res);

  const textEvents = res.written.filter((w) => w.includes('"type":"text"'));
  expect(textEvents.length).toBeGreaterThan(0);
  expect(textEvents.join('')).toContain('Hello');
  expect(res.written.some((w) => w.includes('[DONE]'))).toBe(true);
});

test('executes tool calls and continues conversation', async () => {
  let callCount = 0;

  const toolStream = makeStream(
    [
      { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_1', name: 'list_projects' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{}' } },
      { type: 'content_block_stop', index: 0 },
    ],
    'tool_use',
    [{ type: 'tool_use', id: 'tu_1', name: 'list_projects', input: {} }]
  );

  const textStream = makeStream(
    [{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Done' } }],
    'end_turn',
    [{ type: 'text', text: 'Done' }]
  );

  const mockAnthropic = {
    messages: {
      stream: jest.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? toolStream : textStream;
      }),
    },
  } as unknown as Anthropic;

  const handler = createChatHandler(mockAnthropic);
  const req = { body: { messages: [{ role: 'user', content: 'list projects' }] } } as Request;
  const res = makeRes() as unknown as Response;

  await handler(req, res);

  expect(callCount).toBe(2);
  expect(res.written.some((w) => w.includes('[DONE]'))).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/chat.test.ts --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/chat.ts`**

```typescript
import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getTools, executeTool } from './tools/index';
import { SYSTEM_PROMPT } from './system-prompt';

export function createChatHandler(anthropic: Anthropic) {
  return async function chatHandler(req: Request, res: Response): Promise<void> {
    const { messages } = req.body as { messages: Anthropic.MessageParam[] };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const tools = getTools();
    const allMessages: Anthropic.MessageParam[] = [...messages];

    try {
      while (true) {
        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: allMessages,
          tools,
        });

        const toolUses: {
          id: string;
          name: string;
          inputJson: string;
        }[] = [];
        let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

        for await (const event of stream) {
          if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              inputJson: '',
            };
          } else if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`);
            } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
              currentToolUse.inputJson += event.delta.partial_json;
            }
          } else if (event.type === 'content_block_stop' && currentToolUse) {
            toolUses.push({ ...currentToolUse });
            currentToolUse = null;
          }
        }

        const finalMessage = await stream.finalMessage();

        if (finalMessage.stop_reason === 'end_turn') {
          break;
        }

        if (finalMessage.stop_reason === 'tool_use') {
          allMessages.push({ role: 'assistant', content: finalMessage.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const toolUse of toolUses) {
            const result = await executeTool(
              toolUse.name,
              JSON.parse(toolUse.inputJson || '{}')
            );
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content:
                typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            });
          }

          allMessages.push({ role: 'user', content: toolResults });
        }
      }

      res.write('data: [DONE]\n\n');
    } catch (err) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`
      );
    }

    res.end();
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/chat.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Run all tests to check for regressions**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/chat.ts tests/chat.test.ts
git commit -m "feat: add chat handler with tool-use loop and SSE streaming"
```

---

### Task 11: Express server

**Files:**
- Create: `src/server.ts`

- [ ] **Step 1: Create `src/server.ts`**

```typescript
import 'dotenv/config';
import express from 'express';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { createChatHandler } from './chat';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
app.post('/api/chat', createChatHandler(anthropic));

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`EMHOA server running at http://localhost:${port}`);
});
```

- [ ] **Step 2: Create `.env` from example**

```bash
cp .env.example .env
```

Then edit `.env` and add your actual `ANTHROPIC_API_KEY`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start server**

```bash
npm run dev
```

Expected: `EMHOA server running at http://localhost:3000`

Stop the server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/server.ts
git commit -m "feat: add Express server"
```

---

### Task 12: Frontend

**Files:**
- Create: `public/index.html`

- [ ] **Step 1: Create `public/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EMHOA Assistant</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; height: 100vh; display: flex; flex-direction: column; }
    #header { background: #2c5f2e; color: white; padding: 1rem 1.5rem; font-size: 1.1rem; font-weight: 600; }
    #messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .message { max-width: 80%; padding: 0.75rem 1rem; border-radius: 8px; line-height: 1.5; }
    .message.user { background: #2c5f2e; color: white; align-self: flex-end; }
    .message.assistant { background: white; border: 1px solid #ddd; align-self: flex-start; }
    .message.assistant p { margin-bottom: 0.5rem; }
    .message.assistant p:last-child { margin-bottom: 0; }
    .message.assistant pre { background: #f0f0f0; padding: 0.5rem; border-radius: 4px; overflow-x: auto; margin: 0.5rem 0; }
    .message.assistant table { border-collapse: collapse; margin: 0.5rem 0; }
    .message.assistant th, .message.assistant td { border: 1px solid #ddd; padding: 0.3rem 0.6rem; }
    #input-area { padding: 1rem; background: white; border-top: 1px solid #ddd; display: flex; gap: 0.5rem; }
    #input { flex: 1; padding: 0.6rem 0.8rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; resize: none; }
    #send { padding: 0.6rem 1.2rem; background: #2c5f2e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; }
    #send:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>
  <div id="header">East Meadows HOA Assistant</div>
  <div id="messages"></div>
  <div id="input-area">
    <textarea id="input" rows="2" placeholder="Ask about projects, rules, fees..."></textarea>
    <button id="send">Send</button>
  </div>

  <script>
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const history = [];

    function appendMessage(role, html) {
      const div = document.createElement('div');
      div.className = `message ${role}`;
      div.innerHTML = html;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    async function send() {
      const text = inputEl.value.trim();
      if (!text) return;

      inputEl.value = '';
      sendBtn.disabled = true;

      appendMessage('user', marked.parse(text));
      history.push({ role: 'user', content: text });

      const assistantDiv = appendMessage('assistant', '<em>Thinking…</em>');
      let accumulated = '';

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6);
            if (payload === '[DONE]') break;

            let event;
            try { event = JSON.parse(payload); } catch { continue; }

            if (event.type === 'text') {
              accumulated += event.text;
              assistantDiv.innerHTML = marked.parse(accumulated);
              messagesEl.scrollTop = messagesEl.scrollHeight;
            } else if (event.type === 'error') {
              assistantDiv.innerHTML = `<em>Error: ${event.message}</em>`;
            }
          }
        }

        if (accumulated) {
          history.push({ role: 'assistant', content: accumulated });
        }
      } catch (err) {
        assistantDiv.innerHTML = `<em>Connection error: ${err.message}</em>`;
      }

      sendBtn.disabled = false;
      inputEl.focus();
    }

    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Start the server and verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000` in a browser. Verify:
- The chat UI loads with a green header "East Meadows HOA Assistant"
- Typing a message and pressing Enter (or clicking Send) sends the request
- A response streams back and renders as markdown

- [ ] **Step 3: Test a few queries manually**

Try these in the chat:
1. "What is the review fee for new construction?" — should call `get_document` and return $2,000
2. "List all projects" — should call `list_projects` and return an empty list (no projects yet)
3. "Create a new project for lot 42, owner Alice Smith, address 42 Alpine Way, type new residence, description new house" — should confirm before creating

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: add chat frontend"
```

---

### Task 13: Sample project for smoke testing

**Files:**
- Create: `projects/2026-001-lot42-sample/status.md`

- [ ] **Step 1: Create a sample project manually**

Create directory `projects/2026-001-lot42-sample/` and file `projects/2026-001-lot42-sample/status.md`:

```
---
id: '2026-001'
lot: 42
owner: Alice Sample
address: 42 Alpine Way, Kirkwood, CA
type: new_residence
status: preliminary_review
submitted: '2026-04-15'
fees:
  - description: EMACC Review Fee
    amount: 2000
    due_at: preliminary_review
    paid: '2026-04-10'
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
notes: Preliminary plans submitted. Awaiting board review meeting.
---
```

- [ ] **Step 2: Start server and test with sample project**

```bash
npm run dev
```

Open `http://localhost:3000` and try:
1. "What projects are in preliminary review?" — should return lot 42
2. "Show me the details for project 2026-001" — should return full project with fee status
3. "Has Alice Smith paid all her fees?" — should note the review fee is paid, others outstanding

- [ ] **Step 3: Commit**

```bash
git add projects/2026-001-lot42-sample/status.md
git commit -m "feat: add sample project for testing"
```

---

## Running the full test suite

```bash
npx jest --coverage
```

Expected: all tests pass, coverage reported for all tool files and chat handler.

## Starting the server

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm run build && npm start
```
