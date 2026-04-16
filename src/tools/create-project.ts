import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Fee, Project, ProjectType, ContactInfo } from '../types';

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
      owner: { name: input.owner } as ContactInfo,
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
