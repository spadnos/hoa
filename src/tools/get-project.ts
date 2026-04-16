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
