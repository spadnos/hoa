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
      owner: typeof project.owner === 'string' ? project.owner : project.owner?.name ?? '',
      type: project.type,
      status: project.status,
      directory: path.join(projectsDir, entry.name),
    });
  }

  return summaries.sort((a, b) => a.id.localeCompare(b.id));
}
